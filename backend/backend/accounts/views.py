import hashlib
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.core.mail import send_mail
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import IntegrityError
from django.db.models import Prefetch
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from backend.listings.models import get_expiry_cutoff
from .serializers import (
    PrivateUserSerializer, BusinessUserSerializer, UserProfileSerializer,
    UserBalanceSerializer, DealerListSerializer, DealerDetailSerializer
)
from .models import (
    PrivateUser,
    BusinessUser,
    UserProfile,
    UserImportApiKey,
    ImportApiUsageEvent,
)


def _refresh_cookie_max_age_seconds() -> int:
    return int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())


def _normalize_email(value: str) -> str:
    return str(value).strip().lower()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=_refresh_cookie_max_age_seconds(),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


ADMIN_LOGIN_CODE_LENGTH = 6
ADMIN_LOGIN_CODE_TTL_SECONDS = 10 * 60
ADMIN_LOGIN_SEND_COOLDOWN_SECONDS = 45
ADMIN_LOGIN_MAX_ATTEMPTS = 5


def _build_authenticated_user_payload(request, user: User) -> dict:
    user_type = 'private'
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'created_at': user.date_joined,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_admin': bool(user.is_staff or user.is_superuser),
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username
        if user.business_profile.profile_image:
            user_data['profile_image_url'] = request.build_absolute_uri(
                user.business_profile.profile_image.url
            )

    try:
        profile = UserProfile.objects.get(user=user)
        balance = float(profile.balance)
    except UserProfile.DoesNotExist:
        balance = 0.0

    user_data['balance'] = balance
    user_data['userType'] = user_type
    return user_data


def _build_auth_success_response(request, user: User) -> Response:
    refresh = RefreshToken.for_user(user)
    response = Response(
        {
            'access': str(refresh.access_token),
            'user': _build_authenticated_user_payload(request, user),
        },
        status=status.HTTP_200_OK,
    )
    _set_refresh_cookie(response, str(refresh))
    return response


def _mask_email(email: str) -> str:
    normalized = _normalize_email(email)
    if '@' not in normalized:
        return '***'
    local, domain = normalized.split('@', 1)
    if not local:
        return f"***@{domain}"
    if len(local) == 1:
        masked_local = '*'
    elif len(local) == 2:
        masked_local = f"{local[0]}*"
    else:
        masked_local = f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}"
    return f"{masked_local}@{domain}"


