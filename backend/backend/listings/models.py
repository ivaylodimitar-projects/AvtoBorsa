from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
import io
import os
import posixpath
from threading import Lock

from PIL import Image as PILImage, ImageOps
from django.conf import settings
from django.db import close_old_connections, models, transaction as db_transaction
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.files.base import ContentFile
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.utils.text import slugify

LISTING_EXPIRY_DAYS = 30
TOP_PLAN_1D = "1d"
TOP_PLAN_7D = "7d"
TOP_LISTING_DURATION_DAYS_1D = 1
TOP_LISTING_DURATION_DAYS_7D = 7
VIP_LISTING_DURATION_DAYS = 7
CAR_IMAGE_DETAIL_WIDTHS = (1200, 1600)
CAR_IMAGE_GRID_RENDITIONS = (
    (600, 356),
)
CAR_IMAGE_WEBP_QUALITY = 82
CAR_IMAGE_WEBP_METHOD = 4
CAR_IMAGE_LOW_RES_MIN_WIDTH = 800


def _resolve_rendition_worker_count():
    default_workers = max(2, min(4, os.cpu_count() or 2))
    raw_value = getattr(settings, "CAR_IMAGE_RENDITION_WORKERS", default_workers)
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        parsed = default_workers
    return max(1, min(8, parsed))


_CAR_IMAGE_RENDITION_EXECUTOR = None
_CAR_IMAGE_RENDITION_EXECUTOR_LOCK = Lock()
_CAR_IMAGE_PENDING_RENDITIONS = set()
_CAR_IMAGE_PENDING_RENDITIONS_LOCK = Lock()


def _get_car_image_rendition_executor():
    global _CAR_IMAGE_RENDITION_EXECUTOR
    if _CAR_IMAGE_RENDITION_EXECUTOR is not None:
        return _CAR_IMAGE_RENDITION_EXECUTOR

    with _CAR_IMAGE_RENDITION_EXECUTOR_LOCK:
        if _CAR_IMAGE_RENDITION_EXECUTOR is None:
            _CAR_IMAGE_RENDITION_EXECUTOR = ThreadPoolExecutor(
                max_workers=_resolve_rendition_worker_count(),
                thread_name_prefix="car-image-rendition",
            )
    return _CAR_IMAGE_RENDITION_EXECUTOR


def get_expiry_cutoff(now=None):
    """Return the datetime before which listings are considered expired."""
    current = now or timezone.now()
    return current - timedelta(days=LISTING_EXPIRY_DAYS)


def get_top_expiry(now=None, top_plan=TOP_PLAN_1D):
    """Return the datetime when a top listing should expire for the selected plan."""
    current = now or timezone.now()
    duration_days = (
        TOP_LISTING_DURATION_DAYS_1D
        if str(top_plan) == TOP_PLAN_1D
        else TOP_LISTING_DURATION_DAYS_7D
    )
    return current + timedelta(days=duration_days)


def get_listing_expiry(created_at=None, now=None):
    """Return the datetime when a listing expires."""
    base = created_at or now or timezone.now()
    return base + timedelta(days=LISTING_EXPIRY_DAYS)


def get_vip_short_expiry(now=None):
    """Return the datetime when a 7-day VIP window should expire."""
    current = now or timezone.now()
    return current + timedelta(days=VIP_LISTING_DURATION_DAYS)

