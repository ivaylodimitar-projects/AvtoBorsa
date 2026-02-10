import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.conf import settings


class StripeServiceError(Exception):
    pass


def decimal_to_minor_units(amount: Decimal) -> int:
    if amount <= 0:
        raise StripeServiceError("Amount must be greater than zero.")
    quantized = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(quantized * 100)


def _get_secret_key() -> str:
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not secret_key:
        raise StripeServiceError("Stripe secret key is not configured.")
    return secret_key


def _parse_error_message(payload: str) -> str:
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return "Stripe API request failed."

    error = parsed.get("error", {})
    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str) and message.strip():
            return message
    return "Stripe API request failed."


def _stripe_request(method: str, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
    endpoint_base = getattr(settings, "STRIPE_API_BASE", "https://api.stripe.com/v1").rstrip("/")
    url = f"{endpoint_base}/{path.lstrip('/')}"

    headers = {
        "Authorization": f"Bearer {_get_secret_key()}",
    }

    request_data = None
    if method.upper() == "POST":
        encoded = urllib.parse.urlencode(data or {}, doseq=True)
        request_data = encoded.encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    request = urllib.request.Request(url, data=request_data, headers=headers, method=method.upper())
    timeout_seconds = float(getattr(settings, "STRIPE_TIMEOUT_SECONDS", 20))

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise StripeServiceError(_parse_error_message(body)) from exc
    except urllib.error.URLError as exc:
        raise StripeServiceError("Unable to connect to Stripe API.") from exc
    except json.JSONDecodeError as exc:
        raise StripeServiceError("Invalid response from Stripe API.") from exc


def create_checkout_session(
    *,
    amount: Decimal,
    currency: str,
    user_id: int,
    user_email: str,
    success_url: str,
    cancel_url: str,
) -> dict[str, Any]:
    amount_minor = decimal_to_minor_units(amount)
    currency_code = currency.lower()

    payload: dict[str, Any] = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "payment_method_types[]": "card",
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": currency_code,
        "line_items[0][price_data][unit_amount]": amount_minor,
        "line_items[0][price_data][product_data][name]": "Account balance top-up",
        "line_items[0][price_data][product_data][description]": "Top up account funds",
        "client_reference_id": str(user_id),
        "customer_email": user_email,
        "metadata[user_id]": str(user_id),
    }

    return _stripe_request("POST", "/checkout/sessions", payload)


def retrieve_checkout_session(session_id: str) -> dict[str, Any]:
    encoded_session_id = urllib.parse.quote(session_id, safe="")
    return _stripe_request("GET", f"/checkout/sessions/{encoded_session_id}")


def construct_event(payload: bytes, signature_header: str | None) -> dict[str, Any]:
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")

    if not webhook_secret:
        if getattr(settings, "DEBUG", False):
            try:
                return json.loads(payload.decode("utf-8"))
            except json.JSONDecodeError as exc:
                raise StripeServiceError("Invalid Stripe webhook payload.") from exc
        raise StripeServiceError("Stripe webhook secret is not configured.")

    if not signature_header:
        raise StripeServiceError("Missing Stripe signature header.")

    timestamp = None
    v1_signatures: list[str] = []
    for part in signature_header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError as exc:
                raise StripeServiceError("Invalid Stripe signature timestamp.") from exc
        elif key == "v1":
            v1_signatures.append(value)

    if timestamp is None or not v1_signatures:
        raise StripeServiceError("Invalid Stripe signature header format.")

    tolerance = int(getattr(settings, "STRIPE_WEBHOOK_TOLERANCE_SECONDS", 300))
    if abs(time.time() - timestamp) > tolerance:
        raise StripeServiceError("Stripe webhook signature has expired.")

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected_signature, sig) for sig in v1_signatures):
        raise StripeServiceError("Stripe webhook signature verification failed.")

    try:
        return json.loads(payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise StripeServiceError("Invalid Stripe webhook payload.") from exc
