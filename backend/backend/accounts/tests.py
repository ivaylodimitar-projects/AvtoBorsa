import re

from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class AuthFlowTests(APITestCase):
    def test_private_login_normalizes_email(self):
        register_response = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "mixedcaseuser",
                "email": "MixedCaseUser@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, 201)

        user = User.objects.get(email="mixedcaseuser@example.com")
        user.is_active = True
        user.save(update_fields=["is_active"])

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "email": "  MIXEDCASEUSER@example.com  ",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access", login_response.data)

    def test_business_can_login_with_username_fallback(self):
        register_response = self.client.post(
            "/api/auth/register/business/",
            {
                "dealer_name": "Demo Dealer",
                "city": "Sofia",
                "address": "Demo Street 1",
                "phone": "+359881112233",
                "email": "businessuser@example.com",
                "username": "dealer_demo",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
                "company_name": "Demo LTD",
                "registration_address": "Sofia",
                "mol": "Demo MOL",
                "bulstat": "123456789",
                "admin_name": "Admin Demo",
                "admin_phone": "+359881112244",
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, 201)

        user = User.objects.get(username="dealer_demo")
        user.is_active = True
        user.save(update_fields=["is_active"])

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "email": "dealer_demo",
                "password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access", login_response.data)

    def test_registration_blocks_case_insensitive_duplicate_email(self):
        first_register = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "duplicateone",
                "email": "duplicate@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(first_register.status_code, 201)

        second_register = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "duplicatetwo",
                "email": "DUPLICATE@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(second_register.status_code, 400)
        self.assertIn("email", second_register.data)

    def test_private_registration_rejects_weak_password_policy(self):
        response = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "weak_private",
                "email": "weak-private@example.com",
                "password": "weakpass1",
                "confirm_password": "weakpass1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Паролата", str(response.data))

    def test_private_registration_rejects_duplicate_username_case_insensitive(self):
        first_register = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "privatedemo",
                "email": "private-demo-one@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(first_register.status_code, 201)

        second_register = self.client.post(
            "/api/auth/register/private/",
            {
                "username": "PRIVATEDEMO",
                "email": "private-demo-two@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )
        self.assertEqual(second_register.status_code, 400)
        self.assertIn("username", second_register.data)

    def test_business_registration_rejects_weak_password_policy(self):
        response = self.client.post(
            "/api/auth/register/business/",
            {
                "dealer_name": "Weak Dealer",
                "city": "Sofia",
                "address": "Weak Street 1",
                "phone": "+359881112233",
                "email": "weak-business@example.com",
                "username": "weak_dealer",
                "password": "weakpass1",
                "confirm_password": "weakpass1",
                "company_name": "Weak LTD",
                "registration_address": "Sofia",
                "mol": "Weak MOL",
                "bulstat": "123456789",
                "admin_name": "Weak Admin",
                "admin_phone": "+359881112244",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Паролата", str(response.data))

@override_settings(
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class AdminPanelOtpAccessTests(APITestCase):
    def setUp(self):
        self.password = "StrongPass123!"
        self.admin_user = User.objects.create_user(
            username="admin-otp-user",
            email="admin-otp@example.com",
            password=self.password,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )

    def test_regular_admin_login_cannot_open_admin_panel_without_otp_claim(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "email": self.admin_user.email,
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        access = login_response.data.get("access")
        self.assertTrue(access)

        admin_response = self.client.get(
            "/api/admin/overview/",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(admin_response.status_code, 403)

    def test_admin_login_verify_code_grants_admin_panel_access(self):
        request_code_response = self.client.post(
            "/api/auth/admin-login/request-code/",
            {
                "email": self.admin_user.email,
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(request_code_response.status_code, 200)
        challenge_id = request_code_response.data.get("challenge_id")
        self.assertTrue(challenge_id)
        self.assertGreaterEqual(len(mail.outbox), 1)

        email_body = mail.outbox[-1].body
        match = re.search(r"\b(\d{6})\b", email_body)
        self.assertIsNotNone(match, "Admin OTP code not found in email body.")
        code = match.group(1)

        verify_response = self.client.post(
            "/api/auth/admin-login/verify-code/",
            {
                "challenge_id": challenge_id,
                "code": code,
            },
            format="json",
        )
        self.assertEqual(verify_response.status_code, 200)
        access = verify_response.data.get("access")
        self.assertTrue(access)

        admin_response = self.client.get(
            "/api/admin/overview/",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(admin_response.status_code, 200)