class CarListing(models.Model):
    """Model for car listings/advertisements"""

    FUEL_CHOICES = [
        ('benzin', 'Бензин'),
        ('dizel', 'Дизел'),
        ('gaz_benzin', 'Газ/Бензин'),
        ('hibrid', 'Хибрид'),
        ('elektro', 'Електро'),
    ]

    GEARBOX_CHOICES = [
        ('ruchna', 'Ръчна'),
        ('avtomatik', 'Автоматик'),
    ]

    CONDITION_CHOICES = [
        ('0', 'Нов'),
        ('1', 'Употребяван'),
        ('2', 'Повреден/ударен'),
        ('3', 'За части'),
    ]

    CAR_TYPE_CHOICES = [
        ('van', 'Ван'),
        ('jeep', 'Джип'),
        ('cabriolet', 'Кабрио'),
        ('wagon', 'Комби'),
        ('coupe', 'Купе'),
        ('minivan', 'Миниван'),
        ('pickup', 'Пикап'),
        ('sedan', 'Седан'),
        ('stretch_limo', 'Стреч лимузина'),
        ('hatchback', 'Хечбек'),
    ]

    EURO_STANDARD_CHOICES = [
        ('1', 'Евро 1'),
        ('2', 'Евро 2'),
        ('3', 'Евро 3'),
        ('4', 'Евро 4'),
        ('5', 'Евро 5'),
        ('6', 'Евро 6'),
    ]

    LISTING_TYPE_CHOICES = [
        ('normal', 'Нормална'),
        ('top', 'Топ'),
        ('vip', 'VIP'),
    ]
    TOP_PLAN_CHOICES = [
        (TOP_PLAN_1D, '1 day'),
        (TOP_PLAN_7D, '7 days'),
    ]
    VIP_PLAN_CHOICES = [
        ('7d', '7 days'),
        ('lifetime', 'Lifetime'),
    ]

    MAIN_CATEGORY_CHOICES = [
        ('1', 'Автомобили и Джипове'),
        ('w', 'Гуми и джанти'),
        ('u', 'Части'),
        ('3', 'Бусове'),
        ('4', 'Камиони'),
        ('5', 'Мотоциклети'),
        ('6', 'Селскостопански'),
        ('7', 'Индустриални'),
        ('8', 'Кари'),
        ('9', 'Каравани'),
        ('a', 'Яхти и Лодки'),
        ('b', 'Ремаркета'),
        ('v', 'Аксесоари'),
        ('y', 'Купува'),
        ('z', 'Услуги'),
    ]

    # User and basic info
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='car_listings')
    main_category = models.CharField(max_length=1, choices=MAIN_CATEGORY_CHOICES, default='1')
    category = models.CharField(max_length=20, choices=CAR_TYPE_CHOICES, null=True, blank=True)
    title = models.CharField(max_length=200, null=True, blank=True)

    # Car details
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    slug = models.SlugField(max_length=255, unique=True, db_index=True, null=True, blank=True)
    year_from = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)])
    month = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(12)])
    vin = models.CharField(max_length=17, null=True, blank=True)

    # Price and location
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location_country = models.CharField(max_length=100, null=True, blank=True)
    location_region = models.CharField(max_length=100, null=True, blank=True)
    city = models.CharField(max_length=100)

    # Technical details
    fuel = models.CharField(max_length=20, choices=FUEL_CHOICES)
    gearbox = models.CharField(max_length=20, choices=GEARBOX_CHOICES)
    mileage = models.IntegerField(validators=[MinValueValidator(0)])
    color = models.CharField(max_length=50, null=True, blank=True)
    condition = models.CharField(max_length=1, choices=CONDITION_CHOICES, default='0')
    power = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    displacement = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    euro_standard = models.CharField(max_length=1, choices=EURO_STANDARD_CHOICES, null=True, blank=True)

    # Description and contact
    description = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()

    # Features (stored as JSON)
    features = models.JSONField(default=list, blank=True)

    # Status
    is_draft = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    is_kaparirano = models.BooleanField(default=False)
    risk_score = models.PositiveSmallIntegerField(default=0)
    risk_flags = models.JSONField(default=list, blank=True)
    requires_moderation = models.BooleanField(default=False)
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES, default='normal')
    top_plan = models.CharField(max_length=12, choices=TOP_PLAN_CHOICES, null=True, blank=True)
    top_paid_at = models.DateTimeField(null=True, blank=True)
    top_expires_at = models.DateTimeField(null=True, blank=True)
    vip_plan = models.CharField(max_length=12, choices=VIP_PLAN_CHOICES, null=True, blank=True)
    vip_paid_at = models.DateTimeField(null=True, blank=True)
    vip_expires_at = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Car Listing'
        verbose_name_plural = 'Car Listings'
        indexes = [
            models.Index(fields=['is_active', 'is_draft', 'is_archived', 'created_at'], name='carlist_state_created_idx'),
            models.Index(fields=['created_at'], name='carlist_created_idx'),
            models.Index(fields=['price'], name='carlist_price_idx'),
            models.Index(fields=['year_from'], name='carlist_year_idx'),
            models.Index(fields=['mileage'], name='carlist_mileage_idx'),
            models.Index(fields=['power'], name='carlist_power_idx'),
            models.Index(fields=['fuel'], name='carlist_fuel_idx'),
            models.Index(fields=['gearbox'], name='carlist_gearbox_idx'),
            models.Index(fields=['condition'], name='carlist_condition_idx'),
            models.Index(fields=['category'], name='carlist_category_idx'),
            models.Index(fields=['location_region'], name='carlist_region_idx'),
            models.Index(fields=['listing_type', 'top_expires_at'], name='carlist_top_exp_idx'),
            models.Index(fields=['listing_type', 'vip_expires_at'], name='carlist_vip_exp_idx'),
            models.Index(fields=['requires_moderation', 'created_at'], name='carlist_mod_created_idx'),
        ]

    def __str__(self):
        return f"{self.brand} {self.model} - {self.title}"

    def generate_slug(self):
        """Generate slug in format: obiava-{id}-{brand}-{model}"""
        if self.id and self.brand and self.model:
            brand_slug = slugify(self.brand)
            model_slug = slugify(self.model)
            return f"obiava-{self.id}-{brand_slug}-{model_slug}"
        return None

    def _clear_top_status(self):
        self.top_plan = None
        self.top_paid_at = None
        self.top_expires_at = None

    def _clear_vip_status(self):
        self.vip_plan = None
        self.vip_paid_at = None
        self.vip_expires_at = None

    def apply_listing_type_status(self, now=None):
        """Ensure promoted listings have expiries and demote expired ones."""
        current = now or timezone.now()
        if self.listing_type == 'top':
            if self.top_expires_at and self.top_expires_at <= current:
                self.listing_type = 'normal'
                self._clear_top_status()
                self._clear_vip_status()
                return

            if self.top_plan not in {TOP_PLAN_1D, TOP_PLAN_7D}:
                self.top_plan = TOP_PLAN_1D
            if self.top_paid_at is None:
                self.top_paid_at = current
            if self.top_expires_at is None:
                self.top_expires_at = get_top_expiry(self.top_paid_at, top_plan=self.top_plan)
            self._clear_vip_status()
            return

        if self.listing_type == 'vip':
            if self.vip_expires_at and self.vip_expires_at <= current:
                self.listing_type = 'normal'
                self._clear_top_status()
                self._clear_vip_status()
                return

            if self.vip_plan not in {'7d', 'lifetime'}:
                self.vip_plan = '7d'
            if self.vip_paid_at is None:
                self.vip_paid_at = current
            if self.vip_expires_at is None:
                if self.vip_plan == 'lifetime':
                    self.vip_expires_at = get_listing_expiry(self.created_at, now=current)
                else:
                    self.vip_expires_at = get_vip_short_expiry(self.vip_paid_at)
            self._clear_top_status()
            return

        self._clear_top_status()
        self._clear_vip_status()

    def apply_top_status(self, now=None):
        """Backward compatible wrapper for older callers."""
        self.apply_listing_type_status(now=now)

    @classmethod
    def demote_expired_top_listings(cls, now=None):
        """Bulk demote expired promoted listings to normal."""
        current = now or timezone.now()
        demoted_top = cls.objects.filter(
            listing_type='top',
            top_expires_at__isnull=False,
            top_expires_at__lte=current,
        ).update(
            listing_type='normal',
            top_plan=None,
            top_paid_at=None,
            top_expires_at=None,
            vip_plan=None,
            vip_paid_at=None,
            vip_expires_at=None,
        )
        demoted_vip = cls.objects.filter(
            listing_type='vip',
            vip_expires_at__isnull=False,
            vip_expires_at__lte=current,
        ).update(
            listing_type='normal',
            top_plan=None,
            top_paid_at=None,
            top_expires_at=None,
            vip_plan=None,
            vip_paid_at=None,
            vip_expires_at=None,
        )
        return demoted_top + demoted_vip

    def save(self, *args, **kwargs):
        """Override save to auto-generate slug"""
        old_price = None
        if self.pk:
            old_price = CarListing.objects.filter(pk=self.pk).values_list('price', flat=True).first()
        self.apply_listing_type_status()
        # First save to get an ID if it's a new object
        if not self.pk:
            # Remove force_insert to allow normal insert
            kwargs.pop('force_insert', None)
            super().save(*args, **kwargs)

        # Generate slug if not already set
        if not self.slug:
            generated_slug = self.generate_slug()
            if generated_slug:
                self.slug = generated_slug

        # Save again with the slug (now it's an update since we have pk)
        kwargs.pop('force_insert', None)
        super().save(*args, **kwargs)

        if old_price is not None and self.price is not None and old_price != self.price:
            CarListingPriceHistory.objects.create(
                listing=self,
                old_price=old_price,
                new_price=self.price,
                delta=self.price - old_price
            )


