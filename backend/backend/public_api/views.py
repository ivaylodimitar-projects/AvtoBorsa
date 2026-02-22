from decimal import Decimal

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.accounts.models import UserProfile
from backend.listings.models import CarListing, ListingPurchase
from backend.listings.serializers import CarListingSerializer
from backend.listings.views import (
    TOP_LISTING_PRICE_1D_EUR,
    TOP_LISTING_PRICE_7D_EUR,
    VIP_LISTING_PRICE_7D_EUR,
    VIP_LISTING_PRICE_LIFETIME_EUR,
    _apply_top_listing_window,
    _apply_vip_listing_window,
    _charge_top_listing_fee,
    _charge_vip_listing_fee,
    _clear_top_listing_window,
    _clear_vip_listing_window,
    _invalidate_latest_listings_cache,
    _attach_purchase_record_to_listing,
    _build_listing_snapshot_from_validated_data,
    _normalize_top_plan,
    _normalize_vip_plan,
)

from .authentication import PublicApiKeyAuthentication


SUPPORTED_PUBLIC_MAIN_CATEGORIES = {"1", "5", "3", "4"}
IMAGE_UPLOAD_FIELD_ALIASES = ("images_upload", "images", "images[]", "photos", "photos[]")

PUBLIC_API_COMMON_FIELDS = [
    {"name": "brand", "type": "string", "required": True, "description": "Марка"},
    {"name": "model", "type": "string", "required": True, "description": "Модел"},
    {"name": "year_from", "type": "integer", "required": True, "description": "Година"},
    {"name": "price", "type": "decimal", "required": True, "description": "Цена"},
    {"name": "city", "type": "string", "required": True, "description": "Град"},
    {"name": "fuel", "type": "string", "required": True, "description": "Гориво"},
    {"name": "gearbox", "type": "string", "required": True, "description": "Скоростна кутия"},
    {"name": "mileage", "type": "integer", "required": True, "description": "Пробег"},
    {"name": "description", "type": "string", "required": False, "description": "Описание"},
    {"name": "phone", "type": "string", "required": True, "description": "Телефон"},
    {"name": "email", "type": "string", "required": True, "description": "Email за контакт"},
    {"name": "is_draft", "type": "boolean", "required": False, "description": "false за директно публикуване"},
    {"name": "listing_type", "type": "string", "required": False, "description": "normal, top или vip"},
    {"name": "top_plan", "type": "string", "required": False, "description": "1d или 7d (когато listing_type=top)"},
    {"name": "vip_plan", "type": "string", "required": False, "description": "7d или lifetime (когато listing_type=vip)"},
    {"name": "images_upload", "type": "file[]", "required": True, "description": "Минимум 3 изображения за директно публикуване"},
]

PUBLIC_API_BASE_PAYLOAD = {
    "brand": "BMW",
    "model": "X5",
    "year_from": 2020,
    "price": "35500.00",
    "city": "Sofia",
    "fuel": "dizel",
    "gearbox": "avtomatik",
    "mileage": 120000,
    "description": "Imported listing",
    "phone": "+359888123456",
    "email": "dealer@example.com",
    "is_draft": True,
}

