from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from backend.accounts.models import BusinessUser, UserProfile
from backend.listings.models import (
    CarListing,
    Favorite,
    ListingAnonymousView,
    ListingView,
    get_expiry_cutoff,
    get_listing_expiry,
    get_top_expiry,
    get_vip_short_expiry,
)
from backend.payments.models import PaymentTransaction
from backend.reports.models import ListingReport

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def _parse_positive_int(raw_value, default_value, max_value):
    try:
        value = int(str(raw_value))
    except (TypeError, ValueError):
        value = default_value
    if value < 1:
        value = default_value
    return min(value, max_value)


def _parse_bool(raw_value):
    if isinstance(raw_value, bool):
        return raw_value
    if raw_value is None:
        return None
    normalized = str(raw_value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


def _to_decimal(value):
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _paginate_queryset(queryset, request):
    page = _parse_positive_int(request.query_params.get("page"), 1, 100000)
    page_size = _parse_positive_int(
        request.query_params.get("page_size"),
        DEFAULT_PAGE_SIZE,
        MAX_PAGE_SIZE,
    )
    total = queryset.count()
    start = (page - 1) * page_size
    end = start + page_size
    items = list(queryset[start:end])
    return items, {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


def _has_business_profile(user):
    try:
        user.business_profile
        return True
    except BusinessUser.DoesNotExist:
        return False


def _resolve_seller_name(user):
    try:
        business = user.business_profile
    except BusinessUser.DoesNotExist:
        business = None

    if business and business.dealer_name:
        return business.dealer_name
    full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
    return full_name or user.email or f"User {user.id}"


def _resolve_user_type(user):
    if _has_business_profile(user):
        return "business"
    return "private"


def _serialize_listing(listing):
    return {
        "id": listing.id,
        "slug": listing.slug,
        "title": listing.title,
        "brand": listing.brand,
        "model": listing.model,
        "main_category": listing.main_category,
        "year_from": listing.year_from,
        "price": float(listing.price),
        "city": listing.city,
        "listing_type": listing.listing_type,
        "is_active": listing.is_active,
        "is_draft": listing.is_draft,
        "is_archived": listing.is_archived,
        "is_expired": listing.created_at < get_expiry_cutoff(),
        "view_count": listing.view_count,
        "top_plan": listing.top_plan,
        "top_expires_at": listing.top_expires_at,
        "vip_plan": listing.vip_plan,
        "vip_expires_at": listing.vip_expires_at,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
        "user_id": listing.user_id,
        "user_email": listing.user.email,
        "seller_name": _resolve_seller_name(listing.user),
        "seller_type": _resolve_user_type(listing.user),
    }


def _serialize_user(user):
    try:
        balance = float(user.profile.balance)
    except UserProfile.DoesNotExist:
        balance = 0.0

    listing_count = int(getattr(user, "listing_count", 0) or 0)
    total_views = int(getattr(user, "total_views", 0) or 0)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_admin": bool(user.is_staff or user.is_superuser),
        "user_type": _resolve_user_type(user),
        "balance": balance,
        "listing_count": listing_count,
        "total_views": total_views,
        "created_at": user.date_joined,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_overview(request):
    today = timezone.localdate()
    start_date = today - timedelta(days=13)
    day_keys = [start_date + timedelta(days=offset) for offset in range(14)]

    expiry_cutoff = get_expiry_cutoff()

    users_total = User.objects.count()
    users_private = User.objects.filter(business_profile__isnull=True).count()
    users_business = User.objects.filter(business_profile__isnull=False).count()
    users_admin = User.objects.filter(is_staff=True).count()

    listings_total = CarListing.objects.count()
    listings_active = CarListing.objects.filter(
        is_active=True,
        is_draft=False,
        is_archived=False,
        created_at__gte=expiry_cutoff,
    ).count()
    listings_archived = CarListing.objects.filter(is_archived=True).count()
    listings_drafts = CarListing.objects.filter(is_draft=True).count()
    listings_expired = CarListing.objects.filter(
        is_draft=False,
        is_archived=False,
        created_at__lt=expiry_cutoff,
    ).count()

    tx_all = PaymentTransaction.objects.all()
    tx_succeeded = tx_all.filter(status=PaymentTransaction.Status.SUCCEEDED)
    tx_amount_total = tx_succeeded.aggregate(
        total=Coalesce(Sum("amount"), Value(Decimal("0.00")))
    )["total"]

    views_total = CarListing.objects.aggregate(total=Coalesce(Sum("view_count"), Value(0)))["total"]

    authenticated_views = (
        ListingView.objects.filter(created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"))
    )
    anonymous_views = (
        ListingAnonymousView.objects.filter(created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"))
    )

    views_by_day = {day: 0 for day in day_keys}
    for row in authenticated_views:
        day = row.get("day")
        if day in views_by_day:
            views_by_day[day] += int(row.get("total") or 0)
    for row in anonymous_views:
        day = row.get("day")
        if day in views_by_day:
            views_by_day[day] += int(row.get("total") or 0)

    purchases_by_day = {day: {"count": 0, "amount": Decimal("0.00")} for day in day_keys}
    purchase_rows = (
        tx_succeeded.filter(created_at__date__gte=start_date)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            total=Count("id"),
            amount=Coalesce(Sum("amount"), Value(Decimal("0.00"))),
        )
    )
    for row in purchase_rows:
        day = row.get("day")
        if day in purchases_by_day:
            purchases_by_day[day]["count"] = int(row.get("total") or 0)
            purchases_by_day[day]["amount"] = row.get("amount") or Decimal("0.00")

    top_listings = (
        CarListing.objects.select_related("user", "user__business_profile")
        .order_by("-view_count", "-created_at")[:10]
    )

    top_sellers = (
        User.objects.select_related("business_profile")
        .annotate(
            listing_count=Count("car_listings", distinct=True),
            total_views=Coalesce(Sum("car_listings__view_count"), Value(0)),
        )
        .filter(listing_count__gt=0)
        .order_by("-total_views", "-listing_count", "-date_joined")[:10]
    )

    category_labels = dict(CarListing.MAIN_CATEGORY_CHOICES)
    listing_type_labels = dict(CarListing.LISTING_TYPE_CHOICES)
    category_breakdown = [
        {
            "main_category": row["main_category"],
            "label": category_labels.get(row["main_category"], row["main_category"]),
            "count": row["count"],
        }
        for row in CarListing.objects.values("main_category")
        .annotate(count=Count("id"))
        .order_by("-count")
    ]
    listing_type_breakdown = [
        {
            "listing_type": row["listing_type"],
            "label": listing_type_labels.get(row["listing_type"], row["listing_type"]),
            "count": row["count"],
        }
        for row in CarListing.objects.values("listing_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    ]

    return Response(
        {
            "generated_at": timezone.now(),
            "totals": {
                "users_total": users_total,
                "users_private": users_private,
                "users_business": users_business,
                "users_admin": users_admin,
                "listings_total": listings_total,
                "listings_active": listings_active,
                "listings_archived": listings_archived,
                "listings_drafts": listings_drafts,
                "listings_expired": listings_expired,
                "transactions_total": tx_all.count(),
                "transactions_succeeded": tx_succeeded.count(),
                "transactions_amount_total": float(tx_amount_total or Decimal("0.00")),
                "reports_total": ListingReport.objects.count(),
                "favorites_total": Favorite.objects.count(),
                "views_total": int(views_total or 0),
            },
            "series": {
                "views_last_14_days": [
                    {"date": day.isoformat(), "count": views_by_day[day]}
                    for day in day_keys
                ],
                "purchases_last_14_days": [
                    {
                        "date": day.isoformat(),
                        "count": purchases_by_day[day]["count"],
                        "amount": float(purchases_by_day[day]["amount"]),
                    }
                    for day in day_keys
                ],
            },
            "top_listings": [_serialize_listing(item) for item in top_listings],
            "top_sellers": [
                {
                    "id": seller.id,
                    "email": seller.email,
                    "name": _resolve_seller_name(seller),
                    "seller_type": _resolve_user_type(seller),
                    "listing_count": int(getattr(seller, "listing_count", 0) or 0),
                    "total_views": int(getattr(seller, "total_views", 0) or 0),
                    "is_admin": bool(seller.is_staff or seller.is_superuser),
                }
                for seller in top_sellers
            ],
            "category_breakdown": category_breakdown,
            "listing_type_breakdown": listing_type_breakdown,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_listings(request):
    queryset = CarListing.objects.select_related("user", "user__business_profile")

    search_query = (request.query_params.get("q") or "").strip()
    if search_query:
        queryset = queryset.filter(
            Q(title__icontains=search_query)
            | Q(brand__icontains=search_query)
            | Q(model__icontains=search_query)
            | Q(slug__icontains=search_query)
            | Q(user__email__icontains=search_query)
        )

    status_filter = (request.query_params.get("status") or "all").strip().lower()
    expiry_cutoff = get_expiry_cutoff()
    if status_filter == "active":
        queryset = queryset.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=expiry_cutoff,
        )
    elif status_filter == "draft":
        queryset = queryset.filter(is_draft=True)
    elif status_filter == "archived":
        queryset = queryset.filter(is_archived=True)
    elif status_filter == "expired":
        queryset = queryset.filter(
            is_draft=False,
            is_archived=False,
            created_at__lt=expiry_cutoff,
        )

    listing_type = (request.query_params.get("listing_type") or "").strip().lower()
    if listing_type in {"normal", "top", "vip"}:
        queryset = queryset.filter(listing_type=listing_type)

    main_category = (request.query_params.get("main_category") or "").strip()
    if main_category:
        queryset = queryset.filter(main_category=main_category)

    seller_type = (request.query_params.get("seller_type") or "").strip().lower()
    if seller_type == "business":
        queryset = queryset.filter(user__business_profile__isnull=False)
    elif seller_type == "private":
        queryset = queryset.filter(user__business_profile__isnull=True)

    sort_mapping = {
        "newest": "-created_at",
        "oldest": "created_at",
        "price_asc": "price",
        "price_desc": "-price",
        "views_desc": "-view_count",
        "views_asc": "view_count",
        "updated_desc": "-updated_at",
        "updated_asc": "updated_at",
    }
    sort_by = (request.query_params.get("sort") or "newest").strip().lower()
    queryset = queryset.order_by(sort_mapping.get(sort_by, "-created_at"))

    items, pagination = _paginate_queryset(queryset, request)
    return Response(
        {
            "results": [_serialize_listing(item) for item in items],
            "pagination": pagination,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_listing_update(request, listing_id):
    listing = get_object_or_404(
        CarListing.objects.select_related("user", "user__business_profile"),
        pk=listing_id,
    )
    data = request.data
    has_changes = False

    for field in ("is_active", "is_draft", "is_archived"):
        if field not in data:
            continue
        parsed = _parse_bool(data.get(field))
        if parsed is None:
            return Response(
                {"error": f"Invalid boolean value for {field}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        setattr(listing, field, parsed)
        has_changes = True

    if "price" in data:
        parsed_price = _to_decimal(data.get("price"))
        if parsed_price is None or parsed_price < 0:
            return Response(
                {"error": "Invalid price value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        listing.price = parsed_price
        has_changes = True

    if "title" in data:
        listing.title = str(data.get("title") or "").strip()[:200]
        has_changes = True

    if "city" in data:
        listing.city = str(data.get("city") or "").strip()[:100]
        has_changes = True

    if "listing_type" in data:
        listing_type = str(data.get("listing_type") or "").strip().lower()
        if listing_type not in {"normal", "top", "vip"}:
            return Response(
                {"error": "Invalid listing_type value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        if listing_type == "top":
            top_plan = str(data.get("top_plan") or listing.top_plan or "1d").strip().lower()
            if top_plan not in {"1d", "7d"}:
                return Response(
                    {"error": "Invalid top_plan value."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            listing.listing_type = "top"
            listing.top_plan = top_plan
            listing.top_paid_at = now
            listing.top_expires_at = get_top_expiry(now, top_plan=top_plan)
            listing.vip_plan = None
            listing.vip_paid_at = None
            listing.vip_expires_at = None
        elif listing_type == "vip":
            vip_plan = str(data.get("vip_plan") or listing.vip_plan or "7d").strip().lower()
            if vip_plan not in {"7d", "lifetime"}:
                return Response(
                    {"error": "Invalid vip_plan value."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            listing.listing_type = "vip"
            listing.vip_plan = vip_plan
            listing.vip_paid_at = now
            if vip_plan == "lifetime":
                listing.vip_expires_at = get_listing_expiry(listing.created_at, now=now)
            else:
                listing.vip_expires_at = get_vip_short_expiry(now)
            listing.top_plan = None
            listing.top_paid_at = None
            listing.top_expires_at = None
        else:
            listing.listing_type = "normal"
            listing.top_plan = None
            listing.top_paid_at = None
            listing.top_expires_at = None
            listing.vip_plan = None
            listing.vip_paid_at = None
            listing.vip_expires_at = None
        has_changes = True

    if listing.is_archived or listing.is_draft:
        listing.is_active = False

    if not has_changes:
        return Response(
            {"error": "No valid fields provided for update."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    listing.save()
    return Response(_serialize_listing(listing), status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_listing_delete(request, listing_id):
    listing = get_object_or_404(CarListing, pk=listing_id)
    listing.delete()
    return Response({"message": "Listing deleted."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_users(request):
    queryset = (
        User.objects.select_related("profile", "business_profile")
        .annotate(
            listing_count=Count("car_listings", distinct=True),
            total_views=Coalesce(Sum("car_listings__view_count"), Value(0)),
        )
        .all()
    )

    search_query = (request.query_params.get("q") or "").strip()
    if search_query:
        queryset = queryset.filter(
            Q(email__icontains=search_query)
            | Q(username__icontains=search_query)
            | Q(first_name__icontains=search_query)
            | Q(last_name__icontains=search_query)
        )

    user_type = (request.query_params.get("user_type") or "").strip().lower()
    if user_type == "business":
        queryset = queryset.filter(business_profile__isnull=False)
    elif user_type == "private":
        queryset = queryset.filter(business_profile__isnull=True)

    is_admin = _parse_bool(request.query_params.get("is_admin"))
    if is_admin is True:
        queryset = queryset.filter(Q(is_staff=True) | Q(is_superuser=True))
    elif is_admin is False:
        queryset = queryset.filter(is_staff=False, is_superuser=False)

    is_active = _parse_bool(request.query_params.get("is_active"))
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    sort_mapping = {
        "newest": "-date_joined",
        "oldest": "date_joined",
        "listings_desc": "-listing_count",
        "listings_asc": "listing_count",
        "views_desc": "-total_views",
        "views_asc": "total_views",
        "email_asc": "email",
        "email_desc": "-email",
    }
    sort_by = (request.query_params.get("sort") or "newest").strip().lower()
    queryset = queryset.order_by(sort_mapping.get(sort_by, "-date_joined"))

    items, pagination = _paginate_queryset(queryset, request)
    return Response(
        {
            "results": [_serialize_user(item) for item in items],
            "pagination": pagination,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_user_update(request, user_id):
    target = get_object_or_404(User.objects.select_related("profile", "business_profile"), pk=user_id)
    data = request.data
    changed = False

    if "is_active" in data:
        parsed = _parse_bool(data.get("is_active"))
        if parsed is None:
            return Response({"error": "Invalid is_active value."}, status=status.HTTP_400_BAD_REQUEST)
        target.is_active = parsed
        changed = True

    for field in ("is_staff", "is_superuser"):
        if field not in data:
            continue
        if not request.user.is_superuser:
            return Response(
                {"error": "Only superusers can change admin roles."},
                status=status.HTTP_403_FORBIDDEN,
            )
        parsed = _parse_bool(data.get(field))
        if parsed is None:
            return Response(
                {"error": f"Invalid {field} value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if field == "is_superuser" and target.is_superuser and parsed is False:
            superusers_count = User.objects.filter(is_superuser=True).count()
            if superusers_count <= 1:
                return Response(
                    {"error": "At least one superuser account must remain."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        setattr(target, field, parsed)
        changed = True

    if "balance" in data:
        parsed_balance = _to_decimal(data.get("balance"))
        if parsed_balance is None or parsed_balance < 0:
            return Response(
                {"error": "Invalid balance value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile, _ = UserProfile.objects.get_or_create(user=target)
        profile.balance = parsed_balance
        profile.save(update_fields=["balance", "updated_at"])
        changed = True

    if not changed:
        return Response({"error": "No valid fields provided for update."}, status=status.HTTP_400_BAD_REQUEST)

    target.save()
    target.refresh_from_db()
    return Response(_serialize_user(target), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_transactions(request):
    queryset = PaymentTransaction.objects.select_related("user")

    search_query = (request.query_params.get("q") or "").strip()
    if search_query:
        queryset = queryset.filter(
            Q(user__email__icontains=search_query)
            | Q(stripe_session_id__icontains=search_query)
            | Q(stripe_payment_intent_id__icontains=search_query)
        )

    status_filter = (request.query_params.get("status") or "").strip().lower()
    allowed_statuses = {
        PaymentTransaction.Status.PENDING,
        PaymentTransaction.Status.SUCCEEDED,
        PaymentTransaction.Status.FAILED,
        PaymentTransaction.Status.CANCELLED,
    }
    if status_filter in allowed_statuses:
        queryset = queryset.filter(status=status_filter)

    credited_filter = _parse_bool(request.query_params.get("credited"))
    if credited_filter is not None:
        queryset = queryset.filter(credited=credited_filter)

    sort_mapping = {
        "newest": "-created_at",
        "oldest": "created_at",
        "amount_desc": "-amount",
        "amount_asc": "amount",
    }
    sort_by = (request.query_params.get("sort") or "newest").strip().lower()
    queryset = queryset.order_by(sort_mapping.get(sort_by, "-created_at"))

    items, pagination = _paginate_queryset(queryset, request)
    return Response(
        {
            "results": [
                {
                    "id": tx.id,
                    "user_id": tx.user_id,
                    "user_email": tx.user.email,
                    "amount": float(tx.amount),
                    "currency": tx.currency,
                    "status": tx.status,
                    "credited": tx.credited,
                    "failure_reason": tx.failure_reason,
                    "stripe_session_id": tx.stripe_session_id,
                    "stripe_payment_intent_id": tx.stripe_payment_intent_id,
                    "created_at": tx.created_at,
                    "updated_at": tx.updated_at,
                }
                for tx in items
            ],
            "pagination": pagination,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reports(request):
    queryset = ListingReport.objects.select_related("user", "listing")

    search_query = (request.query_params.get("q") or "").strip()
    if search_query:
        queryset = queryset.filter(
            Q(message__icontains=search_query)
            | Q(user__email__icontains=search_query)
            | Q(listing__title__icontains=search_query)
            | Q(listing__brand__icontains=search_query)
            | Q(listing__model__icontains=search_query)
        )

    listing_id = request.query_params.get("listing_id")
    if listing_id:
        try:
            queryset = queryset.filter(listing_id=int(listing_id))
        except (TypeError, ValueError):
            return Response({"error": "Invalid listing_id value."}, status=status.HTTP_400_BAD_REQUEST)

    queryset = queryset.order_by("-created_at")

    items, pagination = _paginate_queryset(queryset, request)
    return Response(
        {
            "results": [
                {
                    "id": report.id,
                    "listing_id": report.listing_id,
                    "listing_slug": report.listing.slug,
                    "listing_title": report.listing.title,
                    "listing_brand": report.listing.brand,
                    "listing_model": report.listing.model,
                    "user_id": report.user_id,
                    "user_email": report.user.email,
                    "incorrect_price": report.incorrect_price,
                    "other_issue": report.other_issue,
                    "message": report.message,
                    "accepted_terms": report.accepted_terms,
                    "created_at": report.created_at,
                }
                for report in items
            ],
            "pagination": pagination,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_report_delete(request, report_id):
    report = get_object_or_404(ListingReport, pk=report_id)
    report.delete()
    return Response({"message": "Report deleted."}, status=status.HTTP_200_OK)
