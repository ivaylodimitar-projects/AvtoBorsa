from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from django.utils.text import slugify
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from backend.accounts.models import BusinessUser, PrivateUser
from .models import BaseListing, CarsListing, MotoListing, PartsListing
from .serializers import BaseListingSerializer, _build_moto_meta_features


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
        "title": "Ð¡Ð¿Ð¸Ñ€Ð°Ñ‡ÐµÐ½ Ð°Ð¿Ð°Ñ€Ð°Ñ‚ Ð·Ð° BMW",
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
        "part_category": "Ð¡Ð¿Ð¸Ñ€Ð°Ñ‡Ð½Ð° ÑÐ¸ÑÑ‚ÐµÐ¼Ð°",
        "part_element": "ÐÐ¿Ð°Ñ€Ð°Ñ‚",
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
        "transmission": "Ð ÑŠÑ‡Ð½Ð°",
        "engine_type": "Ð‘ÐµÐ½Ð·Ð¸Ð½Ð¾Ð²",
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
            "description": "ÐšÐ¾Ñ€ÐµÐºÑ‚Ð½Ð° Ð¾Ð±ÑÐ²Ð° Ð±ÐµÐ· ÑÐ¿Ð°Ð¼.",
            "phone": "+359888123456",
            "email": "owner@example.com",
            "is_draft": True,
            "listing_type": "normal",
        }

    def test_rejects_external_links_in_description(self):
        payload = self._base_payload()
        payload["description"] = "Ð’Ð¸Ð¶Ñ‚Ðµ Ð¿Ð¾Ð²ÐµÑ‡Ðµ Ñ‚ÑƒÐº: https://scam-example.com/deal"

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
                    "ÐŸÐ¸ÑˆÐ¸ Ð² Telegram Ð¸ WhatsApp. ÐšÐ°Ð¿Ð°Ñ€Ð¾ Ð¿Ð¾ Revolut Ð¸Ð»Ð¸ crypto Ð²ÐµÐ´Ð½Ð°Ð³Ð°!!!! "
                    "ÐšÐ¾Ð½Ñ‚Ð°ÐºÑ‚Ð¸: +359888123456 Ð¸ +359887654321"
                ),
            }
        )

        response = self.client.post(self.create_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", response.data)
        self.assertIn("Ñ€ÑŠÑ‡Ð½Ð° Ð¼Ð¾Ð´ÐµÑ€Ð°Ñ†Ð¸Ñ", str(response.data["non_field_errors"][0]).lower())

    def test_allows_high_risk_payload_as_draft_and_sets_flags(self):
        payload = self._base_payload()
        payload["description"] = (
            "ÐŸÐ¸ÑˆÐ¸ Ð² Telegram Ð¸ WhatsApp. ÐšÐ°Ð¿Ð°Ñ€Ð¾ Ð¿Ð¾ Revolut Ð¸Ð»Ð¸ crypto Ð²ÐµÐ´Ð½Ð°Ð³Ð°!!!! "
            "ÐšÐ¾Ð½Ñ‚Ð°ÐºÑ‚Ð¸: +359888123456 Ð¸ +359887654321"
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
            title="Ð¡Ð¿Ð¸Ñ€Ð°Ñ‡ÐµÐ½ Ð°Ð¿Ð°Ñ€Ð°Ñ‚ Ð·Ð° BMW E90",
            part_year_from=2018,
            part_year_to=2020,
        )
        _create_parts_listing(
            self.owner,
            title="Ð¤Ð°Ñ€ Ð·Ð° Opel Astra H",
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


class ListingDetailSerializerPersistenceTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="detail-owner",
            email="detail-owner@example.com",
            password="testpass123",
        )

    def _create_listing(self, **payload):
        base_payload = {
            "price": "1000.00",
            "city": "Sofia",
            "description": "Draft listing",
            "phone": "+359888123456",
            "email": "detail-owner@example.com",
            "is_draft": True,
            "listing_type": "normal",
        }
        base_payload.update(payload)
        serializer = BaseListingSerializer(data=base_payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        return serializer.save(user=self.owner)

    def test_serializer_persists_extended_detail_fields_by_category(self):
        cases = [
            {
                "name": "wheels_combo",
                "payload": {
                    "main_category": "wheels",
                    "wheel_for": "1",
                    "offer_type": "3",
                    "brand": "BMW",
                    "model": "3 Series",
                    "year_from": 2018,
                    "color": "silver",
                    "condition": "1",
                    "wheel_brand": "BBS",
                    "tire_brand": "Michelin",
                },
                "relation": "wheels_details",
                "expected": {
                    "brand": "BMW",
                    "model": "3 Series",
                    "year_from": 2018,
                    "color": "silver",
                    "condition": "1",
                },
            },
            {
                "name": "parts",
                "payload": {
                    "main_category": "parts",
                    "part_for": "1",
                    "part_category": "Engine",
                    "part_element": "Turbo",
                    "part_year_from": 2016,
                    "part_year_to": 2020,
                    "condition": "3",
                },
                "relation": "parts_details",
                "expected": {"condition": "3"},
            },
            {
                "name": "buses",
                "payload": {
                    "main_category": "buses",
                    "brand": "Mercedes-Benz",
                    "model": "Sprinter",
                    "year_from": 2019,
                    "month": 7,
                    "vin": "WDB9076331P123456",
                    "mileage": 185000,
                    "power": 190,
                    "displacement": 2143,
                    "color": "white",
                    "condition": "1",
                    "transmission": "ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡Ð½Ð°",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "heavy_euro_standard": "6",
                    "features": ["ABS", "Climate control"],
                    "fuel": "dizel",
                    "gearbox": "avtomatik",
                },
                "relation": "buses_details",
                "expected": {
                    "brand": "Mercedes-Benz",
                    "model": "Sprinter",
                    "year_from": 2019,
                    "month": 7,
                    "vin": "WDB9076331P123456",
                    "mileage": 185000,
                    "power": 190,
                    "displacement": 2143,
                    "color": "white",
                    "condition": "1",
                    "transmission": "ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡Ð½Ð°",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "euro_standard": "6",
                    "features": ["ABS", "Climate control"],
                },
            },
            {
                "name": "trucks",
                "payload": {
                    "main_category": "trucks",
                    "brand": "MAN",
                    "model": "TGL",
                    "year_from": 2018,
                    "month": 2,
                    "vin": "WMAH05ZZ8HY123456",
                    "mileage": 420000,
                    "power": 250,
                    "displacement": 6871,
                    "color": "blue",
                    "condition": "1",
                    "transmission": "Ð ÑŠÑ‡Ð½Ð°",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "heavy_euro_standard": "5",
                    "features": ["Air brakes"],
                },
                "relation": "trucks_details",
                "expected": {
                    "brand": "MAN",
                    "model": "TGL",
                    "year_from": 2018,
                    "month": 2,
                    "vin": "WMAH05ZZ8HY123456",
                    "mileage": 420000,
                    "power": 250,
                    "displacement": 6871,
                    "color": "blue",
                    "condition": "1",
                    "transmission": "Ð ÑŠÑ‡Ð½Ð°",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "euro_standard": "5",
                    "features": ["Air brakes"],
                },
            },
            {
                "name": "agriculture",
                "payload": {
                    "main_category": "agriculture",
                    "brand": "Ð¢Ñ€Ð°ÐºÑ‚Ð¾Ñ€",
                    "model": "John Deere",
                    "year_from": 2020,
                    "power": 220,
                    "color": "green",
                    "condition": "1",
                    "equipment_type": "Ð¢Ñ€Ð°ÐºÑ‚Ð¾Ñ€",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "transmission": "PowerShift",
                    "drive_type": "4x4",
                    "hours": 4300,
                    "euro_standard": "Stage V",
                    "features": ["GPS"],
                },
                "relation": "agri_details",
                "expected": {
                    "brand": "Ð¢Ñ€Ð°ÐºÑ‚Ð¾Ñ€",
                    "model": "John Deere",
                    "year_from": 2020,
                    "power": 220,
                    "color": "green",
                    "condition": "1",
                    "equipment_type": "Ð¢Ñ€Ð°ÐºÑ‚Ð¾Ñ€",
                    "engine_type": "Ð”Ð¸Ð·ÐµÐ»Ð¾Ð²",
                    "transmission": "PowerShift",
                    "drive_type": "4x4",
                    "hours": 4300,
                    "euro_standard": "Stage V",
                    "features": ["GPS"],
                },
            },
            {
                "name": "industrial",
                "payload": {
                    "main_category": "industrial",
                    "brand": "lift-platform",
                    "model": "JLG",
                    "year_from": 2017,
                    "power": 80,
                    "color": "orange",
                    "condition": "1",
                    "equipment_type": "telehandler",
                    "engine_type": "diesel",
                    "features": ["4x4"],
                },
                "relation": "industrial_details",
                "expected": {
                    "brand": "lift-platform",
                    "model": "JLG",
                    "year_from": 2017,
                    "power": 80,
                    "color": "orange",
                    "condition": "1",
                    "equipment_type": "lift-platform",
                    "engine_type": "diesel",
                    "features": ["4x4"],
                },
            },
            {
                "name": "forklifts",
                "payload": {
                    "main_category": "forklifts",
                    "brand": "Ð§ÐµÐ»ÐµÐ½ Ñ‚Ð¾Ð²Ð°Ñ€Ð°Ñ‡",
                    "model": "Toyota",
                    "year_from": 2021,
                    "month": 3,
                    "power": 55,
                    "color": "red",
                    "condition": "1",
                    "engine_type": "Ð“Ð°Ð·",
                    "lift_capacity_kg": 2500,
                    "hours": 1600,
                    "features": ["Side shift"],
                },
                "relation": "forklift_details",
                "expected": {
                    "brand": "Ð§ÐµÐ»ÐµÐ½ Ñ‚Ð¾Ð²Ð°Ñ€Ð°Ñ‡",
                    "model": "Toyota",
                    "equipment_type": "Ð§ÐµÐ»ÐµÐ½ Ñ‚Ð¾Ð²Ð°Ñ€Ð°Ñ‡",
                    "year_from": 2021,
                    "month": 3,
                    "power": 55,
                    "color": "red",
                    "condition": "1",
                    "engine_type": "Ð“Ð°Ð·",
                    "lift_capacity_kg": 2500,
                    "hours": 1600,
                    "features": ["Side shift"],
                },
            },
            {
                "name": "rvs",
                "payload": {
                    "main_category": "rvs",
                    "brand": "ÐšÐµÐ¼Ð¿ÐµÑ€",
                    "model": "Hymer",
                    "year_from": 2016,
                    "vin": "VF7YCBMFB12A12345",
                    "color": "beige",
                    "condition": "1",
                    "beds": 4,
                    "length_m": "6.50",
                    "has_toilet": True,
                    "has_heating": True,
                    "has_air_conditioning": True,
                    "features": ["Solar panel"],
                },
                "relation": "caravan_details",
                "expected": {
                    "brand": "ÐšÐµÐ¼Ð¿ÐµÑ€",
                    "model": "Hymer",
                    "equipment_type": "ÐšÐµÐ¼Ð¿ÐµÑ€",
                    "year_from": 2016,
                    "vin": "VF7YCBMFB12A12345",
                    "color": "beige",
                    "condition": "1",
                    "beds": 4,
                    "length_m": Decimal("6.50"),
                    "has_toilet": True,
                    "has_heating": True,
                    "has_air_conditioning": True,
                    "features": ["Solar panel"],
                },
            },
            {
                "name": "yachts",
                "payload": {
                    "main_category": "yachts",
                    "brand": "Ð›Ð¾Ð´ÐºÐ°",
                    "model": "Bayliner",
                    "year_from": 2015,
                    "color": "white",
                    "condition": "1",
                    "boat_category": "Ð›Ð¾Ð´ÐºÐ°",
                    "engine_type": "Ð˜Ð·Ð²ÑŠÐ½Ð±Ð¾Ñ€Ð´Ð¾Ð²",
                    "engine_count": 1,
                    "material": "ÐÐ»ÑƒÐ¼Ð¸Ð½Ð¸Ð¹",
                    "length_m": "5.50",
                    "width_m": "2.20",
                    "draft_m": "0.60",
                    "hours": 800,
                    "boat_features": ["Ð¢ÐµÐ½Ñ‚Ð°", "Ð¡Ð¾Ð½Ð°Ñ€"],
                },
                "relation": "boats_details",
                "expected": {
                    "brand": "Ð›Ð¾Ð´ÐºÐ°",
                    "model": "Bayliner",
                    "year_from": 2015,
                    "color": "white",
                    "condition": "1",
                    "boat_category": "Ð›Ð¾Ð´ÐºÐ°",
                    "engine_type": "Ð˜Ð·Ð²ÑŠÐ½Ð±Ð¾Ñ€Ð´Ð¾Ð²",
                    "engine_count": 1,
                    "material": "ÐÐ»ÑƒÐ¼Ð¸Ð½Ð¸Ð¹",
                    "features": ["Ð¢ÐµÐ½Ñ‚Ð°", "Ð¡Ð¾Ð½Ð°Ñ€"],
                },
            },
            {
                "name": "trailer",
                "payload": {
                    "main_category": "trailer",
                    "brand": "ÐŸÐ»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ð°",
                    "model": "Humbaur",
                    "year_from": 2022,
                    "color": "gray",
                    "condition": "0",
                    "trailer_category": "ÐŸÐ»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ð°",
                    "load_kg": 3500,
                    "axles": 2,
                    "trailer_features": ["ÐšÐ¾Ð»ÐµÑÐ°Ñ€"],
                },
                "relation": "trailers_details",
                "expected": {
                    "brand": "ÐŸÐ»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ð°",
                    "model": "Humbaur",
                    "year_from": 2022,
                    "color": "gray",
                    "condition": "0",
                    "trailer_category": "ÐŸÐ»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ð°",
                    "load_kg": 3500,
                    "axles": 2,
                    "features": ["ÐšÐ¾Ð»ÐµÑÐ°Ñ€"],
                },
            },
            {
                "name": "accessories",
                "payload": {
                    "main_category": "accessories",
                    "classified_for": "1",
                    "accessory_category": "Ð¡Ñ‚ÐµÐ»ÐºÐ¸",
                    "color": "black",
                    "condition": "1",
                    "brand": "Ð¡Ñ‚ÐµÐ»ÐºÐ¸",
                    "model": "ÐÐ²Ñ‚Ð¾Ð¼Ð¾Ð±Ð¸Ð»Ð¸",
                    "year_from": 2024,
                },
                "relation": "accessories_details",
                "expected": {
                    "classified_for": "1",
                    "accessory_category": "Ð¡Ñ‚ÐµÐ»ÐºÐ¸",
                    "color": "black",
                    "condition": "1",
                },
            },
        ]

        for case in cases:
            with self.subTest(category=case["name"]):
                listing = self._create_listing(**case["payload"])
                details = getattr(listing, case["relation"])
                for field_name, expected_value in case["expected"].items():
                    self.assertEqual(getattr(details, field_name), expected_value)

    def test_motorcycle_serializer_extracts_structured_meta_from_features(self):
        moto_meta_features = _build_moto_meta_features(
            moto_category="Naked",
            moto_cooling_type="Liquid",
            moto_engine_kind="Inline",
        )
        listing = self._create_listing(
            main_category="motorcycles",
            brand="Yamaha",
            model="MT-07",
            year_from=2021,
            color="blue",
            condition="1",
            power=74,
            displacement_cc=689,
            engine_type="petrol",
            features=["ABS", *moto_meta_features],
        )

        details = listing.moto_details
        self.assertEqual(details.brand, "Yamaha")
        self.assertEqual(details.model, "MT-07")
        self.assertEqual(details.moto_category, "Naked")
        self.assertEqual(details.moto_cooling_type, "Liquid")
        self.assertEqual(details.moto_engine_kind, "Inline")
        self.assertEqual(details.features, ["ABS", *moto_meta_features])

        serialized = BaseListingSerializer(instance=listing).data
        self.assertEqual(serialized["moto_category"], "Naked")
        self.assertEqual(serialized["moto_cooling_type"], "Liquid")
        self.assertEqual(serialized["moto_engine_kind"], "Inline")
        self.assertIn("ABS", serialized["features"])
        self.assertIn(moto_meta_features[0], serialized["features"])

    def test_generate_slug_uses_category_specific_rules(self):
        cases = [
            {
                "name": "cars",
                "payload": {
                    "main_category": "cars",
                    "brand": "BMW",
                    "model": "320d",
                    "year_from": 2020,
                    "fuel": "dizel",
                    "gearbox": "avtomatik",
                    "mileage": 120000,
                    "condition": "1",
                },
                "expected_parts": ["BMW", "320d"],
            },
            {
                "name": "wheels",
                "payload": {
                    "main_category": "wheels",
                    "wheel_for": "1",
                    "offer_type": "2",
                    "wheel_brand": "BBS",
                    "color": "silver",
                    "condition": "1",
                },
                "expected_parts": [BaseListing.WHEEL_OFFER_TYPE_LABELS["2"], "BBS"],
            },
            {
                "name": "parts",
                "payload": {
                    "main_category": "parts",
                    "part_for": "1",
                    "part_category": "Engine system",
                    "part_element": "Turbo",
                    "condition": "1",
                },
                "expected_parts": ["Engine system", "Turbo"],
            },
            {
                "name": "forklifts",
                "payload": {
                    "main_category": "forklifts",
                    "brand": "loader",
                    "model": "Toyota",
                    "year_from": 2021,
                    "engine_type": "gas",
                    "condition": "1",
                },
                "expected_parts": ["loader", "Toyota"],
            },
            {
                "name": "rvs",
                "payload": {
                    "main_category": "rvs",
                    "brand": "camper",
                    "model": "Hymer",
                    "year_from": 2016,
                    "condition": "1",
                    "beds": 4,
                },
                "expected_parts": ["camper", "Hymer"],
            },
            {
                "name": "yachts",
                "payload": {
                    "main_category": "yachts",
                    "brand": "boat",
                    "model": "Bayliner",
                    "year_from": 2015,
                    "boat_category": "boat",
                    "condition": "1",
                },
                "expected_parts": ["boat", "Bayliner"],
            },
            {
                "name": "trailer",
                "payload": {
                    "main_category": "trailer",
                    "brand": "platform",
                    "model": "Humbaur",
                    "year_from": 2022,
                    "trailer_category": "platform",
                    "condition": "0",
                },
                "expected_parts": ["platform", "Humbaur"],
            },
            {
                "name": "accessories",
                "payload": {
                    "main_category": "accessories",
                    "classified_for": "1",
                    "accessory_category": "floor mats",
                    "color": "black",
                    "condition": "1",
                },
                "expected_parts": [BaseListing.MAIN_CATEGORY_LABELS["cars"], "floor mats"],
            },
            {
                "name": "buy",
                "payload": {
                    "main_category": "buy",
                    "classified_for": "1",
                    "buy_service_category": "engine",
                },
                "expected_parts": [BaseListing.MAIN_CATEGORY_LABELS["cars"], "engine"],
            },
            {
                "name": "services",
                "payload": {
                    "main_category": "services",
                    "classified_for": "1",
                    "buy_service_category": "road assistance",
                },
                "expected_parts": [BaseListing.MAIN_CATEGORY_LABELS["cars"], "road assistance"],
            },
        ]

        for case in cases:
            with self.subTest(category=case["name"]):
                listing = self._create_listing(**case["payload"])
                expected_suffix = "-".join(
                    slugify(str(part).strip(), allow_unicode=True)[:80]
                    for part in case["expected_parts"]
                    if str(part).strip()
                )
                self.assertEqual(
                    listing.slug,
                    f"obiava-{listing.id}-{expected_suffix}",
                )

    def test_serializer_discards_frontend_fallback_vehicle_fields_when_category_does_not_use_them(self):
        cases = [
            {
                "name": "wheels_tires_only",
                "payload": {
                    "main_category": "wheels",
                    "wheel_for": "1",
                    "offer_type": "1",
                    "brand": "Fallback brand",
                    "model": "Fallback model",
                    "year_from": 2026,
                    "color": "black",
                    "condition": "1",
                    "tire_brand": "Michelin",
                },
                "relation": "wheels_details",
                "expected_empty": ("brand", "model"),
                "expected_null": ("year_from",),
            },
            {
                "name": "buy",
                "payload": {
                    "main_category": "buy",
                    "classified_for": "1",
                    "buy_service_category": "Ð”Ð²Ð¸Ð³Ð°Ñ‚ÐµÐ»",
                    "brand": "Synthetic",
                    "model": "Synthetic",
                    "year_from": 2026,
                    "condition": "0",
                    "features": [],
                },
                "relation": "buy_details",
                "expected_empty": (),
                "expected_null": (),
            },
            {
                "name": "services",
                "payload": {
                    "main_category": "services",
                    "classified_for": "1",
                    "buy_service_category": "ÐŸÑŠÑ‚Ð½Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰",
                    "brand": "Synthetic",
                    "model": "Synthetic",
                    "year_from": 2026,
                    "condition": "0",
                    "features": [],
                },
                "relation": "services_details",
                "expected_empty": (),
                "expected_null": (),
            },
        ]

        for case in cases:
            with self.subTest(category=case["name"]):
                listing = self._create_listing(**case["payload"])
                details = getattr(listing, case["relation"])
                if case["name"] == "buy":
                    self.assertEqual(details.buy_category, "Ð”Ð²Ð¸Ð³Ð°Ñ‚ÐµÐ»")
                if case["name"] == "services":
                    self.assertEqual(details.service_category, "ÐŸÑŠÑ‚Ð½Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰")
                for field_name in case["expected_empty"]:
                    self.assertEqual(getattr(details, field_name), "")
                for field_name in case["expected_null"]:
                    self.assertIsNone(getattr(details, field_name))


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
        self.assertIn("Ð´ÑƒÐ±Ð»Ð¸Ñ€Ð°Ð½Ð°", mail.outbox[0].body.lower())
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
                "description": "ÐžÑ‚Ð»Ð¸Ñ‡Ð½Ð¾ ÑÑŠÑÑ‚Ð¾ÑÐ½Ð¸Ðµ, Ñ€ÐµÐ°Ð»Ð½Ð¸ ÐºÐ¸Ð»Ð¾Ð¼ÐµÑ‚Ñ€Ð¸, Ð±ÐµÐ· Ð±Ð°Ñ€Ñ‚ÐµÑ€Ð¸.",
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
            title="ÐŸÑŠÑ‚Ð½Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰ 24/7",
            price="120.00",
            city="Plovdiv",
            description="Road assistance",
            phone="+359888654321",
            email="services-owner@example.com",
        )

        response = self.client.get(self.latest_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next(row for row in response.data if row["id"] == listing.id)
        self.assertEqual(item["display_title"], "ÐŸÑŠÑ‚Ð½Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰ 24/7")
        self.assertEqual(item["brand"], "")
        self.assertEqual(item["model"], "")

    def test_listing_list_brand_filter_works_without_annotation_conflict(self):
        response = self.client.get(self.list_url, {"brand": "BMW"})
        results = self._extract_results(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["brand"], "BMW")