PUBLIC_API_CATEGORY_CONFIG = {
    "cars": {
        "label": "Автомобили и джипове",
        "endpoint": "/api/public/ads/cars/",
        "main_category": "1",
        "specific_fields": [
            {"name": "category", "type": "string", "required": False, "description": "jeep, sedan, wagon, ..."},
            {"name": "condition", "type": "string", "required": False, "description": "0,1,2,3"},
            {"name": "power", "type": "integer", "required": False, "description": "Конски сили"},
            {"name": "displacement", "type": "integer", "required": False, "description": "Кубатура (cc)"},
            {"name": "euro_standard", "type": "string", "required": False, "description": "1..6"},
            {"name": "features", "type": "string[]", "required": False, "description": "Списък с екстри"},
        ],
        "payload_overrides": {
            "category": "jeep",
            "condition": "1",
            "power": 286,
            "displacement": 2993,
            "euro_standard": "6",
            "features": ["4x4", "Кожа", "Навигация"],
            "is_draft": False,
            "listing_type": "normal",
        },
    },
    "motorcycles": {
        "label": "Мотоциклети",
        "endpoint": "/api/public/ads/motorcycles/",
        "main_category": "5",
        "specific_fields": [
            {"name": "displacement_cc", "type": "integer", "required": False, "description": "Кубатура"},
            {"name": "transmission", "type": "string", "required": False, "description": "Ръчни/автоматични"},
            {"name": "engine_type", "type": "string", "required": False, "description": "2T, 4T, electric"},
        ],
        "payload_overrides": {
            "model": "R 1250 GS",
            "displacement_cc": 1254,
            "transmission": "manual",
            "engine_type": "4T",
            "is_draft": False,
            "listing_type": "normal",
        },
    },
    "buses": {
        "label": "Бусове",
        "endpoint": "/api/public/ads/buses/",
        "main_category": "3",
        "specific_fields": [
            {"name": "axles", "type": "integer", "required": False, "description": "ОсИ"},
            {"name": "seats", "type": "integer", "required": False, "description": "Брой места"},
            {"name": "load_kg", "type": "integer", "required": False, "description": "Товароносимост"},
            {"name": "transmission", "type": "string", "required": False, "description": "Тип трансмисия"},
            {"name": "engine_type", "type": "string", "required": False, "description": "Тип двигател"},
            {"name": "heavy_euro_standard", "type": "string", "required": False, "description": "Euro стандарт"},
        ],
        "payload_overrides": {
            "model": "Sprinter 316",
            "axles": 2,
            "seats": 3,
            "load_kg": 1400,
            "transmission": "manual",
            "engine_type": "diesel",
            "heavy_euro_standard": "6",
            "is_draft": False,
            "listing_type": "normal",
        },
    },
    "trucks": {
        "label": "Камиони",
        "endpoint": "/api/public/ads/trucks/",
        "main_category": "4",
        "specific_fields": [
            {"name": "axles", "type": "integer", "required": False, "description": "ОсИ"},
            {"name": "seats", "type": "integer", "required": False, "description": "Брой места"},
            {"name": "load_kg", "type": "integer", "required": False, "description": "Товароносимост"},
            {"name": "transmission", "type": "string", "required": False, "description": "Тип трансмисия"},
            {"name": "engine_type", "type": "string", "required": False, "description": "Тип двигател"},
            {"name": "heavy_euro_standard", "type": "string", "required": False, "description": "Euro стандарт"},
        ],
        "payload_overrides": {
            "model": "Actros 1845",
            "axles": 2,
            "seats": 2,
            "load_kg": 18000,
            "transmission": "automatic",
            "engine_type": "diesel",
            "heavy_euro_standard": "6",
            "is_draft": False,
            "listing_type": "normal",
        },
    },
}


def _prepare_payload(data, forced_fields=None, request_files=None):
    payload = data.copy() if hasattr(data, "copy") else dict(data)

    if request_files and hasattr(request_files, "getlist"):
        uploaded_images = []
        seen_ids = set()
        for field_name in IMAGE_UPLOAD_FIELD_ALIASES:
            for image_file in request_files.getlist(field_name):
                object_id = id(image_file)
                if object_id in seen_ids:
                    continue
                seen_ids.add(object_id)
                uploaded_images.append(image_file)

        if uploaded_images:
            if hasattr(payload, "setlist"):
                payload.setlist("images_upload", uploaded_images)
            else:
                payload["images_upload"] = uploaded_images

    for key, value in (forced_fields or {}).items():
        payload[key] = value
    return payload


def _format_decimal(value: Decimal) -> str:
    return f"{Decimal(value):.2f}"


def _get_user_balance(user) -> Decimal:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile.balance