class CarListingPriceHistory(models.Model):
    """Track price changes for listings."""
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    delta = models.DecimalField(max_digits=10, decimal_places=2)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['listing', 'changed_at'], name='carlist_price_hist_idx'),
        ]

    def __str__(self):
        return f"Price change for {self.listing_id}: {self.old_price} -> {self.new_price}"


class ListingPurchase(models.Model):
    """Persistent history of balance purchases for TOP/VIP listing actions."""

    LISTING_TYPE_TOP = "top"
    LISTING_TYPE_VIP = "vip"
    LISTING_TYPE_CHOICES = [
        (LISTING_TYPE_TOP, "Top"),
        (LISTING_TYPE_VIP, "VIP"),
    ]

    SOURCE_PUBLISH = "publish"
    SOURCE_REPUBLISH = "republish"
    SOURCE_PROMOTE = "promote"
    SOURCE_UNKNOWN = "unknown"
    SOURCE_CHOICES = [
        (SOURCE_PUBLISH, "Publish"),
        (SOURCE_REPUBLISH, "Republish"),
        (SOURCE_PROMOTE, "Promote"),
        (SOURCE_UNKNOWN, "Unknown"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listing_purchases")
    listing = models.ForeignKey(
        CarListing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_records",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES)
    plan = models.CharField(max_length=12)
    source = models.CharField(max_length=16, choices=SOURCE_CHOICES, default=SOURCE_UNKNOWN)
    discount_ratio = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    listing_title_snapshot = models.CharField(max_length=200, blank=True)
    listing_brand_snapshot = models.CharField(max_length=100, blank=True)
    listing_model_snapshot = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"], name="lpurch_created_idx"),
            models.Index(fields=["user", "created_at"], name="lpurch_user_created_idx"),
            models.Index(fields=["listing_type", "created_at"], name="lpurch_type_created_idx"),
            models.Index(fields=["source", "created_at"], name="lpurch_source_created_idx"),
            models.Index(fields=["plan", "created_at"], name="lpurch_plan_created_idx"),
        ]

    def __str__(self):
        return (
            f"ListingPurchase(user={self.user_id}, listing={self.listing_id}, "
            f"type={self.listing_type}, plan={self.plan}, amount={self.amount})"
        )


class CarsListing(models.Model):
    """Dedicated details model for main_category='1' (Автомобили и Джипове)."""
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='cars_details')

    def __str__(self):
        return f"Cars details for listing {self.listing_id}"


class WheelsListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='wheels_details')
    wheel_for = models.CharField(max_length=8, blank=True)
    offer_type = models.CharField(max_length=8, blank=True)
    tire_brand = models.CharField(max_length=120, blank=True)
    tire_width = models.CharField(max_length=16, blank=True)
    tire_height = models.CharField(max_length=16, blank=True)
    tire_diameter = models.CharField(max_length=24, blank=True)
    tire_season = models.CharField(max_length=32, blank=True)
    tire_speed_index = models.CharField(max_length=16, blank=True)
    tire_load_index = models.CharField(max_length=16, blank=True)
    tire_tread = models.CharField(max_length=64, blank=True)
    wheel_brand = models.CharField(max_length=120, blank=True)
    material = models.CharField(max_length=60, blank=True)
    bolts = models.PositiveSmallIntegerField(null=True, blank=True)
    pcd = models.CharField(max_length=24, blank=True)
    center_bore = models.CharField(max_length=24, blank=True)
    offset = models.CharField(max_length=24, blank=True)
    width = models.CharField(max_length=24, blank=True)
    diameter = models.CharField(max_length=24, blank=True)
    count = models.PositiveSmallIntegerField(null=True, blank=True)
    wheel_type = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return f"Wheels details for listing {self.listing_id}"


class PartsListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='parts_details')
    part_for = models.CharField(max_length=8, blank=True)
    part_category = models.CharField(max_length=120, blank=True)
    part_element = models.CharField(max_length=120, blank=True)
    part_year_from = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
    )
    part_year_to = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
    )

    def __str__(self):
        return f"Parts details for listing {self.listing_id}"


class BusesListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='buses_details')
    axles = models.PositiveSmallIntegerField(null=True, blank=True)
    seats = models.PositiveIntegerField(null=True, blank=True)
    load_kg = models.PositiveIntegerField(null=True, blank=True)
    transmission = models.CharField(max_length=60, blank=True)
    engine_type = models.CharField(max_length=60, blank=True)
    euro_standard = models.CharField(max_length=24, blank=True)

    def __str__(self):
        return f"Bus details for listing {self.listing_id}"


class TrucksListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='trucks_details')
    axles = models.PositiveSmallIntegerField(null=True, blank=True)
    seats = models.PositiveIntegerField(null=True, blank=True)
    load_kg = models.PositiveIntegerField(null=True, blank=True)
    transmission = models.CharField(max_length=60, blank=True)
    engine_type = models.CharField(max_length=60, blank=True)
    euro_standard = models.CharField(max_length=24, blank=True)

    def __str__(self):
        return f"Truck details for listing {self.listing_id}"


class MotoListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='moto_details')
    displacement_cc = models.PositiveIntegerField(null=True, blank=True)
    transmission = models.CharField(max_length=60, blank=True)
    engine_type = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return f"Moto details for listing {self.listing_id}"


class AgriListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='agri_details')
    equipment_type = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return f"Agri details for listing {self.listing_id}"


class IndustrialListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='industrial_details')
    equipment_type = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return f"Industrial details for listing {self.listing_id}"


class ForkliftListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='forklift_details')
    engine_type = models.CharField(max_length=60, blank=True)
    lift_capacity_kg = models.PositiveIntegerField(null=True, blank=True)
    hours = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"Forklift details for listing {self.listing_id}"


class CaravanListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='caravan_details')
    beds = models.PositiveSmallIntegerField(null=True, blank=True)
    length_m = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    has_toilet = models.BooleanField(default=False)
    has_heating = models.BooleanField(default=False)
    has_air_conditioning = models.BooleanField(default=False)

    def __str__(self):
        return f"Caravan details for listing {self.listing_id}"


class BoatsListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='boats_details')
    boat_category = models.CharField(max_length=120, blank=True)
    engine_type = models.CharField(max_length=60, blank=True)
    engine_count = models.PositiveSmallIntegerField(null=True, blank=True)
    material = models.CharField(max_length=80, blank=True)
    length_m = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    width_m = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    draft_m = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    hours = models.PositiveIntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Boats details for listing {self.listing_id}"


class TrailersListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='trailers_details')
    trailer_category = models.CharField(max_length=120, blank=True)
    load_kg = models.PositiveIntegerField(null=True, blank=True)
    axles = models.PositiveSmallIntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Trailer details for listing {self.listing_id}"


class AccessoriesListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='accessories_details')
    classified_for = models.CharField(max_length=8, blank=True)
    accessory_category = models.CharField(max_length=160, blank=True)

    def __str__(self):
        return f"Accessory details for listing {self.listing_id}"


class BuyListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='buy_details')
    classified_for = models.CharField(max_length=8, blank=True)
    buy_category = models.CharField(max_length=160, blank=True)

    def __str__(self):
        return f"Buy details for listing {self.listing_id}"


class ServicesListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='services_details')
    classified_for = models.CharField(max_length=8, blank=True)
    service_category = models.CharField(max_length=160, blank=True)

    def __str__(self):
        return f"Service details for listing {self.listing_id}"


class CarImage(models.Model):
    """Model for storing images for car listings"""
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='car_listings/%Y/%m/%d/')
    thumbnail = models.ImageField(upload_to='car_listings/thumbs/%Y/%m/%d/', null=True, blank=True)
    original_width = models.PositiveIntegerField(null=True, blank=True)
    original_height = models.PositiveIntegerField(null=True, blank=True)
    low_res = models.BooleanField(default=False)
    renditions = models.JSONField(default=dict, blank=True)
    order = models.IntegerField(default=0)
    is_cover = models.BooleanField(default=False, help_text="Mark this image as the cover/main image for the listing")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Car Image'
        verbose_name_plural = 'Car Images'

    def __str__(self):
        return f"Image for {self.listing.title}"

    @staticmethod
    def _collect_rendition_paths(renditions_data):
        paths = set()
        if not isinstance(renditions_data, dict):
            return paths
        for items in renditions_data.values():
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                path = str(item.get('path') or '').strip()
                if path:
                    paths.add(path)
        return paths

    def _has_valid_renditions(self, payload):
        if not payload:
            return False
        width = payload.get('original_width')
        height = payload.get('original_height')
        if not isinstance(width, int) or width <= 0:
            return False
        if not isinstance(height, int) or height <= 0:
            return False
        return bool(self._collect_rendition_paths(payload.get('renditions')))

    def _get_rendition_directory(self):
        image_name = str(self.image.name or '')
        image_dir = posixpath.dirname(image_name)
        if image_dir:
            return posixpath.join(image_dir, 'renditions')
        return 'car_listings/renditions'

    def _build_rendition_path(self, base_name, kind, width):
        return posixpath.join(
            self._get_rendition_directory(),
            f'{base_name}_{kind}_{width}.webp',
        )

    def _store_rendition(self, rendered_image, rendition_path):
        buffer = io.BytesIO()
        rendered_image.save(
            buffer,
            format='WEBP',
            quality=CAR_IMAGE_WEBP_QUALITY,
            method=CAR_IMAGE_WEBP_METHOD,
            optimize=True,
        )
        storage = self.image.storage
        _delete_storage_path_safely(storage, rendition_path)
        storage.save(rendition_path, ContentFile(buffer.getvalue()))
        return rendition_path

    def _generate_webp_renditions(self):
        if not self.image:
            return None

        try:
            self.image.open('rb')
            with PILImage.open(self.image) as source_file:
                source = ImageOps.exif_transpose(source_file).convert('RGB')
                original_width, original_height = source.size
                if original_width <= 0 or original_height <= 0:
                    return None

                image_name = os.path.basename(self.image.name or f'listing-{self.pk}')
                base_name, _ = os.path.splitext(image_name)
                resampling = getattr(PILImage, 'Resampling', PILImage)

                renditions = []
                thumbnail_path = None

                for detail_width in CAR_IMAGE_DETAIL_WIDTHS:
                    if detail_width > original_width:
                        continue
                    detail_height = max(
                        1,
                        int(round((detail_width / float(original_width)) * original_height)),
                    )
                    resized = source.resize(
                        (detail_width, detail_height),
                        resampling.LANCZOS,
                    )
                    try:
                        rendition_path = self._build_rendition_path(base_name, 'detail', detail_width)
                        stored_path = self._store_rendition(resized, rendition_path)
                    finally:
                        resized.close()
                    renditions.append(
                        {
                            'width': detail_width,
                            'height': detail_height,
                            'kind': 'detail',
                            'format': 'webp',
                            'path': stored_path,
                        }
                    )

                for grid_width, grid_height in CAR_IMAGE_GRID_RENDITIONS:
                    if grid_width > original_width or grid_height > original_height:
                        continue
                    fitted = ImageOps.fit(
                        source,
                        (grid_width, grid_height),
                        method=resampling.LANCZOS,
                        centering=(0.5, 0.5),
                    )
                    try:
                        rendition_path = self._build_rendition_path(base_name, 'grid', grid_width)
                        stored_path = self._store_rendition(fitted, rendition_path)
                    finally:
                        fitted.close()
                    renditions.append(
                        {
                            'width': grid_width,
                            'height': grid_height,
                            'kind': 'grid',
                            'format': 'webp',
                            'path': stored_path,
                        }
                    )
                    if thumbnail_path is None:
                        thumbnail_path = stored_path

                renditions.sort(key=lambda item: (0 if item.get('kind') == 'grid' else 1, item.get('width') or 0))
                return {
                    'original_width': original_width,
                    'original_height': original_height,
                    'thumbnail_path': thumbnail_path,
                    'renditions': renditions,
                }
        except Exception:
            return None
        finally:
            try:
                self.image.close()
            except Exception:
                pass

    def _cleanup_previous_assets(self, previous):
        if not previous or not self.image:
            return
        storage = self.image.storage
        previous_image = str(previous.get('image') or '').strip()
        previous_thumbnail = str(previous.get('thumbnail') or '').strip()
        current_image = str(self.image.name or '').strip()

        if previous_image and previous_image != current_image:
            _delete_storage_path_safely(storage, previous_image)
        if previous_thumbnail and previous_thumbnail != current_image:
            _delete_storage_path_safely(storage, previous_thumbnail)
        for rendition_path in self._collect_rendition_paths(previous.get('renditions')):
            if rendition_path != current_image:
                _delete_storage_path_safely(storage, rendition_path)

    @classmethod
    def _schedule_rendition_generation(cls, image_id):
        try:
            normalized_id = int(image_id)
        except (TypeError, ValueError):
            return
        if normalized_id <= 0:
            return

        with _CAR_IMAGE_PENDING_RENDITIONS_LOCK:
            if normalized_id in _CAR_IMAGE_PENDING_RENDITIONS:
                return
            _CAR_IMAGE_PENDING_RENDITIONS.add(normalized_id)

        def _enqueue():
            try:
                _get_car_image_rendition_executor().submit(
                    cls._run_rendition_generation_task,
                    normalized_id,
                )
            except Exception:
                with _CAR_IMAGE_PENDING_RENDITIONS_LOCK:
                    _CAR_IMAGE_PENDING_RENDITIONS.discard(normalized_id)

        try:
            db_transaction.on_commit(_enqueue)
        except Exception:
            _enqueue()

    @classmethod
    def _run_rendition_generation_task(cls, image_id):
        close_old_connections()
        try:
            image_obj = cls.objects.filter(pk=image_id).only(
                'id',
                'image',
                'thumbnail',
                'original_width',
                'original_height',
                'low_res',
                'renditions',
            ).first()
            if image_obj is None or not image_obj.image:
                return

            current_payload = {
                'original_width': image_obj.original_width,
                'original_height': image_obj.original_height,
                'renditions': image_obj.renditions,
            }
            if image_obj._has_valid_renditions(current_payload):
                return

            generated = image_obj._generate_webp_renditions()
            if not generated:
                return

            original_width = generated.get('original_width')
            cls.objects.filter(pk=image_obj.pk).update(
                thumbnail=generated.get('thumbnail_path') or None,
                original_width=original_width,
                original_height=generated.get('original_height'),
                low_res=bool(original_width and original_width < CAR_IMAGE_LOW_RES_MIN_WIDTH),
                renditions={'webp': generated.get('renditions') or []},
            )
        finally:
            with _CAR_IMAGE_PENDING_RENDITIONS_LOCK:
                _CAR_IMAGE_PENDING_RENDITIONS.discard(image_id)
            close_old_connections()

    def save(self, *args, **kwargs):
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            normalized_update_fields = {str(field_name) for field_name in update_fields}
            image_related_fields = {
                'image',
                'thumbnail',
                'original_width',
                'original_height',
                'low_res',
                'renditions',
            }
            if normalized_update_fields and normalized_update_fields.isdisjoint(image_related_fields):
                super().save(*args, **kwargs)
                return

        previous = None
        if self.pk:
            previous = CarImage.objects.filter(pk=self.pk).values(
                'image',
                'thumbnail',
                'renditions',
                'original_width',
                'original_height',
            ).first()
        super().save(*args, **kwargs)

        if not self.image:
            return

        current_image_name = str(self.image.name or '').strip()
        if not current_image_name:
            return

        previous_image_name = str((previous or {}).get('image') or '').strip()
        image_changed = bool(previous and previous_image_name and previous_image_name != current_image_name)

        should_generate = previous is None or image_changed or not self._has_valid_renditions(previous)
        if not should_generate:
            return

        if image_changed:
            self._cleanup_previous_assets(previous)

        should_defer_renditions = bool(getattr(self, '_defer_renditions', False)) or (
            previous is None and bool(getattr(settings, 'CAR_IMAGE_ASYNC_RENDITIONS', True))
        )
        if should_defer_renditions:
            self._schedule_rendition_generation(self.pk)
            return

        generated = self._generate_webp_renditions()
        if not generated:
            return

        thumbnail_path = generated.get('thumbnail_path')
        self.thumbnail = thumbnail_path or None
        self.original_width = generated.get('original_width')
        self.original_height = generated.get('original_height')
        self.low_res = bool(self.original_width and self.original_width < CAR_IMAGE_LOW_RES_MIN_WIDTH)
        self.renditions = {
            'webp': generated.get('renditions') or [],
        }

        super().save(
            update_fields=[
                'thumbnail',
                'original_width',
                'original_height',
                'low_res',
                'renditions',
            ]
        )

    def ensure_renditions(self):
        """Generate renditions for legacy images that predate rendition support."""
        if not self.image:
            return False
        current_payload = {
            'original_width': self.original_width,
            'original_height': self.original_height,
            'renditions': self.renditions,
        }
        if self._has_valid_renditions(current_payload):
            return False
        self.save()
        return True


