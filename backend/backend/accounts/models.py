from django.db import models
from django.contrib.auth.models import User
from django.core.validators import EmailValidator

class PrivateUser(models.Model):
    """Model for private user accounts"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='private_profile')
    email = models.EmailField(unique=True, validators=[EmailValidator()])
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
    dealer_name = models.CharField(max_length=80)
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Business User: {self.dealer_name}"

    class Meta:
        verbose_name = "Business User"
        verbose_name_plural = "Business Users"
