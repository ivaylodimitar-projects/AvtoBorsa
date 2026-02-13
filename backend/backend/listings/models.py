from datetime import timedelta
import io
import os

from PIL import Image as PILImage, ImageOps
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import slugify

LISTING_EXPIRY_DAYS = 30
TOP_LISTING_DURATION_DAYS = 14
CAR_IMAGE_THUMBNAIL_SIZE = (280, 194)
CAR_IMAGE_THUMBNAIL_QUALITY = 82


def get_expiry_cutoff(now=None):
    """Return the datetime before which listings are considered expired."""
    current = now or timezone.now()
    return current - timedelta(days=LISTING_EXPIRY_DAYS)


def get_top_expiry(now=None):
    """Return the datetime when a top listing should expire."""
    current = now or timezone.now()
    return current + timedelta(days=TOP_LISTING_DURATION_DAYS)

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
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES, default='normal')
    top_paid_at = models.DateTimeField(null=True, blank=True)
    top_expires_at = models.DateTimeField(null=True, blank=True)
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

    def apply_top_status(self, now=None):
        """Ensure top listings have an expiry and demote expired ones."""
        current = now or timezone.now()
        if self.listing_type == 'top':
            if self.top_expires_at and self.top_expires_at <= current:
                self.listing_type = 'normal'
                self.top_paid_at = None
                self.top_expires_at = None
                return

            if self.top_paid_at is None:
                self.top_paid_at = current
            if self.top_expires_at is None:
                self.top_expires_at = get_top_expiry(self.top_paid_at)
        else:
            self.top_paid_at = None
            self.top_expires_at = None

    @classmethod
    def demote_expired_top_listings(cls, now=None):
        """Bulk demote expired top listings to normal."""
        current = now or timezone.now()
        return cls.objects.filter(
            listing_type='top',
            top_expires_at__isnull=False,
            top_expires_at__lte=current,
        ).update(listing_type='normal', top_paid_at=None, top_expires_at=None)

    def save(self, *args, **kwargs):
        """Override save to auto-generate slug"""
        old_price = None
        if self.pk:
            old_price = CarListing.objects.filter(pk=self.pk).values_list('price', flat=True).first()
        self.apply_top_status()
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


class CarsListing(models.Model):
    """Dedicated details model for main_category='1' (Автомобили и Джипове)."""
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='cars_details')

    def __str__(self):
        return f"Cars details for listing {self.listing_id}"


class WheelsListing(models.Model):
    listing = models.OneToOneField(CarListing, on_delete=models.CASCADE, related_name='wheels_details')
    wheel_for = models.CharField(max_length=8, blank=True)
    offer_type = models.CharField(max_length=8, blank=True)
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
    order = models.IntegerField(default=0)
    is_cover = models.BooleanField(default=False, help_text="Mark this image as the cover/main image for the listing")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Car Image'
        verbose_name_plural = 'Car Images'

    def __str__(self):
        return f"Image for {self.listing.title}"

    def _build_thumbnail_content(self):
        if not self.image:
            return None
        try:
            self.image.open('rb')
            with PILImage.open(self.image) as source:
                source = source.convert('RGB')
                resampling = getattr(PILImage, 'Resampling', PILImage)
                thumb = ImageOps.fit(
                    source,
                    CAR_IMAGE_THUMBNAIL_SIZE,
                    method=resampling.LANCZOS,
                    centering=(0.5, 0.5),
                )
                buffer = io.BytesIO()
                thumb.save(
                    buffer,
                    format='WEBP',
                    quality=CAR_IMAGE_THUMBNAIL_QUALITY,
                    optimize=True,
                )
                return ContentFile(buffer.getvalue())
        except Exception:
            return None
        finally:
            try:
                self.image.close()
            except Exception:
                pass

    def save(self, *args, **kwargs):
        should_generate_thumbnail = bool(self.image)
        if self.pk and should_generate_thumbnail:
            previous = CarImage.objects.filter(pk=self.pk).values('image', 'thumbnail').first()
            if previous and str(previous.get('image') or '') == str(self.image.name or '') and previous.get('thumbnail'):
                should_generate_thumbnail = False

        super().save(*args, **kwargs)

        if not should_generate_thumbnail:
            return

        thumbnail_content = self._build_thumbnail_content()
        if not thumbnail_content:
            return

        image_name = os.path.basename(self.image.name or f'listing-{self.pk}')
        base_name, _ = os.path.splitext(image_name)
        self.thumbnail.save(f'{base_name}_sm.webp', thumbnail_content, save=False)
        super().save(update_fields=['thumbnail'])


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
