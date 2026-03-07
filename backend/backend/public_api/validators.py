from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError

from backend.listings.models import BusesListing, CarsListing, MotoListing, TrucksListing
from backend.listings.serializers import _extract_moto_meta_from_features


PUBLIC_API_MAX_IMAGES = 12
PUBLIC_API_MAX_IMAGE_BYTES = 12 * 1024 * 1024
PUBLIC_API_TOP_PLAN_INPUT_ALIASES = {
    "1": "1d",
    "7": "7d",
}
PUBLIC_API_VIP_PLAN_INPUT_ALIASES = {
    "7": "7d",
    "lifetime": "lifetime",
}

PUBLIC_API_MAIN_CATEGORY_ALIASES = {
    "1": "cars",
    "3": "buses",
    "4": "trucks",
    "5": "motorcycles",
    "bus": "buses",
    "buses": "buses",
    "car": "cars",
    "cars": "cars",
    "moto": "motorcycles",
    "motorcycle": "motorcycles",
    "motorcycles": "motorcycles",
    "truck": "trucks",
    "trucks": "trucks",
}

PUBLIC_API_BASE_FIELDS = {
    "main_category",
    "title",
    "price",
    "currency",
    "location_country",
    "location_region",
    "city",
    "description",
    "phone",
    "email",
    "is_draft",
    "listing_type",
    "top_plan",
    "vip_plan",
    "images_upload",
}

PUBLIC_API_COMMON_DETAIL_FIELDS = {
    "brand",
    "model",
    "year_from",
    "color",
    "condition",
    "power",
    "features",
}

PUBLIC_API_DETAIL_FIELDS_BY_CATEGORY = {
    "cars": PUBLIC_API_COMMON_DETAIL_FIELDS
    | {
        "category",
        "month",
        "vin",
        "fuel",
        "gearbox",
        "mileage",
        "displacement",
        "euro_standard",
    },
    "motorcycles": PUBLIC_API_COMMON_DETAIL_FIELDS
    | {
        "displacement_cc",
        "transmission",
        "engine_type",
        "moto_category",
        "moto_cooling_type",
        "moto_engine_kind",
    },
    "buses": PUBLIC_API_COMMON_DETAIL_FIELDS
    | {
        "month",
        "vin",
        "mileage",
        "displacement",
        "axles",
        "seats",
        "load_kg",
        "transmission",
        "engine_type",
        "heavy_euro_standard",
        "euro_standard",
    },
    "trucks": PUBLIC_API_COMMON_DETAIL_FIELDS
    | {
        "month",
        "vin",
        "mileage",
        "displacement",
        "axles",
        "seats",
        "load_kg",
        "transmission",
        "engine_type",
        "heavy_euro_standard",
        "euro_standard",
    },
}

PUBLIC_API_ALLOWED_FIELDS_BY_CATEGORY = {
    category: PUBLIC_API_BASE_FIELDS | detail_fields
    for category, detail_fields in PUBLIC_API_DETAIL_FIELDS_BY_CATEGORY.items()
}

PUBLIC_API_DRAFT_REQUIRED_FIELDS_BY_CATEGORY = {
    "cars": {"brand", "model", "year_from", "price", "city", "phone", "email"},
    "motorcycles": {"brand", "model", "year_from", "price", "city", "phone", "email"},
    "buses": {"brand", "model", "year_from", "price", "city", "phone", "email"},
    "trucks": {"brand", "model", "year_from", "price", "city", "phone", "email"},
}

PUBLIC_API_PUBLISH_REQUIRED_FIELDS_BY_CATEGORY = {
    "cars": {
        "brand",
        "model",
        "year_from",
        "price",
        "city",
        "phone",
        "email",
        "color",
        "condition",
        "category",
        "fuel",
        "gearbox",
        "mileage",
        "power",
        "displacement",
        "euro_standard",
    },
    "motorcycles": {
        "brand",
        "model",
        "year_from",
        "price",
        "city",
        "phone",
        "email",
        "color",
        "condition",
        "power",
        "displacement_cc",
        "engine_type",
        "moto_category",
        "moto_cooling_type",
        "moto_engine_kind",
    },
    "buses": {
        "brand",
        "model",
        "year_from",
        "price",
        "city",
        "phone",
        "email",
        "color",
        "condition",
        "mileage",
        "power",
        "axles",
        "seats",
        "load_kg",
        "transmission",
        "engine_type",
        "heavy_euro_standard",
    },
    "trucks": {
        "brand",
        "model",
        "year_from",
        "price",
        "city",
        "phone",
        "email",
        "color",
        "condition",
        "mileage",
        "power",
        "axles",
        "seats",
        "load_kg",
        "transmission",
        "engine_type",
        "heavy_euro_standard",
    },
}

