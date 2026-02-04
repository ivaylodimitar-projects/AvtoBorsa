from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

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

    CATEGORY_CHOICES = [
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
    category = models.CharField(max_length=1, choices=CATEGORY_CHOICES, default='1')
    title = models.CharField(max_length=200, null=True, blank=True)

    # Car details
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year_from = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)])
    year_to = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1900), MaxValueValidator(2100)])

    # Price and location
    price = models.DecimalField(max_digits=10, decimal_places=2)
    city = models.CharField(max_length=100)

    # Technical details
    fuel = models.CharField(max_length=20, choices=FUEL_CHOICES)
    gearbox = models.CharField(max_length=20, choices=GEARBOX_CHOICES)
    mileage = models.IntegerField(validators=[MinValueValidator(0)])

    # Description and contact
    description = models.TextField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()

    # Features (stored as JSON)
    features = models.JSONField(default=list, blank=True)

    # Status
    is_draft = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Car Listing'
        verbose_name_plural = 'Car Listings'

    def __str__(self):
        return f"{self.brand} {self.model} - {self.title}"


class CarImage(models.Model):
    """Model for storing images for car listings"""
    listing = models.ForeignKey(CarListing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='car_listings/%Y/%m/%d/')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Car Image'
        verbose_name_plural = 'Car Images'

    def __str__(self):
        return f"Image for {self.listing.title}"
