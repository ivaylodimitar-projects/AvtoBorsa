from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PrivateUser, BusinessUser, UserProfile


class PrivateUserSerializer(serializers.ModelSerializer):
    """Serializer for private user registration"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = PrivateUser
        fields = ['email', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
        return data

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        
        # Create Django User
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )
        
        # Create PrivateUser profile
        private_user = PrivateUser.objects.create(
            user=user,
            email=email
        )
        
        return private_user


class BusinessUserSerializer(serializers.ModelSerializer):
    """Serializer for business user registration"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = BusinessUser
        fields = [
            'dealer_name', 'city', 'address', 'phone', 'email', 'website',
            'username', 'password', 'confirm_password',
            'company_name', 'registration_address', 'mol', 'bulstat', 'vat_number',
            'admin_name', 'admin_phone', 'description'
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Паролите не съвпадат"})
        if len(data['username']) < 3:
            raise serializers.ValidationError({"username": "Потребителското име трябва да е поне 3 символа"})
        return data

    def create(self, validated_data):
        email = validated_data['email']
        username = validated_data['username']
        password = validated_data.pop('password')
        validated_data.pop('confirm_password')
        
        # Create Django User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
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
        return obj.user.car_listings.filter(is_active=True, is_draft=False, is_archived=False).count()

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
        return obj.user.car_listings.filter(is_active=True, is_draft=False, is_archived=False).count()

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

