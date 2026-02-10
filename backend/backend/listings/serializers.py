from rest_framework import serializers
from .models import CarListing, CarImage, Favorite


class CarImageSerializer(serializers.ModelSerializer):
    """Serializer for car images"""
    class Meta:
        model = CarImage
        fields = ['id', 'image', 'order', 'is_cover', 'created_at']
        read_only_fields = ['id', 'created_at']


class CarListingSerializer(serializers.ModelSerializer):
    """Serializer for car listings"""
    images = CarImageSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    # Display names for choice fields
    fuel_display = serializers.SerializerMethodField()
    gearbox_display = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    # Get the first image URL for list views
    image_url = serializers.SerializerMethodField()
    # Check if current user has favorited this listing
    is_favorited = serializers.SerializerMethodField()
    # Seller information
    seller_name = serializers.SerializerMethodField()
    seller_type = serializers.SerializerMethodField()
    # Handle image uploads during creation
    images_upload = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'user', 'user_email', 'main_category', 'category', 'category_display', 'title', 'brand', 'model',
            'year_from', 'month', 'vin', 'price', 'location_country', 'location_region', 'city',
            'fuel', 'fuel_display', 'gearbox', 'gearbox_display', 'mileage', 'color', 'condition', 'condition_display', 'power', 'displacement', 'euro_standard',
            'description', 'phone', 'email', 'features', 'listing_type', 'listing_type_display', 'top_expires_at',
            'is_draft', 'is_active', 'is_archived', 'created_at', 'updated_at', 'images', 'image_url', 'is_favorited', 'seller_name', 'seller_type', 'images_upload'
        ]
        read_only_fields = ['id', 'slug', 'user', 'user_email', 'created_at', 'updated_at', 'images', 'image_url', 'is_favorited', 'is_draft', 'is_active', 'fuel_display', 'gearbox_display', 'condition_display', 'category_display', 'listing_type_display', 'seller_name', 'seller_type', 'top_expires_at']

    def get_fuel_display(self, obj):
        """Return display name for fuel"""
        fuel_choices = {
            'benzin': 'Бензин',
            'dizel': 'Дизел',
            'gaz_benzin': 'Газ/Бензин',
            'hibrid': 'Хибрид',
            'elektro': 'Електро',
        }
        return fuel_choices.get(obj.fuel, obj.fuel)

    def get_gearbox_display(self, obj):
        """Return display name for gearbox"""
        gearbox_choices = {
            'ruchna': 'Ръчна',
            'avtomatik': 'Автоматик',
        }
        return gearbox_choices.get(obj.gearbox, obj.gearbox)

    def get_condition_display(self, obj):
        """Return display name for condition"""
        condition_choices = {
            '0': 'Нов',
            '1': 'Употребяван',
            '2': 'Повреден/ударен',
            '3': 'За части',
        }
        return condition_choices.get(obj.condition, obj.condition)

    def get_category_display(self, obj):
        """Return display name for category"""
        category_choices = {
            'van': 'Ван',
            'jeep': 'Джип',
            'cabriolet': 'Кабрио',
            'wagon': 'Комби',
            'coupe': 'Купе',
            'minivan': 'Миниван',
            'pickup': 'Пикап',
            'sedan': 'Седан',
            'stretch_limo': 'Стреч лимузина',
            'hatchback': 'Хечбек',
        }
        return category_choices.get(obj.category, obj.category)

    def get_listing_type_display(self, obj):
        """Return display name for listing type"""
        listing_type_choices = {
            'normal': 'Нормална',
            'top': 'Топ',
        }
        return listing_type_choices.get(obj.listing_type, obj.listing_type)

    def get_image_url(self, obj):
        """Return the URL of the first image"""
        if obj.images.exists():
            first_image = obj.images.first()
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None

    def get_is_favorited(self, obj):
        """Check if current user has favorited this listing"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, listing=obj).exists()
        return False

    def get_seller_name(self, obj):
        """Return seller name based on user type"""
        user = obj.user
        # Check if user has a business profile
        if hasattr(user, 'business_profile'):
            return user.business_profile.dealer_name
        # Check if user has a private profile
        elif hasattr(user, 'private_profile'):
            # For private users, return email or a generic name
            return user.email.split('@')[0]  # Return username part of email
        # Fallback to email
        return user.email

    def get_seller_type(self, obj):
        """Return seller type (business or private)"""
        user = obj.user
        if hasattr(user, 'business_profile'):
            return 'business'
        elif hasattr(user, 'private_profile'):
            return 'private'
        return 'unknown'

    def create(self, validated_data):
        """Create listing and handle image uploads"""
        images_data = validated_data.pop('images_upload', [])
        listing = CarListing.objects.create(**validated_data)

        # Create image objects
        for index, image in enumerate(images_data):
            # First image is cover by default
            is_cover = index == 0 and len(images_data) > 0
            CarImage.objects.create(
                listing=listing,
                image=image,
                order=index,
                is_cover=is_cover
            )

        return listing


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for favorite listings"""
    listing = CarListingSerializer(read_only=True)
    listing_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'listing', 'listing_id', 'created_at']
        read_only_fields = ['id', 'created_at']

