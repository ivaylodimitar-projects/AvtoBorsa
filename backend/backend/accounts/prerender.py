import hashlib
import io
import json
import re
import unicodedata
import urllib.error
import urllib.request
from html import escape
from urllib.parse import quote

from django.conf import settings
from django.http import HttpResponse
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date, parse_http_date_safe, quote_etag
from PIL import Image, ImageDraw, ImageFont, ImageOps
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from backend.listings.models import get_expiry_cutoff

from .models import BusinessUser

PRERENDER_PUBLIC_CACHE_SECONDS = 300
PRERENDER_PUBLIC_STALE_SECONDS = 900
PRERENDER_BOT_SIGNATURES = (
    "googlebot",
    "bingbot",
    "duckduckbot",
    "applebot",
    "perplexitybot",
    "gptbot",
    "claudebot",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "whatsapp",
)

_CARD_WIDTH = 1200
_CARD_HEIGHT = 630
_CARD_PADDING = 56
_LANCZOS = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.LANCZOS


def _trim_to_value(value, fallback=""):
    normalized = str(value or "").strip()
    return normalized or fallback


def _resolve_site_name():
    return _trim_to_value(
        getattr(settings, "SITE_NAME", "") or getattr(settings, "SEO_SITE_NAME", ""),
        fallback="Kar.bg",
    )


def _resolve_frontend_base_url():
    configured = _trim_to_value(getattr(settings, "FRONTEND_BASE_URL", ""))
    if configured:
        return configured.rstrip("/")
    return "https://www.kar.bg"


def _resolve_backend_base_url(request):
    configured = _trim_to_value(getattr(settings, "BACKEND_BASE_URL", ""))
    if configured:
        return configured.rstrip("/")
    return request.build_absolute_uri("/").rstrip("/")


def _slugify_dealer_segment(value):
    normalized = unicodedata.normalize("NFKC", str(value or "")).strip().lower()
    cleaned = "".join(
        char for char in normalized if char.isalnum() or char.isspace() or char == "-"
    )
    compact = re.sub(r"\s+", "-", cleaned)
    compact = re.sub(r"-{2,}", "-", compact).strip("-")
    return compact or "dealer"


def _is_supported_prerender_bot(user_agent):
    normalized = _trim_to_value(user_agent).lower()
    if not normalized:
        return False
    return any(signature in normalized for signature in PRERENDER_BOT_SIGNATURES)


def _if_none_match_matches(request, current_etag):
    raw_header = request.headers.get("If-None-Match")
    if not raw_header:
        return False

    def normalize_tag(tag):
        normalized = str(tag or "").strip()
        if normalized.startswith("W/"):
            normalized = normalized[2:].strip()
        if normalized.startswith('"') and normalized.endswith('"') and len(normalized) >= 2:
            normalized = normalized[1:-1]
        return normalized

    candidate = normalize_tag(current_etag)
    if not candidate:
        return False

    for header_part in raw_header.split(","):
        normalized = normalize_tag(header_part)
        if not normalized:
            continue
        if normalized == "*":
            return True
        if normalized == candidate:
            return True
    return False


