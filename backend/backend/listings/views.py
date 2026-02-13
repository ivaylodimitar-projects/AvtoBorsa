from decimal import Decimal
from datetime import timedelta
import hashlib

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db import transaction as db_transaction
from django.db.models import Q, OuterRef, Subquery, Case, When, Value, IntegerField, F
from django.db.models import Prefetch
from django.db.models.functions import Substr, Coalesce
from django.core.cache import cache
from django.utils.cache import patch_cache_control, patch_vary_headers
from django.utils import timezone
from backend.accounts.models import UserProfile
from .models import CarListing, CarImage, Favorite, CarListingPriceHistory, get_expiry_cutoff, TOP_LISTING_DURATION_DAYS
from .serializers import (
    CarListingSerializer,
    CarListingLiteSerializer,
    CarListingListSerializer,
    CarListingSearchCompactSerializer,
    CarImageSerializer,
    FavoriteSerializer,
)


TOP_LISTING_PRICE_EUR = Decimal("3.00")
LISTINGS_PUBLIC_CACHE_SECONDS = 30
LISTINGS_PUBLIC_STALE_SECONDS = 120
TOP_DEMOTION_MIN_INTERVAL_SECONDS = 60
TOP_DEMOTION_LOCK_KEY = "listings:demote-expired-top:lock"
LATEST_LISTINGS_CACHE_SECONDS = 30
LATEST_LISTINGS_CACHE_KEY = "listings:latest:v2"


class ListingsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 20

    def get_page_size(self, request):
        page_size = super().get_page_size(request)
        if page_size is None:
            limit = request.query_params.get("limit")
            if limit is not None:
                try:
                    page_size = int(limit)
                except (TypeError, ValueError):
                    page_size = None
        if page_size is None:
            return self.page_size
        if self.max_page_size:
            return max(1, min(page_size, self.max_page_size))
        return max(1, page_size)


def _demote_expired_top_listings():
    """Ensure expired top listings are demoted to normal."""
    if not cache.add(TOP_DEMOTION_LOCK_KEY, 1, TOP_DEMOTION_MIN_INTERVAL_SECONDS):
        return 0
    return CarListing.demote_expired_top_listings()


def _charge_top_listing_fee(user):
    """Charge the top listing fee from the user's wallet."""
    with db_transaction.atomic():
        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
        if profile.balance < TOP_LISTING_PRICE_EUR:
            raise ValidationError("Недостатъчни средства")
        profile.balance -= TOP_LISTING_PRICE_EUR
        profile.save(update_fields=["balance"])
        return profile


def _apply_top_listing_window(listing, now=None):
    """Set a fresh 14-day top window on the listing."""
    current = now or timezone.now()
    listing.listing_type = "top"
    listing.top_paid_at = current
    listing.top_expires_at = current + timedelta(days=TOP_LISTING_DURATION_DAYS)


def _clear_top_listing_window(listing):
    """Remove top status timing fields from the listing."""
    listing.top_paid_at = None
    listing.top_expires_at = None


def _set_public_cache_headers(response, max_age=LISTINGS_PUBLIC_CACHE_SECONDS):
    response["Cache-Control"] = (
        f"public, max-age={max_age}, stale-while-revalidate={LISTINGS_PUBLIC_STALE_SECONDS}"
    )


