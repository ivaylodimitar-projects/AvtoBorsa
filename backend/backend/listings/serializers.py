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
    # Handle image uploads during creation
    images_upload = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = CarListing
        fields = [
            'id', 'user', 'user_email', 'category', 'title', 'brand', 'model',
            'year_from', 'year_to', 'price', 'city', 'fuel', 'gearbox',
            'mileage', 'description', 'phone', 'email', 'features',
            'is_draft', 'is_active', 'created_at', 'updated_at', 'images', 'images_upload'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'created_at', 'updated_at', 'images']

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