PUBLIC_API_DETAIL_MODEL_BY_CATEGORY = {
    "cars": (CarsListing, "cars_details"),
    "motorcycles": (MotoListing, "moto_details"),
    "buses": (BusesListing, "buses_details"),
    "trucks": (TrucksListing, "trucks_details"),
}

PUBLIC_API_INTERNAL_VALIDATED_FIELDS = {"risk_score", "risk_flags", "requires_moderation"}
PUBLIC_API_CONDITION_VALUES = {"0", "1", "2", "3"}
PUBLIC_API_MOTO_META_FIELDS = {
    "moto_category",
    "moto_cooling_type",
    "moto_engine_kind",
}

SUPPORTED_PUBLIC_MAIN_CATEGORIES = frozenset(PUBLIC_API_DETAIL_FIELDS_BY_CATEGORY.keys())

PUBLIC_API_COMMON_FIELDS = [
    {
        "name": "brand",
        "type": "string",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "model",
        "type": "string",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "year_from",
        "type": "integer",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "price",
        "type": "decimal",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "city",
        "type": "string",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "phone",
        "type": "string",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "email",
        "type": "string",
        "required": True,
        "description": "Required for both draft creation and publish.",
    },
    {
        "name": "color",
        "type": "string",
        "required": True,
        "description": "Required when publishing, optional for drafts.",
    },
    {
        "name": "condition",
        "type": "string",
        "required": True,
        "description": "Required when publishing, optional for drafts. Use 0, 1, 2 or 3.",
    },
    {
        "name": "title",
        "type": "string",
        "required": False,
        "description": "Optional custom title.",
    },
    {
        "name": "currency",
        "type": "string",
        "required": False,
        "description": "Optional. Defaults to EUR.",
    },
    {
        "name": "location_country",
        "type": "string",
        "required": False,
        "description": "Optional country or region group.",
    },
    {
        "name": "location_region",
        "type": "string",
        "required": False,
        "description": "Optional free-text region.",
    },
    {
        "name": "description",
        "type": "string",
        "required": False,
        "description": "Optional listing description.",
    },
    {
        "name": "features",
        "type": "string[]",
        "required": False,
        "description": "Optional features array.",
    },
    {
        "name": "is_draft",
        "type": "boolean",
        "required": False,
        "description": "Set to false for direct publish.",
    },
    {
        "name": "listing_type",
        "type": "string",
        "required": False,
        "description": "normal, top or vip.",
    },
    {
        "name": "top_plan",
        "type": "string",
        "required": False,
        "description": "1 or 7 when listing_type=top.",
    },
    {
        "name": "vip_plan",
        "type": "string",
        "required": False,
        "description": "7 or lifetime when listing_type=vip.",
    },
    {
        "name": "images_upload",
        "type": "file[]",
        "required": True,
        "description": "Required for direct publish. Up to 12 images, max 12 MB each.",
    },
]

PUBLIC_API_BASE_PAYLOAD = {
    "brand": "BMW",
    "model": "X5",
    "year_from": 2020,
    "price": "35500.00",
    "currency": "EUR",
    "city": "Sofia",
    "color": "Black",
    "condition": "1",
    "description": "Imported listing",
    "phone": "+359888123456",
    "email": "dealer@example.com",
    "is_draft": False,
    "listing_type": "normal",
}

