import re
from decimal import Decimal
from math import ceil

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.accounts.models import UserProfile
from backend.listings.models import BaseListing, ListingPurchase
from backend.listings.serializers import BaseListingSerializer
from backend.listings.views import (
    TOP_LISTING_PRICE_1D_EUR,
    TOP_LISTING_PRICE_7D_EUR,
    VIP_LISTING_PRICE_7D_EUR,
    VIP_LISTING_PRICE_LIFETIME_EUR,
    _apply_top_listing_window,
    _apply_vip_listing_window,
    _attach_purchase_record_to_listing,
    _build_listing_snapshot_from_validated_data,
    _charge_top_listing_fee,
    _charge_vip_listing_fee,
    _clear_top_listing_window,
    _clear_vip_listing_window,
    _invalidate_latest_listings_cache,
    _normalize_top_plan,
    _normalize_vip_plan,
)

from .authentication import PublicApiKeyAuthentication
from .throttling import PublicApiRateThrottle
from .validators import (
    PUBLIC_API_BASE_PAYLOAD,
    PUBLIC_API_CATEGORY_CONFIG,
    PUBLIC_API_COMMON_FIELDS,
    SUPPORTED_PUBLIC_MAIN_CATEGORIES,
    normalize_public_api_promotion_inputs,
    validate_public_api_payload,
    validate_requested_main_category,
)


IMAGE_UPLOAD_FIELD_ALIASES = ("images_upload", "images", "images[]", "photos", "photos[]")
PUBLIC_API_RATE_LIMIT_MESSAGE = "Rate limit exceeded. Maximum 2 requests per minute."
PUBLIC_API_ENGLISH_ERROR_MAP = {
    "Недостатъчни средства": "Insufficient funds.",
    "Невалиден VIP пакет": "Invalid VIP plan.",
    "Невалиден TOP пакет": "Invalid TOP plan.",
    "Линкове в обявите не са позволени. Премахнете URL адресите и опитайте отново.": (
        "Links are not allowed in listings. Remove the URL(s) and try again."
    ),
}
PUBLIC_API_MIN_IMAGES_ERROR_RE = re.compile(
    r"^Минимум (?P<count>\d+) снимки са задължителни за тази категория\.$"
)
PUBLIC_API_ALLOWED_CURRENCY_ERROR_RE = re.compile(
    r"^Избраната валута не е позволена за тази държава\. Разрешени: (?P<allowed>.+)$"
)


def _translate_public_api_error_text(value):
    text = str(value or "").strip()
    if not text:
        return text

    translated = PUBLIC_API_ENGLISH_ERROR_MAP.get(text)
    if translated is not None:
        return translated

    min_images_match = PUBLIC_API_MIN_IMAGES_ERROR_RE.match(text)
    if min_images_match:
        return (
            f"At least {min_images_match.group('count')} images are required for this category."
        )

    allowed_currency_match = PUBLIC_API_ALLOWED_CURRENCY_ERROR_RE.match(text)
    if allowed_currency_match:
        return (
            "The selected currency is not allowed for this country. "
            f"Allowed: {allowed_currency_match.group('allowed')}"
        )

    if text.startswith("Обявата е маркирана за ръчна модерация "):
        return (
            "This listing was flagged for manual moderation. "
            "Save it as a draft and edit the content."
        )

    return text


def _normalize_public_api_error_detail(detail):
    if isinstance(detail, dict):
        return {
            str(field_name): _normalize_public_api_error_detail(value)
            for field_name, value in detail.items()
        }

    if isinstance(detail, list):
        return [_normalize_public_api_error_detail(item) for item in detail]

    return _translate_public_api_error_text(detail)


def _extract_public_api_error_message(detail, field_name=None):
    if isinstance(detail, dict):
        for key, value in detail.items():
            if key == "message":
                continue
            nested_field_name = None if key in {"detail", "non_field_errors"} else key
            message = _extract_public_api_error_message(value, nested_field_name)
            if message:
                return message
        return ""

    if isinstance(detail, list):
        for item in detail:
            message = _extract_public_api_error_message(item, field_name)
            if message:
                return message
        return ""

    message = _translate_public_api_error_text(detail)
    if field_name:
        return f"{field_name}: {message}"
    return message


