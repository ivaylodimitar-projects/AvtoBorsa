from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from backend.accounts.models import BusinessUser, PrivateUser
from .models import BaseListing, CarsListing, MotoListing, PartsListing


def _create_cars_listing(user, **overrides):
    listing_payload = {
        "user": user,
        "main_category": "cars",
        "price": "20000.00",
        "city": "Sofia",
        "description": "Test listing",
        "phone": "+359888123456",
        "email": "owner@example.com",
    }
    listing_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key in {"main_category", "price", "city", "description", "phone", "email", "title", "is_draft"}
        }
    )
    listing = BaseListing.objects.create(**listing_payload)

    details_payload = {
        "listing": listing,
        "brand": "BMW",
        "model": "320d",
        "year_from": 2020,
        "fuel": "dizel",
        "gearbox": "avtomatik",
        "mileage": 120000,
        "condition": "1",
    }
    details_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key
            in {
                "brand",
                "model",
                "year_from",
                "month",
                "vin",
                "fuel",
                "gearbox",
                "mileage",
                "color",
                "condition",
                "power",
                "displacement",
                "euro_standard",
                "category",
            }
        }
    )
    CarsListing.objects.create(**details_payload)
    return listing


def _create_parts_listing(user, **overrides):
    listing_payload = {
        "user": user,
        "main_category": "parts",
        "price": "350.00",
        "city": "Sofia",
        "description": "Parts listing",
        "phone": "+359888123456",
        "email": "owner@example.com",
        "title": "Спирачен апарат за BMW",
    }
    listing_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key in {"main_category", "price", "city", "description", "phone", "email", "title", "is_draft"}
        }
    )
    listing = BaseListing.objects.create(**listing_payload)

    details_payload = {
        "listing": listing,
        "part_for": "1",
        "part_category": "Спирачна система",
        "part_element": "Апарат",
        "part_year_from": 2018,
        "part_year_to": 2020,
    }
    details_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key in {"part_for", "part_category", "part_element", "part_year_from", "part_year_to"}
        }
    )
    PartsListing.objects.create(**details_payload)
    return listing


def _create_moto_listing(user, **overrides):
    listing_payload = {
        "user": user,
        "main_category": "motorcycles",
        "price": "9500.00",
        "city": "Sofia",
        "description": "Moto listing",
        "phone": "+359888123456",
        "email": "owner@example.com",
        "title": "Yamaha MT-07",
    }
    listing_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key in {"main_category", "price", "city", "description", "phone", "email", "title", "is_draft"}
        }
    )
    listing = BaseListing.objects.create(**listing_payload)

    details_payload = {
        "listing": listing,
        "displacement_cc": 689,
        "transmission": "Ръчна",
        "engine_type": "Бензинов",
    }
    details_payload.update(
        {
            key: value
            for key, value in overrides.items()
            if key in {"displacement_cc", "transmission", "engine_type"}
        }
    )
    MotoListing.objects.create(**details_payload)
    return listing


class ListingViewCountTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.viewer_one = user_model.objects.create_user(
            username="viewer-one",
            email="viewer1@example.com",
            password="testpass123",
        )
        self.viewer_two = user_model.objects.create_user(
            username="viewer-two",
            email="viewer2@example.com",
            password="testpass123",
        )

        self.listing = _create_cars_listing(
            self.owner,
            brand="BMW",
            model="320d",
            year_from=2020,
            price="19999.00",
            city="Sofia",
            fuel="dizel",
            gearbox="avtomatik",
            mileage=120000,
            description="Test listing",
            phone="+359888123456",
            email="owner@example.com",
        )
        self.detail_url = reverse("listing-detail", args=[self.listing.id])

    def _retrieve(self, user=None):
        if user is not None:
            self.client.force_authenticate(user=user)
        return self.client.get(self.detail_url)

    def test_view_count_increments_only_once_for_same_authenticated_user(self):
        first = self._retrieve(self.viewer_one)
        second = self._retrieve(self.viewer_one)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db(fields=["view_count"])
        self.assertEqual(self.listing.view_count, 1)

    def test_view_count_increments_for_each_distinct_authenticated_user(self):
        self._retrieve(self.viewer_one)
        self._retrieve(self.viewer_two)

        self.listing.refresh_from_db(fields=["view_count"])
        self.assertEqual(self.listing.view_count, 2)

    def test_owner_view_does_not_increment_view_count(self):
        response = self._retrieve(self.owner)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db(fields=["view_count"])
        self.assertEqual(self.listing.view_count, 0)

    def test_view_count_increments_only_once_for_same_anonymous_session(self):
        first = self._retrieve()
        second = self._retrieve()

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db(fields=["view_count"])
        self.assertEqual(self.listing.view_count, 1)

    def test_view_count_increments_for_distinct_anonymous_sessions(self):
        self._retrieve()

        second_client = APIClient()
        second = second_client.get(self.detail_url)

        self.assertEqual(second.status_code, status.HTTP_200_OK)

        self.listing.refresh_from_db(fields=["view_count"])
        self.assertEqual(self.listing.view_count, 2)


class ListingKapariranoStatusTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.business_owner = user_model.objects.create_user(
            username="business-owner",
            email="business-owner@example.com",
            password="testpass123",
        )
        BusinessUser.objects.create(
            user=self.business_owner,
            dealer_name="Dealer One",
            city="Sofia",
            address="bul. Vitosha 1",
            phone="+359888000001",
            email="dealer-one@example.com",
            website="https://dealer-one.example.com",
            username="dealerone",
            company_name="Dealer One OOD",
            registration_address="Sofia",
            mol="Ivan Ivanov",
            bulstat="123456789",
            vat_number="BG123456789",
            admin_name="Ivan Ivanov",
            admin_phone="+359888000001",
        )
        self.private_owner = user_model.objects.create_user(
            username="private-owner",
            email="private-owner@example.com",
            password="testpass123",
        )

        self.business_listing = _create_cars_listing(
            self.business_owner,
            brand="BMW",
            model="X5",
            year_from=2021,
            price="50000.00",
            city="Sofia",
            fuel="dizel",
            gearbox="avtomatik",
            mileage=100000,
            description="Business listing",
            phone="+359888000001",
            email="business-owner@example.com",
        )
        self.private_listing = _create_cars_listing(
            self.private_owner,
            brand="Audi",
            model="A4",
            year_from=2020,
            price="22000.00",
            city="Plovdiv",
            fuel="benzin",
            gearbox="ruchna",
            mileage=130000,
            description="Private listing",
            phone="+359888000002",
            email="private-owner@example.com",
        )
        self.business_url = reverse("update_kaparirano_status", args=[self.business_listing.id])
        self.private_url = reverse("update_kaparirano_status", args=[self.private_listing.id])

    def test_business_user_can_mark_listing_as_kaparirano(self):
        self.client.force_authenticate(user=self.business_owner)

        response = self.client.post(self.business_url, {"is_kaparirano": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.business_listing.refresh_from_db(fields=["is_kaparirano"])
        self.assertTrue(self.business_listing.is_kaparirano)
        self.assertTrue(response.data["is_kaparirano"])

    def test_business_user_can_toggle_kaparirano_without_payload(self):
        self.client.force_authenticate(user=self.business_owner)
        BaseListing.objects.filter(pk=self.business_listing.pk).update(is_kaparirano=True)
        self.business_listing.refresh_from_db(fields=["is_kaparirano"])

        response = self.client.post(self.business_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.business_listing.refresh_from_db(fields=["is_kaparirano"])
        self.assertFalse(self.business_listing.is_kaparirano)
        self.assertFalse(response.data["is_kaparirano"])

    def test_private_user_cannot_mark_listing_as_kaparirano(self):
        self.client.force_authenticate(user=self.private_owner)

        response = self.client.post(self.private_url, {"is_kaparirano": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.private_listing.refresh_from_db(fields=["is_kaparirano"])
        self.assertFalse(self.private_listing.is_kaparirano)


class ListingAntiFraudValidationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="fraud-check-user",
            email="fraud-check@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.create_url = reverse("listing-list")

    def _base_payload(self):
        return {
            "main_category": "cars",
            "brand": "BMW",
            "model": "320d",
            "year_from": 2020,
            "price": "19999.00",
            "city": "Sofia",
            "fuel": "dizel",
            "gearbox": "avtomatik",
            "mileage": 120000,
            "description": "Коректна обява без спам.",
            "phone": "+359888123456",
            "email": "owner@example.com",
            "is_draft": True,
            "listing_type": "normal",
        }

    def test_rejects_external_links_in_description(self):
        payload = self._base_payload()
        payload["description"] = "Вижте повече тук: https://scam-example.com/deal"

        response = self.client.post(self.create_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.data)

    def test_blocks_high_risk_payload_on_publish(self):
        payload = self._base_payload()
        payload.update(
            {
                "main_category": "buy",
                "is_draft": False,
                "description": (
                    "Пиши в Telegram и WhatsApp. Капаро по Revolut или crypto веднага!!!! "
                    "Контакти: +359888123456 и +359887654321"
                ),
            }
        )

        response = self.client.post(self.create_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)
        self.assertIn("ръчна модерация", str(response.data["non_field_errors"][0]).lower())

    def test_allows_high_risk_payload_as_draft_and_sets_flags(self):
        payload = self._base_payload()
        payload["description"] = (
            "Пиши в Telegram и WhatsApp. Капаро по Revolut или crypto веднага!!!! "
            "Контакти: +359888123456 и +359887654321"
        )
        payload["is_draft"] = True

        response = self.client.post(self.create_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_draft"])
        self.assertTrue(response.data["requires_moderation"])


class ListingSearchFilterRegressionTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="search-owner",
            email="search-owner@example.com",
            password="testpass123",
        )
        self.url = reverse("listing-list")

    def test_parts_year_range_filters_use_parts_details_only(self):
        matching_listing = _create_parts_listing(
            self.owner,
            title="Спирачен апарат за BMW E90",
            part_year_from=2018,
            part_year_to=2020,
        )
        _create_parts_listing(
            self.owner,
            title="Фар за Opel Astra H",
            part_year_from=2004,
            part_year_to=2008,
        )

        response = self.client.get(
            self.url,
            {
                "mainCategory": "parts",
                "yearFrom": 2018,
                "yearTo": 2020,
                "partYearFrom": 2018,
                "partYearTo": 2020,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(result_ids, {matching_listing.id})

    def test_motorcycle_brand_and_model_filters_fallback_to_title(self):
        matching_listing = _create_moto_listing(
            self.owner,
            title="Yamaha MT-07 ABS",
        )
        _create_moto_listing(
            self.owner,
            title="Honda CB500F",
        )

        response = self.client.get(
            self.url,
            {
                "mainCategory": "motorcycles",
                "marka": "Yamaha",
                "model": "MT-07",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(result_ids, {matching_listing.id})

class AdminListingDeleteReasonTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_user(
            username="admin-user",
            email="admin@example.com",
            password="testpass123",
            is_staff=True,
        )
        self.owner = user_model.objects.create_user(
            username="listing-owner",
            email="owner@example.com",
            password="testpass123",
        )
        self.listing = _create_cars_listing(
            self.owner,
            brand="Audi",
            model="A4",
            year_from=2020,
            price="22000.00",
            city="Plovdiv",
            fuel="benzin",
            gearbox="ruchna",
            mileage=130000,
            description="Owner listing",
            phone="+359888000002",
            email="owner@example.com",
        )
        self.url = reverse("admin_listing_delete", args=[self.listing.id])
        self.client.force_authenticate(
            user=self.admin,
            token={"admin_panel_verified": True},
        )

    def test_delete_requires_reason(self):
        response = self.client.delete(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(BaseListing.objects.filter(pk=self.listing.id).exists())

    def test_delete_with_reason_removes_listing_and_sends_email(self):
        response = self.client.delete(
            self.url,
            {"reason": "duplicate_listing"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(BaseListing.objects.filter(pk=self.listing.id).exists())
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("дублирана", mail.outbox[0].body.lower())
        self.assertEqual(response.data["reason"], "duplicate_listing")
        self.assertTrue(response.data["email_requested"])
        self.assertTrue(response.data["email_sent"])

    def test_delete_without_email_removes_listing_without_sending_email(self):
        response = self.client.delete(
            self.url,
            {"reason": "duplicate_listing", "send_email": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(BaseListing.objects.filter(pk=self.listing.id).exists())
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(response.data["reason"], "duplicate_listing")
        self.assertFalse(response.data["email_requested"])
        self.assertFalse(response.data["email_sent"])

    def test_allows_clean_publish_without_moderation_flag(self):
        payload = self._base_payload()
        payload.update(
            {
                "main_category": "buy",
                "is_draft": False,
                "description": "Отлично състояние, реални километри, без бартери.",
            }
        )

        response = self.client.post(self.create_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data["requires_moderation"])
        self.assertLess(int(response.data["risk_score"]), 70)


class PublicProfileListingsTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.private_user = user_model.objects.create_user(
            username="private-owner-login",
            email="private-profile@example.com",
            password="testpass123",
        )
        self.business_user = user_model.objects.create_user(
            username="business-owner-login",
            email="business-profile@example.com",
            password="testpass123",
        )
        PrivateUser.objects.create(
            user=self.private_user,
            email="private-profile@example.com",
            username="private_profile",
        )
        BusinessUser.objects.create(
            user=self.business_user,
            dealer_name="Dealer Company One",
            city="Sofia",
            address="bul. Vitosha 1",
            phone="+359888000001",
            email="dealer-company-one@example.com",
            website="https://dealer-company-one.example.com",
            username="dealercompanyone",
            company_name="Dealer Company One LTD",
            registration_address="Sofia",
            mol="Ivan Ivanov",
            bulstat="123456789",
            vat_number="BG123456789",
            admin_name="Ivan Ivanov",
            admin_phone="+359888000001",
        )
        _create_cars_listing(
            self.private_user,
            brand="Toyota",
            model="Corolla",
            year_from=2019,
            price="15000.00",
            city="Sofia",
            fuel="benzin",
            gearbox="ruchna",
            mileage=150000,
            description="Private profile listing",
            phone="+359888000111",
            email="private-profile@example.com",
        )
        _create_cars_listing(
            self.business_user,
            brand="BMW",
            model="X3",
            year_from=2021,
            price="43000.00",
            city="Sofia",
            fuel="dizel",
            gearbox="avtomatik",
            mileage=90000,
            description="Business profile listing",
            phone="+359888000222",
            email="business-profile@example.com",
        )

    def test_public_profile_listings_available_for_private_username_without_auth(self):
        response = self.client.get("/api/profiles/private_profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["type"], "private")
        self.assertEqual(response.data["profile"]["title"], "private_profile")
        self.assertEqual(response.data["listing_count"], 1)

    def test_public_profile_listings_available_for_business_company_slug_without_auth(self):
        response = self.client.get("/api/profiles/dealer-company-one/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["type"], "business")
        self.assertEqual(response.data["profile"]["title"], "Dealer Company One")
        self.assertEqual(response.data["listing_count"], 1)


class ListingCarsDetailsQueryTests(APITestCase):
    def setUp(self):
        cache.clear()
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="cars-query-owner",
            email="cars-query-owner@example.com",
            password="testpass123",
        )
        _create_cars_listing(
            self.owner,
            brand="BMW",
            model="320d",
            year_from=2020,
            price="19999.00",
            city="Sofia",
            fuel="dizel",
            gearbox="avtomatik",
            mileage=120000,
            description="Cars query listing",
            phone="+359888123456",
            email="cars-query-owner@example.com",
        )
        self.latest_url = reverse("latest_listings")
        self.list_url = reverse("listing-list")

    def _extract_results(self, response):
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data

    def test_latest_listings_endpoint_returns_car_proxy_fields(self):
        response = self.client.get(self.latest_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["display_title"], "BMW 320d")
        self.assertEqual(response.data[0]["brand"], "BMW")
        self.assertEqual(response.data[0]["model"], "320d")

    def test_latest_listings_endpoint_returns_display_title_for_non_car_listing(self):
        listing = BaseListing.objects.create(
            user=self.owner,
            main_category="services",
            title="Пътна помощ 24/7",
            price="120.00",
            city="Plovdiv",
            description="Road assistance",
            phone="+359888654321",
            email="services-owner@example.com",
        )

        response = self.client.get(self.latest_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next(row for row in response.data if row["id"] == listing.id)
        self.assertEqual(item["display_title"], "Пътна помощ 24/7")
        self.assertEqual(item["brand"], "")
        self.assertEqual(item["model"], "")

    def test_listing_list_brand_filter_works_without_annotation_conflict(self):
        response = self.client.get(self.list_url, {"brand": "BMW"})
        results = self._extract_results(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["brand"], "BMW")
