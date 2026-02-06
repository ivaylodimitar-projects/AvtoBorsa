from rest_framework import serializers
from .models import CarListing, CarImage


class CarImageSerializer(serializers.ModelSerializer):
    """Serializer for car images"""
    class Meta:
        model = CarImage
        fields = ['id', 'image', 'order', 'created_at']
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
            'description', 'phone', 'email', 'features',
            'is_draft', 'is_active', 'is_archived', 'created_at', 'updated_at', 'images', 'images_upload'
        ]
        read_only_fields = ['id', 'slug', 'user', 'user_email', 'created_at', 'updated_at', 'images', 'is_draft', 'is_active', 'fuel_display', 'gearbox_display', 'condition_display', 'category_display']

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

    def create(self, validated_data):
        """Create listing and handle image uploads"""
        images_data = validated_data.pop('images_upload', [])
        listing = CarListing.objects.create(**validated_data)

        # Create image objects
        for index, image in enumerate(images_data):
            CarImage.objects.create(
                listing=listing,
                image=image,
                order=index
            )

        return listing

