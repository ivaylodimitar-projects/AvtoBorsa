from decimal import Decimal
from datetime import timedelta
import hashlib

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db import transaction as db_transaction
from django.db.models import Q, OuterRef, Subquery, Case, When, Value, IntegerField, F
from django.db.models import Prefetch
from django.db.models.functions import Substr, Coalesce
from django.core.cache import cache
from django.utils.cache import patch_cache_control, patch_vary_headers
from django.utils import timezone
from backend.accounts.models import UserProfile
from .models import CarListing, CarImage, Favorite, CarListingPriceHistory, get_expiry_cutoff, TOP_LISTING_DURATION_DAYS
from .serializers import (
    CarListingSerializer,
    CarListingLiteSerializer,
    CarListingListSerializer,
    CarListingSearchCompactSerializer,
    CarImageSerializer,
    FavoriteSerializer,
)


TOP_LISTING_PRICE_EUR = Decimal("3.00")
LISTINGS_PUBLIC_CACHE_SECONDS = 30
LISTINGS_PUBLIC_STALE_SECONDS = 120
TOP_DEMOTION_MIN_INTERVAL_SECONDS = 60
TOP_DEMOTION_LOCK_KEY = "listings:demote-expired-top:lock"
LATEST_LISTINGS_CACHE_SECONDS = 30
LATEST_LISTINGS_CACHE_KEY = "listings:latest:v2"


class ListingsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 20

    def get_page_size(self, request):
        page_size = super().get_page_size(request)
        if page_size is None:
            limit = request.query_params.get("limit")
            if limit is not None:
                try:
                    page_size = int(limit)
                except (TypeError, ValueError):
                    page_size = None
        if page_size is None:
            return self.page_size
        if self.max_page_size:
            return max(1, min(page_size, self.max_page_size))
        return max(1, page_size)


def _demote_expired_top_listings():
    """Ensure expired top listings are demoted to normal."""
    if not cache.add(TOP_DEMOTION_LOCK_KEY, 1, TOP_DEMOTION_MIN_INTERVAL_SECONDS):
        return 0
    return CarListing.demote_expired_top_listings()


def _charge_top_listing_fee(user):
    """Charge the top listing fee from the user's wallet."""
    with db_transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        if profile.balance < TOP_LISTING_PRICE_EUR:
            raise ValidationError("Недостатъчни средства")
        profile.balance -= TOP_LISTING_PRICE_EUR
        profile.save(update_fields=["balance"])
        return profile


def _apply_top_listing_window(listing, now=None):
    """Set a fresh 14-day top window on the listing."""
    current = now or timezone.now()
    listing.listing_type = "top"
    listing.top_paid_at = current
    listing.top_expires_at = current + timedelta(days=TOP_LISTING_DURATION_DAYS)


def _clear_top_listing_window(listing):
    """Remove top status timing fields from the listing."""
    listing.top_paid_at = None
    listing.top_expires_at = None


def _is_business_user(user):
    """Return True when the account is a business profile."""
    return hasattr(user, "business_profile")


def _set_public_cache_headers(response, max_age=LISTINGS_PUBLIC_CACHE_SECONDS):
    response["Cache-Control"] = (
        f"public, max-age={max_age}, stale-while-revalidate={LISTINGS_PUBLIC_STALE_SECONDS}"
    )