class CarListingViewSet(viewsets.ModelViewSet):
    """ViewSet for car listings"""
    serializer_class = CarListingSerializer
    parser_classes = (MultiPartParser, FormParser)
    pagination_class = ListingsPagination

    def _build_public_cache_key(self):
        # Normalize params so query param order does not fragment cache keys.
        normalized_parts = []
        for key in sorted(self.request.query_params.keys()):
            values = self.request.query_params.getlist(key)
            for value in sorted(values):
                normalized_parts.append(f"{key}={value}")
        normalized_query = "&".join(normalized_parts)
        digest = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
        return f"listings:list:v1:{digest}"

    def _set_list_cache_headers(self, response):
        patch_vary_headers(response, ("Authorization",))
        if self.request.user.is_authenticated:
            patch_cache_control(response, private=True, no_cache=True, no_store=True, max_age=0)
            return
        _set_public_cache_headers(response, max_age=LISTINGS_PUBLIC_CACHE_SECONDS)

    def list(self, request, *args, **kwargs):
        cache_key = None
        if not request.user.is_authenticated:
            cache_key = self._build_public_cache_key()
            cached_payload = cache.get(cache_key)
            if cached_payload is not None:
                response = Response(cached_payload, status=status.HTTP_200_OK)
                self._set_list_cache_headers(response)
                response["X-Listings-Cache"] = "HIT"
                return response

        response = super().list(request, *args, **kwargs)

        if cache_key and response.status_code == status.HTTP_200_OK:
            cache.set(cache_key, response.data, LISTINGS_PUBLIC_CACHE_SECONDS)
            response["X-Listings-Cache"] = "MISS"

        self._set_list_cache_headers(response)
        return response

    def get_serializer_class(self):
        """Use a lightweight serializer when requested."""
        if self.action == "list":
            lite = (self.request.query_params.get("lite") or "").lower()
            if lite in {"1", "true", "yes"}:
                return CarListingLiteSerializer
            compact = (self.request.query_params.get("compact") or "").lower()
            if compact in {"1", "true", "yes"}:
                return CarListingSearchCompactSerializer
            return CarListingListSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        """Get listings based on user and filters"""
        _demote_expired_top_listings()
        cutoff = get_expiry_cutoff()
        queryset = CarListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        )
        queryset = queryset.annotate(
            top_rank=Case(
                When(listing_type='top', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
        latest_price_change = CarListingPriceHistory.objects.filter(
            listing=OuterRef('pk')
        ).order_by('-changed_at')
        queryset = queryset.annotate(
            last_price_change_delta=Subquery(latest_price_change.values('delta')[:1]),
            last_price_change_at=Subquery(latest_price_change.values('changed_at')[:1]),
        )

        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Search filters
        main_category = (
            self.request.query_params.get('main_category')
            or self.request.query_params.get('mainCategory')
        )
        if main_category:
            allowed_main_categories = {key for key, _ in CarListing.MAIN_CATEGORY_CHOICES}
            label_to_main_category = {
                label: key for key, label in CarListing.MAIN_CATEGORY_CHOICES
            }
            main_category_key = (
                main_category
                if main_category in allowed_main_categories
                else label_to_main_category.get(main_category, main_category)
            )
            queryset = queryset.filter(main_category=main_category_key)

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
                queryset = queryset.order_by('top_rank', 'price')
            elif sort_by == 'price-desc':
                queryset = queryset.order_by('top_rank', '-price')
            elif sort_by == 'year-desc':
                queryset = queryset.order_by('top_rank', '-year_from')
            elif sort_by == 'year-asc':
                queryset = queryset.order_by('top_rank', 'year_from')
            elif sort_by == 'Марка/Модел/Цена' or sort_by == '':
                # Default: Марка/Модел/Цена
                queryset = queryset.order_by('top_rank', 'brand', 'model', 'price')
            else:
                # Default fallback
                queryset = queryset.order_by('top_rank', 'brand', 'model', 'price')

        else:
            # Stable default ordering for pagination and landing page
            queryset = queryset.order_by('top_rank', '-created_at')

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

        if self.action == "list":
            lite = (self.request.query_params.get("lite") or "").lower()
            compact = (self.request.query_params.get("compact") or "").lower()
            first_thumbnail_subquery = CarImage.objects.filter(
                listing_id=OuterRef('pk')
            ).order_by('-is_cover', 'order', 'id').values('thumbnail')[:1]
            first_image_subquery = CarImage.objects.filter(
                listing_id=OuterRef('pk')
            ).order_by('-is_cover', 'order', 'id').values('image')[:1]
            image_prefetch = Prefetch(
                'images',
                queryset=CarImage.objects.only('id', 'image', 'thumbnail', 'order', 'is_cover', 'listing_id').order_by('order')
            )

            if lite in {"1", "true", "yes"}:
                queryset = queryset.annotate(
                    first_image=Coalesce(
                        Subquery(first_thumbnail_subquery),
                        Subquery(first_image_subquery),
                    )
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'power', 'city', 'created_at', 'listing_type'
                )
            elif compact in {"1", "true", "yes"}:
                queryset = queryset.annotate(
                    description_preview=Substr('description', 1, 220),
                    first_image=Coalesce(
                        Subquery(first_thumbnail_subquery),
                        Subquery(first_image_subquery),
                    )
                ).select_related(
                    'user',
                    'user__business_profile',
                    'user__private_profile'
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'gearbox', 'power', 'city',
                    'category', 'condition', 'created_at', 'listing_type',
                    'user_id', 'user__email',
                    'user__business_profile__dealer_name',
                    'user__private_profile__id'
                ).prefetch_related(image_prefetch)
            else:
                queryset = queryset.annotate(
                    description_preview=Substr('description', 1, 220)
                ).select_related(
                    'user',
                    'user__business_profile',
                    'user__private_profile'
                ).only(
                    'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
                    'fuel', 'gearbox', 'power', 'city',
                    'category', 'condition', 'created_at', 'listing_type',
                    'is_active', 'is_draft', 'is_archived',
                    'user_id', 'user__email',
                    'user__business_profile__dealer_name',
                    'user__private_profile__id'
                ).prefetch_related(image_prefetch)
        elif self.action == "retrieve":
            queryset = queryset.select_related(
                'user',
                'user__business_profile',
                'user__private_profile'
            ).prefetch_related('images')

        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        CarListing.objects.filter(pk=instance.pk).update(view_count=F('view_count') + 1)
        instance.refresh_from_db(fields=['view_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """Create listing and associate with current user"""
        _demote_expired_top_listings()
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

        listing_type = serializer.validated_data.get("listing_type", "normal")
        with db_transaction.atomic():
            if listing_type == "top":
                _charge_top_listing_fee(self.request.user)

            listing = serializer.save(user=self.request.user)

            if listing_type == "top":
                _apply_top_listing_window(listing)
                listing.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])

    def perform_update(self, serializer):
        """Update listing - only owner can update"""
        _demote_expired_top_listings()
        listing = self.get_object()
        if listing.user != self.request.user:
            raise PermissionError("You can only edit your own listings")
        listing_type = serializer.validated_data.get("listing_type")
        now = timezone.now()

        with db_transaction.atomic():
            if listing_type == "top":
                is_current_top = (
                    listing.listing_type == "top"
                    and listing.top_expires_at
                    and listing.top_expires_at > now
                )
                if not is_current_top:
                    _charge_top_listing_fee(self.request.user)
                    _apply_top_listing_window(listing, now=now)

            updated = serializer.save()

            if listing_type == "top":
                updated.top_paid_at = listing.top_paid_at
                updated.top_expires_at = listing.top_expires_at
                updated.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])
            elif listing_type == "normal":
                _clear_top_listing_window(updated)
                updated.save(update_fields=["listing_type", "top_paid_at", "top_expires_at"])

    def perform_destroy(self, instance):
        """Delete listing - only owner can delete"""
        if instance.user != self.request.user:
            raise PermissionError("You can only delete your own listings")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_listings(request):
    """Get current user's active listings"""
    _demote_expired_top_listings()
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
    _demote_expired_top_listings()
    drafts = CarListing.objects.filter(user=request.user, is_draft=True).prefetch_related('images')
    serializer = CarListingSerializer(drafts, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_archived(request):
    """Get current user's archived listings"""
    _demote_expired_top_listings()
    archived = CarListing.objects.filter(user=request.user, is_archived=True).prefetch_related('images')
    serializer = CarListingSerializer(archived, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_expired(request):
    """Get current user's expired listings"""
    _demote_expired_top_listings()
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
    _demote_expired_top_listings()
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

    if listing_type not in ['top', 'normal']:
        return Response(
            {"detail": "Невалиден тип на обявата."},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    with db_transaction.atomic():
        if listing_type == "top":
            _charge_top_listing_fee(request.user)
            _apply_top_listing_window(listing, now=now)
        else:
            listing.listing_type = "normal"
            _clear_top_listing_window(listing)

        listing.is_draft = False
        listing.is_archived = False
        listing.is_active = True
        listing.created_at = now
        listing.save()

    serializer = CarListingSerializer(listing, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_listing_type(request, listing_id):
    """Update listing type (top/normal) for a listing."""
    _demote_expired_top_listings()
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
    listing_type = request.data.get('listing_type')

    if listing_type not in ['top', 'normal']:
        return Response(
            {"detail": "Невалиден тип на обявата."},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    with db_transaction.atomic():
        if listing_type == "top":
            is_current_top = (
                listing.listing_type == "top"
                and listing.top_expires_at
                and listing.top_expires_at > now
            )
            if not is_current_top:
                _charge_top_listing_fee(request.user)
                _apply_top_listing_window(listing, now=now)
        else:
            listing.listing_type = "normal"
            _clear_top_listing_window(listing)

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
    _demote_expired_top_listings()
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


@api_view(['GET'])
@permission_classes([AllowAny])
def latest_listings(request):
    """Return the latest 16 listings for the landing page with minimal payload."""
    cached_payload = cache.get(LATEST_LISTINGS_CACHE_KEY)
    if cached_payload is not None:
        response = Response(cached_payload, status=status.HTTP_200_OK)
        _set_public_cache_headers(response, max_age=LATEST_LISTINGS_CACHE_SECONDS)
        response["X-Latest-Listings-Cache"] = "HIT"
        return response

    _demote_expired_top_listings()
    cutoff = get_expiry_cutoff()
    first_thumbnail_subquery = CarImage.objects.filter(
        listing_id=OuterRef('pk')
    ).order_by('-is_cover', 'order', 'id').values('thumbnail')[:1]
    first_image_subquery = CarImage.objects.filter(
        listing_id=OuterRef('pk')
    ).order_by('-is_cover', 'order', 'id').values('image')[:1]
    latest_price_change = CarListingPriceHistory.objects.filter(
        listing=OuterRef('pk')
    ).order_by('-changed_at')

    queryset = (
        CarListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff
        )
        .annotate(
            top_rank=Case(
                When(listing_type='top', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
            first_image=Coalesce(
                Subquery(first_thumbnail_subquery),
                Subquery(first_image_subquery),
            ),
            last_price_change_delta=Subquery(latest_price_change.values('delta')[:1]),
            last_price_change_at=Subquery(latest_price_change.values('changed_at')[:1]),
        )
        .only(
            'id', 'slug', 'brand', 'model', 'year_from', 'price', 'mileage',
            'fuel', 'power', 'city', 'created_at', 'listing_type'
        )
        .order_by('top_rank', '-created_at')[:16]
    )

    payload = CarListingLiteSerializer(queryset, many=True, context={'request': request}).data
    cache.set(LATEST_LISTINGS_CACHE_KEY, payload, LATEST_LISTINGS_CACHE_SECONDS)

    response = Response(payload, status=status.HTTP_200_OK)
    _set_public_cache_headers(response, max_age=LATEST_LISTINGS_CACHE_SECONDS)
    response["X-Latest-Listings-Cache"] = "MISS"
    return response
