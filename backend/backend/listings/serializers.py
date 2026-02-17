from rest_framework import serializers
from django.conf import settings
import json
from .models import (
    CarListing,
    CarImage,
    Favorite,
    CarsListing,
    WheelsListing,
    PartsListing,
    BusesListing,
    TrucksListing,
    MotoListing,
    AgriListing,
    IndustrialListing,
    ForkliftListing,
    CaravanListing,
    BoatsListing,
    TrailersListing,
    AccessoriesListing,
    BuyListing,
    ServicesListing,
)
from decimal import Decimal, InvalidOperation


def _normalize_media_path(raw_path):
    if not raw_path:
        return None

    path = str(raw_path).strip()
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if path.startswith("/"):
        return path

    media_url = settings.MEDIA_URL if settings.MEDIA_URL.startswith("/") else f"/{settings.MEDIA_URL}"
    media_url = media_url.rstrip("/")
    if path.startswith("media/"):
        return f"/{path}"
    return f"{media_url}/{path.lstrip('/')}"


def _normalize_choice_alias(value, aliases):
    if value in (None, ""):
        return value
    key = str(value).strip().lower()
    return aliases.get(key, value)


FUEL_ALIASES = {
    "benzin": "benzin",
    "petrol": "benzin",
    "gasoline": "benzin",
    "бензин": "benzin",
    "dizel": "dizel",
    "diesel": "dizel",
    "дизел": "dizel",
    "gaz_benzin": "gaz_benzin",
    "газ/бензин": "gaz_benzin",
    "газ бензин": "gaz_benzin",
    "gas/benzin": "gaz_benzin",
    "gas/benzine": "gaz_benzin",
    "gasoline+gas": "gaz_benzin",
    "lpg/petrol": "gaz_benzin",
    "hibrid": "hibrid",
    "hybrid": "hibrid",
    "хибрид": "hibrid",
    "elektro": "elektro",
    "electric": "elektro",
    "ev": "elektro",
    "електро": "elektro",
}

GEARBOX_ALIASES = {
    "ruchna": "ruchna",
    "manual": "ruchna",
    "stick": "ruchna",
    "ръчна": "ruchna",
    "avtomatik": "avtomatik",
    "automatic": "avtomatik",
    "auto": "avtomatik",
    "автоматик": "avtomatik",
    "автоматична": "avtomatik",
}

CONDITION_ALIASES = {
    "0": "0",
    "new": "0",
    "нов": "0",
    "нова": "0",
    "1": "1",
    "used": "1",
    "second hand": "1",
    "употребяван": "1",
    "използван": "1",
    "2": "2",
    "damaged": "2",
    "повреден": "2",
    "ударен": "2",
    "3": "3",
    "parts": "3",
    "за части": "3",
}

CATEGORY_ALIASES = {
    "van": "van",
    "ван": "van",
    "jeep": "jeep",
    "джип": "jeep",
    "cabriolet": "cabriolet",
    "кабрио": "cabriolet",
    "wagon": "wagon",
    "комби": "wagon",
    "coupe": "coupe",
    "купе": "coupe",
    "minivan": "minivan",
    "миниван": "minivan",
    "pickup": "pickup",
    "пикап": "pickup",
    "sedan": "sedan",
    "седан": "sedan",
    "stretch_limo": "stretch_limo",
    "стреч лимузина": "stretch_limo",
    "hatchback": "hatchback",
    "хечбек": "hatchback",
}

LISTING_TYPE_ALIASES = {
    "normal": "normal",
    "regular": "normal",
    "standard": "normal",
    "нормална": "normal",
    "топ": "top",
    "top": "top",
    "vip": "vip",
}

MAIN_CATEGORY_ALIASES = {
    "1": "1",
    "cars": "1",
    "car": "1",
    "автомобили и джипове": "1",
    "w": "w",
    "wheels": "w",
    "tires and rims": "w",
    "гуми и джанти": "w",
    "u": "u",
    "parts": "u",
    "части": "u",
    "3": "3",
    "buses": "3",
    "бусове": "3",
    "4": "4",
    "trucks": "4",
    "камиони": "4",
    "5": "5",
    "motorcycles": "5",
    "мотоциклети": "5",
    "6": "6",
    "agri": "6",
    "agricultural": "6",
    "селскостопански": "6",
    "7": "7",
    "industrial": "7",
    "индустриални": "7",
    "8": "8",
    "forklifts": "8",
    "кари": "8",
    "9": "9",
    "caravans": "9",
    "каравани": "9",
    "a": "a",
    "boats": "a",
    "яхти и лодки": "a",
    "b": "b",
    "trailers": "b",
    "ремаркета": "b",
    "v": "v",
    "accessories": "v",
    "аксесоари": "v",
    "y": "y",
    "buy": "y",
    "купува": "y",
    "z": "z",
    "services": "z",
    "услуги": "z",
}

