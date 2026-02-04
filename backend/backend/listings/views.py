from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import CarListing, CarImage
from .serializers import CarListingSerializer, CarImageSerializer


class CarListingViewSet(viewsets.ModelViewSet):
    """ViewSet for car listings"""
    serializer_class = CarListingSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        """Get listings based on user and filters"""
        queryset = CarListing.objects.filter(is_active=True, is_draft=False)

        # Filter by user if requested
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

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
    listings = CarListing.objects.filter(user=request.user, is_active=True, is_draft=False)
    serializer = CarListingSerializer(listings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_drafts(request):
    """Get current user's draft listings"""
    drafts = CarListing.objects.filter(user=request.user, is_draft=True)
    serializer = CarListingSerializer(drafts, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_listing_images(request, listing_id):
    """Upload images for a listing"""
    listing = get_object_or_404(CarListing, id=listing_id, user=request.user)

    images = request.FILES.getlist('images')
    for index, image in enumerate(images):
        CarImage.objects.create(
            listing=listing,
            image=image,
            order=index
        )

    return Response(
        {'message': f'{len(images)} images uploaded successfully'},
        status=status.HTTP_201_CREATED
    )
