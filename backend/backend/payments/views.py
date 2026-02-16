import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.db import transaction as db_transaction
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.timezone import localtime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from backend.accounts.models import UserProfile
from backend.payments.models import PaymentTransaction
from backend.payments.serializers import PaymentTransactionSerializer
from backend.payments.services.stripe_service import (
    StripeServiceError,
    construct_event,
    create_checkout_session,
    retrieve_checkout_session,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def _invoice_number_for_transaction(tx: PaymentTransaction) -> str:
    issued_at = localtime(tx.credited_at or tx.updated_at or tx.created_at)
    return f"AB-{issued_at:%Y%m%d}-{tx.id}"


def _build_invoice_email_context(tx: PaymentTransaction) -> dict[str, str]:
    user = tx.user
    issued_at = localtime(tx.credited_at or tx.updated_at or tx.created_at)
    customer_name = (
        user.get_full_name().strip()
        or getattr(user, "username", "").strip()
        or user.email
        or "Customer"
    )
    return {
        "brand_name": "AvtoBorsa",
        "invoice_number": _invoice_number_for_transaction(tx),
        "issued_at": issued_at.strftime("%Y-%m-%d %H:%M"),
        "invoice_year": f"{issued_at:%Y}",
        "customer_name": customer_name,
        "customer_email": user.email or "-",
        "transaction_id": str(tx.id),
        "stripe_session_id": tx.stripe_session_id or "-",
        "payment_method": "Card via Stripe Checkout",
        "amount": f"{tx.amount:.2f}",
        "currency": tx.currency,
        "support_email": settings.DEFAULT_FROM_EMAIL,
    }


def send_invoice_email(tx: PaymentTransaction) -> None:
    if not tx.user.email:
        return

    context = _build_invoice_email_context(tx)
    subject = f"Your AvtoBorsa invoice {context['invoice_number']}"
    html_message = render_to_string("payments/invoice_email.html", context)
    text_message = strip_tags(html_message)

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[tx.user.email],
    )
    message.attach_alternative(html_message, "text/html")
    message.send(fail_silently=False)


def _send_invoice_email_after_commit(transaction_id: int) -> None:
    tx = (
        PaymentTransaction.objects.select_related("user")
        .filter(pk=transaction_id)
        .first()
    )
    if tx is None:
        return

    try:
        send_invoice_email(tx)
    except Exception:
        logger.exception(
            "Failed to send invoice email for transaction %s",
            transaction_id,
        )


def _normalize_session_data(session_data: object) -> dict:
    """Return a dict for Stripe session payloads, or empty dict if invalid."""
    return session_data if isinstance(session_data, dict) else {}


