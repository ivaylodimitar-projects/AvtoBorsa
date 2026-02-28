import io
import hashlib
import secrets
from PIL import Image as PILImage
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import EmailValidator
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

class UserProfile(models.Model):
    """Model for user balance and profile information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.email} - Balance: {self.balance} EUR"

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"


class UserImportApiKey(models.Model):
    """API key used by external tools (e.g. Chrome extension) to import listings."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='import_api_key')
    key_prefix = models.CharField(max_length=16, blank=True)
    key_hash = models.CharField(max_length=64, unique=True, db_index=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Import API key for {self.user.email}"

    @staticmethod
    def hash_key(raw_key: str) -> str:
        value = str(raw_key or "").strip()
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    @classmethod
    def generate_raw_key(cls) -> str:
        return f"karbg_{secrets.token_urlsafe(32)}"

    def set_raw_key(self, raw_key: str) -> None:
        value = str(raw_key or "").strip()
        self.key_hash = self.hash_key(value)
        self.key_prefix = value[:12]

    def mark_used(self) -> None:
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at', 'updated_at'])

    class Meta:
        verbose_name = "User Import API Key"
        verbose_name_plural = "User Import API Keys"


class ImportApiUsageEvent(models.Model):
    """Audit log for import API requests coming from external clients."""

    SOURCE_EXTENSION = "extension"
    SOURCE_PUBLIC_API = "public_api"
    SOURCE_UNKNOWN = "unknown"
    SOURCE_CHOICES = (
        (SOURCE_EXTENSION, "Chrome Extension"),
        (SOURCE_PUBLIC_API, "Public API"),
        (SOURCE_UNKNOWN, "Unknown"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="import_api_usage_events",
        null=True,
        blank=True,
    )
    api_key = models.ForeignKey(
        UserImportApiKey,
        on_delete=models.SET_NULL,
        related_name="usage_events",
        null=True,
        blank=True,
    )
    imported_listing = models.ForeignKey(
        "listings.CarListing",
        on_delete=models.SET_NULL,
        related_name="import_api_usage_events",
        null=True,
        blank=True,
    )
    imported_listing_id_snapshot = models.PositiveIntegerField(null=True, blank=True)

    endpoint = models.CharField(max_length=120, default="/api/auth/import/copart/")
    request_method = models.CharField(max_length=12, default="POST")
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default=SOURCE_EXTENSION,
    )
    status_code = models.PositiveSmallIntegerField(default=0, db_index=True)
    success = models.BooleanField(default=False, db_index=True)

    lot_number = models.CharField(max_length=80, blank=True)
    source_url = models.URLField(max_length=1000, blank=True)
    source_host = models.CharField(max_length=255, blank=True, db_index=True)
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    extension_version = models.CharField(max_length=32, blank=True)
    payload_bytes = models.PositiveIntegerField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        owner = self.user.email if self.user else "anonymous"
        return f"{self.endpoint} {self.status_code} ({owner})"

    class Meta:
        verbose_name = "Import API Usage Event"
        verbose_name_plural = "Import API Usage Events"
        indexes = [
            models.Index(fields=["user", "created_at"], name="impapi_usr_created_idx"),
            models.Index(fields=["source", "created_at"], name="impapi_src_created_idx"),
            models.Index(fields=["success", "created_at"], name="impapi_ok_created_idx"),
            models.Index(fields=["status_code", "created_at"], name="impapi_st_created_idx"),
        ]


# Signal to create UserProfile when a new User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


class PrivateUser(models.Model):
    """Model for private user accounts"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='private_profile')
    email = models.EmailField(unique=True, validators=[EmailValidator()])
    username = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Private User: {self.email}"

    class Meta:
        verbose_name = "Private User"
        verbose_name_plural = "Private Users"


class BusinessUser(models.Model):
    """Model for business/dealer user accounts"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business_profile')

    # Име и контакти (Name and Contacts)
    dealer_name = models.CharField(max_length=80, unique=True)
    city = models.CharField(max_length=50)
    address = models.CharField(max_length=80)
    phone = models.CharField(max_length=25)
    email = models.EmailField(unique=True, validators=[EmailValidator()])
    website = models.URLField(blank=True, null=True)

    # Потребителско име и парола (Username and Password)
    username = models.CharField(max_length=16, unique=True)

    # Фирмени данни (Company Data)
    company_name = models.CharField(max_length=60)
    registration_address = models.CharField(max_length=80)
    mol = models.CharField(max_length=35)  # Manager of Operations
    bulstat = models.CharField(max_length=25)  # Business Registration Number
    vat_number = models.CharField(max_length=25, blank=True, null=True)

    # Администратор (Administrator)
    admin_name = models.CharField(max_length=30)
    admin_phone = models.CharField(max_length=30)

    # Description
    description = models.TextField(blank=True, null=True)

    # Profile image & about
    profile_image = models.ImageField(upload_to='dealer_photos/', blank=True, null=True)
    about_text = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Business User: {self.dealer_name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.profile_image:
            try:
                img = PILImage.open(self.profile_image.path)
                if img.width > 160 or img.height > 160:
                    img = img.convert('RGB')
                    img.thumbnail((160, 160), PILImage.LANCZOS)
                    img.save(self.profile_image.path, quality=90)
            except Exception:
                pass

    class Meta:
        verbose_name = "Business User"
        verbose_name_plural = "Business Users"