VIP_PLAN_ALIASES = {
    "7d": "7d",
    "7": "7d",
    "7days": "7d",
    "7-day": "7d",
    "lifetime": "lifetime",
    "full": "lifetime",
    "30d": "lifetime",
}

TOP_PLAN_ALIASES = {
    "1d": "1d",
    "1": "1d",
    "1day": "1d",
    "1-day": "1d",
    "7d": "7d",
    "7": "7d",
    "7days": "7d",
    "7-day": "7d",
}

MIN_IMAGES_REQUIRED_FOR_PUBLISH = 3
MAIN_CATEGORIES_WITH_OPTIONAL_IMAGES = {"y", "z"}


class CarImageSerializer(serializers.ModelSerializer):
    """Serializer for car images"""
    class Meta:
        model = CarImage
        fields = ['id', 'image', 'thumbnail', 'order', 'is_cover', 'created_at']
        read_only_fields = ['id', 'created_at']


class CarListingLiteSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views like the landing page."""
    fuel_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    price_change = serializers.SerializerMethodField()
    part_for = serializers.SerializerMethodField()
    part_element = serializers.SerializerMethodField()

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'main_category', 'brand', 'model', 'year_from', 'price', 'mileage',
            'fuel', 'fuel_display', 'power', 'city', 'created_at',
            'listing_type', 'listing_type_display', 'image_url', 'price_change',
            'part_for', 'part_element',
        ]
        read_only_fields = fields

    def get_fuel_display(self, obj):
        return obj.fuel

    def get_listing_type_display(self, obj):
        return obj.listing_type

    def get_image_url(self, obj):
        first_image = getattr(obj, 'first_image', None)
        if first_image:
            return _normalize_media_path(first_image)
        images = list(obj.images.all()[:1])
        if images:
            image_obj = images[0]
            source_url = image_obj.thumbnail.url if image_obj.thumbnail else image_obj.image.url
            return _normalize_media_path(source_url)
        return None

    def _resolve_price_change(self, obj):
        delta = getattr(obj, 'last_price_change_delta', None)
        changed_at = getattr(obj, 'last_price_change_at', None)
        if delta is None and changed_at is None:
            last = obj.price_history.order_by('-changed_at').values('delta', 'changed_at').first()
            if not last:
                return None, None
            delta = last['delta']
            changed_at = last['changed_at']
        return delta, changed_at

    def get_price_change(self, obj):
        delta, changed_at = self._resolve_price_change(obj)
        if delta is None:
            return None
        try:
            delta_value = Decimal(delta)
        except (InvalidOperation, TypeError):
            delta_value = None

        if delta_value is None:
            direction = 'same'
        elif delta_value > 0:
            direction = 'up'
        elif delta_value < 0:
            direction = 'down'
        else:
            direction = 'same'

        return {
            'delta': delta,
            'direction': direction,
            'changed_at': changed_at
        }

    def get_part_for(self, obj):
        if getattr(obj, 'main_category', None) != 'u':
            return ""
        try:
            details = obj.parts_details
        except PartsListing.DoesNotExist:
            details = None
        return getattr(details, 'part_for', "") if details else ""

    def get_part_element(self, obj):
        if getattr(obj, 'main_category', None) != 'u':
            return ""
        try:
            details = obj.parts_details
        except PartsListing.DoesNotExist:
            details = None
        return getattr(details, 'part_element', "") if details else ""


class CarListingListSerializer(serializers.ModelSerializer):
    """Optimized serializer for search/list pages."""
    main_category_display = serializers.SerializerMethodField()
    fuel_display = serializers.SerializerMethodField()
    gearbox_display = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    seller_type = serializers.SerializerMethodField()
    description_preview = serializers.SerializerMethodField()
    price_change = serializers.SerializerMethodField()

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'main_category', 'main_category_display', 'title', 'brand', 'model', 'year_from', 'price', 'mileage', 'power', 'location_country', 'city',
            'fuel', 'fuel_display', 'gearbox', 'gearbox_display',
            'category', 'category_display', 'condition', 'condition_display',
            'description_preview', 'created_at', 'updated_at',
            'listing_type', 'listing_type_display',
            'is_active', 'is_draft', 'is_archived',
            'image_url', 'images', 'is_favorited', 'seller_name', 'seller_type', 'price_change'
        ]
        read_only_fields = fields

    def _get_preview_images(self, obj):
        cache = self.context.setdefault('_images_preview_cache', {})
        cached = cache.get(obj.id)
        if cached is not None:
            return cached
        images = list(obj.images.all()[:4])
        cache[obj.id] = images
        return images

    def _build_image_url(self, image_obj):
        if not image_obj or not image_obj.image:
            return None
        source_url = image_obj.thumbnail.url if image_obj.thumbnail else image_obj.image.url
        return _normalize_media_path(source_url)

    def get_images(self, obj):
        return [
            {
                'id': image.id,
                'image': self._build_image_url(image),
                'order': image.order,
                'is_cover': image.is_cover,
            }
            for image in self._get_preview_images(obj)
        ]

    def get_image_url(self, obj):
        first_image = getattr(obj, 'first_image', None)
        if first_image:
            return _normalize_media_path(first_image)
        images = self._get_preview_images(obj)
        return self._build_image_url(images[0]) if images else None

    def get_fuel_display(self, obj):
        return obj.fuel

    def get_main_category_display(self, obj):
        return obj.main_category

    def get_gearbox_display(self, obj):
        return obj.gearbox

    def get_condition_display(self, obj):
        return obj.condition

    def get_category_display(self, obj):
        return obj.category

    def get_listing_type_display(self, obj):
        return obj.listing_type

    def get_description_preview(self, obj):
        preview = getattr(obj, 'description_preview', None)
        if preview is not None:
            return preview
        raw_description = obj.description or ''
        return raw_description[:220]

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            favorite_ids = self.context.get('favorite_listing_ids')
            if favorite_ids is None:
                favorite_ids = set(
                    Favorite.objects.filter(user=request.user).values_list('listing_id', flat=True)
                )
                self.context['favorite_listing_ids'] = favorite_ids
            return obj.id in favorite_ids
        return False

    def get_seller_name(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return user.business_profile.dealer_name
        first_name = (user.first_name or '').strip()
        last_name = (user.last_name or '').strip()
        if first_name and last_name:
            return f"{first_name} {last_name}"
        return "Частно лице"

    def get_seller_type(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return 'business'
        if hasattr(user, 'private_profile'):
            return 'private'
        return 'unknown'

    def _resolve_price_change(self, obj):
        delta = getattr(obj, 'last_price_change_delta', None)
        changed_at = getattr(obj, 'last_price_change_at', None)
        if delta is None and changed_at is None:
            last = obj.price_history.order_by('-changed_at').values('delta', 'changed_at').first()
            if not last:
                return None, None
            delta = last['delta']
            changed_at = last['changed_at']
        return delta, changed_at

    def get_price_change(self, obj):
        delta, changed_at = self._resolve_price_change(obj)
        if delta is None:
            return None
        try:
            delta_value = Decimal(delta)
        except (InvalidOperation, TypeError):
            delta_value = None

        if delta_value is None:
            direction = 'same'
        elif delta_value > 0:
            direction = 'up'
        elif delta_value < 0:
            direction = 'down'
        else:
            direction = 'same'

        return {
            'delta': delta,
            'direction': direction,
            'changed_at': changed_at
        }

class CarListingSearchCompactSerializer(CarListingListSerializer):
    """Compact serializer for SearchPage pagination."""

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'main_category', 'main_category_display', 'title', 'brand', 'model', 'year_from', 'price', 'mileage', 'power', 'location_country', 'city',
            'fuel_display', 'gearbox_display', 'category_display', 'condition_display',
            'description_preview', 'created_at', 'updated_at',
            'listing_type', 'listing_type_display',
            'image_url', 'images', 'is_favorited', 'seller_name', 'seller_type', 'price_change'
        ]
        read_only_fields = fields


DETAIL_MODEL_MAP = {
    '1': (CarsListing, 'cars_details'),
    'w': (WheelsListing, 'wheels_details'),
    'u': (PartsListing, 'parts_details'),
    '3': (BusesListing, 'buses_details'),
    '4': (TrucksListing, 'trucks_details'),
    '5': (MotoListing, 'moto_details'),
    '6': (AgriListing, 'agri_details'),
    '7': (IndustrialListing, 'industrial_details'),
    '8': (ForkliftListing, 'forklift_details'),
    '9': (CaravanListing, 'caravan_details'),
    'a': (BoatsListing, 'boats_details'),
    'b': (TrailersListing, 'trailers_details'),
    'v': (AccessoriesListing, 'accessories_details'),
    'y': (BuyListing, 'buy_details'),
    'z': (ServicesListing, 'services_details'),
}

DETAIL_FIELDS_BY_MAIN_CATEGORY = {
    '1': [],
    'w': [
        'wheel_for', 'offer_type',
        'tire_brand', 'tire_width', 'tire_height', 'tire_diameter',
        'tire_season', 'tire_speed_index', 'tire_load_index', 'tire_tread',
        'wheel_brand', 'material', 'bolts', 'pcd',
        'center_bore', 'offset', 'width', 'diameter', 'count', 'wheel_type',
    ],
    'u': ['part_for', 'part_category', 'part_element', 'part_year_from', 'part_year_to'],
    '3': ['axles', 'seats', 'load_kg', 'transmission', 'engine_type', 'euro_standard'],
    '4': ['axles', 'seats', 'load_kg', 'transmission', 'engine_type', 'euro_standard'],
    '5': ['displacement_cc', 'transmission', 'engine_type'],
    '6': ['equipment_type'],
    '7': ['equipment_type'],
    '8': ['engine_type', 'lift_capacity_kg', 'hours'],
    '9': ['beds', 'length_m', 'has_toilet', 'has_heating', 'has_air_conditioning'],
    'a': [
        'boat_category', 'engine_type', 'engine_count', 'material',
        'length_m', 'width_m', 'draft_m', 'hours',
    ],
    'b': ['trailer_category', 'load_kg', 'axles'],
    'v': ['classified_for', 'accessory_category'],
    'y': ['classified_for', 'buy_category'],
    'z': ['classified_for', 'service_category'],
}


class CarListingSerializer(serializers.ModelSerializer):
    """Serializer for car listings with per-main-category detail models."""

    images = CarImageSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    fuel_display = serializers.SerializerMethodField()
    gearbox_display = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    seller_type = serializers.SerializerMethodField()
    seller_created_at = serializers.SerializerMethodField()
    price_history = serializers.SerializerMethodField()
    description = serializers.CharField(required=False, allow_blank=True, default="")

    images_upload = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    wheel_for = serializers.CharField(required=False, allow_blank=True)
    offer_type = serializers.CharField(required=False, allow_blank=True)
    tire_brand = serializers.CharField(required=False, allow_blank=True)
    tire_width = serializers.CharField(required=False, allow_blank=True)
    tire_height = serializers.CharField(required=False, allow_blank=True)
    tire_diameter = serializers.CharField(required=False, allow_blank=True)
    tire_season = serializers.CharField(required=False, allow_blank=True)
    tire_speed_index = serializers.CharField(required=False, allow_blank=True)
    tire_load_index = serializers.CharField(required=False, allow_blank=True)
    tire_tread = serializers.CharField(required=False, allow_blank=True)
    wheel_brand = serializers.CharField(required=False, allow_blank=True)
    material = serializers.CharField(required=False, allow_blank=True)
    bolts = serializers.IntegerField(required=False, allow_null=True)
    pcd = serializers.CharField(required=False, allow_blank=True)
    center_bore = serializers.CharField(required=False, allow_blank=True)
    offset = serializers.CharField(required=False, allow_blank=True)
    width = serializers.CharField(required=False, allow_blank=True)
    diameter = serializers.CharField(required=False, allow_blank=True)
    count = serializers.IntegerField(required=False, allow_null=True)
    wheel_type = serializers.CharField(required=False, allow_blank=True)

    part_for = serializers.CharField(required=False, allow_blank=True)
    part_category = serializers.CharField(required=False, allow_blank=True)
    part_element = serializers.CharField(required=False, allow_blank=True)
    part_year_from = serializers.IntegerField(required=False, allow_null=True)
    part_year_to = serializers.IntegerField(required=False, allow_null=True)

    axles = serializers.IntegerField(required=False, allow_null=True)
    seats = serializers.IntegerField(required=False, allow_null=True)
    load_kg = serializers.IntegerField(required=False, allow_null=True)
    transmission = serializers.CharField(required=False, allow_blank=True)
    engine_type = serializers.CharField(required=False, allow_blank=True)
    heavy_euro_standard = serializers.CharField(required=False, allow_blank=True)
    displacement_cc = serializers.IntegerField(required=False, allow_null=True)

    equipment_type = serializers.CharField(required=False, allow_blank=True)
    lift_capacity_kg = serializers.IntegerField(required=False, allow_null=True)
    hours = serializers.IntegerField(required=False, allow_null=True)

    beds = serializers.IntegerField(required=False, allow_null=True)
    length_m = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    has_toilet = serializers.BooleanField(required=False)
    has_heating = serializers.BooleanField(required=False)
    has_air_conditioning = serializers.BooleanField(required=False)

    boat_category = serializers.CharField(required=False, allow_blank=True)
    engine_count = serializers.IntegerField(required=False, allow_null=True)
    width_m = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    draft_m = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    boat_features = serializers.ListField(child=serializers.CharField(), required=False)

    trailer_category = serializers.CharField(required=False, allow_blank=True)
    trailer_features = serializers.ListField(child=serializers.CharField(), required=False)

    classified_for = serializers.CharField(required=False, allow_blank=True)
    accessory_category = serializers.CharField(required=False, allow_blank=True)
    buy_service_category = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'user', 'user_email', 'main_category', 'category', 'category_display', 'title', 'brand', 'model',
            'year_from', 'month', 'vin', 'price', 'location_country', 'location_region', 'city',
            'fuel', 'fuel_display', 'gearbox', 'gearbox_display', 'mileage', 'color', 'condition', 'condition_display',
            'power', 'displacement', 'euro_standard',
            'description', 'phone', 'email', 'features', 'listing_type', 'listing_type_display',
            'top_plan', 'vip_plan', 'top_expires_at', 'vip_expires_at',
            'view_count', 'is_draft', 'is_active', 'is_archived', 'created_at', 'updated_at', 'images', 'image_url',
            'is_favorited', 'seller_name', 'seller_type', 'seller_created_at', 'price_history', 'images_upload',
            'wheel_for', 'offer_type',
            'tire_brand', 'tire_width', 'tire_height', 'tire_diameter',
            'tire_season', 'tire_speed_index', 'tire_load_index', 'tire_tread',
            'wheel_brand', 'material', 'bolts', 'pcd', 'center_bore', 'offset', 'width', 'diameter', 'count', 'wheel_type',
            'part_for', 'part_category', 'part_element', 'part_year_from', 'part_year_to',
            'axles', 'seats', 'load_kg', 'transmission', 'engine_type', 'heavy_euro_standard', 'displacement_cc',
            'equipment_type', 'lift_capacity_kg', 'hours',
            'beds', 'length_m', 'has_toilet', 'has_heating', 'has_air_conditioning',
            'boat_category', 'engine_count', 'width_m', 'draft_m', 'boat_features',
            'trailer_category', 'trailer_features',
            'classified_for', 'accessory_category', 'buy_service_category',
        ]
        read_only_fields = [
            'id', 'slug', 'user', 'user_email', 'created_at', 'updated_at', 'images', 'image_url', 'is_favorited',
            'is_active', 'fuel_display', 'gearbox_display', 'condition_display', 'category_display',
            'listing_type_display', 'seller_name', 'seller_type', 'seller_created_at', 'price_history',
            'top_expires_at', 'vip_expires_at', 'view_count'
        ]

    def get_fuel_display(self, obj):
        return obj.fuel

    def get_gearbox_display(self, obj):
        return obj.gearbox

    def get_condition_display(self, obj):
        return obj.condition

    def get_category_display(self, obj):
        return obj.category

    def get_listing_type_display(self, obj):
        return obj.listing_type

    def get_image_url(self, obj):
        images = list(obj.images.all())
        if images:
            first_image = images[0]
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            favorite_ids = self.context.get('favorite_listing_ids')
            if favorite_ids is None:
                favorite_ids = set(
                    Favorite.objects.filter(user=request.user).values_list('listing_id', flat=True)
                )
                self.context['favorite_listing_ids'] = favorite_ids
            return obj.id in favorite_ids
        return False

    def get_seller_name(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return user.business_profile.dealer_name
        first_name = (user.first_name or '').strip()
        last_name = (user.last_name or '').strip()
        if first_name and last_name:
            return f"{first_name} {last_name}"
        return "Частно лице"

    def get_seller_type(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return 'business'
        if hasattr(user, 'private_profile'):
            return 'private'
        return 'unknown'

    def get_seller_created_at(self, obj):
        user = obj.user
        return user.date_joined if user and user.date_joined else None

    def get_price_history(self, obj):
        history = obj.price_history.order_by('-changed_at')[:20]
        return [
            {
                'old_price': entry.old_price,
                'new_price': entry.new_price,
                'delta': entry.delta,
                'changed_at': entry.changed_at,
            }
            for entry in history
        ]

    def validate(self, attrs):
        main_category = str(
            attrs.get("main_category", self.instance.main_category if self.instance else "1")
        )

        is_create = self.instance is None
        if is_create:
            target_is_draft = bool(attrs.get("is_draft", False))
            will_publish = not target_is_draft
            existing_images_count = 0
        else:
            target_is_draft = bool(attrs.get("is_draft", self.instance.is_draft))
            will_publish = bool(self.instance.is_draft and not target_is_draft)
            existing_images_count = self.instance.images.count()

        if (
            will_publish
            and main_category not in MAIN_CATEGORIES_WITH_OPTIONAL_IMAGES
        ):
            incoming_images_count = len(attrs.get("images_upload") or [])
            total_images = existing_images_count + incoming_images_count
            if total_images < MIN_IMAGES_REQUIRED_FOR_PUBLISH:
                raise serializers.ValidationError(
                    {
                        "images_upload": (
                            f"Минимум {MIN_IMAGES_REQUIRED_FOR_PUBLISH} снимки са задължителни "
                            "за тази категория."
                        )
                    }
                )

        if attrs.get("description") is None:
            attrs["description"] = ""

        return attrs

    def to_internal_value(self, data):
        if hasattr(data, "getlist"):
            always_list_keys = {
                "images_upload",
                "features",
                "boat_features",
                "trailer_features",
                "boatFeatures",
                "trailerFeatures",
            }
            mutable_data = {}
            for key in data.keys():
                values = data.getlist(key)
                if not values:
                    continue
                if key in always_list_keys or len(values) > 1:
                    mutable_data[key] = list(values)
                else:
                    mutable_data[key] = values[0]
        else:
            mutable_data = data.copy() if hasattr(data, "copy") else dict(data)

        camel_to_snake = {
            "mainCategory": "main_category",
            "yearFrom": "year_from",
            "locationCountry": "location_country",
            "locationRegion": "location_region",
            "listingType": "listing_type",
            "topPlan": "top_plan",
            "vipPlan": "vip_plan",
            "euroStandard": "euro_standard",
            "wheelFor": "wheel_for",
            "wheelOfferType": "offer_type",
            "wheelTireBrand": "tire_brand",
            "wheelTireWidth": "tire_width",
            "wheelTireHeight": "tire_height",
            "wheelTireDiameter": "tire_diameter",
            "wheelTireSeason": "tire_season",
            "wheelTireSpeedIndex": "tire_speed_index",
            "wheelTireLoadIndex": "tire_load_index",
            "wheelTireTread": "tire_tread",
            "wheelBrand": "wheel_brand",
            "wheelMaterial": "material",
            "wheelBolts": "bolts",
            "wheelPcd": "pcd",
            "wheelCenterBore": "center_bore",
            "wheelOffset": "offset",
            "wheelWidth": "width",
            "wheelDiameter": "diameter",
            "wheelCount": "count",
            "wheelType": "wheel_type",
            "partFor": "part_for",
            "partCategory": "part_category",
            "partElement": "part_element",
            "partYearFrom": "part_year_from",
            "partYearTo": "part_year_to",
            "heavyAxles": "axles",
            "heavySeats": "seats",
            "heavyLoad": "load_kg",
            "engineType": "engine_type",
            "heavyEuroStandard": "heavy_euro_standard",
            "motoDisplacement": "displacement_cc",
            "equipmentType": "equipment_type",
            "forkliftLoad": "lift_capacity_kg",
            "forkliftHours": "hours",
            "caravanBeds": "beds",
            "caravanLength": "length_m",
            "caravanHasToilet": "has_toilet",
            "caravanHasHeating": "has_heating",
            "caravanHasAc": "has_air_conditioning",
            "boatCategory": "boat_category",
            "boatEngineCount": "engine_count",
            "boatMaterial": "material",
            "boatLength": "length_m",
            "boatWidth": "width_m",
            "boatDraft": "draft_m",
            "boatHours": "hours",
            "boatFeatures": "boat_features",
            "trailerCategory": "trailer_category",
            "trailerLoad": "load_kg",
            "trailerAxles": "axles",
            "trailerFeatures": "trailer_features",
            "classifiedFor": "classified_for",
            "accessoryCategory": "accessory_category",
            "buyServiceCategory": "buy_service_category",
        }
        for source_key, target_key in camel_to_snake.items():
            if source_key in mutable_data and target_key not in mutable_data:
                mutable_data[target_key] = mutable_data.get(source_key)

        for numeric_key in [
            "month", "year_from", "price", "mileage", "power", "displacement",
            "bolts", "count", "axles", "seats", "load_kg", "part_year_from", "part_year_to", "displacement_cc",
            "lift_capacity_kg", "hours", "beds", "length_m", "engine_count", "width_m", "draft_m"
        ]:
            if mutable_data.get(numeric_key, None) == "":
                mutable_data[numeric_key] = None

        choice_field_aliases = {
            "fuel": FUEL_ALIASES,
            "gearbox": GEARBOX_ALIASES,
            "condition": CONDITION_ALIASES,
            "category": CATEGORY_ALIASES,
            "listing_type": LISTING_TYPE_ALIASES,
            "main_category": MAIN_CATEGORY_ALIASES,
            "top_plan": TOP_PLAN_ALIASES,
            "vip_plan": VIP_PLAN_ALIASES,
        }
        for field_name, aliases in choice_field_aliases.items():
            if field_name in mutable_data:
                mutable_data[field_name] = _normalize_choice_alias(
                    mutable_data.get(field_name),
                    aliases,
                )

        def normalize_list_field(raw_value):
            if raw_value in (None, ""):
                return None

            if isinstance(raw_value, (list, tuple)):
                return [str(item).strip() for item in raw_value if str(item).strip()]

            if isinstance(raw_value, str):
                text = raw_value.strip()
                if not text:
                    return []

                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                    if isinstance(parsed, str):
                        return [parsed.strip()] if parsed.strip() else []
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass

                if "," in text:
                    return [item.strip() for item in text.split(",") if item.strip()]
                return [text]

            return None

        list_key_aliases = {
            "features": ["features"],
            "boat_features": ["boat_features", "boatFeatures"],
            "trailer_features": ["trailer_features", "trailerFeatures"],
        }

        for list_key, aliases in list_key_aliases.items():
            values_from_multipart = None
            if hasattr(data, "getlist"):
                for alias in aliases:
                    alias_values = data.getlist(alias)
                    if alias_values:
                        values_from_multipart = alias_values
                        break

            if values_from_multipart:
                if len(values_from_multipart) > 1:
                    mutable_data[list_key] = [
                        str(item).strip()
                        for item in values_from_multipart
                        if str(item).strip()
                    ]
                    continue
                raw_value = values_from_multipart[0]
            else:
                raw_value = None
                for alias in aliases:
                    if alias in mutable_data:
                        raw_value = mutable_data.get(alias)
                        break

            normalized_list = normalize_list_field(raw_value)
            if normalized_list is not None:
                mutable_data[list_key] = normalized_list

        return super().to_internal_value(mutable_data)

    def _extract_detail_payload(self, validated_data, main_category):
        detail_payload = {}
        normalized_main_category = str(main_category or '1')

        # Defensive cleanup: never let detail fields leak into CarListing(**validated_data).
        all_detail_fields = set()
        for fields in DETAIL_FIELDS_BY_MAIN_CATEGORY.values():
            all_detail_fields.update(fields)
        all_detail_fields.update({'heavy_euro_standard', 'boat_features', 'trailer_features', 'buy_service_category'})

        extracted_values = {}
        for field_name in all_detail_fields:
            if field_name in validated_data:
                extracted_values[field_name] = validated_data.pop(field_name)

        detail_fields = DETAIL_FIELDS_BY_MAIN_CATEGORY.get(normalized_main_category, [])
        for field_name in detail_fields:
            if field_name in extracted_values:
                detail_payload[field_name] = extracted_values[field_name]

        heavy_euro_standard = extracted_values.get('heavy_euro_standard')
        boat_features = extracted_values.get('boat_features')
        trailer_features = extracted_values.get('trailer_features')
        buy_service_category = extracted_values.get('buy_service_category')

        if normalized_main_category in {'3', '4'} and heavy_euro_standard not in (None, ''):
            detail_payload['euro_standard'] = heavy_euro_standard

        if normalized_main_category == 'a' and boat_features is not None:
            detail_payload['features'] = boat_features
        if normalized_main_category == 'b' and trailer_features is not None:
            detail_payload['features'] = trailer_features

        if normalized_main_category == 'y' and buy_service_category not in (None, ''):
            detail_payload['buy_category'] = buy_service_category
        if normalized_main_category == 'z' and buy_service_category not in (None, ''):
            detail_payload['service_category'] = buy_service_category

        return detail_payload

    def _upsert_details(self, listing, detail_payload):
        main_category = listing.main_category
        model_and_relation = DETAIL_MODEL_MAP.get(main_category)
        if not model_and_relation:
            return

        model_cls, relation_name = model_and_relation
        detail_instance = getattr(listing, relation_name, None)
        if detail_instance is None:
            detail_instance = model_cls(listing=listing)

        for key, value in detail_payload.items():
            setattr(detail_instance, key, value)
        detail_instance.save()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        model_and_relation = DETAIL_MODEL_MAP.get(instance.main_category)
        if not model_and_relation:
            return data

        detail_fields = DETAIL_FIELDS_BY_MAIN_CATEGORY.get(instance.main_category, [])
        has_derived_fields = instance.main_category in {'3', '4', 'a', 'b', 'y', 'z'}
        if not detail_fields and not has_derived_fields:
            return data

        _, relation_name = model_and_relation
        detail_instance = getattr(instance, relation_name, None)
        if detail_instance is None:
            return data

        for field_name in detail_fields:
            value = getattr(detail_instance, field_name, None)
            if isinstance(value, Decimal):
                value = str(value)
            data[field_name] = value

        if instance.main_category in {'3', '4'}:
            data['heavy_euro_standard'] = getattr(detail_instance, 'euro_standard', '')
        if instance.main_category == 'a':
            data['boat_features'] = getattr(detail_instance, 'features', []) or []
        if instance.main_category == 'b':
            data['trailer_features'] = getattr(detail_instance, 'features', []) or []
        if instance.main_category == 'y':
            data['buy_service_category'] = getattr(detail_instance, 'buy_category', '')
        if instance.main_category == 'z':
            data['buy_service_category'] = getattr(detail_instance, 'service_category', '')

        return data

    def create(self, validated_data):
        images_data = validated_data.pop('images_upload', [])
        main_category = validated_data.get('main_category', '1')
        detail_payload = self._extract_detail_payload(validated_data, main_category)

        listing = CarListing.objects.create(**validated_data)
        self._upsert_details(listing, detail_payload)

        for index, image in enumerate(images_data):
            is_cover = index == 0 and len(images_data) > 0
            CarImage.objects.create(
                listing=listing,
                image=image,
                order=index,
                is_cover=is_cover
            )

        return listing

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images_upload', [])
        main_category = validated_data.get('main_category', instance.main_category)
        detail_payload = self._extract_detail_payload(validated_data, main_category)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._upsert_details(instance, detail_payload)

        for image in images_data:
            CarImage.objects.create(
                listing=instance,
                image=image,
                order=instance.images.count(),
                is_cover=False
            )

        return instance


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for favorite listings"""
    listing = CarListingSerializer(read_only=True)
    listing_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'listing', 'listing_id', 'created_at']
        read_only_fields = ['id', 'created_at']