def _resolve_promotion(validated_data, allow_promotions: bool):
    listing_type = validated_data.get("listing_type", "normal")
    top_plan = None
    vip_plan = None
    charged_amount = Decimal("0.00")

    if listing_type == "top":
        if not allow_promotions:
            raise ValidationError(
                {"listing_type": "TOP or VIP can be applied only when publishing."}
            )
        top_plan = _normalize_top_plan(validated_data.get("top_plan"))
        charged_amount = (
            TOP_LISTING_PRICE_7D_EUR if top_plan == "7d" else TOP_LISTING_PRICE_1D_EUR
        )
    elif listing_type == "vip":
        if not allow_promotions:
            raise ValidationError(
                {"listing_type": "TOP or VIP can be applied only when publishing."}
            )
        vip_plan = _normalize_vip_plan(validated_data.get("vip_plan"))
        charged_amount = (
            VIP_LISTING_PRICE_LIFETIME_EUR
            if vip_plan == "lifetime"
            else VIP_LISTING_PRICE_7D_EUR
        )
    elif listing_type != "normal":
        raise ValidationError({"listing_type": "Invalid listing_type."})

    return listing_type, top_plan, vip_plan, charged_amount


def _apply_promotion_window(listing, listing_type, top_plan=None, vip_plan=None, now=None):
    current = now or timezone.now()
    if listing_type == "top":
        _apply_top_listing_window(listing, top_plan=top_plan, now=current)
        listing.save(
            update_fields=[
                "listing_type",
                "top_plan",
                "top_paid_at",
                "top_expires_at",
                "vip_plan",
                "vip_paid_at",
                "vip_expires_at",
            ]
        )
        return

    if listing_type == "vip":
        _apply_vip_listing_window(listing, vip_plan=vip_plan, now=current)
        listing.save(
            update_fields=[
                "listing_type",
                "top_plan",
                "top_paid_at",
                "top_expires_at",
                "vip_plan",
                "vip_paid_at",
                "vip_expires_at",
            ]
        )
        return

    listing.listing_type = "normal"
    _clear_top_listing_window(listing)
    _clear_vip_listing_window(listing)
    listing.save(
        update_fields=[
            "listing_type",
            "top_plan",
            "top_paid_at",
            "top_expires_at",
            "vip_plan",
            "vip_paid_at",
            "vip_expires_at",
        ]
    )


class PublicCategoryListingCreateView(APIView):
    """Create a listing in a fixed main category via API key auth."""

    authentication_classes = [PublicApiKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    main_category = None

    def post(self, request):
        payload = _prepare_payload(
            request.data,
            forced_fields={"main_category": self.main_category},
            request_files=request.FILES,
        )
        serializer = CarListingSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)

        is_draft = bool(serializer.validated_data.get("is_draft", False))
        listing_type, top_plan, vip_plan, charged_amount = _resolve_promotion(
            serializer.validated_data,
            allow_promotions=not is_draft,
        )
        now = timezone.now()
        purchase_snapshot = _build_listing_snapshot_from_validated_data(serializer.validated_data)

        with db_transaction.atomic():
            purchase_record = None
            if not is_draft:
                if listing_type == "top":
                    purchase_record = _charge_top_listing_fee(
                        request.user,
                        top_plan,
                        source=ListingPurchase.SOURCE_PUBLISH,
                        listing_snapshot=purchase_snapshot,
                        metadata={"flow": "public_api_create"},
                    )
                elif listing_type == "vip":
                    purchase_record = _charge_vip_listing_fee(
                        request.user,
                        vip_plan,
                        source=ListingPurchase.SOURCE_PUBLISH,
                        listing_snapshot=purchase_snapshot,
                        metadata={"flow": "public_api_create"},
                    )

            listing = serializer.save(
                user=request.user,
                main_category=self.main_category,
                top_plan=top_plan if listing_type == "top" else None,
                vip_plan=vip_plan if listing_type == "vip" else None,
            )
            if purchase_record and purchase_record.listing_id is None:
                _attach_purchase_record_to_listing(purchase_record, listing)

            if not is_draft:
                _apply_promotion_window(
                    listing,
                    listing_type=listing_type,
                    top_plan=top_plan,
                    vip_plan=vip_plan,
                    now=now,
                )

        _invalidate_latest_listings_cache()
        response_serializer = CarListingSerializer(listing, context={"request": request})
        return Response(
            {
                "listing": response_serializer.data,
                "charged_amount": _format_decimal(charged_amount if not is_draft else Decimal("0.00")),
                "balance": _format_decimal(_get_user_balance(request.user)),
            },
            status=status.HTTP_201_CREATED,
        )