def send_verification_email(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = settings.FRONTEND_BASE_URL.rstrip("/")
    verify_url = f"{base_url}/verify-email?uid={uid}&token={token}"
    subject = "Потвърдете акаунта си в Kar.bg"
    message = (
        "Здравейте,\n\n"
        "Благодарим за регистрацията в Kar.bg. Моля, потвърдете акаунта си чрез линка по-долу:\n"
        f"{verify_url}\n\n"
        "Ако не сте вие, игнорирайте този имейл.\n"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def _extract_import_api_key(request) -> str:
    auth_header = str(request.headers.get('Authorization') or '').strip()
    if auth_header.lower().startswith('apikey '):
        return auth_header[7:].strip()

    fallback = request.headers.get('X-Karbg-Api-Key') or request.headers.get('X-Api-Key')
    return str(fallback or '').strip()


def _has_business_profile(user) -> bool:
    try:
        user.business_profile
        return True
    except BusinessUser.DoesNotExist:
        return False


def _extract_client_ip(request) -> str:
    forwarded_for = str(request.META.get('HTTP_X_FORWARDED_FOR') or '').strip()
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    real_ip = str(request.META.get('HTTP_X_REAL_IP') or '').strip()
    if real_ip:
        return real_ip

    return str(request.META.get('REMOTE_ADDR') or '').strip()


def _detect_import_source(request) -> str:
    client_hint = str(
        request.headers.get('X-Karbg-Client')
        or request.headers.get('X-Client-App')
        or ''
    ).strip().lower()
    if 'public' in client_hint:
        return ImportApiUsageEvent.SOURCE_PUBLIC_API
    if 'extension' in client_hint or 'chrome' in client_hint:
        return ImportApiUsageEvent.SOURCE_EXTENSION
    # This endpoint is dedicated for the extension integration by default.
    return ImportApiUsageEvent.SOURCE_EXTENSION


def _safe_status_code(status_code):
    try:
        parsed = int(status_code)
    except (TypeError, ValueError):
        return 0
    if parsed < 0:
        return 0
    if parsed > 999:
        return 999
    return parsed


def _estimate_payload_bytes(request) -> int | None:
    try:
        body = request.body
    except Exception:
        return None
    if isinstance(body, (bytes, bytearray)):
        return len(body)
    if body is None:
        return None
    try:
        return len(str(body).encode('utf-8'))
    except Exception:
        return None


def _log_import_api_usage(
    request,
    *,
    api_key=None,
    user=None,
    listing=None,
    status_code=0,
    success=False,
    error_message='',
    duration_ms=None,
):
    payload = request.data if hasattr(request, 'data') else {}
    source_url = _safe_str(payload.get('source_url') or payload.get('url'), 1000)
    lot_number = _safe_str(payload.get('lot_number') or payload.get('lotNumber'), 80)
    source_host = ''
    if source_url:
        try:
            source_host = urllib.parse.urlparse(source_url).hostname or ''
        except Exception:
            source_host = ''

    payload_bytes = _estimate_payload_bytes(request)

    safe_duration_ms = None
    if duration_ms is not None:
        try:
            parsed_duration = int(duration_ms)
        except (TypeError, ValueError):
            parsed_duration = None
        if parsed_duration is not None and parsed_duration >= 0:
            safe_duration_ms = parsed_duration

    imported_listing_id_snapshot = None
    if listing is not None:
        imported_listing_id_snapshot = getattr(listing, 'id', None)

    try:
        ImportApiUsageEvent.objects.create(
            user=user,
            api_key=api_key,
            imported_listing=listing,
            imported_listing_id_snapshot=imported_listing_id_snapshot,
            endpoint=_safe_str(request.path, 120) or '/api/auth/import/copart/',
            request_method=_safe_str(request.method, 12) or 'POST',
            source=_detect_import_source(request),
            status_code=_safe_status_code(status_code),
            success=bool(success),
            lot_number=lot_number,
            source_url=source_url,
            source_host=_safe_str(source_host, 255),
            request_ip=_safe_str(_extract_client_ip(request), 64) or None,
            user_agent=_safe_str(request.headers.get('User-Agent'), 512),
            extension_version=_safe_str(
                request.headers.get('X-Karbg-Extension-Version')
                or request.headers.get('X-Extension-Version'),
                32,
            ),
            payload_bytes=payload_bytes,
            duration_ms=safe_duration_ms,
            error_message=_safe_str(error_message, 4000),
        )
    except Exception:
        # Logging should never break the import flow.
        return


def _safe_int(value, default=0):
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    digits = re.sub(r'[^0-9-]', '', text)
    if not digits or digits in {'-', '--'}:
        return default
    try:
        return int(digits)
    except (TypeError, ValueError):
        return default


def _safe_decimal(value, default=Decimal('0')):
    if value is None:
        return default
    text = str(value).replace(' ', '').replace(',', '').strip()
    if not text:
        return default
    cleaned = re.sub(r'[^0-9.\-]', '', text)
    if not cleaned:
        return default
    try:
        parsed = Decimal(cleaned)
    except (InvalidOperation, TypeError, ValueError):
        return default
    return parsed if parsed >= 0 else default


def _safe_str(value, max_length=255):
    text = str(value or '').strip()
    if not text:
        return ''
    return text[:max_length]


def _normalize_copart_category(value):
    key = str(value or '').strip().lower()
    if not key:
        return 'sedan'

    normalized = re.sub(r'[^a-z0-9]+', ' ', key).strip()

    if any(token in normalized for token in ('pickup', 'pick up', 'truck')):
        return 'pickup'
    if any(token in normalized for token in ('suv', 'sport utility', 'jeep', 'crossover')):
        return 'jeep'
    if any(token in normalized for token in ('hatchback', 'hatch')):
        return 'hatchback'
    if any(token in normalized for token in ('wagon', 'estate')):
        return 'wagon'
    if any(token in normalized for token in ('coupe', 'kup')):
        return 'coupe'
    if any(token in normalized for token in ('cabriolet', 'convertible', 'roadster', 'cabrio')):
        return 'cabriolet'
    if any(token in normalized for token in ('minivan', 'mini van', 'mpv')):
        return 'minivan'
    if any(token in normalized for token in ('stretch', 'limo', 'limousine')):
        return 'stretch_limo'
    if 'van' in normalized:
        return 'van'
    if any(token in normalized for token in ('sedan', 'saloon')):
        return 'sedan'
    return 'sedan'


def _normalize_copart_fuel(value):
    key = str(value or '').strip().lower()
    if not key:
        return 'benzin'

    normalized = re.sub(r'[^a-z0-9]+', ' ', key).strip()
    if any(token in normalized for token in ('electric', 'ev', 'bev')):
        return 'elektro'
    if any(token in normalized for token in ('plug in', 'phev', 'hybrid', 'hibrid')):
        return 'hibrid'
    if any(token in normalized for token in ('diesel', 'dizel')):
        return 'dizel'
    if any(token in normalized for token in ('lpg', 'cng', 'газ', 'gas benzin', 'gasoline lpg', 'газ бензин')):
        return 'gaz_benzin'
    if any(token in normalized for token in ('gasoline', 'gas', 'petrol', 'benzin')):
        return 'benzin'
    return 'benzin'


def _normalize_copart_gearbox(value):
    key = str(value or '').strip().lower()
    if not key:
        return 'avtomatik'

    normalized = re.sub(r'[^a-z0-9]+', ' ', key).strip()
    if any(token in normalized for token in ('manual', 'stick', 'mt', 'ruchna')):
        return 'ruchna'
    if any(token in normalized for token in ('automatic', 'auto', 'cvt', 'dct', 'semi', 'avtomatik')):
        return 'avtomatik'
    return 'avtomatik'


def _normalize_copart_condition(value):
    key = str(value or '').strip().lower()
    if not key:
        return '2'

    if key in {'0', '1', '2', '3'}:
        return key

    normalized = re.sub(r'[^a-z0-9]+', ' ', key).strip()
    if any(token in normalized for token in ('new', 'unused', 'brand new')):
        return '0'
    if any(
        token in normalized
        for token in (
            'for parts',
            'parts only',
            'donor',
            'scrap',
            'junk',
        )
    ):
        return '3'
    if any(
        token in normalized
        for token in (
            'used',
            'normal wear',
            'clean title',
            'minor dent',
            'minor scratch',
        )
    ):
        return '1'
    if any(
        token in normalized
        for token in (
            'damag',
            'salvage',
            'collision',
            'flood',
            'burn',
            'fire',
            'hail',
            'water',
            'stripped',
            'biohazard',
            'vandal',
        )
    ):
        return '2'
    return '2'


def _parse_copart_displacement_cc(*values):
    for value in values:
        text = str(value or '').strip()
        if not text:
            continue

        cc_match = re.search(r'(\d{3,5})\s*(?:cc|cm3|cm\^?3|куб\.?\s*см)', text, flags=re.IGNORECASE)
        if cc_match:
            parsed = _safe_int(cc_match.group(1), default=0)
            if parsed > 0:
                return parsed

        liter_match = re.search(r'(\d(?:\.\d)?)\s*(?:l|liter|litre|литра?)\b', text, flags=re.IGNORECASE)
        if liter_match:
            try:
                liters = Decimal(liter_match.group(1))
            except (InvalidOperation, ValueError):
                liters = None
            if liters and liters > 0:
                cc_value = int((liters * Decimal('1000')).to_integral_value())
                if cc_value > 0:
                    return cc_value

    return 0


def _parse_copart_power_hp(*values):
    for value in values:
        text = str(value or '').strip()
        if not text:
            continue
        hp_match = re.search(r'(\d{2,4})\s*(?:hp|bhp|ps|к\.?\s*с\.?)\b', text, flags=re.IGNORECASE)
        if hp_match:
            parsed = _safe_int(hp_match.group(1), default=0)
            if parsed > 0:
                return parsed
    return 0


COPART_ALLOWED_IMAGE_HOST_TOKENS = (
    'copart.',
    '.copart',
    'copartimages',
)
IMPORT_MAX_IMAGES = 12
IMPORT_MAX_IMAGE_BYTES = 12 * 1024 * 1024
IMAGE_CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
}
ALLOWED_IMAGE_EXTENSIONS = set(IMAGE_CONTENT_TYPE_EXTENSIONS.values())


def _to_string_list(raw_value):
    if raw_value is None:
        return []
    if isinstance(raw_value, (list, tuple, set)):
        return [str(item).strip() for item in raw_value if str(item).strip()]
    value = str(raw_value).strip()
    if not value:
        return []
    if value.startswith('[') and value.endswith(']'):
        value = value[1:-1]
    separators = ['\n', ',']
    parts = [value]
    for separator in separators:
        next_parts = []
        for part in parts:
            if separator in part:
                next_parts.extend(part.split(separator))
            else:
                next_parts.append(part)
        parts = next_parts
    return [part.strip().strip('"').strip("'") for part in parts if part.strip()]


def _normalize_remote_image_url(raw_url, base_url=''):
    candidate = str(raw_url or '').strip()
    if not candidate or candidate.lower().startswith('data:'):
        return ''

    resolved = urllib.parse.urljoin(base_url, candidate) if base_url else candidate
    parsed = urllib.parse.urlparse(resolved)
    if parsed.scheme not in {'http', 'https'}:
        return ''
    if not parsed.netloc:
        return ''

    normalized_host = parsed.netloc.lower()
    if not any(token in normalized_host for token in COPART_ALLOWED_IMAGE_HOST_TOKENS):
        return ''

    return parsed.geturl()


def _extract_import_image_urls(payload):
    base_url = _safe_str(payload.get('source_url') or payload.get('url'), 1000)
    raw_urls = (
        payload.get('image_urls')
        or payload.get('imageUrls')
        or payload.get('images')
        or []
    )
    items = _to_string_list(raw_urls)
    unique_urls = []
    seen = set()
    for item in items:
        normalized = _normalize_remote_image_url(item, base_url=base_url)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        unique_urls.append(normalized)
    return unique_urls


def _detect_image_extension(url, content_type=''):
    normalized_content_type = str(content_type or '').split(';')[0].strip().lower()
    if normalized_content_type in IMAGE_CONTENT_TYPE_EXTENSIONS:
        return IMAGE_CONTENT_TYPE_EXTENSIONS[normalized_content_type]

    path = urllib.parse.urlparse(url).path
    suffix = path.rsplit('.', 1)[-1].lower() if '.' in path else ''
    if suffix in ALLOWED_IMAGE_EXTENSIONS:
        return suffix
    return 'jpg'


def _download_remote_image_bytes(url, referer=''):
    request_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarBgCopartImporter/1.0',
    }
    if referer:
        request_headers['Referer'] = referer

    request = urllib.request.Request(
        url,
        headers=request_headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            content_type = response.headers.get('Content-Type', '')
            if content_type and not str(content_type).lower().startswith('image/'):
                return None, None

            data = response.read(IMPORT_MAX_IMAGE_BYTES + 1)
            if not data or len(data) > IMPORT_MAX_IMAGE_BYTES:
                return None, None
            return data, content_type
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, OSError):
        return None, None