def _fetch_image_from_url(url, timeout=6, mode="RGB"):
    value = _trim_to_value(url)
    if not value:
        return None

    request = urllib.request.Request(
        value,
        headers={"User-Agent": "Kar.bg Prerender/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None

    try:
        with Image.open(io.BytesIO(payload)) as image:
            if mode:
                return image.convert(mode)
            return image.copy()
    except Exception:
        return None


def _resolve_dealer_profile_image_url(request, dealer, frontend_base_url):
    if not getattr(dealer, "profile_image", None):
        return ""
    try:
        image_url = _trim_to_value(dealer.profile_image.url)
    except Exception:
        image_url = _trim_to_value(getattr(dealer.profile_image, "name", ""))

    if not image_url:
        return ""
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    if image_url.startswith("/"):
        return request.build_absolute_uri(image_url)
    return f"{frontend_base_url}/{image_url.lstrip('/')}"


def _get_active_listing_count(dealer):
    cutoff = get_expiry_cutoff()
    return dealer.user.car_listings.filter(
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff,
    ).count()


def _resolve_dealer_by_slug(dealer_slug):
    target_slug = _slugify_dealer_segment(dealer_slug)
    dealer_rows = (
        BusinessUser.objects.select_related("user")
        .only(
            "id",
            "dealer_name",
            "city",
            "address",
            "phone",
            "email",
            "website",
            "description",
            "about_text",
            "profile_image",
            "created_at",
            "updated_at",
            "user_id",
            "user__id",
            "user__email",
        )
        .order_by("id")
    )

    for dealer in dealer_rows:
        if _slugify_dealer_segment(dealer.dealer_name) == target_slug:
            return dealer, target_slug
    return None, target_slug


def _build_dealer_etag(dealer, slug_value, listing_count):
    fingerprint = {
        "id": dealer.id,
        "slug": slug_value,
        "dealer_name": _trim_to_value(dealer.dealer_name),
        "city": _trim_to_value(dealer.city),
        "address": _trim_to_value(dealer.address),
        "phone": _trim_to_value(dealer.phone),
        "email": _trim_to_value(dealer.email),
        "website": _trim_to_value(dealer.website),
        "profile_image_name": _trim_to_value(getattr(dealer.profile_image, "name", "")),
        "listing_count": int(listing_count or 0),
        "updated_at": int(dealer.updated_at.timestamp()) if dealer.updated_at else 0,
        "created_at": int(dealer.created_at.timestamp()) if dealer.created_at else 0,
    }
    digest = hashlib.sha256(
        json.dumps(fingerprint, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return quote_etag(digest[:32])


def _load_font(font_size, bold=False):
    font_candidates = []
    if bold:
        font_candidates.extend(
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/segoeuib.ttf",
            ]
        )
    else:
        font_candidates.extend(
            [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/segoeui.ttf",
            ]
        )

    for candidate in font_candidates:
        try:
            return ImageFont.truetype(candidate, font_size)
        except OSError:
            continue
    return ImageFont.load_default()


def _wrap_text(draw, text, font, max_width, max_lines):
    words = [word for word in str(text or "").split() if word]
    if not words:
        return []

    lines = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
            continue
        lines.append(current)
        current = word
    lines.append(current)

    if len(lines) <= max_lines:
        return lines

    clipped = lines[:max_lines]
    while clipped and draw.textlength(f"{clipped[-1]}...", font=font) > max_width:
        trimmed = clipped[-1].rstrip()
        if not trimmed:
            break
        clipped[-1] = trimmed[:-1]
    clipped[-1] = f"{clipped[-1].rstrip()}..."
    return clipped


def _render_dealer_card_image(request, dealer, dealer_slug, listing_count):
    frontend_base_url = _resolve_frontend_base_url()
    canvas = Image.new("RGB", (_CARD_WIDTH, _CARD_HEIGHT), "#ffffff")
    draw = ImageDraw.Draw(canvas, "RGBA")

    draw.rounded_rectangle(
        [_CARD_PADDING, _CARD_PADDING, _CARD_WIDTH - _CARD_PADDING, _CARD_HEIGHT - _CARD_PADDING],
        radius=30,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255),
        width=2,
    )
    draw.rounded_rectangle(
        [_CARD_PADDING, _CARD_PADDING, _CARD_PADDING + 16, _CARD_HEIGHT - _CARD_PADDING],
        radius=10,
        fill=(15, 118, 110, 255),
    )

    title_font = _load_font(62, bold=True)
    subtitle_font = _load_font(30, bold=False)
    info_font = _load_font(25, bold=False)
    desc_font = _load_font(22, bold=False)
    badge_font = _load_font(23, bold=True)

    left_x = _CARD_PADDING + 36
    logo_anchor_x = _CARD_PADDING + 44
    logo_bottom_y = _CARD_PADDING + 24
    logo = None
    for logo_url in (f"{frontend_base_url}/karbglogo.png", "https://www.kar.bg/karbglogo.png"):
        logo = _fetch_image_from_url(logo_url, mode="RGBA")
        if logo is not None:
            break

    if logo is not None:
        max_logo_width = 250
        max_logo_height = 92
        scale = min(max_logo_width / logo.width, max_logo_height / logo.height, 1.0)
        logo_size = (
            max(1, int(logo.width * scale)),
            max(1, int(logo.height * scale)),
        )
        logo = logo.resize(logo_size, _LANCZOS)
        logo_x = logo_anchor_x
        logo_y = _CARD_PADDING + 18
        logo_box = [logo_x - 12, logo_y - 8, logo_x + logo_size[0] + 12, logo_y + logo_size[1] + 8]
        draw.rounded_rectangle(
            logo_box,
            radius=14,
            fill=(248, 250, 252, 255),
            outline=(226, 232, 240, 255),
            width=1,
        )
        canvas.paste(logo, (logo_x, logo_y), logo if logo.mode == "RGBA" else None)
        logo_bottom_y = logo_y + logo_size[1]
    else:
        logo_fallback_font = _load_font(44, bold=True)
        logo_fallback_y = _CARD_PADDING + 24
        draw.text((logo_anchor_x, logo_fallback_y), "kar.bg", font=logo_fallback_font, fill=(15, 118, 110, 255))
        logo_bottom_y = logo_fallback_y + logo_fallback_font.size

    title_lines = _wrap_text(draw, dealer.dealer_name, title_font, max_width=610, max_lines=2)
    title_y = max(_CARD_PADDING + 78, logo_bottom_y + 16)
    for line in title_lines:
        draw.text((left_x, title_y), line, font=title_font, fill=(15, 23, 42, 255))
        title_y += title_font.size + 10

    city_label = _trim_to_value(getattr(dealer, "city", ""), fallback="България")
    listings_label = f"{int(listing_count)} активни обяви" if listing_count else "Нови обяви"
    draw.text(
        (left_x, title_y + 2),
        f"{city_label} | {listings_label}",
        font=subtitle_font,
        fill=(71, 85, 105, 255),
    )

    info_y = title_y + 72

    def _draw_info_chip(text_value, x, y):
        chip_bbox = draw.textbbox((0, 0), text_value, font=badge_font)
        chip_w = (chip_bbox[2] - chip_bbox[0]) + 28
        chip_h = (chip_bbox[3] - chip_bbox[1]) + 16
        draw.rounded_rectangle(
            [x, y, x + chip_w, y + chip_h],
            radius=16,
            fill=(236, 253, 245, 255),
            outline=(153, 246, 228, 255),
            width=1,
        )
        draw.text((x + 14, y + 8), text_value, font=badge_font, fill=(15, 118, 110, 255))
        return chip_w

    chip_x = left_x
    first_chip_w = _draw_info_chip(f"Обяви: {int(listing_count)}", chip_x, info_y)
    _draw_info_chip(f"Град: {city_label}", chip_x + first_chip_w + 10, info_y)

    info_rows = []
    address_label = _trim_to_value(getattr(dealer, "address", ""))
    if address_label:
        info_rows.append(f"Адрес: {address_label}")
    phone_label = _trim_to_value(getattr(dealer, "phone", ""))
    if phone_label:
        info_rows.append(f"Телефон: {phone_label}")
    email_label = _trim_to_value(getattr(dealer, "email", ""))
    if email_label:
        info_rows.append(f"Имейл: {email_label}")
    website_label = _trim_to_value(getattr(dealer, "website", ""))
    if website_label:
        info_rows.append(f"Уебсайт: {website_label}")

    current_info_y = info_y + 66
    for row in info_rows[:4]:
        max_lines = 2 if row.startswith("Адрес:") else 1
        row_lines = _wrap_text(draw, row, info_font, max_width=630, max_lines=max_lines)
        for line in row_lines:
            draw.text((left_x, current_info_y), line, font=info_font, fill=(30, 41, 59, 255))
            current_info_y += info_font.size + 6
        current_info_y += 2

    desc_source = _trim_to_value(getattr(dealer, "about_text", "")) or _trim_to_value(
        getattr(dealer, "description", "")
    )
    if desc_source:
        description_lines = _wrap_text(draw, desc_source, desc_font, max_width=630, max_lines=2)
        desc_y = min(current_info_y + 2, _CARD_HEIGHT - 150)
        for line in description_lines:
            draw.text((left_x, desc_y), line, font=desc_font, fill=(100, 116, 139, 255))
            desc_y += desc_font.size + 6

    badge_text = f"www.kar.bg/dealers/{dealer_slug}"
    badge_bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    badge_width = (badge_bbox[2] - badge_bbox[0]) + 34
    badge_height = (badge_bbox[3] - badge_bbox[1]) + 18
    badge_x = left_x
    badge_y = _CARD_HEIGHT - 122
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_width, badge_y + badge_height],
        radius=18,
        fill=(15, 118, 110, 255),
        outline=(15, 148, 136, 255),
        width=1,
    )
    draw.text((badge_x + 17, badge_y + 9), badge_text, font=badge_font, fill=(255, 255, 255, 255))

    photo_box = (772, 172, 1074, 506)
    draw.rounded_rectangle(
        photo_box,
        radius=28,
        fill=(248, 250, 252, 255),
        outline=(203, 213, 225, 255),
        width=2,
    )

    fallback_box = (
        photo_box[0] + 10,
        photo_box[1] + 10,
        photo_box[2] - 10,
        photo_box[3] - 10,
    )
    dealer_photo_url = _resolve_dealer_profile_image_url(request, dealer, frontend_base_url)
    dealer_photo = _fetch_image_from_url(dealer_photo_url)
    if dealer_photo is not None:
        photo_w = fallback_box[2] - fallback_box[0]
        photo_h = fallback_box[3] - fallback_box[1]
        fitted = ImageOps.fit(dealer_photo, (photo_w, photo_h), method=_LANCZOS, centering=(0.5, 0.5))
        mask = Image.new("L", (photo_w, photo_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, photo_w, photo_h], radius=22, fill=255)
        canvas.paste(fitted, (fallback_box[0], fallback_box[1]), mask)
    else:
        draw.rounded_rectangle(fallback_box, radius=22, fill=(226, 232, 240, 255))
        avatar_radius = 92
        avatar_cx = (fallback_box[0] + fallback_box[2]) // 2
        avatar_cy = (fallback_box[1] + fallback_box[3]) // 2 - 8
        draw.ellipse(
            [
                avatar_cx - avatar_radius,
                avatar_cy - avatar_radius,
                avatar_cx + avatar_radius,
                avatar_cy + avatar_radius,
            ],
            fill=(15, 118, 110, 255),
            outline=(15, 148, 136, 255),
            width=4,
        )

        initial_font = _load_font(118, bold=True)
        initial = _trim_to_value(dealer.dealer_name, fallback="D")[0].upper()
        initial_bbox = draw.textbbox((0, 0), initial, font=initial_font)
        initial_w = initial_bbox[2] - initial_bbox[0]
        initial_h = initial_bbox[3] - initial_bbox[1]
        initial_x = avatar_cx - (initial_w / 2)
        initial_y = avatar_cy - (initial_h / 2) - 8
        draw.text((initial_x, initial_y), initial, font=initial_font, fill=(255, 255, 255, 255))

    return canvas.convert("RGB")


