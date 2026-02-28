from django.contrib.auth.models import User
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
