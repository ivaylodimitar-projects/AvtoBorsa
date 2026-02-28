import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from backend.accounts.models import UserProfile
from backend.payments.models import PaymentTransaction
from backend.payments.views import send_invoice_email


@override_settings(
    DEBUG=True,
    STRIPE_SECRET_KEY="sk_test_dummy",
    STRIPE_WEBHOOK_SECRET="",
    STRIPE_CURRENCY="BGN",
)
class PaymentsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payments-user",
            email="payments@example.com",
            password="secret123",
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)

    @patch("backend.payments.views.create_checkout_session")
    def test_create_checkout_session_creates_pending_transaction(self, mock_create_checkout_session):
        mock_create_checkout_session.return_value = {
            "id": "cs_test_123",
            "url": "https://checkout.stripe.com/c/pay/cs_test_123",
            "payment_intent": "pi_test_123",
        }

        response = self.client.post(
            "/api/payments/create-checkout-session/",
            {
                "amount": "25.50",
                "success_url": "http://localhost:5173/?payment=success",
                "cancel_url": "http://localhost:5173/?payment=cancelled",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["session_id"], "cs_test_123")
        self.assertEqual(response.data["status"], PaymentTransaction.Status.PENDING)

        tx = PaymentTransaction.objects.get(stripe_session_id="cs_test_123")
        self.assertEqual(tx.user_id, self.user.id)
        self.assertEqual(tx.amount, Decimal("25.50"))
        self.assertEqual(tx.status, PaymentTransaction.Status.PENDING)
        self.assertFalse(tx.credited)

    @patch("backend.payments.views.retrieve_checkout_session")
    def test_session_status_marks_succeeded_and_updates_balance(self, mock_retrieve_checkout_session):
        PaymentTransaction.objects.create(
            user=self.user,
            amount=Decimal("50.00"),
            currency="BGN",
            status=PaymentTransaction.Status.PENDING,
            stripe_session_id="cs_status_123",
        )

        mock_retrieve_checkout_session.return_value = {
            "id": "cs_status_123",
            "payment_status": "paid",
            "status": "complete",
            "payment_intent": "pi_status_123",
            "amount_total": 5000,
            "currency": "bgn",
            "metadata": {"user_id": str(self.user.id)},
        }

        response = self.client.get("/api/payments/session-status/?session_id=cs_status_123")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], PaymentTransaction.Status.SUCCEEDED)
        self.assertTrue(response.data["credited"])
        self.assertEqual(response.data["balance"], 50.0)

        tx = PaymentTransaction.objects.get(stripe_session_id="cs_status_123")
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCEEDED)
        self.assertTrue(tx.credited)
        self.assertEqual(profile.balance, Decimal("50.00"))

    @patch("backend.payments.views._send_invoice_email_after_commit")
    def test_webhook_completion_is_idempotent(self, mock_send_invoice_email):
        PaymentTransaction.objects.create(
            user=self.user,
            amount=Decimal("30.00"),
            currency="BGN",
            status=PaymentTransaction.Status.PENDING,
            stripe_session_id="cs_webhook_123",
            metadata={"created_by": "test"},
        )

        event = {
            "id": "evt_test_123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_webhook_123",
                    "payment_status": "paid",
                    "status": "complete",
                    "amount_total": 3000,
                    "currency": "bgn",
                    "payment_intent": "pi_webhook_123",
                    "metadata": {"user_id": str(self.user.id)},
                }
            },
        }

        first = self.client.post(
            "/api/payments/webhook/",
            data=json.dumps(event),
            content_type="application/json",
        )
        second = self.client.post(
            "/api/payments/webhook/",
            data=json.dumps(event),
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)

        tx = PaymentTransaction.objects.get(stripe_session_id="cs_webhook_123")
        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCEEDED)
        self.assertTrue(tx.credited)
        self.assertEqual(profile.balance, Decimal("30.00"))
        self.assertEqual(mock_send_invoice_email.call_count, 1)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="no-reply@kar.bg",
        SUPPORT_FROM_EMAIL="support@kar.bg",
    )
    @patch("backend.payments.views._build_invoice_pdf_bytes")
    def test_send_invoice_email_is_bulgarian_and_attaches_pdf(self, mock_build_invoice_pdf_bytes):
        mock_build_invoice_pdf_bytes.return_value = b"%PDF-1.4\nmock-invoice"
        tx = PaymentTransaction.objects.create(
            user=self.user,
            amount=Decimal("42.50"),
            currency="EUR",
            status=PaymentTransaction.Status.SUCCEEDED,
            stripe_session_id="cs_invoice_123",
            credited=True,
        )

        send_invoice_email(tx)

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("Фактура от Kar.bg", message.subject)
        self.assertEqual(message.from_email, "no-reply@kar.bg")
        self.assertEqual(message.to, [self.user.email])
        self.assertEqual(len(message.attachments), 1)

        attachment_name, attachment_content, attachment_type = message.attachments[0]
        self.assertEqual(attachment_type, "application/pdf")
        self.assertTrue(attachment_name.startswith("invoice-AB-"))
        self.assertEqual(attachment_content, b"%PDF-1.4\nmock-invoice")