def _attach_copart_images_to_listing(listing, payload):
    from backend.listings.models import CarImage

    image_urls = _extract_import_image_urls(payload)
    source_url = _safe_str(payload.get('source_url') or payload.get('url'), 1000)
    uploaded_count = 0
    for image_url in image_urls[:IMPORT_MAX_IMAGES]:
        image_bytes, content_type = _download_remote_image_bytes(image_url, referer=source_url)
        if not image_bytes:
            continue

        extension = _detect_image_extension(image_url, content_type=content_type)
        file_name = f"copart_{listing.id}_{uploaded_count + 1}.{extension}"
        content_file = ContentFile(image_bytes, name=file_name)

        try:
            CarImage.objects.create(
                listing=listing,
                image=content_file,
                order=uploaded_count,
                is_cover=(uploaded_count == 0),
            )
            uploaded_count += 1
        except Exception:
            continue

    return uploaded_count


def _build_copart_draft_payload(payload, user):
    source_url = _safe_str(payload.get('source_url') or payload.get('url'), 1000)
    lot_number = _safe_str(payload.get('lot_number') or payload.get('lotNumber'), 60)
    source_title = _safe_str(
        payload.get('source_title') or payload.get('copart_title') or payload.get('title'),
        200,
    )
    brand = _safe_str(payload.get('brand'), 100)
    model = _safe_str(payload.get('model'), 100)
    year_from = _safe_int(payload.get('year_from') or payload.get('year'), default=timezone.now().year)
    year_from = year_from if 1900 <= year_from <= 2100 else timezone.now().year
    price = _safe_decimal(
        payload.get('price')
        or payload.get('current_bid')
        or payload.get('currentBid')
        or payload.get('buy_now')
        or payload.get('buyNow'),
        default=Decimal('0'),
    )
    mileage = _safe_int(payload.get('mileage') or payload.get('odometer'), default=0)
    mileage = mileage if mileage >= 0 else 0
    vin = _safe_str(payload.get('vin'), 17)

    engine_text = _safe_str(
        payload.get('engine') or payload.get('engine_spec') or payload.get('engineSpec'),
        160,
    )
    cylinders = _safe_str(payload.get('cylinders'), 40)
    drive = _safe_str(payload.get('drive') or payload.get('driveline') or payload.get('drive_line'), 80)
    primary_damage = _safe_str(
        payload.get('primary_damage') or payload.get('primaryDamage'),
        120,
    )
    secondary_damage = _safe_str(
        payload.get('secondary_damage') or payload.get('secondaryDamage'),
        120,
    )
    title_type = _safe_str(payload.get('title_type') or payload.get('titleType'), 120)
    vehicle_type = _safe_str(payload.get('vehicle_type') or payload.get('vehicleType'), 120)
    keys_info = _safe_str(payload.get('keys'), 60)
    run_and_drives = _safe_str(payload.get('run_and_drives') or payload.get('runAndDrives'), 80)
    odometer_text = _safe_str(payload.get('odometer_text') or payload.get('odometerText'), 80)
    odometer_status = _safe_str(payload.get('odometer_status') or payload.get('odometerStatus'), 80)
    seller = _safe_str(payload.get('seller') or payload.get('seller_name'), 160)
    sale_date = _safe_str(payload.get('sale_date') or payload.get('saleDate'), 120)
    sale_name = _safe_str(payload.get('sale_name') or payload.get('saleName'), 160)
    lot_status = _safe_str(payload.get('lot_status') or payload.get('lotStatus'), 120)
    highlights = _safe_str(payload.get('highlights'), 220)

    power = _safe_int(payload.get('power') or payload.get('horsepower'), default=0)
    if power <= 0:
        power = _parse_copart_power_hp(payload.get('horsepower'), engine_text, source_title)

    displacement = _parse_copart_displacement_cc(
        payload.get('displacement'),
        payload.get('displacement_cc'),
        payload.get('displacementCc'),
        engine_text,
        source_title,
    )
    if displacement <= 0:
        displacement = _safe_int(payload.get('displacement') or payload.get('displacement_cc'), default=0)

    est_retail_value = _safe_decimal(
        payload.get('est_retail_value')
        or payload.get('estRetailValue')
        or payload.get('retail_value'),
        default=Decimal('0'),
    )
    repair_cost = _safe_decimal(
        payload.get('repair_cost')
        or payload.get('repairCost')
        or payload.get('estimated_repair_cost'),
        default=Decimal('0'),
    )

    if not brand or not model:
        title_parts = [part for part in re.split(r'\s+', source_title) if part]
        if title_parts and len(title_parts[0]) == 4 and title_parts[0].isdigit():
            guessed_year = _safe_int(title_parts[0], default=year_from)
            if 1900 <= guessed_year <= 2100:
                year_from = guessed_year
            title_parts = title_parts[1:]
        if not brand and title_parts:
            brand = title_parts[0][:100]
            title_parts = title_parts[1:]
        if not model and title_parts:
            model = title_parts[0][:100]

    if not brand:
        brand = 'Unknown'
    if not model:
        model = 'Model'

    title = _safe_str(payload.get('clean_title') or payload.get('listing_title'), 200)
    if not title:
        title = f"{year_from} {brand} {model}".strip()
    title = title[:200] if title else "Imported from Copart"

    business_phone = getattr(getattr(user, 'business_profile', None), 'phone', '')
    phone = _safe_str(payload.get('phone') or business_phone, 20) or '0000000000'
    email = _safe_str(user.email, 254) or f"user{user.id}@kar.bg"

    country = _safe_str(payload.get('location_country') or payload.get('locationCountry'), 100)
    if not country:
        raw_country = _safe_str(payload.get('country') or 'Canada', 100)
        lowered_raw_country = raw_country.lower()
        if raw_country and lowered_raw_country not in {'bulgaria', 'българия'}:
            country = 'Извън страната'
        else:
            country = raw_country
    if not country:
        country = 'Извън страната'

    region = _safe_str(payload.get('region') or payload.get('province') or payload.get('state'), 100)
    city = _safe_str(payload.get('city'), 100) or 'Unknown'

    if city == 'Unknown' and region:
        city = region

    def append_if_value(label, raw_value, max_length=180):
        text = _safe_str(raw_value, max_length)
        if text:
            description_lines.append(f"{label}: {text}")

    description_lines = [
        "Imported automatically from Copart.",
    ]
    if source_url:
        description_lines.append(f"Source URL: {source_url}")
    if source_title and source_title.lower() != title.lower():
        description_lines.append(f"Original Copart title: {source_title}")
    append_if_value("Lot number", lot_number, max_length=80)
    append_if_value("VIN", vin, max_length=17)
    append_if_value("Odometer", odometer_text)
    append_if_value("Odometer status", odometer_status)
    append_if_value("Primary damage", primary_damage)
    append_if_value("Secondary damage", secondary_damage)
    append_if_value("Title type", title_type)
    append_if_value("Vehicle type", vehicle_type)
    append_if_value("Drive line", drive)
    append_if_value("Engine", engine_text)
    append_if_value("Cylinders", cylinders, max_length=40)
    append_if_value("Keys", keys_info, max_length=60)
    append_if_value("Run and drives", run_and_drives, max_length=80)
    append_if_value("Lot status", lot_status, max_length=120)
    append_if_value("Seller", seller, max_length=160)
    append_if_value("Sale date", sale_date, max_length=120)
    append_if_value("Sale name", sale_name, max_length=160)
    append_if_value("Highlights", highlights, max_length=220)
    if est_retail_value > 0:
        description_lines.append(f"Estimated retail value: {est_retail_value}")
    if repair_cost > 0:
        description_lines.append(f"Estimated repair cost: {repair_cost}")

    return {
        'main_category': '1',
        'category': _normalize_copart_category(
            payload.get('category')
            or payload.get('body_style')
            or payload.get('bodyStyle')
            or vehicle_type
        ),
        'title': title,
        'brand': brand,
        'model': model,
        'year_from': year_from,
        'vin': vin,
        'price': price,
        'location_country': country,
        'location_region': region,
        'city': city,
        'fuel': _normalize_copart_fuel(payload.get('fuel') or payload.get('engine_type') or engine_text),
        'gearbox': _normalize_copart_gearbox(payload.get('gearbox') or payload.get('transmission')),
        'mileage': mileage,
        'color': _safe_str(payload.get('color') or payload.get('exterior_color'), 50),
        'condition': _normalize_copart_condition(
            payload.get('condition') or primary_damage or secondary_damage or title_type
        ),
        'power': power if power > 0 else None,
        'displacement': displacement if displacement > 0 else None,
        'description': "\n".join(description_lines),
        'phone': phone,
        'email': email,
        'features': ['copart-import'],
        'is_draft': True,
        'is_active': True,
        'is_archived': False,
        'listing_type': 'normal',
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_private_user(request):
    """API endpoint for private user registration"""
    if request.method == 'POST':
        serializer = PrivateUserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                send_verification_email(user.user)
                return Response(
                    {
                        'message': 'Регистрацията е успешна. Изпратихме ти имейл за потвърждение.',
                        'email': serializer.validated_data['email'],
                        'verification_required': True,
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """API endpoint for user login"""
    identifier = request.data.get('email')
    password = request.data.get('password')
    normalized_email = _normalize_email(identifier)

    if not normalized_email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Primary login: email (case-insensitive). Fallback: username.
    candidate_users = list(User.objects.filter(email__iexact=normalized_email).order_by('id'))
    if not candidate_users:
        candidate_users = list(
            User.objects.filter(username__iexact=str(identifier).strip()).order_by('id')
        )

    user = None
    for user_obj in candidate_users:
        if not user_obj.check_password(password):
            continue
        if not user_obj.is_active:
            return Response(
            {'error': 'Акаунтът не е потвърден. Проверете пощата си.'},
            status=status.HTTP_403_FORBIDDEN
        )

        user = authenticate(username=user_obj.username, password=password)
        if user is not None:
            break

    if user is None:
        return Response(
            {'error': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    return _build_auth_success_response(request, user)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_request_code(request):
    """Start admin login by validating credentials and emailing an OTP code."""
    identifier = request.data.get('email')
    password = request.data.get('password')
    normalized_email = _normalize_email(identifier)

    if not normalized_email or not password:
        return Response(
            {'error': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    candidate_users = list(User.objects.filter(email__iexact=normalized_email).order_by('id'))
    if not candidate_users:
        candidate_users = list(
            User.objects.filter(username__iexact=str(identifier).strip()).order_by('id')
        )

    user = None
    for user_obj in candidate_users:
        if not user_obj.check_password(password):
            continue
        if not user_obj.is_active:
            return Response(
                {'error': 'Account is not verified.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(username=user_obj.username, password=password)
        if user is not None:
            break

    if user is None:
        return Response(
            {'error': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not (user.is_staff or user.is_superuser):
        return Response(
            {'error': 'Admin role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    cooldown_key = f"admin-login-cooldown:{user.id}"
    if cache.get(cooldown_key):
        return Response(
            {
                'error': 'Please wait before requesting a new code.',
                'retry_after': ADMIN_LOGIN_SEND_COOLDOWN_SECONDS,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    challenge_id = secrets.token_urlsafe(24)
    one_time_code = f"{secrets.randbelow(10 ** ADMIN_LOGIN_CODE_LENGTH):0{ADMIN_LOGIN_CODE_LENGTH}d}"
    code_hash = hashlib.sha256(f"{challenge_id}:{one_time_code}".encode("utf-8")).hexdigest()
    expires_at = int(time.time()) + ADMIN_LOGIN_CODE_TTL_SECONDS
    challenge_key = f"admin-login-challenge:{challenge_id}"
    cache.set(
        challenge_key,
        {
            'user_id': user.id,
            'code_hash': code_hash,
            'attempts_left': ADMIN_LOGIN_MAX_ATTEMPTS,
            'expires_at': expires_at,
        },
        timeout=ADMIN_LOGIN_CODE_TTL_SECONDS,
    )

    try:
        send_mail(
            "Kar.bg admin login code",
            (
                "Your one-time admin login code is:\n\n"
                f"{one_time_code}\n\n"
                f"It expires in {ADMIN_LOGIN_CODE_TTL_SECONDS // 60} minutes.\n"
                "If you did not request this code, ignore this email."
            ),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception:
        cache.delete(challenge_key)
        return Response(
            {'error': 'Failed to send the login code email.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    cache.set(cooldown_key, True, timeout=ADMIN_LOGIN_SEND_COOLDOWN_SECONDS)
    return Response(
        {
            'challenge_id': challenge_id,
            'masked_email': _mask_email(user.email),
            'expires_in_seconds': ADMIN_LOGIN_CODE_TTL_SECONDS,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_verify_code(request):
    """Verify admin OTP code and issue auth tokens."""
    challenge_id = str(request.data.get('challenge_id') or '').strip()
    code = str(request.data.get('code') or '').strip()

    if not challenge_id or not code:
        return Response(
            {'error': 'challenge_id and code are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not code.isdigit() or len(code) != ADMIN_LOGIN_CODE_LENGTH:
        return Response(
            {'error': 'Invalid code format.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    challenge_key = f"admin-login-challenge:{challenge_id}"
    challenge = cache.get(challenge_key)
    if not challenge:
        return Response(
            {'error': 'Code expired or invalid challenge.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now_ts = int(time.time())
    expires_at = int(challenge.get('expires_at') or 0)
    if expires_at and now_ts >= expires_at:
        cache.delete(challenge_key)
        return Response(
            {'error': 'Code expired. Request a new one.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    attempts_left = int(challenge.get('attempts_left') or 0)
    if attempts_left <= 0:
        cache.delete(challenge_key)
        return Response(
            {'error': 'Too many invalid attempts. Request a new code.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    expected_hash = str(challenge.get('code_hash') or '')
    provided_hash = hashlib.sha256(f"{challenge_id}:{code}".encode("utf-8")).hexdigest()
    if not secrets.compare_digest(expected_hash, provided_hash):
        attempts_left -= 1
        if attempts_left <= 0:
            cache.delete(challenge_key)
            return Response(
                {'error': 'Too many invalid attempts. Request a new code.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        remaining_seconds = max(1, expires_at - now_ts) if expires_at else ADMIN_LOGIN_CODE_TTL_SECONDS
        challenge['attempts_left'] = attempts_left
        cache.set(challenge_key, challenge, timeout=remaining_seconds)
        return Response(
            {
                'error': 'Invalid code.',
                'attempts_left': attempts_left,
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user_id = challenge.get('user_id')
    user = User.objects.filter(pk=user_id).first()
    if not user or not user.is_active:
        cache.delete(challenge_key)
        return Response(
            {'error': 'User account is invalid or inactive.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not (user.is_staff or user.is_superuser):
        cache.delete(challenge_key)
        return Response(
            {'error': 'Admin role required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    cache.delete(challenge_key)
    return _build_auth_success_response(request, user)


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """Refresh access token using HttpOnly refresh-token cookie."""
    refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if not refresh_token:
        # Temporary fallback for older clients still sending refresh in body.
        refresh_token = request.data.get('refresh')

    if not refresh_token:
        response = Response(
            {'error': 'Refresh token is missing.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        _clear_refresh_cookie(response)
        return response

    serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
    try:
        serializer.is_valid(raise_exception=True)
    except Exception:
        response = Response(
            {'error': 'Refresh token is invalid or expired.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        _clear_refresh_cookie(response)
        return response

    payload = serializer.validated_data
    next_access = payload.get('access')
    next_refresh = payload.get('refresh')

    response = Response({'access': next_access}, status=status.HTTP_200_OK)
    if next_refresh:
        _set_refresh_cookie(response, next_refresh)
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """API endpoint for user logout"""
    refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            pass

    response = Response(
        {'message': 'Logout successful'},
        status=status.HTTP_200_OK
    )
    _clear_refresh_cookie(response)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """API endpoint to get current user info"""
    user = request.user
    user_type = 'private'
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'created_at': user.date_joined,
    }

    if hasattr(user, 'business_profile'):
        user_type = 'business'
        user_data['username'] = user.business_profile.username
        if user.business_profile.profile_image:
            user_data['profile_image_url'] = request.build_absolute_uri(
                user.business_profile.profile_image.url
            )

    # Get user balance
    try:
        profile = UserProfile.objects.get(user=user)
        balance = float(profile.balance)
    except UserProfile.DoesNotExist:
        balance = 0.0

    return Response({
        'id': user.id,
        'email': user.email,
        'userType': user_type,
        'balance': balance,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_admin': bool(user.is_staff or user.is_superuser),
        **user_data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_business_user(request):
    """API endpoint for business user registration"""
    if request.method == 'POST':
        serializer = BusinessUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            send_verification_email(user.user)
            return Response(
                {
                    'message': 'Регистрацията е успешна. Изпратихме ти имейл за потвърждение.',
                    'dealer_name': serializer.validated_data['dealer_name'],
                    'username': serializer.validated_data['username'],
                    'verification_required': True,
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email е задължителен.'}, status=status.HTTP_400_BAD_REQUEST)

    email_normalized = str(email).strip().lower()
    cooldown_seconds = getattr(settings, 'PASSWORD_RESET_COOLDOWN_SECONDS', 60)
    cache_key = f"password-reset:{email_normalized}"
    if cache.get(cache_key):
        return Response(
            {
                'error': f'Моля, изчакай {cooldown_seconds} секунди преди нов опит.',
                'retry_after': cooldown_seconds,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    cache.set(cache_key, True, timeout=cooldown_seconds)

    user = User.objects.filter(email=email_normalized).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        base_url = settings.FRONTEND_BASE_URL.rstrip("/")
        reset_url = f"{base_url}/reset-password?uid={uid}&token={token}"
        subject = "Смяна на парола в Kar.bg"
        message = (
            "Здравейте,\n\n"
            "Получихме заявка за смяна на парола. Ако това сте вие, използвайте линка по-долу:\n"
            f"{reset_url}\n\n"
            "Ако не сте вие, игнорирайте този имейл.\n"
        )
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

    return Response(
        {'message': 'Ако този имейл съществува, ще получиш инструкции за смяна на парола.'},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not uidb64 or not token or not new_password:
        return Response({'error': 'Липсва информация за смяна на парола.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({'error': 'Невалиден линк за смяна на парола.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Линкът е невалиден или изтекъл.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response({'message': 'Паролата е сменена успешно.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request):
    uidb64 = request.query_params.get('uid')
    token = request.query_params.get('token')
    if not uidb64 or not token:
        return Response({'error': 'Невалиден линк за потвърждение.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response({'error': 'Невалиден линк за потвърждение.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.is_active:
        return Response({'message': 'Акаунтът вече е потвърден.'}, status=status.HTTP_200_OK)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'message': 'Акаунтът е потвърден успешно.'}, status=status.HTTP_200_OK)

    return Response({'error': 'Линкът е невалиден или изтекъл.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_balance(request):
    """API endpoint to get current user's balance"""
    try:
        profile = UserProfile.objects.get(user=request.user)
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for the current user."""
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not old_password or not new_password or not confirm_password:
        return Response({'error': 'Всички полета са задължителни.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != confirm_password:
        return Response({'error': 'Паролите не съвпадат.'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old_password):
        return Response({'error': 'Старата парола е грешна.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()
    return Response({'message': 'Паролата е сменена успешно.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_names(request):
    """Update the first/last name for the current user."""
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    if first_name is None:
        first_name = ''
    if last_name is None:
        last_name = ''
    first_name = str(first_name).strip()
    last_name = str(last_name).strip()

    if len(first_name) > 150 or len(last_name) > 150:
        return Response({'error': 'Името е твърде дълго.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.first_name = first_name
    request.user.last_name = last_name
    request.user.save()
    return Response(
        {'first_name': first_name, 'last_name': last_name},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Delete the current user's account."""
    password = request.data.get("password")
    if not password:
        return Response({'error': 'Паролата е задължителна.'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(password):
        return Response({'error': 'Паролата е грешна.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.delete()
    return Response({'message': 'Акаунтът е изтрит.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_import_api_key_status(request):
    """Get metadata for the current user's import API key."""
    if not _has_business_profile(request.user):
        return Response(
            {
                'has_key': False,
                'allowed': False,
                'reason': 'Only business accounts can use the import API.',
            },
            status=status.HTTP_200_OK,
        )

    api_key = UserImportApiKey.objects.filter(user=request.user).first()
    if not api_key:
        return Response({'has_key': False, 'allowed': True}, status=status.HTTP_200_OK)

    masked_suffix = '...' if api_key.key_prefix else ''
    return Response(
        {
            'has_key': True,
            'allowed': True,
            'key_prefix': api_key.key_prefix,
            'masked_key': f"{api_key.key_prefix}{masked_suffix}" if api_key.key_prefix else None,
            'created_at': api_key.created_at,
            'last_used_at': api_key.last_used_at,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_import_api_key(request):
    """Generate or rotate import API key for the current user."""
    if not _has_business_profile(request.user):
        return Response(
            {'error': 'Only business accounts can use the import API.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    max_attempts = 8
    for _ in range(max_attempts):
        raw_key = UserImportApiKey.generate_raw_key()
        try:
            api_key, _ = UserImportApiKey.objects.get_or_create(
                user=request.user,
                defaults={
                    'key_hash': UserImportApiKey.hash_key(raw_key),
                    'key_prefix': raw_key[:12],
                },
            )
            api_key.set_raw_key(raw_key)
            api_key.last_used_at = None
            api_key.save()
            return Response(
                {
                    'api_key': raw_key,
                    'key_prefix': api_key.key_prefix,
                    'created_at': api_key.created_at,
                    'last_used_at': api_key.last_used_at,
                },
                status=status.HTTP_200_OK,
            )
        except IntegrityError:
            continue

    return Response(
        {'error': 'Could not generate API key. Please try again.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_import_api_key(request):
    """Delete the current user's import API key."""
    deleted_count, _ = UserImportApiKey.objects.filter(user=request.user).delete()
    return Response({'deleted': bool(deleted_count)}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def import_copart_listing(request):
    """Import Copart listing into draft ad by using an API key."""
    started_at = time.perf_counter()
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    success = False
    error_message = ''
    api_key = None
    listing = None
    event_user = None

    try:
        raw_key = _extract_import_api_key(request)
        if not raw_key:
            status_code = status.HTTP_401_UNAUTHORIZED
            error_message = 'API key is missing.'
            return Response(
                {'error': 'API key is missing.'},
                status=status_code,
            )

        api_key = UserImportApiKey.objects.select_related('user').filter(
            key_hash=UserImportApiKey.hash_key(raw_key)
        ).first()
        if not api_key or not api_key.user.is_active:
            status_code = status.HTTP_401_UNAUTHORIZED
            error_message = 'API key is invalid.'
            return Response(
                {'error': 'API key is invalid.'},
                status=status_code,
            )

        event_user = api_key.user
        if not _has_business_profile(api_key.user):
            status_code = status.HTTP_403_FORBIDDEN
            error_message = 'Only business accounts can use the import API.'
            return Response(
                {'error': 'Only business accounts can use the import API.'},
                status=status_code,
            )

        from backend.listings.models import CarListing

        draft_payload = _build_copart_draft_payload(request.data, api_key.user)
        try:
            listing = CarListing.objects.create(
                user=api_key.user,
                **draft_payload,
            )
        except Exception as exc:
            status_code = status.HTTP_400_BAD_REQUEST
            error_message = str(exc)
            return Response(
                {'error': 'Could not import listing.', 'details': str(exc)},
                status=status_code,
            )

        uploaded_images = _attach_copart_images_to_listing(listing, request.data)
        api_key.mark_used()

        status_code = status.HTTP_201_CREATED
        success = True
        return Response(
            {
                'id': listing.id,
                'slug': listing.slug,
                'title': listing.title,
                'is_draft': listing.is_draft,
                'images_uploaded': uploaded_images,
                'message': 'Listing imported as draft.',
            },
            status=status_code,
        )
    except Exception as exc:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_message = str(exc)
        return Response(
            {'error': 'Unexpected import error.', 'details': str(exc)},
            status=status_code,
        )
    finally:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        _log_import_api_usage(
            request,
            api_key=api_key,
            user=event_user,
            listing=listing,
            status_code=status_code,
            success=success,
            error_message=error_message,
            duration_ms=duration_ms,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topup_balance(request):
    """API endpoint to top-up user balance"""
    try:
        amount = request.data.get('amount')

        # Validate amount
        if amount is None:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = float(amount)
            if amount <= 0:
                return Response(
                    {'error': 'Amount must be greater than 0'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if amount > 999999.99:
                return Response(
                    {'error': 'Amount exceeds maximum limit'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        # Update balance
        from decimal import Decimal
        profile.balance += Decimal(str(amount))
        profile.save()

        serializer = UserProfileSerializer(profile)
        return Response(
            {
                'message': 'Balance updated successfully',
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def list_dealers(request):
    """List all business users / dealers"""
    dealers = BusinessUser.objects.all().order_by('-created_at')
    serializer = DealerListSerializer(dealers, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def dealer_detail(request, pk):
    """Get a single dealer's full info + their listings"""
    try:
        dealer = BusinessUser.objects.get(pk=pk)
    except BusinessUser.DoesNotExist:
        return Response({'error': 'Dealer not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DealerDetailSerializer(dealer, context={'request': request})
    data = serializer.data

    # Include dealer's active listings
    from backend.listings.models import CarImage
    from backend.listings.serializers import CarListingSerializer
    cutoff = get_expiry_cutoff()
    image_prefetch = Prefetch(
        'images',
        queryset=CarImage.objects.only(
            'id',
            'image',
            'thumbnail',
            'renditions',
            'original_width',
            'original_height',
            'low_res',
            'order',
            'is_cover',
            'listing_id',
        ).order_by('-is_cover', 'order', 'id')
    )
    listings = dealer.user.car_listings.filter(
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).prefetch_related(image_prefetch).order_by('-created_at')
    listings_data = CarListingSerializer(listings, many=True, context={'request': request}).data
    data['listings'] = listings_data

    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_photo(request):
    """Upload profile photo for business users (downscaled to 160x160)"""
    user = request.user
    if not hasattr(user, 'business_profile'):
        return Response(
            {'error': 'Only business users can upload a profile photo'},
            status=status.HTTP_403_FORBIDDEN
        )
    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        business = user.business_profile
        # Delete old image if exists
        if business.profile_image:
            business.profile_image.delete(save=False)
        business.profile_image = image
        business.save()  # save() handles downscaling

        image_url = request.build_absolute_uri(business.profile_image.url) if business.profile_image else None
        return Response({'profile_image_url': image_url}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_about(request):
    """Update the about_text for business users"""
    user = request.user
    if not hasattr(user, 'business_profile'):
        return Response(
            {'error': 'Only business users can update about text'},
            status=status.HTTP_403_FORBIDDEN
        )

    about_text = request.data.get('about_text', '')
    business = user.business_profile
    business.about_text = about_text
    business.save()

    return Response({'about_text': business.about_text}, status=status.HTTP_200_OK)