def _format_public_api_error_payload(detail, exc):
    if isinstance(exc, Throttled):
        payload = {
            "message": PUBLIC_API_RATE_LIMIT_MESSAGE,
            "detail": PUBLIC_API_RATE_LIMIT_MESSAGE,
        }
        if getattr(exc, "wait", None) is not None:
            payload["wait_seconds"] = max(1, int(ceil(exc.wait)))
        return payload

    normalized_detail = _normalize_public_api_error_detail(detail)

    if isinstance(normalized_detail, dict):
        payload = dict(normalized_detail)
    elif isinstance(normalized_detail, list):
        if len(normalized_detail) == 1:
            payload = {"detail": normalized_detail[0]}
        else:
            payload = {"detail": normalized_detail}
    else:
        payload = {"detail": normalized_detail}

    message = _extract_public_api_error_message(payload)
    if message:
        payload = {"message": message, **payload}

    if isinstance(exc, Throttled) and getattr(exc, "wait", None) is not None:
        payload["wait_seconds"] = max(1, int(ceil(exc.wait)))

    return payload


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

    for key, value in normalize_public_api_promotion_inputs(data).items():
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


class PublicApiBaseView(APIView):
    authentication_classes = [PublicApiKeyAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_classes = [PublicApiRateThrottle]

    def throttled(self, request, wait):
        raise Throttled(wait=wait, detail=PUBLIC_API_RATE_LIMIT_MESSAGE)

    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        if response is not None:
            response.data = _format_public_api_error_payload(response.data, exc)
        return response


class PublicCategoryListingCreateView(PublicApiBaseView):
    """Create a listing in a fixed main category via API key auth."""

    main_category = None

    def post(self, request):
        validate_requested_main_category(
            request.data,
            expected_main_category=self.main_category,
        )

        payload = _prepare_payload(
            request.data,
            forced_fields={"main_category": self.main_category},
            request_files=request.FILES,
        )
        serializer = BaseListingSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)

        is_draft = bool(serializer.validated_data.get("is_draft", False))
        validate_public_api_payload(
            serializer.validated_data,
            main_category=self.main_category,
            is_publish=not is_draft,
        )

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
        response_serializer = BaseListingSerializer(listing, context={"request": request})
        return Response(
            {
                "listing": response_serializer.data,
                "charged_amount": _format_decimal(
                    charged_amount if not is_draft else Decimal("0.00")
                ),
                "balance": _format_decimal(_get_user_balance(request.user)),
            },
            status=status.HTTP_201_CREATED,
        )


class PublicCarsCreateView(PublicCategoryListingCreateView):
    main_category = "cars"


class PublicMotorcyclesCreateView(PublicCategoryListingCreateView):
    main_category = "motorcycles"


class PublicBusesCreateView(PublicCategoryListingCreateView):
    main_category = "buses"


class PublicTrucksCreateView(PublicCategoryListingCreateView):
    main_category = "trucks"


class PublicDraftPublishView(PublicApiBaseView):
    """Publish an existing draft listing owned by the API key user."""

    def post(self, request, listing_id):
        listing = get_object_or_404(BaseListing, id=listing_id, user=request.user)
        if listing.main_category not in SUPPORTED_PUBLIC_MAIN_CATEGORIES:
            raise ValidationError(
                {"detail": "Only cars, moto, buses, and trucks can be published here."}
            )
        if not listing.is_draft:
            raise ValidationError({"detail": "Listing is already published."})

        validate_requested_main_category(
            request.data,
            expected_main_category=listing.main_category,
        )

        payload = _prepare_payload(
            request.data,
            forced_fields={
                "main_category": listing.main_category,
                "is_draft": False,
            },
            request_files=request.FILES,
        )
        serializer = BaseListingSerializer(
            listing,
            data=payload,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        validate_public_api_payload(
            serializer.validated_data,
            main_category=listing.main_category,
            is_publish=True,
            listing=listing,
        )

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
        response_serializer = BaseListingSerializer(updated, context={"request": request})
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
