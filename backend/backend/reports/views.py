from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from backend.listings.models import CarListing
from .models import ContactInquiry, ListingReport
from .serializers import ContactInquiryCreateSerializer, ListingReportCreateSerializer


DUPLICATE_REPORT_MESSAGE = "Можете да съобщите за нередност с тази обява само веднъж, благодаря."


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_listing_report(request, listing_id):
    listing = get_object_or_404(
        CarListing,
        id=listing_id,
        is_active=True,
        is_draft=False,
        is_archived=False,
    )

    if ListingReport.objects.filter(user=request.user, listing=listing).exists():
        return Response({'detail': DUPLICATE_REPORT_MESSAGE}, status=status.HTTP_409_CONFLICT)

    serializer = ListingReportCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        serializer.save(user=request.user, listing=listing)
    except IntegrityError:
        return Response({'detail': DUPLICATE_REPORT_MESSAGE}, status=status.HTTP_409_CONFLICT)

    return Response({'detail': 'Сигналът е изпратен успешно.'}, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([AllowAny])
def create_contact_inquiry(request):
    serializer = ContactInquiryCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    inquiry: ContactInquiry = serializer.save()

    return Response(
        {
            "message": "Inquiry submitted successfully.",
            "id": inquiry.id,
        },
        status=status.HTTP_201_CREATED,
    )
