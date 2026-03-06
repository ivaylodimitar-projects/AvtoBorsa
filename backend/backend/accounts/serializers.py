from rest_framework import serializers
from django.contrib.auth.models import User
import re
from backend.listings.models import get_expiry_cutoff
from .models import PrivateUser, BusinessUser, UserProfile


def _normalize_email(value: str) -> str:
    return str(value).strip().lower()


EMAIL_MAX_LENGTH = 254
BUSINESS_LOGIN_IDENTIFIER_MAX_LENGTH = 150
BG_PHONE_PREFIX = "+359"
BG_PHONE_DIGIT_COUNT = 8

PASSWORD_POLICY_ERROR = (
    "Паролата трябва да е поне 8 символа, с поне 1 главна буква и 1 цифра."
)

EMAIL_ERROR_MESSAGES = {
    "blank": "Имейлът е задължителен.",
    "required": "Имейлът е задължителен.",
    "invalid": "Въведете валиден имейл адрес.",
    "max_length": f"Имейлът може да бъде най-много {EMAIL_MAX_LENGTH} символа.",
}

PRIVATE_USERNAME_ERROR_MESSAGES = {
    "blank": "Потребителското име е задължително.",
    "required": "Потребителското име е задължително.",
    "min_length": "Потребителското име трябва да е поне 3 символа.",
    "max_length": "Потребителското име може да бъде най-много 32 символа.",
}

BUSINESS_LOGIN_IDENTIFIER_ERROR_MESSAGES = {
    "blank": "Полето за вход е задължително.",
    "required": "Полето за вход е задължително.",
    "min_length": "Полето за вход трябва да е поне 3 символа.",
    "max_length": (
        f"Полето за вход може да бъде най-много "
        f"{BUSINESS_LOGIN_IDENTIFIER_MAX_LENGTH} символа."
    ),
}

PASSWORD_FIELD_ERROR_MESSAGES = {
    "blank": "Паролата е задължителна.",
    "required": "Паролата е задължителна.",
    "min_length": "Паролата трябва да е поне 8 символа.",
}

CONFIRM_PASSWORD_ERROR_MESSAGES = {
    "blank": "Потвърждението на паролата е задължително.",
    "required": "Потвърждението на паролата е задължително.",
    "min_length": "Потвърждението на паролата трябва да е поне 8 символа.",
}

ACCEPTED_TERMS_REQUIRED_MESSAGE = "Трябва да приемете Общите условия."
BG_PHONE_ERROR_MESSAGE = f"Номерът трябва да е във формат {BG_PHONE_PREFIX}12345678."


def _validate_password_policy(password: str) -> None:
    has_uppercase = any(char.isupper() for char in password)
    has_digit = any(char.isdigit() for char in password)
    if len(password) < 8 or not has_uppercase or not has_digit:
        raise serializers.ValidationError(PASSWORD_POLICY_ERROR)


def _validate_bg_phone_number(value: str) -> str:
    phone = str(value or "").strip()
    if not re.fullmatch(rf"\{BG_PHONE_PREFIX}\d{{{BG_PHONE_DIGIT_COUNT}}}", phone):
        raise serializers.ValidationError(BG_PHONE_ERROR_MESSAGE)
    return phone


class PrivateUserSerializer(serializers.ModelSerializer):
    """Serializer for private user registration"""
    username = serializers.CharField(
        min_length=3,
        max_length=32,
        error_messages=PRIVATE_USERNAME_ERROR_MESSAGES,
    )
    email = serializers.EmailField(
        max_length=EMAIL_MAX_LENGTH,
        error_messages=EMAIL_ERROR_MESSAGES,
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages=PASSWORD_FIELD_ERROR_MESSAGES,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages=CONFIRM_PASSWORD_ERROR_MESSAGES,
    )
    accepted_terms = serializers.BooleanField(
        write_only=True,
        error_messages={"required": ACCEPTED_TERMS_REQUIRED_MESSAGE},
    )

    class Meta:
        model = PrivateUser
        fields = ['username', 'email', 'password', 'confirm_password', 'accepted_terms']

    def validate(self, data):
        _validate_password_policy(data['password'])
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
        if not data.get('accepted_terms'):
            raise serializers.ValidationError({"accepted_terms": ACCEPTED_TERMS_REQUIRED_MESSAGE})
        return data

    def validate_email(self, value):
        email = _normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Потребител с този имейл вече съществува.")
        return email

    def validate_username(self, value):
        username = str(value).strip().lower()
        if not re.fullmatch(r"[a-z0-9]{3,32}", username):
            raise serializers.ValidationError(
                "Потребителското име може да съдържа само малки латински букви и цифри."
            )
        if PrivateUser.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Потребителското име вече съществува.")
        if BusinessUser.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Потребителското име вече съществува.")
        return username

    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        password = validated_data.pop('password')
        validated_data.pop('confirm_password', None)
        validated_data.pop('accepted_terms', None)

        # Create Django User
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            is_active=False
        )
        
        # Create PrivateUser profile
        private_user = PrivateUser.objects.create(
            user=user,
            email=email,
            username=username,
        )
        
        return private_user