class PublicCarsCreateView(PublicCategoryListingCreateView):
    main_category = "1"


class PublicMotorcyclesCreateView(PublicCategoryListingCreateView):
    main_category = "5"


class PublicBusesCreateView(PublicCategoryListingCreateView):
    main_category = "3"


class PublicTrucksCreateView(PublicCategoryListingCreateView):
    main_category = "4"


class PublicDraftPublishView(APIView):
    """Publish an existing draft listing owned by the API key user."""

    authentication_classes = [PublicApiKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, listing_id):
        listing = get_object_or_404(CarListing, id=listing_id, user=request.user)
        if listing.main_category not in SUPPORTED_PUBLIC_MAIN_CATEGORIES:
            raise ValidationError(
                {"detail": "Only cars, motorcycles, buses, and trucks can be published here."}
            )
        if not listing.is_draft:
            raise ValidationError({"detail": "Listing is already published."})

        payload = _prepare_payload(
            request.data,
            forced_fields={
                "is_draft": False,
                "is_active": True,
                "is_archived": False,
            },
            request_files=request.FILES,
        )
        serializer = CarListingSerializer(
            listing,
            data=payload,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        listing_type, top_plan, vip_plan, charged_amount = _resolve_promotion(
            serializer.validated_data,
            allow_promotions=True,
        )
        now = timezone.now()

        with db_transaction.atomic():
            if listing_type == "top":
                _charge_top_listing_fee(
                    request.user,
                    top_plan,
                    listing=listing,
                    source=ListingPurchase.SOURCE_PUBLISH,
                    metadata={"flow": "public_api_publish_draft"},
                )
            elif listing_type == "vip":
                _charge_vip_listing_fee(
                    request.user,
                    vip_plan,
                    listing=listing,
                    source=ListingPurchase.SOURCE_PUBLISH,
                    metadata={"flow": "public_api_publish_draft"},
                )

            updated = serializer.save()
            updated.is_draft = False
            updated.is_active = True
            updated.is_archived = False
            updated.created_at = now
            updated.save(
                update_fields=[
                    "is_draft",
                    "is_active",
                    "is_archived",
                    "created_at",
                ]
            )
            _apply_promotion_window(
                updated,
                listing_type=listing_type,
                top_plan=top_plan,
                vip_plan=vip_plan,
                now=now,
            )

        _invalidate_latest_listings_cache()
        response_serializer = CarListingSerializer(updated, context={"request": request})
        return Response(
            {
                "listing": response_serializer.data,
                "charged_amount": _format_decimal(charged_amount),
                "balance": _format_decimal(_get_user_balance(request.user)),
            },
            status=status.HTTP_200_OK,
        )


def public_api_docs(request):
    docs_config = {
        "common_fields": PUBLIC_API_COMMON_FIELDS,
        "base_payload": PUBLIC_API_BASE_PAYLOAD,
        "categories": PUBLIC_API_CATEGORY_CONFIG,
    }
    return render(
        request,
        "public_api/docs.html",
        {
            "top_1d": _format_decimal(TOP_LISTING_PRICE_1D_EUR),
            "top_7d": _format_decimal(TOP_LISTING_PRICE_7D_EUR),
            "vip_7d": _format_decimal(VIP_LISTING_PRICE_7D_EUR),
            "vip_lifetime": _format_decimal(VIP_LISTING_PRICE_LIFETIME_EUR),
            "docs_config": docs_config,
        },
    )