def _parse_amount(amount_raw) -> Decimal:
    """Validate the incoming amount and normalize to 2 decimal places."""
    if amount_raw in (None, ""):
        raise ValueError("Amount is required.")

    try:
        amount = Decimal(str(amount_raw)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Invalid amount format.") from exc

    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")
    if amount > Decimal("999999.99"):
        raise ValueError("Amount exceeds maximum limit.")
    return amount


def _default_success_url() -> str:
    """Fallback success redirect when frontend does not provide one."""
    frontend = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    return f"{frontend}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}"


def _default_cancel_url() -> str:
    """Fallback cancel redirect when frontend does not provide one."""
    frontend = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    return f"{frontend}/?payment=cancelled"


def _update_transaction_from_session(
    tx: PaymentTransaction, session_data: dict, event_id: str | None
) -> PaymentTransaction:
    """Store Stripe identifiers and snapshot the latest session payload."""
    session_data = _normalize_session_data(session_data)
    payment_intent_id = session_data.get("payment_intent")
    if payment_intent_id and tx.stripe_payment_intent_id != payment_intent_id:
        tx.stripe_payment_intent_id = payment_intent_id

    if event_id:
        tx.stripe_event_id = event_id

    if session_data:
        metadata = tx.metadata or {}
        metadata["session_snapshot"] = session_data
        tx.metadata = metadata

    return tx


def _credit_balance_if_needed(tx: PaymentTransaction) -> PaymentTransaction:
    """Idempotently credit user balance for a successful transaction."""
    with db_transaction.atomic():
        locked_tx = (
            PaymentTransaction.objects.select_for_update()
            .select_related("user")
            .get(pk=tx.pk)
        )

        if locked_tx.credited:
            return locked_tx

        profile, _ = UserProfile.objects.select_for_update().get_or_create(user=locked_tx.user)
        profile.balance += locked_tx.amount
        profile.save()

        locked_tx.status = PaymentTransaction.Status.SUCCEEDED
        locked_tx.mark_credited()
        locked_tx.save(
            update_fields=[
                "status",
                "credited",
                "credited_at",
                "stripe_payment_intent_id",
                "stripe_event_id",
                "metadata",
                "updated_at",
            ]
        )
        db_transaction.on_commit(
            lambda transaction_id=locked_tx.pk: _send_invoice_email_after_commit(transaction_id)
        )
        return locked_tx


def _mark_transaction_status(
    tx: PaymentTransaction,
    *,
    new_status: str,
    reason: str = "",
    event_id: str | None = None,
    session_data: dict | None = None,
) -> PaymentTransaction:
    """Update transaction status and persist Stripe context."""
    session_data = _normalize_session_data(session_data)
    tx.status = new_status
    if reason:
        tx.failure_reason = reason
    if event_id:
        tx.stripe_event_id = event_id
    if session_data:
        metadata = tx.metadata or {}
        metadata["session_snapshot"] = session_data
        tx.metadata = metadata
    tx.save(update_fields=["status", "failure_reason", "stripe_event_id", "metadata", "updated_at"])
    return tx


def _get_user_id_from_session(session_data: dict) -> int | None:
    """Extract user id from Stripe metadata or client_reference_id."""
    session_data = _normalize_session_data(session_data)
    metadata = session_data.get("metadata", {}) if isinstance(session_data.get("metadata"), dict) else {}
    raw_user_id = metadata.get("user_id") or session_data.get("client_reference_id")
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _get_or_create_transaction_from_session(session_data: dict) -> PaymentTransaction:
    """Create a local transaction from Stripe session data if it doesn't exist."""
    session_data = _normalize_session_data(session_data)
    session_id = session_data.get("id")
    if not session_id:
        raise StripeServiceError("Missing checkout session id in Stripe event.")

    transaction_qs = PaymentTransaction.objects.filter(stripe_session_id=session_id)
    existing = transaction_qs.first()
    if existing:
        return existing

    user_id = _get_user_id_from_session(session_data)
    if not user_id:
        raise StripeServiceError("Missing user id metadata in Stripe event.")

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist as exc:
        raise StripeServiceError("User from Stripe metadata does not exist.") from exc

    amount_total = session_data.get("amount_total")
    if amount_total is None:
        raise StripeServiceError("Missing amount_total in Stripe session.")

    amount = (Decimal(str(amount_total)) / Decimal("100")).quantize(Decimal("0.01"))
    currency = str(session_data.get("currency") or "eur").upper()
    payment_intent = session_data.get("payment_intent")

    tx = PaymentTransaction.objects.create(
        user=user,
        amount=amount,
        currency=currency,
        status=PaymentTransaction.Status.PENDING,
        stripe_session_id=session_id,
        stripe_payment_intent_id=payment_intent,
        metadata={"session_snapshot": session_data},
    )
    return tx


def _process_successful_checkout_session(
    session_data: dict, event_id: str | None
) -> PaymentTransaction:
    """Mark session as succeeded and ensure balance is credited once."""
    tx = _get_or_create_transaction_from_session(session_data)
    tx = _update_transaction_from_session(tx, session_data, event_id)
    tx.status = PaymentTransaction.Status.SUCCEEDED
    tx.save(
        update_fields=[
            "status",
            "stripe_payment_intent_id",
            "stripe_event_id",
            "metadata",
            "updated_at",
        ]
    )
    return _credit_balance_if_needed(tx)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session_view(request):
    """Create a Stripe checkout session for a balance top-up."""
    try:
        amount = _parse_amount(request.data.get("amount"))
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    success_url = request.data.get("success_url") or getattr(
        settings, "STRIPE_CHECKOUT_SUCCESS_URL", _default_success_url()
    )
    cancel_url = request.data.get("cancel_url") or getattr(
        settings, "STRIPE_CHECKOUT_CANCEL_URL", _default_cancel_url()
    )

    if not isinstance(success_url, str) or not success_url.startswith("http"):
        return Response({"error": "Invalid success_url."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(cancel_url, str) or not cancel_url.startswith("http"):
        return Response({"error": "Invalid cancel_url."}, status=status.HTTP_400_BAD_REQUEST)

    # Currency is enforced server-side to avoid client tampering.
    currency = getattr(settings, "STRIPE_CURRENCY", "EUR").upper()

    try:
        session = create_checkout_session(
            amount=amount,
            currency=currency,
            user_id=request.user.id,
            user_email=request.user.email,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except StripeServiceError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    session_id = session.get("id")
    checkout_url = session.get("url")
    if not session_id or not checkout_url:
        return Response(
            {"error": "Stripe session response is missing required fields."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    tx, _ = PaymentTransaction.objects.update_or_create(
        stripe_session_id=session_id,
        defaults={
            "user": request.user,
            "amount": amount,
            "currency": currency,
            "status": PaymentTransaction.Status.PENDING,
            "stripe_payment_intent_id": session.get("payment_intent"),
            "metadata": {"session_snapshot": session},
            "failure_reason": "",
        },
    )

    return Response(
        {
            "transaction_id": tx.id,
            "session_id": session_id,
            "url": checkout_url,
            "status": tx.status,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def checkout_session_status_view(request):
    """Poll Stripe for session status and sync local transaction state."""
    session_id = request.query_params.get("session_id")
    if not session_id:
        return Response({"error": "session_id query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

    tx = PaymentTransaction.objects.filter(
        stripe_session_id=session_id,
        user=request.user,
    ).first()
    if not tx:
        return Response({"error": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)

    if tx.status == PaymentTransaction.Status.PENDING:
        try:
            session_data = retrieve_checkout_session(session_id)
            session_data = _normalize_session_data(session_data)
            payment_status = session_data.get("payment_status")
            session_status = session_data.get("status")

            if payment_status == "paid":
                tx = _process_successful_checkout_session(session_data, event_id=None)
            elif session_status == "expired":
                tx = _mark_transaction_status(
                    tx,
                    new_status=PaymentTransaction.Status.CANCELLED,
                    reason="Checkout session expired.",
                    session_data=session_data,
                )
            else:
                tx = _update_transaction_from_session(tx, session_data, event_id=None)
                tx.save(
                    update_fields=[
                        "stripe_payment_intent_id",
                        "metadata",
                        "updated_at",
                    ]
                )
        except StripeServiceError:
            # Keep pending if Stripe cannot be reached right now.
            pass

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response(
        {
            "transaction_id": tx.id,
            "session_id": tx.stripe_session_id,
            "status": tx.status,
            "credited": tx.credited,
            "balance": float(profile.balance),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_transactions(request):
    """List Stripe transactions for the current user."""
    transactions = PaymentTransaction.objects.filter(user=request.user).order_by("-created_at")
    serializer = PaymentTransactionSerializer(transactions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def stripe_webhook_view(request):
    """Handle Stripe webhook events for checkout sessions."""
    payload = request.body
    signature = request.META.get("HTTP_STRIPE_SIGNATURE")

    try:
        event = construct_event(payload, signature)
    except StripeServiceError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    event_type = event.get("type")
    event_id = event.get("id")
    data = event.get("data", {})
    session_data = _normalize_session_data(data.get("object") if isinstance(data, dict) else {})

    try:
        if event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            payment_status = session_data.get("payment_status")
            if payment_status == "paid" or event_type == "checkout.session.async_payment_succeeded":
                _process_successful_checkout_session(session_data, event_id)
        elif event_type == "checkout.session.expired":
            tx = _get_or_create_transaction_from_session(session_data)
            _mark_transaction_status(
                tx,
                new_status=PaymentTransaction.Status.CANCELLED,
                reason="Checkout session expired.",
                event_id=event_id,
                session_data=session_data,
            )
        elif event_type == "checkout.session.async_payment_failed":
            tx = _get_or_create_transaction_from_session(session_data)
            _mark_transaction_status(
                tx,
                new_status=PaymentTransaction.Status.FAILED,
                reason="Async payment failed.",
                event_id=event_id,
                session_data=session_data,
            )
    except StripeServiceError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"received": True}, status=status.HTTP_200_OK)


