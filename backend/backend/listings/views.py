from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .models import CarListing, CarImage, Favorite, get_expiry_cutoff
from .serializers import CarListingSerializer, CarImageSerializer, FavoriteSerializer


class CarListingViewSet(viewsets.ModelViewSet):
    """ViewSet for car listings"""
    serializer_class = CarListingSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        """Get listings based on user and filters"""
        cutoff = get_expiry_cutoff()
        queryset = CarListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        )

        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Search filters
        brand = self.request.query_params.get('brand')
        if brand:
            queryset = queryset.filter(brand__icontains=brand)

        model = self.request.query_params.get('model')
        if model:
            queryset = queryset.filter(model__icontains=model)

        # Price filters
        price_from = self.request.query_params.get('priceFrom')
        if price_from:
            queryset = queryset.filter(price__gte=float(price_from))

        price_to = self.request.query_params.get('priceTo')
        if price_to:
            queryset = queryset.filter(price__lte=float(price_to))

        max_price = self.request.query_params.get('maxPrice')
        if max_price:
            queryset = queryset.filter(price__lte=float(max_price))

        # Year filters
        year_from = self.request.query_params.get('yearFrom')
        if year_from:
            queryset = queryset.filter(year_from__gte=int(year_from))

        year_to = self.request.query_params.get('yearTo')
        if year_to:
            queryset = queryset.filter(year_from__lte=int(year_to))

        # Sorting
        sort_by = self.request.query_params.get('sortBy')
        if sort_by:
            if sort_by == 'price-asc':
                queryset = queryset.order_by('price')
            elif sort_by == 'price-desc':
                queryset = queryset.order_by('-price')
            elif sort_by == 'year-desc':
                queryset = queryset.order_by('-year_from')
            elif sort_by == 'year-asc':
                queryset = queryset.order_by('year_from')
            elif sort_by == 'Марка/Модел/Цена' or sort_by == '':
                # Default: Марка/Модел/Цена
                queryset = queryset.order_by('brand', 'model', 'price')
            else:
                # Default fallback
                queryset = queryset.order_by('brand', 'model', 'price')

        # Fuel filter - handle both display names and keys
        fuel = self.request.query_params.get('fuel')
        if fuel:
            # Map display names to database keys
            fuel_mapping = {
                'Бензин': 'benzin',
                'Дизел': 'dizel',
                'Газ/Бензин': 'gaz_benzin',
                'Хибрид': 'hibrid',
                'Електро': 'elektro',
                'benzin': 'benzin',
                'dizel': 'dizel',
                'gaz_benzin': 'gaz_benzin',
                'hibrid': 'hibrid',
                'elektro': 'elektro',
            }
            fuel_key = fuel_mapping.get(fuel, fuel)
            queryset = queryset.filter(fuel=fuel_key)

        # Gearbox filter - handle both display names and keys
        gearbox = self.request.query_params.get('gearbox')
        if gearbox:
            # Map display names to database keys
            gearbox_mapping = {
                'Ръчна': 'ruchna',
                'Автоматик': 'avtomatik',
                'ruchna': 'ruchna',
                'avtomatik': 'avtomatik',
            }
            gearbox_key = gearbox_mapping.get(gearbox, gearbox)
            queryset = queryset.filter(gearbox=gearbox_key)

        # Mileage filters
        mileage_from = self.request.query_params.get('mileageFrom')
        if mileage_from:
            queryset = queryset.filter(mileage__gte=int(mileage_from))

        mileage_to = self.request.query_params.get('mileageTo')
        if mileage_to:
            queryset = queryset.filter(mileage__lte=int(mileage_to))

        # Engine/Power filters
        engine_from = self.request.query_params.get('engineFrom')
        if engine_from:
            queryset = queryset.filter(power__gte=int(engine_from))

        engine_to = self.request.query_params.get('engineTo')
        if engine_to:
            queryset = queryset.filter(power__lte=int(engine_to))

        # Color filter
        color = self.request.query_params.get('color')
        if color:
            queryset = queryset.filter(color__icontains=color)

        # Region filter (for "Намира се в" and "Регион")
        region = self.request.query_params.get('region')
        if region:
            queryset = queryset.filter(location_region__icontains=region)

        # Condition filter - handle both display names and keys
        condition = self.request.query_params.get('condition')
        if condition:
            # Map display names to database keys
            condition_mapping = {
                'Нов': '0',
                'Употребяван': '1',
                'Повреден/ударен': '2',
                'За части': '3',
                '0': '0',
                '1': '1',
                '2': '2',
                '3': '3',
            }
            condition_key = condition_mapping.get(condition, condition)
            queryset = queryset.filter(condition=condition_key)

        # Category filter - handle both display names and keys
        category = self.request.query_params.get('category')
        if category:
            # Map display names to database keys
            category_mapping = {
                'Ван': 'van',
                'Джип': 'jeep',
                'Кабрио': 'cabriolet',
                'Комби': 'wagon',
                'Купе': 'coupe',
                'Миниван': 'minivan',
                'Пикап': 'pickup',
                'Седан': 'sedan',
                'Стреч лимузина': 'stretch_limo',
                'Хечбек': 'hatchback',
                'van': 'van',
                'jeep': 'jeep',
                'cabriolet': 'cabriolet',
                'wagon': 'wagon',
                'coupe': 'coupe',
                'minivan': 'minivan',
                'pickup': 'pickup',
                'sedan': 'sedan',
                'stretch_limo': 'stretch_limo',
                'hatchback': 'hatchback',
            }
            category_key = category_mapping.get(category, category)
            queryset = queryset.filter(category=category_key)

        return queryset

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create listing and associate with current user"""
        # Check if user has reached the 3 advert limit
        cutoff = get_expiry_cutoff()
        active_listings_count = CarListing.objects.filter(
            user=self.request.user,
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        ).count()

        if active_listings_count >= 3:
            raise ValidationError(
                "Можете да публикувате максимум 3 активни обяви. "
                "Моля, изтрийте или архивирайте някоя от вашите обяви, за да добавите нова."
            )

        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Update listing - only owner can update"""
        listing = self.get_object()
        if listing.user != self.request.user:
            raise PermissionError("You can only edit your own listings")
        serializer.save()

    def perform_destroy(self, instance):
        """Delete listing - only owner can delete"""
        if instance.user != self.request.user:
            raise PermissionError("You can only delete your own listings")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_listings(request):
    """Get current user's active listings"""
    cutoff = get_expiry_cutoff()
    listings = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).prefetch_related('images')
    serializer = CarListingSerializer(listings, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_drafts(request):
    """Get current user's draft listings"""
    drafts = CarListing.objects.filter(user=request.user, is_draft=True).prefetch_related('images')
    serializer = CarListingSerializer(drafts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_archived(request):
    """Get current user's archived listings"""
    archived = CarListing.objects.filter(user=request.user, is_archived=True).prefetch_related('images')
    serializer = CarListingSerializer(archived, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_expired(request):
    """Get current user's expired listings"""
    cutoff = get_expiry_cutoff()
    expired = CarListing.objects.filter(
        user=request.user,
        is_draft=False,
        is_archived=False,
        created_at__lt=cutoff
    ).prefetch_related('images')
    serializer = CarListingSerializer(expired, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_listing(request, listing_id):
    """Archive a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing.is_archived = True
    listing.is_active = False
    listing.save()
    serializer = CarListingSerializer(listing)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unarchive_listing(request, listing_id):
    """Unarchive a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    cutoff = get_expiry_cutoff()
    active_count = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).exclude(id=listing.id).count()

    if active_count >= 3:
        return Response(
            {
                "detail": "Можете да имате максимум 3 активни обяви. "
                          "Моля, архивирайте или изтрийте някоя от активните."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    listing.is_archived = False
    listing.is_active = True
    listing.created_at = timezone.now()
    listing.save()
    serializer = CarListingSerializer(listing)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_listing(request, listing_id):
    """Delete a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing.delete()
    return Response(
        {
            'message': 'Listing deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def republish_listing(request, listing_id):
    """Republish a listing for another 30 minutes."""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing_type = request.data.get('listing_type')

    # Enforce active listings limit (exclude the current listing)
    cutoff = get_expiry_cutoff()
    active_count = CarListing.objects.filter(
        user=request.user,
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=cutoff
    ).exclude(id=listing.id).count()

    if active_count >= 3:
        return Response(
            {
                "detail": "Можете да имате максимум 3 активни обяви. "
                          "Моля, архивирайте или изтрийте някоя от активните."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if listing_type in ['top', 'normal']:
        listing.listing_type = listing_type

    listing.is_draft = False
    listing.is_archived = False
    listing.is_active = True
    listing.created_at = timezone.now()
    listing.save()

    serializer = CarListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_listing_type(request, listing_id):
    """Update listing type (top/normal) for a listing."""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing_type = request.data.get('listing_type')

    if listing_type not in ['top', 'normal']:
        return Response(
            {"detail": "Невалиден тип на обявата."},
            status=status.HTTP_400_BAD_REQUEST
        )

    listing.listing_type = listing_type
    listing.save()

    serializer = CarListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_listing_images(request, listing_id):
    """Upload images for a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)

    images = request.FILES.getlist('images')
    for index, image in enumerate(images):
        # First image is cover by default
        is_cover = index == 0 and len(images) > 0
        CarImage.objects.create(
            listing=listing,
            image=image,
            order=index,
            is_cover=is_cover
        )

    return Response(
        {'message': f'{len(images)} images uploaded successfully'},
        status=status.HTTP_201_CREATED
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_listing_images(request, listing_id):
    """Update image order and cover status for a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)

    images_data = request.data.get('images', [])

    # Update each image with new order and cover status
    for image_data in images_data:
        image_id = image_data.get('id')
        order = image_data.get('order')
        is_cover = image_data.get('is_cover', False)

        try:
            image = CarImage.objects.get(id=image_id, listing=listing)
            image.order = order
            image.is_cover = is_cover
            image.save()
        except CarImage.DoesNotExist:
            return Response(
                {'error': f'Image {image_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    # Ensure only one image is marked as cover
    CarImage.objects.filter(listing=listing).exclude(
        id__in=[img.get('id') for img in images_data if img.get('is_cover')]
    ).update(is_cover=False)

    serializer = CarImageSerializer(
        listing.images.all(),
        many=True
    )

    return Response(
        {'message': 'Images updated successfully', 'images': serializer.data},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_favorite(request, listing_id):
    """Add a listing to user's favorites"""
    listing = get_object_or_404(CarListing, id=listing_id)

    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        listing=listing
    )

    if created:
        return Response(
            {'message': 'Listing added to favorites'},
            status=status.HTTP_201_CREATED
        )
    else:
        return Response(
            {'message': 'Listing already in favorites'},
            status=status.HTTP_200_OK
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_favorite(request, listing_id):
    """Remove a listing from user's favorites"""
    favorite = get_object_or_404(Favorite, user=request.user, listing_id=listing_id)
    favorite.delete()

    return Response(
        {'message': 'Listing removed from favorites'},
        status=status.HTTP_204_NO_CONTENT
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_favorites(request):
    """Get current user's favorite listings"""
    cutoff = get_expiry_cutoff()
    favorites = Favorite.objects.filter(
        user=request.user,
        listing__is_active=True,
        listing__is_draft=False,
        listing__is_archived=False,
        listing__created_at__gte=cutoff
    ).select_related('listing').prefetch_related('listing__images')
    serializer = FavoriteSerializer(favorites, many=True, context={'request': request})
    return Response(serializer.data)
