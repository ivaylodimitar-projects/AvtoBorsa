from datetime import timedelta

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.utils.text import slugify

LISTING_EXPIRY_DAYS = 30
TOP_LISTING_DURATION_DAYS = 14


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
        ('c', 'Велосипеди'),
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


class CarImage(models.Model):
    """Model for storing images for car listings"""
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='car_listings/%Y/%m/%d/')
    order = models.IntegerField(default=0)
    is_cover = models.BooleanField(default=False, help_text="Mark this image as the cover/main image for the listing")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Car Image'
        verbose_name_plural = 'Car Images'

    def __str__(self):
        return f"Image for {self.listing.title}"


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