def _delete_storage_path_safely(storage, name):
    normalized = str(name or '').strip()
    if not normalized:
        return
    try:
        if storage.exists(normalized):
            storage.delete(normalized)
            return
    except Exception:
        pass

    try:
        storage.delete(normalized)
    except Exception:
        pass


def _delete_file_field_safely(file_field):
    name = getattr(file_field, 'name', '') or ''
    if not name:
        return
    try:
        _delete_storage_path_safely(file_field.storage, name)
    except Exception:
        pass


@receiver(post_delete, sender=CarImage)
def cleanup_car_image_files(sender, instance, **kwargs):
    """Ensure image files are removed from storage when CarImage rows are deleted."""
    _delete_file_field_safely(instance.thumbnail)
    for rendition_path in CarImage._collect_rendition_paths(getattr(instance, 'renditions', {}) or {}):
        try:
            _delete_storage_path_safely(instance.image.storage, rendition_path)
        except Exception:
            pass
    _delete_file_field_safely(instance.image)


class ListingView(models.Model):
    """Track unique listing views per authenticated user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listing_views')
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='viewer_entries')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'listing')
        ordering = ['-created_at']
        verbose_name = 'Listing View'
        verbose_name_plural = 'Listing Views'

    def __str__(self):
        return f"{self.user.email} viewed {self.listing_id}"


class ListingAnonymousView(models.Model):
    """Track unique listing views per anonymous browser session."""
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='anonymous_viewer_entries')
    session_key = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('listing', 'session_key')
        ordering = ['-created_at']
        verbose_name = 'Listing Anonymous View'
        verbose_name_plural = 'Listing Anonymous Views'

    def __str__(self):
        return f"anonymous({self.session_key}) viewed {self.listing_id}"


class Favorite(models.Model):
    """Model for storing user's favorite listings"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'listing')
        ordering = ['-created_at']
        verbose_name = 'Favorite'
        verbose_name_plural = 'Favorites'

    def __str__(self):
        return f"{self.user.email} favorited {self.listing.brand} {self.listing.model}"


