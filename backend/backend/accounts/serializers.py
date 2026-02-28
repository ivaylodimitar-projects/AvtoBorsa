from rest_framework import serializers
from django.contrib.auth.models import User
import re
from backend.listings.models import get_expiry_cutoff
from .models import PrivateUser, BusinessUser, UserProfile


def _normalize_email(value: str) -> str:
    return str(value).strip().lower()


PASSWORD_POLICY_ERROR = (
    "Паролата трябва да е поне 8 символа, с поне 1 главна буква и 1 цифра."
)


def _validate_password_policy(password: str) -> None:
    has_uppercase = any(char.isupper() for char in password)
    has_digit = any(char.isdigit() for char in password)
    if len(password) < 8 or not has_uppercase or not has_digit:
        raise serializers.ValidationError(PASSWORD_POLICY_ERROR)


class PrivateUserSerializer(serializers.ModelSerializer):
    """Serializer for private user registration"""
    username = serializers.CharField(min_length=3, max_length=32)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = PrivateUser
        fields = ['username', 'email', 'password', 'confirm_password']

    def validate(self, data):
        _validate_password_policy(data['password'])
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
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
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = BusinessUser
        fields = [
            'dealer_name', 'city', 'address', 'phone', 'email', 'website',
            'username', 'password', 'confirm_password',
            'company_name', 'registration_address', 'mol', 'bulstat', 'vat_number',
            'admin_name', 'admin_phone', 'description'
        ]

    def validate(self, data):
        _validate_password_policy(data['password'])
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
        if len(data['username']) < 3:
            raise serializers.ValidationError({"username": "Потребителското име трябва да е поне 3 символа"})
        return data

    def validate_email(self, value):
        email = _normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Потребител с този имейл вече съществува.")
        return email

    def validate_dealer_name(self, value):
        dealer_name = str(value).strip()
        if BusinessUser.objects.filter(dealer_name__iexact=dealer_name).exists():
            raise serializers.ValidationError("Името на дилъра вече съществува.")
        return dealer_name

    def create(self, validated_data):
        email = validated_data['email']
        username = str(validated_data['username']).strip()
        password = validated_data.pop('password')
        validated_data.pop('confirm_password', None)

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