PUBLIC_API_CATEGORY_CONFIG = {
    "cars": {
        "label": "Cars",
        "endpoint": "/api/public/ads/cars/",
        "main_category": "cars",
        "specific_fields": [
            {
                "name": "category",
                "type": "string",
                "required": True,
                "description": "Required on publish. Example: jeep, sedan, wagon.",
            },
            {
                "name": "fuel",
                "type": "string",
                "required": True,
                "description": "Required on publish. Uses car fuel aliases supported by the main app.",
            },
            {
                "name": "gearbox",
                "type": "string",
                "required": True,
                "description": "Required on publish. Uses car gearbox aliases supported by the main app.",
            },
            {
                "name": "mileage",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "power",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "displacement",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "euro_standard",
                "type": "string",
                "required": True,
                "description": "Required on publish. Accepts 1..6 and Euro 1..6 labels.",
            },
            {
                "name": "month",
                "type": "integer",
                "required": False,
                "description": "Optional month.",
            },
            {
                "name": "vin",
                "type": "string",
                "required": False,
                "description": "Optional VIN.",
            },
        ],
        "payload_overrides": {
            "category": "jeep",
            "fuel": "dizel",
            "gearbox": "avtomatik",
            "mileage": 120000,
            "power": 286,
            "displacement": 2993,
            "euro_standard": "6",
            "features": ["4x4", "leather", "navigation"],
        },
    },
    "motorcycles": {
        "label": "Moto",
        "endpoint": "/api/public/ads/moto/",
        "alternate_endpoints": ["/api/public/ads/motorcycles/"],
        "main_category": "motorcycles",
        "specific_fields": [
            {
                "name": "moto_category",
                "type": "string",
                "required": True,
                "description": "Required on publish. Can also be derived from moto meta features.",
            },
            {
                "name": "displacement_cc",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "power",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "engine_type",
                "type": "string",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "moto_cooling_type",
                "type": "string",
                "required": True,
                "description": "Required on publish. Can also be derived from moto meta features.",
            },
            {
                "name": "moto_engine_kind",
                "type": "string",
                "required": True,
                "description": "Required on publish. Can also be derived from moto meta features.",
            },
            {
                "name": "transmission",
                "type": "string",
                "required": False,
                "description": "Optional transmission.",
            },
        ],
        "payload_overrides": {
            "model": "R 1250 GS",
            "power": 136,
            "displacement_cc": 1254,
            "engine_type": "petrol",
            "moto_category": "Adventure",
            "moto_cooling_type": "Liquid",
            "moto_engine_kind": "4-stroke",
            "features": ["ABS"],
        },
    },
    "buses": {
        "label": "Buses",
        "endpoint": "/api/public/ads/buses/",
        "main_category": "buses",
        "specific_fields": [
            {
                "name": "mileage",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "power",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "axles",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "seats",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "load_kg",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "transmission",
                "type": "string",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "engine_type",
                "type": "string",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "heavy_euro_standard",
                "type": "string",
                "required": True,
                "description": "Required on publish. Accepts 1..6 and Euro 1..6 labels.",
            },
            {
                "name": "month",
                "type": "integer",
                "required": False,
                "description": "Optional month.",
            },
            {
                "name": "vin",
                "type": "string",
                "required": False,
                "description": "Optional VIN.",
            },
            {
                "name": "displacement",
                "type": "integer",
                "required": False,
                "description": "Optional displacement.",
            },
        ],
        "payload_overrides": {
            "model": "Sprinter 316",
            "mileage": 240000,
            "power": 163,
            "axles": 2,
            "seats": 3,
            "load_kg": 1400,
            "transmission": "Manual",
            "engine_type": "Diesel",
            "heavy_euro_standard": "6",
            "features": ["air conditioning", "navigation"],
        },
    },
    "trucks": {
        "label": "Trucks",
        "endpoint": "/api/public/ads/trucks/",
        "main_category": "trucks",
        "specific_fields": [
            {
                "name": "mileage",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "power",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "axles",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "seats",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "load_kg",
                "type": "integer",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "transmission",
                "type": "string",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "engine_type",
                "type": "string",
                "required": True,
                "description": "Required on publish.",
            },
            {
                "name": "heavy_euro_standard",
                "type": "string",
                "required": True,
                "description": "Required on publish. Accepts 1..6 and Euro 1..6 labels.",
            },
            {
                "name": "month",
                "type": "integer",
                "required": False,
                "description": "Optional month.",
            },
            {
                "name": "vin",
                "type": "string",
                "required": False,
                "description": "Optional VIN.",
            },
            {
                "name": "displacement",
                "type": "integer",
                "required": False,
                "description": "Optional displacement.",
            },
        ],
        "payload_overrides": {
            "model": "Actros 1845",
            "mileage": 680000,
            "power": 450,
            "axles": 2,
            "seats": 2,
            "load_kg": 18000,
            "transmission": "Automatic",
            "engine_type": "Diesel",
            "heavy_euro_standard": "6",
            "features": ["retarder", "air suspension"],
        },
    },
}