@api_view(["GET"])
@permission_classes([AllowAny])
def prerender_dealer_card(request, dealer_slug):
    dealer, normalized_slug = _resolve_dealer_by_slug(dealer_slug)
    if dealer is None:
        return HttpResponse("Dealer not found.", status=404, content_type="text/plain; charset=utf-8")

    listing_count = _get_active_listing_count(dealer)
    card_etag = _build_dealer_etag(dealer, normalized_slug, listing_count)
    last_modified = dealer.updated_at or dealer.created_at
    last_modified_value = http_date(last_modified.timestamp()) if last_modified else None

    if card_etag and _if_none_match_matches(request, card_etag):
        response = HttpResponse(status=304)
        response["ETag"] = card_etag
        if last_modified_value:
            response["Last-Modified"] = last_modified_value
        response["Cache-Control"] = (
            f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
            f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
        )
        patch_vary_headers(response, ("Accept", "User-Agent"))
        return response

    if last_modified and not request.headers.get("If-None-Match"):
        if_modified_since = parse_http_date_safe(request.headers.get("If-Modified-Since") or "")
        if if_modified_since is not None and int(last_modified.timestamp()) <= int(if_modified_since):
            response = HttpResponse(status=304)
            if card_etag:
                response["ETag"] = card_etag
            if last_modified_value:
                response["Last-Modified"] = last_modified_value
            response["Cache-Control"] = (
                f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
                f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
            )
            patch_vary_headers(response, ("Accept", "User-Agent"))
            return response

    card_image = _render_dealer_card_image(request, dealer, normalized_slug, listing_count)
    image_buffer = io.BytesIO()
    card_image.save(image_buffer, format="JPEG", quality=90, optimize=True, progressive=True)

    response = HttpResponse(image_buffer.getvalue(), content_type="image/jpeg")
    response["Cache-Control"] = (
        f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
        f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
    )
    if card_etag:
        response["ETag"] = card_etag
    if last_modified_value:
        response["Last-Modified"] = last_modified_value
    patch_vary_headers(response, ("Accept", "User-Agent"))
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def prerender_dealer(request, dealer_slug):
    user_agent = request.headers.get("User-Agent", "")
    force_mode = str(request.query_params.get("force") or "").strip().lower() in {"1", "true", "yes"}
    bot_detected = _is_supported_prerender_bot(user_agent)

    if not bot_detected and not force_mode:
        return HttpResponse(
            "Prerender endpoint is reserved for crawler user-agents.",
            status=403,
            content_type="text/plain; charset=utf-8",
        )

    dealer, normalized_slug = _resolve_dealer_by_slug(dealer_slug)
    if dealer is None:
        return HttpResponse("Dealer not found.", status=404, content_type="text/plain; charset=utf-8")

    site_name = _resolve_site_name()
    frontend_base_url = _resolve_frontend_base_url()
    backend_base_url = _resolve_backend_base_url(request)
    listing_count = _get_active_listing_count(dealer)
    canonical_path = f"/dealers/{quote(normalized_slug, safe='-_~')}"
    canonical_url = f"{frontend_base_url}{canonical_path}"

    title_value = f"{dealer.dealer_name} | Дилър в {site_name}"
    description_value = (
        f"Официална страница на автокъща {dealer.dealer_name} в {dealer.city}. "
        f"Разгледай {listing_count} активни обяви в {site_name}."
    )

    share_signature = f"{int((dealer.updated_at or dealer.created_at).timestamp())}-{listing_count}"
    og_image = (
        f"{backend_base_url}/prerender/dealer-card/{quote(normalized_slug, safe='-_~')}/"
        f"?v={quote(share_signature, safe='-_~')}"
    )

    dealer_etag = _build_dealer_etag(dealer, normalized_slug, listing_count)
    last_modified = dealer.updated_at or dealer.created_at
    last_modified_value = http_date(last_modified.timestamp()) if last_modified else None

    if dealer_etag and _if_none_match_matches(request, dealer_etag):
        response = HttpResponse(status=304)
        response["ETag"] = dealer_etag
        if last_modified_value:
            response["Last-Modified"] = last_modified_value
        response["Cache-Control"] = (
            f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
            f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
        )
        patch_vary_headers(response, ("User-Agent",))
        return response

    if last_modified and not request.headers.get("If-None-Match"):
        if_modified_since = parse_http_date_safe(request.headers.get("If-Modified-Since") or "")
        if if_modified_since is not None and int(last_modified.timestamp()) <= int(if_modified_since):
            response = HttpResponse(status=304)
            if dealer_etag:
                response["ETag"] = dealer_etag
            if last_modified_value:
                response["Last-Modified"] = last_modified_value
            response["Cache-Control"] = (
                f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
                f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
            )
            patch_vary_headers(response, ("User-Agent",))
            return response

    dealer_schema = {
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        "name": dealer.dealer_name,
        "url": canonical_url,
        "image": og_image,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": _trim_to_value(dealer.city, fallback="България"),
        },
        "description": description_value,
    }
    dealer_schema_json = json.dumps(dealer_schema, ensure_ascii=False)

    html_document = f"""<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title_value)}</title>
  <meta name="description" content="{escape(description_value)}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="{escape(canonical_url)}" />
  <meta property="og:site_name" content="{escape(site_name)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="{escape(title_value)}" />
  <meta property="og:description" content="{escape(description_value)}" />
  <meta property="og:url" content="{escape(canonical_url)}" />
  <meta property="og:image" content="{escape(og_image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{escape(f'Визитка на автокъща {dealer.dealer_name}')}"/>
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{escape(title_value)}" />
  <meta name="twitter:description" content="{escape(description_value)}" />
  <meta name="twitter:image" content="{escape(og_image)}" />
  <script type="application/ld+json">{dealer_schema_json}</script>
</head>
<body>
  <main>
    <h1>{escape(dealer.dealer_name)}</h1>
    <p>{escape(description_value)}</p>
    <img src="{escape(og_image)}" alt="{escape(f'Визитка на автокъща {dealer.dealer_name}')}" />
  </main>
</body>
</html>
"""

    response = HttpResponse(html_document, content_type="text/html; charset=utf-8")
    response["Cache-Control"] = (
        f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
        f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
    )
    response["X-Prerender-Bot-Detected"] = "1" if bot_detected else "0"
    if dealer_etag:
        response["ETag"] = dealer_etag
    if last_modified_value:
        response["Last-Modified"] = last_modified_value
    patch_vary_headers(response, ("User-Agent",))
    return response