class BusinessUserSerializer(serializers.ModelSerializer):
    """Serializer for business user registration"""
    username = serializers.CharField(
        min_length=3,
        max_length=BUSINESS_LOGIN_IDENTIFIER_MAX_LENGTH,
        trim_whitespace=True,
        error_messages=BUSINESS_LOGIN_IDENTIFIER_ERROR_MESSAGES,
    )
    email = serializers.EmailField(
        max_length=EMAIL_MAX_LENGTH,
        error_messages=EMAIL_ERROR_MESSAGES,
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages=PASSWORD_FIELD_ERROR_MESSAGES,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages=CONFIRM_PASSWORD_ERROR_MESSAGES,
    )
    accepted_terms = serializers.BooleanField(
        write_only=True,
        error_messages={"required": ACCEPTED_TERMS_REQUIRED_MESSAGE},
    )

    class Meta:
        model = BusinessUser
        fields = [
            'dealer_name', 'city', 'address', 'phone', 'email', 'website',
            'username', 'password', 'confirm_password', 'accepted_terms',
            'company_name', 'registration_address', 'mol', 'bulstat', 'vat_number',
            'admin_name', 'admin_phone', 'description'
        ]

    def validate(self, data):
        _validate_password_policy(data['password'])
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
        if not data.get('accepted_terms'):
            raise serializers.ValidationError({"accepted_terms": ACCEPTED_TERMS_REQUIRED_MESSAGE})
        if len(data['bulstat']) != 9:
            raise serializers.ValidationError({"bulstat": "БУЛСТАТ/ЕИК трябва да е 9 символа"})
        return data

    def validate_email(self, value):
        email = _normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Потребител с този имейл вече съществува.")
        return email

    def validate_username(self, value):
        username = str(value).strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Това поле за вход вече се използва.")
        if PrivateUser.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Това поле за вход вече се използва.")
        if BusinessUser.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Това поле за вход вече се използва.")
        return username

    def validate_dealer_name(self, value):
        dealer_name = str(value).strip()
        if BusinessUser.objects.filter(dealer_name__iexact=dealer_name).exists():
            raise serializers.ValidationError("Името на дилъра вече съществува.")
        return dealer_name

    def validate_phone(self, value):
        return _validate_bg_phone_number(value)

    def validate_admin_phone(self, value):
        return _validate_bg_phone_number(value)

    def create(self, validated_data):
        email = validated_data['email']
        username = str(validated_data['username']).strip()
        password = validated_data.pop('password')
        validated_data.pop('confirm_password', None)
        validated_data.pop('accepted_terms', None)

        # Create Django User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=False
        )
        
        # Create BusinessUser profile
        business_user = BusinessUser.objects.create(
            user=user,
            **validated_data
        )

        return business_user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile and balance"""
    class Meta:
        model = UserProfile
        fields = ['id', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserBalanceSerializer(serializers.ModelSerializer):
    """Serializer for user balance updates"""
    class Meta:
        model = UserProfile
        fields = ['balance']


class DealerListSerializer(serializers.ModelSerializer):
    """Serializer for listing dealers on the dealers page"""
    listing_count = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessUser
        fields = [
            'id', 'dealer_name', 'city', 'phone', 'email',
            'profile_image_url', 'listing_count', 'created_at',
        ]

    def get_listing_count(self, obj):
        cutoff = get_expiry_cutoff()
        return obj.user.car_listings.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        ).count()

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


class DealerDetailSerializer(serializers.ModelSerializer):
    """Full dealer info for the detail page"""
    listing_count = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessUser
        fields = [
            'id', 'dealer_name', 'city', 'address', 'phone', 'email', 'website',
            'company_name', 'description', 'about_text',
            'profile_image_url', 'listing_count', 'created_at',
        ]

    def get_listing_count(self, obj):
        cutoff = get_expiry_cutoff()
        return obj.user.car_listings.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        ).count()

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None