def normalize_public_main_category(value: Any, default: str | None = None) -> str | None:
    if value in (None, ""):
        return default

    normalized = str(value).strip().lower()
    if not normalized:
        return default

    return PUBLIC_API_MAIN_CATEGORY_ALIASES.get(normalized, default or str(value))


def normalize_public_api_promotion_inputs(data: Any) -> dict[str, str]:
    normalized_payload: dict[str, str] = {}
    _normalize_public_api_plan_input(
        data,
        field_names=("top_plan", "topPlan"),
        field_name="top_plan",
        aliases=PUBLIC_API_TOP_PLAN_INPUT_ALIASES,
        normalized_payload=normalized_payload,
    )
    _normalize_public_api_plan_input(
        data,
        field_names=("vip_plan", "vipPlan"),
        field_name="vip_plan",
        aliases=PUBLIC_API_VIP_PLAN_INPUT_ALIASES,
        normalized_payload=normalized_payload,
    )
    return normalized_payload


def validate_requested_main_category(data: Any, *, expected_main_category: str) -> None:
    raw_value = _extract_raw_main_category(data)
    if raw_value in (None, ""):
        return

    normalized = normalize_public_main_category(raw_value)
    if normalized == expected_main_category:
        return

    endpoint_name = "moto" if expected_main_category == "motorcycles" else expected_main_category
    raise ValidationError(
        {
            "main_category": f"This endpoint accepts only '{endpoint_name}' listings.",
        }
    )


def validate_public_api_payload(
    validated_data: dict[str, Any],
    *,
    main_category: str,
    is_publish: bool,
    listing=None,
) -> None:
    errors: dict[str, Any] = {}
    state = _build_effective_state(listing, validated_data, main_category)

    _normalize_euro_standard_fields(validated_data, state, main_category, errors)
    _validate_allowed_fields(validated_data, main_category, errors)
    _validate_promotion_field_consistency(state, errors)
    _validate_required_fields(state, main_category, is_publish, errors)
    _validate_uploaded_images(validated_data, listing, errors)
    _validate_detail_fields(state, validated_data, main_category, is_publish, errors)

    if errors:
        raise ValidationError(errors)


def _extract_raw_main_category(data: Any) -> Any:
    return _extract_raw_value(data, ("main_category", "mainCategory", "maincategory"))


def _extract_raw_value(data: Any, field_names: tuple[str, ...]) -> Any:
    if hasattr(data, "get"):
        for key in field_names:
            value = data.get(key)
            if value not in (None, ""):
                return value
        return None

    if isinstance(data, Mapping):
        for key in field_names:
            value = data.get(key)
            if value not in (None, ""):
                return value

    return None


def _normalize_public_api_plan_input(
    data: Any,
    *,
    field_names: tuple[str, ...],
    field_name: str,
    aliases: dict[str, str],
    normalized_payload: dict[str, str],
) -> None:
    raw_value = _extract_raw_value(data, field_names)
    if raw_value in (None, ""):
        return

    normalized = str(raw_value).strip().lower()
    if not normalized:
        return

    resolved = aliases.get(normalized)
    if resolved is None:
        allowed_values = ", ".join(f"'{value}'" for value in aliases)
        raise ValidationError(
            {
                field_name: (
                    f"Use {field_name} values {allowed_values} in the public API."
                )
            }
        )

    normalized_payload[field_name] = resolved


def _build_effective_state(listing, validated_data: dict[str, Any], main_category: str) -> dict[str, Any]:
    state: dict[str, Any] = {}
    if listing is not None:
        state.update(_extract_existing_listing_state(listing, main_category))
    state.update(validated_data)
    return state


