from rest_framework import serializers
from django.conf import settings
from .models import CarListing, CarImage, Favorite


def _normalize_media_path(raw_path):
    if not raw_path:
        return None

    path = str(raw_path).strip()
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if path.startswith("/"):
        return path

    media_url = settings.MEDIA_URL if settings.MEDIA_URL.startswith("/") else f"/{settings.MEDIA_URL}"
    media_url = media_url.rstrip("/")
    if path.startswith("media/"):
        return f"/{path}"
    return f"{media_url}/{path.lstrip('/')}"


class CarImageSerializer(serializers.ModelSerializer):
    """Serializer for car images"""
    class Meta:
        model = CarImage
        fields = ['id', 'image', 'order', 'is_cover', 'created_at']
        read_only_fields = ['id', 'created_at']


class CarListingLiteSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views like the landing page."""
    fuel_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
            'fuel', 'fuel_display', 'power', 'city', 'created_at',
            'listing_type', 'listing_type_display', 'image_url'
        ]
        read_only_fields = fields

    def get_fuel_display(self, obj):
        return obj.get_fuel_display()

    def get_listing_type_display(self, obj):
        return obj.get_listing_type_display()

    def get_image_url(self, obj):
        first_image = getattr(obj, 'first_image', None)
        if first_image:
            return _normalize_media_path(first_image)
        images = list(obj.images.all()[:1])
        if images:
            return _normalize_media_path(images[0].image.url)
        return None


class CarListingListSerializer(serializers.ModelSerializer):
    """Optimized serializer for search/list pages."""
    fuel_display = serializers.SerializerMethodField()
    gearbox_display = serializers.SerializerMethodField()
    condition_display = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    listing_type_display = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    seller_type = serializers.SerializerMethodField()
    description_preview = serializers.SerializerMethodField()

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage', 'power', 'city',
            'fuel', 'fuel_display', 'gearbox', 'gearbox_display',
            'category', 'category_display', 'condition', 'condition_display',
            'description_preview', 'created_at',
            'listing_type', 'listing_type_display',
            'is_active', 'is_draft', 'is_archived',
            'image_url', 'images', 'is_favorited', 'seller_name', 'seller_type'
        ]
        read_only_fields = fields

    def _get_preview_images(self, obj):
        cache = self.context.setdefault('_images_preview_cache', {})
        cached = cache.get(obj.id)
        if cached is not None:
            return cached
        images = list(obj.images.all()[:4])
        cache[obj.id] = images
        return images

    def _build_image_url(self, image_obj):
        if not image_obj or not image_obj.image:
            return None
        return _normalize_media_path(image_obj.image.url)

    def get_images(self, obj):
        return [
            {
                'id': image.id,
                'image': self._build_image_url(image),
                'order': image.order,
                'is_cover': image.is_cover,
            }
            for image in self._get_preview_images(obj)
        ]

    def get_image_url(self, obj):
        first_image = getattr(obj, 'first_image', None)
        if first_image:
            return _normalize_media_path(first_image)
        images = self._get_preview_images(obj)
        return self._build_image_url(images[0]) if images else None

    def get_fuel_display(self, obj):
        return obj.get_fuel_display()

    def get_gearbox_display(self, obj):
        return obj.get_gearbox_display()

    def get_condition_display(self, obj):
        return obj.get_condition_display()

    def get_category_display(self, obj):
        return obj.get_category_display()

    def get_listing_type_display(self, obj):
        return obj.get_listing_type_display()

    def get_description_preview(self, obj):
        preview = getattr(obj, 'description_preview', None)
        if preview is not None:
            return preview
        raw_description = obj.description or ''
        return raw_description[:220]

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            favorite_ids = self.context.get('favorite_listing_ids')
            if favorite_ids is None:
                favorite_ids = set(
                    Favorite.objects.filter(user=request.user).values_list('listing_id', flat=True)
                )
                self.context['favorite_listing_ids'] = favorite_ids
            return obj.id in favorite_ids
        return False

    def get_seller_name(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return user.business_profile.dealer_name
        if hasattr(user, 'private_profile'):
            return user.email.split('@')[0]
        return user.email

    def get_seller_type(self, obj):
        user = obj.user
        if hasattr(user, 'business_profile'):
            return 'business'
        if hasattr(user, 'private_profile'):
            return 'private'
        return 'unknown'


class CarListingSearchCompactSerializer(CarListingListSerializer):
    """Compact serializer for SearchPage pagination."""

    class Meta:
        model = CarListing
        fields = [
            'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage', 'power', 'city',
            'fuel_display', 'gearbox_display', 'category_display', 'condition_display',
            'description_preview', 'created_at',
            'listing_type', 'listing_type_display',
            'image_url', 'is_favorited', 'seller_name', 'seller_type'
        ]
        read_only_fields = fields


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
            'benzin': 'Ð‘ÐµÐ½Ð·Ð¸Ð½',
            'dizel': 'Ð”Ð¸Ð·ÐµÐ»',
            'gaz_benzin': 'Ð“Ð°Ð·/Ð‘ÐµÐ½Ð·Ð¸Ð½',
            'hibrid': 'Ð¥Ð¸Ð±Ñ€Ð¸Ð´',
            'elektro': 'Ð•Ð»ÐµÐºÑ‚Ñ€Ð¾',
        }
        return fuel_choices.get(obj.fuel, obj.fuel)

    def get_gearbox_display(self, obj):
        """Return display name for gearbox"""
        gearbox_choices = {
            'ruchna': 'Ð ÑŠÑ‡Ð½Ð°',
            'avtomatik': 'ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ðº',
        }
        return gearbox_choices.get(obj.gearbox, obj.gearbox)

    def get_condition_display(self, obj):
        """Return display name for condition"""
        condition_choices = {
            '0': 'ÐÐ¾Ð²',
            '1': 'Ð£Ð¿Ð¾Ñ‚Ñ€ÐµÐ±ÑÐ²Ð°Ð½',
            '2': 'ÐŸÐ¾Ð²Ñ€ÐµÐ´ÐµÐ½/ÑƒÐ´Ð°Ñ€ÐµÐ½',
            '3': 'Ð—Ð° Ñ‡Ð°ÑÑ‚Ð¸',
        }
        return condition_choices.get(obj.condition, obj.condition)

    def get_category_display(self, obj):
        """Return display name for category"""
        category_choices = {
            'van': 'Ð’Ð°Ð½',
            'jeep': 'Ð”Ð¶Ð¸Ð¿',
            'cabriolet': 'ÐšÐ°Ð±Ñ€Ð¸Ð¾',
            'wagon': 'ÐšÐ¾Ð¼Ð±Ð¸',
            'coupe': 'ÐšÑƒÐ¿Ðµ',
            'minivan': 'ÐœÐ¸Ð½Ð¸Ð²Ð°Ð½',
            'pickup': 'ÐŸÐ¸ÐºÐ°Ð¿',
            'sedan': 'Ð¡ÐµÐ´Ð°Ð½',
            'stretch_limo': 'Ð¡Ñ‚Ñ€ÐµÑ‡ Ð»Ð¸Ð¼ÑƒÐ·Ð¸Ð½Ð°',
            'hatchback': 'Ð¥ÐµÑ‡Ð±ÐµÐº',
        }
        return category_choices.get(obj.category, obj.category)

    def get_listing_type_display(self, obj):
        """Return display name for listing type"""
        listing_type_choices = {
            'normal': 'ÐÐ¾Ñ€Ð¼Ð°Ð»Ð½Ð°',
            'top': 'Ð¢Ð¾Ð¿',
        }
        return listing_type_choices.get(obj.listing_type, obj.listing_type)

    def get_image_url(self, obj):
        """Return the URL of the first image"""
        images = list(obj.images.all())
        if images:
            first_image = images[0]
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None

    def get_is_favorited(self, obj):
        """Check if current user has favorited this listing"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            favorite_ids = self.context.get('favorite_listing_ids')
            if favorite_ids is None:
                favorite_ids = set(
                    Favorite.objects.filter(user=request.user).values_list('listing_id', flat=True)
                )
                self.context['favorite_listing_ids'] = favorite_ids
            return obj.id in favorite_ids
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