class CarListingViewSet(viewsets.ModelViewSet):
    """ViewSet for car listings"""
    serializer_class = CarListingSerializer
    parser_classes = (MultiPartParser, FormParser)
    pagination_class = ListingsPagination

    def _build_public_cache_key(self):
        # Normalize params so query param order does not fragment cache keys.
        normalized_parts = []
        for key in sorted(self.request.query_params.keys()):
            values = self.request.query_params.getlist(key)
            for value in sorted(values):
                normalized_parts.append(f"{key}={value}")
        normalized_query = "&".join(normalized_parts)
        digest = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
        return f"listings:list:v1:{digest}"

    def _set_list_cache_headers(self, response):
        patch_vary_headers(response, ("Authorization",))
        if self.request.user.is_authenticated:
            patch_cache_control(response, private=True, no_cache=True, no_store=True, max_age=0)
            return
        _set_public_cache_headers(response, max_age=LISTINGS_PUBLIC_CACHE_SECONDS)

    def list(self, request, *args, **kwargs):
        cache_key = None
        if not request.user.is_authenticated:
            cache_key = self._build_public_cache_key()
            cached_payload = cache.get(cache_key)
            if cached_payload is not None:
                response = Response(cached_payload, status=status.HTTP_200_OK)
                self._set_list_cache_headers(response)
                response["X-Listings-Cache"] = "HIT"
                return response

        response = super().list(request, *args, **kwargs)

        if cache_key and response.status_code == status.HTTP_200_OK:
            cache.set(cache_key, response.data, LISTINGS_PUBLIC_CACHE_SECONDS)
            response["X-Listings-Cache"] = "MISS"

        self._set_list_cache_headers(response)
        return response

    def get_serializer_class(self):
        """Use a lightweight serializer when requested."""
        if self.action == "list":
            lite = (self.request.query_params.get("lite") or "").lower()
            if lite in {"1", "true", "yes"}:
                return CarListingLiteSerializer
            compact = (self.request.query_params.get("compact") or "").lower()
            if compact in {"1", "true", "yes"}:
                return CarListingSearchCompactSerializer
            return CarListingListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        """Get listings based on user and filters"""
        _demote_expired_top_listings()
        cutoff = get_expiry_cutoff()
        queryset = CarListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        )
        queryset = queryset.annotate(
            top_rank=Case(
                When(listing_type='top', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        latest_price_change = CarListingPriceHistory.objects.filter(
            listing=OuterRef('pk')
        ).order_by('-changed_at')
        queryset = queryset.annotate(
            last_price_change_delta=Subquery(latest_price_change.values('delta')[:1]),
            last_price_change_at=Subquery(latest_price_change.values('changed_at')[:1]),
        )

        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Search filters
        main_category = (
            self.request.query_params.get('main_category')
            or self.request.query_params.get('mainCategory')
        )
        if main_category:
            allowed_main_categories = {key for key, _ in CarListing.MAIN_CATEGORY_CHOICES}
            label_to_main_category = {
                label: key for key, label in CarListing.MAIN_CATEGORY_CHOICES
            }
            main_category_key = (
                main_category
                if main_category in allowed_main_categories
                else label_to_main_category.get(main_category, main_category)
            )
            queryset = queryset.filter(main_category=main_category_key)

        def get_param(*keys):
            for key in keys:
                value = self.request.query_params.get(key)
                if value not in (None, ""):
                    return value
            return None

        def to_int(value):
            try:
                return int(str(value))
            except (TypeError, ValueError):
                return None

        def to_float(value):
            try:
                return float(str(value))
            except (TypeError, ValueError):
                return None

        brand = get_param('brand', 'marka')
        model = get_param('model')

        # Price filters
        price_from = to_float(get_param('priceFrom'))
        if price_from is not None:
            queryset = queryset.filter(price__gte=price_from)

        price_to = to_float(get_param('priceTo'))
        if price_to is not None:
            queryset = queryset.filter(price__lte=price_to)

        max_price = to_float(get_param('maxPrice', 'price1'))
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        # Year filters
        year_from = to_int(get_param('yearFrom', 'year'))
        if year_from is not None:
            queryset = queryset.filter(year_from__gte=year_from)

        year_to = to_int(get_param('yearTo'))
        if year_to is not None:
            queryset = queryset.filter(year_from__lte=year_to)

        if main_category in {'6', '7'} and brand:
            related_name = 'agri_details__equipment_type' if main_category == '6' else 'industrial_details__equipment_type'
            queryset = queryset.filter(**{f'{related_name}__icontains': brand})
        elif main_category == 'v' and brand:
            queryset = queryset.filter(accessories_details__accessory_category__icontains=brand)
        elif brand:
            queryset = queryset.filter(brand__icontains=brand)

        if model:
            queryset = queryset.filter(model__icontains=model)

        # Location filters
        region = get_param('region', 'locat')
        if region:
            if region in {'България', 'Извън страната'}:
                # Support country-level filters for classifieds-style categories.
                queryset = queryset.filter(location_country__icontains=region)
            else:
                # Keep compatibility with records that store the region either in
                # location_region (preferred) or location_country (legacy data/UI).
                queryset = queryset.filter(
                    Q(location_region__icontains=region) | Q(location_country__icontains=region)
                )
        city = get_param('city', 'locatc')
        if city:
            queryset = queryset.filter(city__icontains=city)

        # Fuel / engine type filters
        fuel = get_param('fuel')
        if fuel:
            if main_category == '3':
                queryset = queryset.filter(buses_details__engine_type__icontains=fuel)
            elif main_category == '4':
                queryset = queryset.filter(trucks_details__engine_type__icontains=fuel)
            elif main_category == '5':
                queryset = queryset.filter(moto_details__engine_type__icontains=fuel)
            elif main_category == '8':
                queryset = queryset.filter(forklift_details__engine_type__icontains=fuel)
            elif main_category == 'a':
                queryset = queryset.filter(boats_details__engine_type__icontains=fuel)
            else:
                fuel_mapping = {
                    'Бензин': 'benzin',
                    'Дизел': 'dizel',
                    'Газ/Бензин': 'gaz_benzin',
                    'Хибрид': 'hibrid',
                    'Електро': 'elektro',
                    'benzin': 'benzin',
                    'dizel': 'dizel',
                    'gaz_benzin': 'gaz_benzin',
                    'hibrid': 'hibrid',
                    'elektro': 'elektro',
                }
                fuel_key = fuel_mapping.get(fuel, fuel)
                queryset = queryset.filter(fuel=fuel_key)

        transmission = get_param('transmission')
        if transmission:
            if main_category == '3':
                queryset = queryset.filter(buses_details__transmission__icontains=transmission)
            elif main_category == '4':
                queryset = queryset.filter(trucks_details__transmission__icontains=transmission)
            elif main_category == '5':
                queryset = queryset.filter(moto_details__transmission__icontains=transmission)

        gearbox = get_param('gearbox')
        if gearbox:
            gearbox_mapping = {
                'Ръчна': 'ruchna',
                'Автоматик': 'avtomatik',
                'ruchna': 'ruchna',
                'avtomatik': 'avtomatik',
            }
            gearbox_key = gearbox_mapping.get(gearbox, gearbox)
            queryset = queryset.filter(gearbox=gearbox_key)

        # Mileage filters
        mileage_from = to_int(get_param('mileageFrom'))
        if mileage_from is not None:
            queryset = queryset.filter(mileage__gte=mileage_from)
        mileage_to = to_int(get_param('mileageTo'))
        if mileage_to is not None:
            queryset = queryset.filter(mileage__lte=mileage_to)

        # Engine/Power filters
        engine_from = to_int(get_param('engineFrom'))
        if engine_from is not None:
            queryset = queryset.filter(power__gte=engine_from)
        engine_to = to_int(get_param('engineTo'))
        if engine_to is not None:
            queryset = queryset.filter(power__lte=engine_to)

        color = get_param('color')
        if color:
            queryset = queryset.filter(color__icontains=color)

        condition = get_param('condition')
        nup = get_param('nup')
        if condition:
            condition_mapping = {
                'Нов': '0',
                'Употребяван': '1',
                'Повреден/ударен': '2',
                'За части': '3',
                '0': '0',
                '1': '1',
                '2': '2',
                '3': '3',
            }
            condition_key = condition_mapping.get(condition, condition)
            queryset = queryset.filter(condition=condition_key)
        elif nup:
            # mobile.bg-compatible state mask:
            # 1=new, 0=used, 3=damaged, 2=for parts
            nup_to_condition = {
                '1': '0',
                '0': '1',
                '3': '2',
                '2': '3',
            }
            allowed_states = [nup_to_condition[flag] for flag in str(nup) if flag in nup_to_condition]
            if allowed_states:
                queryset = queryset.filter(condition__in=list(dict.fromkeys(allowed_states)))

        # Main-category-specific filters
        if main_category == 'w':
            topmenu = get_param('topmenu')
            if topmenu:
                queryset = queryset.filter(wheels_details__wheel_for=topmenu)
            twrubr = get_param('twrubr')
            if twrubr:
                queryset = queryset.filter(wheels_details__offer_type=twrubr)
            wheel_brand = get_param('wheelBrand')
            if wheel_brand:
                queryset = queryset.filter(wheels_details__wheel_brand__icontains=wheel_brand)
            wheel_material = get_param('wheelMaterial')
            if wheel_material:
                queryset = queryset.filter(wheels_details__material__icontains=wheel_material)
            wheel_bolts = to_int(get_param('wheelBolts'))
            if wheel_bolts is not None:
                queryset = queryset.filter(wheels_details__bolts=wheel_bolts)
            wheel_pcd = get_param('wheelPcd')
            if wheel_pcd:
                queryset = queryset.filter(wheels_details__pcd__icontains=wheel_pcd)
            center_bore = get_param('wheelCenterBore')
            if center_bore:
                queryset = queryset.filter(wheels_details__center_bore__icontains=center_bore)
            wheel_offset = get_param('wheelOffset')
            if wheel_offset:
                queryset = queryset.filter(wheels_details__offset__icontains=wheel_offset)
            wheel_width = get_param('wheelWidth')
            if wheel_width:
                queryset = queryset.filter(wheels_details__width__icontains=wheel_width)
            wheel_diameter = get_param('wheelDiameter')
            if wheel_diameter:
                queryset = queryset.filter(wheels_details__diameter__icontains=wheel_diameter)
            wheel_count = to_int(get_param('wheelCount'))
            if wheel_count is not None:
                queryset = queryset.filter(wheels_details__count=wheel_count)
            wheel_type = get_param('wheelType')
            if wheel_type:
                queryset = queryset.filter(wheels_details__wheel_type__icontains=wheel_type)

        if main_category == 'u':
            part_for = get_param('topmenu')
            if part_for:
                queryset = queryset.filter(parts_details__part_for=part_for)
            part_category = get_param('partrub')
            if part_category:
                queryset = queryset.filter(parts_details__part_category__icontains=part_category)
            part_element = get_param('partelem')
            if part_element:
                queryset = queryset.filter(parts_details__part_element__icontains=part_element)

        if main_category in {'3', '4'}:
            relation = 'buses_details' if main_category == '3' else 'trucks_details'
            axles_from = to_int(get_param('axlesFrom'))
            if axles_from is not None:
                queryset = queryset.filter(**{f'{relation}__axles__gte': axles_from})
            axles_to = to_int(get_param('axlesTo'))
            if axles_to is not None:
                queryset = queryset.filter(**{f'{relation}__axles__lte': axles_to})
            seats_from = to_int(get_param('seatsFrom'))
            if seats_from is not None:
                queryset = queryset.filter(**{f'{relation}__seats__gte': seats_from})
            seats_to = to_int(get_param('seatsTo'))
            if seats_to is not None:
                queryset = queryset.filter(**{f'{relation}__seats__lte': seats_to})
            load_from = to_int(get_param('loadFrom'))
            if load_from is not None:
                queryset = queryset.filter(**{f'{relation}__load_kg__gte': load_from})
            load_to = to_int(get_param('loadTo'))
            if load_to is not None:
                queryset = queryset.filter(**{f'{relation}__load_kg__lte': load_to})
            euro_standard = get_param('euroStandard')
            if euro_standard:
                queryset = queryset.filter(**{f'{relation}__euro_standard__icontains': euro_standard})

        if main_category == '5':
            displacement_from = to_int(get_param('displacementFrom'))
            if displacement_from is not None:
                queryset = queryset.filter(moto_details__displacement_cc__gte=displacement_from)
            displacement_to = to_int(get_param('displacementTo'))
            if displacement_to is not None:
                queryset = queryset.filter(moto_details__displacement_cc__lte=displacement_to)

        if main_category == '8':
            lift_from = to_int(get_param('liftCapacityFrom'))
            if lift_from is not None:
                queryset = queryset.filter(forklift_details__lift_capacity_kg__gte=lift_from)
            lift_to = to_int(get_param('liftCapacityTo'))
            if lift_to is not None:
                queryset = queryset.filter(forklift_details__lift_capacity_kg__lte=lift_to)
            hours_from = to_int(get_param('hoursFrom'))
            if hours_from is not None:
                queryset = queryset.filter(forklift_details__hours__gte=hours_from)
            hours_to = to_int(get_param('hoursTo'))
            if hours_to is not None:
                queryset = queryset.filter(forklift_details__hours__lte=hours_to)

        if main_category == '9':
            beds_from = to_int(get_param('bedsFrom'))
            if beds_from is not None:
                queryset = queryset.filter(caravan_details__beds__gte=beds_from)
            beds_to = to_int(get_param('bedsTo'))
            if beds_to is not None:
                queryset = queryset.filter(caravan_details__beds__lte=beds_to)
            length_from = to_float(get_param('lengthFrom'))
            if length_from is not None:
                queryset = queryset.filter(caravan_details__length_m__gte=length_from)
            length_to = to_float(get_param('lengthTo'))
            if length_to is not None:
                queryset = queryset.filter(caravan_details__length_m__lte=length_to)
            if get_param('hasToilet') in {'1', 'true', 'True'}:
                queryset = queryset.filter(caravan_details__has_toilet=True)
            if get_param('hasHeating') in {'1', 'true', 'True'}:
                queryset = queryset.filter(caravan_details__has_heating=True)
            if get_param('hasAirConditioning') in {'1', 'true', 'True'}:
                queryset = queryset.filter(caravan_details__has_air_conditioning=True)

        if main_category == 'a':
            engine_count_from = to_int(get_param('engineCountFrom'))
            if engine_count_from is not None:
                queryset = queryset.filter(boats_details__engine_count__gte=engine_count_from)
            engine_count_to = to_int(get_param('engineCountTo'))
            if engine_count_to is not None:
                queryset = queryset.filter(boats_details__engine_count__lte=engine_count_to)
            material = get_param('material')
            if material:
                queryset = queryset.filter(boats_details__material__icontains=material)
            for query_key, field_name in [
                ('lengthFrom', 'length_m__gte'),
                ('lengthTo', 'length_m__lte'),
                ('widthFrom', 'width_m__gte'),
                ('widthTo', 'width_m__lte'),
                ('draftFrom', 'draft_m__gte'),
                ('draftTo', 'draft_m__lte'),
                ('hoursFrom', 'hours__gte'),
                ('hoursTo', 'hours__lte'),
            ]:
                value = to_float(get_param(query_key))
                if value is not None:
                    queryset = queryset.filter(**{f'boats_details__{field_name}': value})
            boat_features = get_param('boatFeatures')
            if boat_features:
                for feature in [item.strip() for item in boat_features.split(',') if item.strip()]:
                    queryset = queryset.filter(boats_details__features__contains=[feature])

        if main_category == 'b':
            load_from = to_int(get_param('loadFrom'))
            if load_from is not None:
                queryset = queryset.filter(trailers_details__load_kg__gte=load_from)
            load_to = to_int(get_param('loadTo'))
            if load_to is not None:
                queryset = queryset.filter(trailers_details__load_kg__lte=load_to)
            axles_from = to_int(get_param('axlesFrom'))
            if axles_from is not None:
                queryset = queryset.filter(trailers_details__axles__gte=axles_from)
            axles_to = to_int(get_param('axlesTo'))
            if axles_to is not None:
                queryset = queryset.filter(trailers_details__axles__lte=axles_to)
            trailer_features = get_param('trailerFeatures')
            if trailer_features:
                for feature in [item.strip() for item in trailer_features.split(',') if item.strip()]:
                    queryset = queryset.filter(trailers_details__features__contains=[feature])

        if main_category == 'v':
            topmenu = get_param('topmenu')
            if topmenu:
                queryset = queryset.filter(accessories_details__classified_for=topmenu)
            accessory_category = get_param('marka')
            if accessory_category:
                queryset = queryset.filter(accessories_details__accessory_category__icontains=accessory_category)

        if main_category in {'y', 'z'}:
            topmenu = get_param('topmenu')
            if topmenu:
                relation_field = 'buy_details__classified_for' if main_category == 'y' else 'services_details__classified_for'
                queryset = queryset.filter(**{relation_field: topmenu})
            category = get_param('category')
            if category:
                relation_field = 'buy_details__buy_category' if main_category == 'y' else 'services_details__service_category'
                queryset = queryset.filter(**{f'{relation_field}__icontains': category})

        # Car category filter (legacy mappings)
        category = get_param('category')
        if category and (main_category == '1' or main_category is None):
            category_mapping = {
                'Ван': 'van',
                'Джип': 'jeep',
                'Кабрио': 'cabriolet',
                'Комби': 'wagon',
                'Купе': 'coupe',
                'Миниван': 'minivan',
                'Пикап': 'pickup',
                'Седан': 'sedan',
                'Стреч лимузина': 'stretch_limo',
                'Хечбек': 'hatchback',
                'van': 'van',
                'jeep': 'jeep',
                'cabriolet': 'cabriolet',
                'wagon': 'wagon',
                'coupe': 'coupe',
                'minivan': 'minivan',
                'pickup': 'pickup',
                'sedan': 'sedan',
                'stretch_limo': 'stretch_limo',
                'hatchback': 'hatchback',
            }
            category_key = category_mapping.get(category, category)
            queryset = queryset.filter(category=category_key)

        # Media / seller filters
        if get_param('hasPhoto') in {'1', 'true', 'True'}:
            queryset = queryset.filter(images__isnull=False).distinct()

        seller_type = get_param('sellerType')
        if seller_type == '2':
            queryset = queryset.filter(user__business_profile__isnull=False)
        elif seller_type == '1':
            queryset = queryset.filter(user__business_profile__isnull=True)

        # Sorting
        sort_by = get_param('sortBy', 'sort') or ''
        if sort_by in {'price-asc', '3', 'Цена'}:
            queryset = queryset.order_by('top_rank', 'price')
        elif sort_by in {'price-desc'}:
            queryset = queryset.order_by('top_rank', '-price')
        elif sort_by in {'year-desc', '4'}:
            queryset = queryset.order_by('top_rank', '-year_from')
        elif sort_by in {'year-asc'}:
            queryset = queryset.order_by('top_rank', 'year_from')
        elif sort_by in {'mileage-desc', '5'}:
            queryset = queryset.order_by('top_rank', '-mileage')
        elif sort_by in {'newest', '6', 'Най-новите обяви'}:
            queryset = queryset.order_by('top_rank', '-created_at')
        elif sort_by in {'newest-2days', '7', 'Най-новите обяви от посл. 2 дни'}:
            queryset = queryset.filter(created_at__gte=timezone.now() - timedelta(days=2)).order_by('top_rank', '-created_at')
        else:
            queryset = queryset.order_by('top_rank', 'brand', 'model', 'price')
        if self.action == "list":
            lite = (self.request.query_params.get("lite") or "").lower()
            compact = (self.request.query_params.get("compact") or "").lower()
            first_thumbnail_subquery = CarImage.objects.filter(
                listing_id=OuterRef('pk')
            ).order_by('-is_cover', 'order', 'id').values('thumbnail')[:1]
            first_image_subquery = CarImage.objects.filter(
                listing_id=OuterRef('pk')
            ).order_by('-is_cover', 'order', 'id').values('image')[:1]
            image_prefetch = Prefetch(
                'images',
                queryset=CarImage.objects.only('id', 'image', 'thumbnail', 'order', 'is_cover', 'listing_id').order_by('order')
            )

            if lite in {"1", "true", "yes"}:
                queryset = queryset.annotate(
                    first_image=Coalesce(
                        Subquery(first_thumbnail_subquery),
                        Subquery(first_image_subquery),
                    )
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'power', 'city', 'created_at', 'listing_type'
                )
            elif compact in {"1", "true", "yes"}:
                queryset = queryset.annotate(
                    description_preview=Substr('description', 1, 220),
                    first_image=Coalesce(
                        Subquery(first_thumbnail_subquery),
                        Subquery(first_image_subquery),
                    )
                ).select_related(
                    'user',
                    'user__business_profile',
                    'user__private_profile'
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'gearbox', 'power', 'city',
                    'category', 'condition', 'created_at', 'listing_type',
                    'user_id', 'user__email',
                    'user__business_profile__dealer_name',
                    'user__private_profile__id'
                ).prefetch_related(image_prefetch)
            else:
                queryset = queryset.annotate(
                    description_preview=Substr('description', 1, 220)
                ).select_related(
                    'user',
                    'user__business_profile',
                    'user__private_profile'
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'gearbox', 'power', 'city',
                    'category', 'condition', 'created_at', 'listing_type',
                    'is_active', 'is_draft', 'is_archived',
                    'user_id', 'user__email',
                    'user__business_profile__dealer_name',
                    'user__private_profile__id'
                ).prefetch_related(image_prefetch)
        elif self.action == "retrieve":
            queryset = queryset.select_related(
                'user',
                'user__business_profile',
                'user__private_profile'
            ).prefetch_related('images')

        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        CarListing.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
        instance.refresh_from_db(fields=['view_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create listing and associate with current user"""
        _demote_expired_top_listings()
        # Check if user has reached the 3 advert limit
        cutoff = get_expiry_cutoff()
        active_listings_count = CarListing.objects.filter(
            user=self.request.user,
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        ).count()

        if not _is_business_user(self.request.user) and active_listings_count >= 3:
            raise ValidationError(
                "ÐœÐ¾Ð¶ÐµÑ‚Ðµ Ð´Ð° Ð¿ÑƒÐ±Ð»Ð¸ÐºÑƒÐ²Ð°Ñ‚Ðµ Ð¼Ð°ÐºÑÐ¸Ð¼ÑƒÐ¼ 3 Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸ Ð¾Ð±ÑÐ²Ð¸. "
                "ÐœÐ¾Ð»Ñ, Ð¸Ð·Ñ‚Ñ€Ð¸Ð¹Ñ‚Ðµ Ð¸Ð»Ð¸ Ð°Ñ€Ñ…Ð¸Ð²Ð¸Ñ€Ð°Ð¹Ñ‚Ðµ Ð½ÑÐºÐ¾Ñ Ð¾Ñ‚ Ð²Ð°ÑˆÐ¸Ñ‚Ðµ Ð¾Ð±ÑÐ²Ð¸, Ð·Ð° Ð´Ð° Ð´Ð¾Ð±Ð°Ð²Ð¸Ñ‚Ðµ Ð½Ð¾Ð²Ð°."
            )

        listing_type = serializer.validated_data.get("listing_type", "normal")
        with db_transaction.atomic():
            if listing_type == "top":
                _charge_top_listing_fee(self.request.user)

            listing = serializer.save(user=self.request.user)

            if listing_type == "top":
                _apply_top_listing_window(listing)
                listing.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])

    def perform_update(self, serializer):
        """Update listing - only owner can update"""
        _demote_expired_top_listings()
        listing = self.get_object()
        if listing.user != self.request.user:
            raise PermissionError("You can only edit your own listings")
        listing_type = serializer.validated_data.get("listing_type")
        now = timezone.now()

        with db_transaction.atomic():
            if listing_type == "top":
                is_current_top = (
                    listing.listing_type == "top"
                    and listing.top_expires_at
                    and listing.top_expires_at > now
                )
                if not is_current_top:
                    _charge_top_listing_fee(self.request.user)
                    _apply_top_listing_window(listing, now=now)

            updated = serializer.save()

            if listing_type == "top":
                updated.top_paid_at = listing.top_paid_at
                updated.top_expires_at = listing.top_expires_at
                updated.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])
            elif listing_type == "normal":
                _clear_top_listing_window(updated)
                updated.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])

    def perform_destroy(self, instance):
        """Delete listing - only owner can delete"""
        if instance.user != self.request.user:
            raise PermissionError("You can only delete your own listings")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_listings(request):
    """Get current user's active listings"""
    _demote_expired_top_listings()
    cutoff = get_expiry_cutoff()
    listings = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).prefetch_related('images')
    serializer = CarListingSerializer(listings, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_drafts(request):
    """Get current user's draft listings"""
    _demote_expired_top_listings()
    drafts = CarListing.objects.filter(user=request.user, is_draft=True).prefetch_related('images')
    serializer = CarListingSerializer(drafts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_archived(request):
    """Get current user's archived listings"""
    _demote_expired_top_listings()
    archived = CarListing.objects.filter(user=request.user, is_archived=True).prefetch_related('images')
    serializer = CarListingSerializer(archived, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_expired(request):
    """Get current user's expired listings"""
    _demote_expired_top_listings()
    cutoff = get_expiry_cutoff()
    expired = CarListing.objects.filter(
        user=request.user,
        is_draft=False,
        is_archived=False,
        created_at__lt=cutoff
    ).prefetch_related('images')
    serializer = CarListingSerializer(expired, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_listing(request, listing_id):
    """Archive a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing.is_archived = True
    listing.is_active = False
    listing.save()
    serializer = CarListingSerializer(listing)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unarchive_listing(request, listing_id):
    """Unarchive a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    cutoff = get_expiry_cutoff()
    active_count = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).exclude(id=listing.id).count()

    if not _is_business_user(request.user) and active_count >= 3:
        return Response(
            {
                "detail": "ÐœÐ¾Ð¶ÐµÑ‚Ðµ Ð´Ð° Ð¸Ð¼Ð°Ñ‚Ðµ Ð¼Ð°ÐºÑÐ¸Ð¼ÑƒÐ¼ 3 Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸ Ð¾Ð±ÑÐ²Ð¸. "
                          "ÐœÐ¾Ð»Ñ, Ð°Ñ€Ñ…Ð¸Ð²Ð¸Ñ€Ð°Ð¹Ñ‚Ðµ Ð¸Ð»Ð¸ Ð¸Ð·Ñ‚Ñ€Ð¸Ð¹Ñ‚Ðµ Ð½ÑÐºÐ¾Ñ Ð¾Ñ‚ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸Ñ‚Ðµ."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    listing.is_archived = False
    listing.is_active = True
    listing.created_at = timezone.now()
    listing.save()
    serializer = CarListingSerializer(listing)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_listing(request, listing_id):
    """Delete a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing.delete()
    return Response(
        {
            'message': 'Listing deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def republish_listing(request, listing_id):
    """Republish a listing for another 30 minutes."""
    _demote_expired_top_listings()
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing_type = request.data.get('listing_type')

    # Enforce active listings limit (exclude the current listing)
    cutoff = get_expiry_cutoff()
    active_count = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).exclude(id=listing.id).count()

    if not _is_business_user(request.user) and active_count >= 3:
        return Response(
            {
                "detail": "ÐœÐ¾Ð¶ÐµÑ‚Ðµ Ð´Ð° Ð¸Ð¼Ð°Ñ‚Ðµ Ð¼Ð°ÐºÑÐ¸Ð¼ÑƒÐ¼ 3 Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸ Ð¾Ð±ÑÐ²Ð¸. "
                          "ÐœÐ¾Ð»Ñ, Ð°Ñ€Ñ…Ð¸Ð²Ð¸Ñ€Ð°Ð¹Ñ‚Ðµ Ð¸Ð»Ð¸ Ð¸Ð·Ñ‚Ñ€Ð¸Ð¹Ñ‚Ðµ Ð½ÑÐºÐ¾Ñ Ð¾Ñ‚ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸Ñ‚Ðµ."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if listing_type not in ['top', 'normal']:
        return Response(
            {"detail": "ÐÐµÐ²Ð°Ð»Ð¸Ð´ÐµÐ½ Ñ‚Ð¸Ð¿ Ð½Ð° Ð¾Ð±ÑÐ²Ð°Ñ‚Ð°."},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    with db_transaction.atomic():
        if listing_type == "top":
            _charge_top_listing_fee(request.user)
            _apply_top_listing_window(listing, now=now)
        else:
            listing.listing_type = "normal"
            _clear_top_listing_window(listing)

        listing.is_draft = False
        listing.is_archived = False
        listing.is_active = True
        listing.created_at = now
        listing.save()

    serializer = CarListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_listing_type(request, listing_id):
    """Update listing type (top/normal) for a listing."""
    _demote_expired_top_listings()
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing_type = request.data.get('listing_type')

    if listing_type not in ['top', 'normal']:
        return Response(
            {"detail": "ÐÐµÐ²Ð°Ð»Ð¸Ð´ÐµÐ½ Ñ‚Ð¸Ð¿ Ð½Ð° Ð¾Ð±ÑÐ²Ð°Ñ‚Ð°."},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    with db_transaction.atomic():
        if listing_type == "top":
            is_current_top = (
                listing.listing_type == "top"
                and listing.top_expires_at
                and listing.top_expires_at > now
            )
            if not is_current_top:
                _charge_top_listing_fee(request.user)
                _apply_top_listing_window(listing, now=now)
        else:
            listing.listing_type = "normal"
            _clear_top_listing_window(listing)

        listing.save()

    serializer = CarListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_listing_images(request, listing_id):
    """Upload images for a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)

    images = request.FILES.getlist('images')
    for index, image in enumerate(images):
        # First image is cover by default
        is_cover = index == 0 and len(images) > 0
        CarImage.objects.create(
            listing=listing,
            image=image,
            order=index,
            is_cover=is_cover
        )

    return Response(
        {'message': f'{len(images)} images uploaded successfully'},
        status=status.HTTP_201_CREATED
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_listing_images(request, listing_id):
    """Update image order and cover status for a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)

    images_data = request.data.get('images', [])

    # Update each image with new order and cover status
    for image_data in images_data:
        image_id = image_data.get('id')
        order = image_data.get('order')
        is_cover = image_data.get('is_cover', False)

        try:
            image = CarImage.objects.get(id=image_id, listing=listing)
            image.order = order
            image.is_cover = is_cover
            image.save()
        except CarImage.DoesNotExist:
            return Response(
                {'error': f'Image {image_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    # Ensure only one image is marked as cover
    CarImage.objects.filter(listing=listing).exclude(
        id__in=[img.get('id') for img in images_data if img.get('is_cover')]
    ).update(is_cover=False)

    serializer = CarImageSerializer(
        listing.images.all(),
        many=True
    )

    return Response(
        {'message': 'Images updated successfully', 'images': serializer.data},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_favorite(request, listing_id):
    """Add a listing to user's favorites"""
    listing = get_object_or_404(CarListing, id=listing_id)

    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        listing=listing
    )

    if created:
        return Response(
            {'message': 'Listing added to favorites'},
            status=status.HTTP_201_CREATED
        )
    else:
        return Response(
            {'message': 'Listing already in favorites'},
            status=status.HTTP_200_OK
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_favorite(request, listing_id):
    """Remove a listing from user's favorites"""
    favorite = get_object_or_404(Favorite, user=request.user, listing_id=listing_id)
    favorite.delete()

    return Response(
        {'message': 'Listing removed from favorites'},
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_favorites(request):
    """Get current user's favorite listings"""
    _demote_expired_top_listings()
    cutoff = get_expiry_cutoff()
    favorites = Favorite.objects.filter(
        user=request.user,
        listing__is_active=True,
        listing__is_draft=False,
        listing__is_archived=False,
        listing__created_at__gte=cutoff
    ).select_related('listing').prefetch_related('listing__images')
    serializer = FavoriteSerializer(favorites, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def latest_listings(request):
    """Return the latest 16 listings for the landing page with minimal payload."""
    cached_payload = cache.get(LATEST_LISTINGS_CACHE_KEY)
    if cached_payload is not None:
        response = Response(cached_payload, status=status.HTTP_200_OK)
        _set_public_cache_headers(response, max_age=LATEST_LISTINGS_CACHE_SECONDS)
        response["X-Latest-Listings-Cache"] = "HIT"
        return response

    _demote_expired_top_listings()
    cutoff = get_expiry_cutoff()
    first_thumbnail_subquery = CarImage.objects.filter(
        listing_id=OuterRef('pk')
    ).order_by('-is_cover', 'order', 'id').values('thumbnail')[:1]
    first_image_subquery = CarImage.objects.filter(
        listing_id=OuterRef('pk')
    ).order_by('-is_cover', 'order', 'id').values('image')[:1]
    latest_price_change = CarListingPriceHistory.objects.filter(
        listing=OuterRef('pk')
    ).order_by('-changed_at')

    queryset = (
        CarListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        )
        .annotate(
            top_rank=Case(
                When(listing_type='top', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
            first_image=Coalesce(
                Subquery(first_thumbnail_subquery),
                Subquery(first_image_subquery),
            ),
            last_price_change_delta=Subquery(latest_price_change.values('delta')[:1]),
            last_price_change_at=Subquery(latest_price_change.values('changed_at')[:1]),
        )
        .only(
            'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
            'fuel', 'power', 'city', 'created_at', 'listing_type'
        )
        .order_by('top_rank', '-created_at')[:16]
    )

    payload = CarListingLiteSerializer(queryset, many=True, context={'request': request}).data
    cache.set(LATEST_LISTINGS_CACHE_KEY, payload, LATEST_LISTINGS_CACHE_SECONDS)

    response = Response(payload, status=status.HTTP_200_OK)
    _set_public_cache_headers(response, max_age=LATEST_LISTINGS_CACHE_SECONDS)
    response["X-Latest-Listings-Cache"] = "MISS"
    return response