def _extract_existing_listing_state(listing, main_category: str) -> dict[str, Any]:
    state: dict[str, Any] = {}
    for field_name in PUBLIC_API_BASE_FIELDS:
        if hasattr(listing, field_name):
            state[field_name] = getattr(listing, field_name)

    detail_model, relation_name = PUBLIC_API_DETAIL_MODEL_BY_CATEGORY[main_category]
    detail_instance = getattr(listing, relation_name, None)
    if detail_instance is None:
        return state

    for field_name in PUBLIC_API_DETAIL_FIELDS_BY_CATEGORY[main_category]:
        model_field_name = _public_field_to_model_field(main_category, field_name)
        if hasattr(detail_instance, model_field_name):
            state[field_name] = getattr(detail_instance, model_field_name)

    if main_category in {"buses", "trucks"} and hasattr(detail_instance, "euro_standard"):
        state["euro_standard"] = getattr(detail_instance, "euro_standard")

    return state


def _normalize_euro_standard_fields(
    validated_data: dict[str, Any],
    state: dict[str, Any],
    main_category: str,
    errors: dict[str, Any],
) -> None:
    if main_category == "cars":
        value = state.get("euro_standard")
        if _is_missing(value):
            return

        normalized = _normalize_euro_standard_value(value)
        state["euro_standard"] = normalized
        if "euro_standard" in validated_data:
            validated_data["euro_standard"] = normalized
        return

    if main_category not in {"buses", "trucks"}:
        return

    heavy_value = state.get("heavy_euro_standard")
    euro_value = state.get("euro_standard")

    normalized_heavy = None if _is_missing(heavy_value) else _normalize_euro_standard_value(heavy_value)
    normalized_euro = None if _is_missing(euro_value) else _normalize_euro_standard_value(euro_value)

    if normalized_heavy and normalized_euro and normalized_heavy != normalized_euro:
        _set_error(
            errors,
            "heavy_euro_standard",
            "heavy_euro_standard and euro_standard must match when both are provided.",
        )
        return

    resolved = normalized_heavy or normalized_euro
    if resolved is None:
        return

    state["heavy_euro_standard"] = resolved
    state["euro_standard"] = resolved

    if "heavy_euro_standard" in validated_data:
        validated_data["heavy_euro_standard"] = resolved
    if "euro_standard" in validated_data:
        validated_data["euro_standard"] = resolved


def _validate_allowed_fields(
    validated_data: dict[str, Any],
    main_category: str,
    errors: dict[str, Any],
) -> None:
    allowed_fields = PUBLIC_API_ALLOWED_FIELDS_BY_CATEGORY[main_category]

    for field_name, value in validated_data.items():
        if field_name in PUBLIC_API_INTERNAL_VALIDATED_FIELDS:
            continue
        if field_name in allowed_fields:
            continue
        if _is_missing(value):
            continue
        _set_error(
            errors,
            field_name,
            f"Field '{field_name}' is not supported for the '{main_category}' public API endpoint.",
        )


def _validate_promotion_field_consistency(state: dict[str, Any], errors: dict[str, Any]) -> None:
    listing_type = str(state.get("listing_type") or "normal").strip().lower() or "normal"
    top_plan = state.get("top_plan")
    vip_plan = state.get("vip_plan")

    if listing_type == "top":
        if not _is_missing(vip_plan):
            _set_error(errors, "vip_plan", "vip_plan can be sent only when listing_type='vip'.")
        return

    if listing_type == "vip":
        if not _is_missing(top_plan):
            _set_error(errors, "top_plan", "top_plan can be sent only when listing_type='top'.")
        return

    if not _is_missing(top_plan):
        _set_error(errors, "top_plan", "top_plan can be sent only when listing_type='top'.")
    if not _is_missing(vip_plan):
        _set_error(errors, "vip_plan", "vip_plan can be sent only when listing_type='vip'.")


def _validate_required_fields(
    state: dict[str, Any],
    main_category: str,
    is_publish: bool,
    errors: dict[str, Any],
) -> None:
    required_fields = (
        PUBLIC_API_PUBLISH_REQUIRED_FIELDS_BY_CATEGORY[main_category]
        if is_publish
        else PUBLIC_API_DRAFT_REQUIRED_FIELDS_BY_CATEGORY[main_category]
    )

    for field_name in sorted(required_fields):
        value = _resolved_required_value(state, main_category, field_name)
        if _is_missing(value):
            phase = "publishing" if is_publish else "draft creation"
            _set_error(
                errors,
                field_name,
                f"This field is required for {phase} in the '{main_category}' public API endpoint.",
            )


def _validate_uploaded_images(
    validated_data: dict[str, Any],
    listing,
    errors: dict[str, Any],
) -> None:
    uploaded_images = list(validated_data.get("images_upload") or [])
    existing_count = listing.images.count() if listing is not None else 0

    if len(uploaded_images) > PUBLIC_API_MAX_IMAGES:
        _set_error(
            errors,
            "images_upload",
            f"You can upload at most {PUBLIC_API_MAX_IMAGES} images per request.",
        )
        return

    if existing_count + len(uploaded_images) > PUBLIC_API_MAX_IMAGES:
        _set_error(
            errors,
            "images_upload",
            f"A listing can have at most {PUBLIC_API_MAX_IMAGES} images in total.",
        )
        return

    for image in uploaded_images:
        size = getattr(image, "size", None)
        if size is None:
            continue
        if size <= 0:
            _set_error(errors, "images_upload", "Uploaded images must not be empty.")
            return
        if size > PUBLIC_API_MAX_IMAGE_BYTES:
            _set_error(
                errors,
                "images_upload",
                f"Each uploaded image must be {PUBLIC_API_MAX_IMAGE_BYTES // (1024 * 1024)} MB or smaller.",
            )
            return


def _validate_detail_fields(
    state: dict[str, Any],
    validated_data: dict[str, Any],
    main_category: str,
    is_publish: bool,
    errors: dict[str, Any],
) -> None:
    detail_model, _ = PUBLIC_API_DETAIL_MODEL_BY_CATEGORY[main_category]
    detail_fields = PUBLIC_API_DETAIL_FIELDS_BY_CATEGORY[main_category]

    fields_to_validate = set(validated_data).intersection(detail_fields)
    if is_publish:
        fields_to_validate |= detail_fields.intersection(state.keys())
        fields_to_validate |= PUBLIC_API_PUBLISH_REQUIRED_FIELDS_BY_CATEGORY[main_category].intersection(
            detail_fields
        )

    for field_name in sorted(fields_to_validate):
        value = _resolved_required_value(state, main_category, field_name)
        if _is_missing(value):
            continue

        if field_name == "condition" and str(value) not in PUBLIC_API_CONDITION_VALUES:
            _set_error(errors, field_name, "Use condition values 0, 1, 2 or 3.")
            continue

        model_field_name = _public_field_to_model_field(main_category, field_name)
        model_field = detail_model._meta.get_field(model_field_name)

        try:
            model_field.clean(value, None)
        except DjangoValidationError as exc:
            _set_error(errors, field_name, _format_django_validation_error(exc))


def _resolved_required_value(state: dict[str, Any], main_category: str, field_name: str) -> Any:
    if field_name in PUBLIC_API_MOTO_META_FIELDS and main_category == "motorcycles":
        explicit_value = state.get(field_name)
        if not _is_missing(explicit_value):
            return explicit_value

        parsed = _extract_moto_meta_from_features(state.get("features") or [])
        return parsed.get(field_name)

    if field_name == "heavy_euro_standard" and main_category in {"buses", "trucks"}:
        return state.get("heavy_euro_standard") or state.get("euro_standard")

    return state.get(field_name)


def _public_field_to_model_field(main_category: str, field_name: str) -> str:
    if main_category in {"buses", "trucks"} and field_name == "heavy_euro_standard":
        return "euro_standard"
    return field_name


def _normalize_euro_standard_value(value: Any) -> str:
    normalized = str(value).strip().lower()
    aliases = {
        "1": "1",
        "2": "2",
        "3": "3",
        "4": "4",
        "5": "5",
        "6": "6",
        "euro 1": "1",
        "euro 2": "2",
        "euro 3": "3",
        "euro 4": "4",
        "euro 5": "5",
        "euro 6": "6",
        "eur 1": "1",
        "eur 2": "2",
        "eur 3": "3",
        "eur 4": "4",
        "eur 5": "5",
        "eur 6": "6",
    }
    return aliases.get(normalized, str(value).strip())


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def _format_django_validation_error(exc: DjangoValidationError) -> str:
    if getattr(exc, "messages", None):
        return " ".join(str(message) for message in exc.messages)
    return str(exc)


def _set_error(errors: dict[str, Any], field_name: str, message: str) -> None:
    if field_name not in errors:
        errors[field_name] = message
