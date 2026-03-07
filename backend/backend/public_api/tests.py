from decimal import Decimal
import io

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image as PILImage
from rest_framework import status
from rest_framework.test import APITestCase

from backend.accounts.models import BusinessUser, UserImportApiKey, UserProfile
from backend.listings.models import BaseListing, CarImage

from .validators import PUBLIC_API_MAX_IMAGES


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class PublicApiListingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="publicapi-user",
            email="publicapi@example.com",
            password="StrongPass123!",
            is_active=True,
        )
        BusinessUser.objects.create(
            user=self.user,
            dealer_name="Public API Dealer",
            city="Sofia",
            address="1 Business St",
            phone="+359888000111",
            email="dealer-business@example.com",
            username="publicapi-dealer",
            company_name="Public API Dealer Ltd",
            registration_address="1 Business St",
            mol="Dealer Manager",
            bulstat="123456789",
            vat_number="BG123456789",
            admin_name="Admin Dealer",
            admin_phone="+359888000222",
        )

        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.balance = Decimal("20.00")
        profile.save(update_fields=["balance"])

        self.raw_api_key = UserImportApiKey.generate_raw_key()
        self.api_key = UserImportApiKey.objects.create(
            user=self.user,
            key_hash=UserImportApiKey.hash_key(self.raw_api_key),
            key_prefix=self.raw_api_key[:12],
        )

    def _make_png_upload(self, file_name: str, *, pad_bytes: int = 0):
        image_buffer = io.BytesIO()
        image = PILImage.new("RGB", (2, 2), color=(255, 0, 0))
        image.save(image_buffer, format="PNG")
        content = image_buffer.getvalue()
        if pad_bytes > 0:
            content += b"0" * pad_bytes
        return SimpleUploadedFile(
            name=file_name,
            content=content,
            content_type="image/png",
        )

    def _auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"ApiKey {self.raw_api_key}"}

    def _base_payload(self):
        return {
            "brand": "BMW",
            "model": "X5",
            "year_from": 2020,
            "price": "35500.00",
            "city": "Sofia",
            "description": "Imported listing",
            "phone": "+359888123456",
            "email": "dealer@example.com",
            "is_draft": True,
        }

    def _cars_publish_fields(self):
        return {
            "color": "Black",
            "condition": "1",
            "category": "jeep",
            "fuel": "dizel",
            "gearbox": "avtomatik",
            "mileage": 120000,
            "power": 286,
            "displacement": 2993,
            "euro_standard": "6",
        }

    def _attach_minimum_images(self, listing, count=3):
        for index in range(count):
            CarImage.objects.create(
                listing=listing,
                image=self._make_png_upload(f"listing_{listing.id}_{index}.png"),
                order=index,
                is_cover=index == 0,
            )

    def test_missing_api_key_returns_401(self):
        response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["message"], "API key is missing.")
        self.assertEqual(response.data["detail"], "API key is missing.")

    def test_moto_alias_endpoint_creates_motorcycle_draft(self):
        payload = self._base_payload()
        payload["main_category"] = "moto"
        payload["brand"] = "Honda"
        payload["model"] = "Africa Twin"

        response = self.client.post(
            "/api/public/ads/moto/",
            payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        listing = BaseListing.objects.get(id=response.data["listing"]["id"])
        self.assertEqual(listing.main_category, "motorcycles")
        self.assertEqual(listing.user_id, self.user.id)

    def test_endpoint_rejects_mismatched_main_category(self):
        payload = self._base_payload()
        payload["main_category"] = "cars"

        response = self.client.post(
            "/api/public/ads/moto/",
            payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("main_category", response.data)

    def test_motorcycles_endpoint_rejects_car_only_fields(self):
        payload = self._base_payload()
        payload["brand"] = "Honda"
        payload["model"] = "Africa Twin"
        payload["fuel"] = "dizel"

        response = self.client.post(
            "/api/public/ads/motorcycles/",
            payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fuel", response.data)

    def test_direct_publish_cars_requires_category_specific_fields(self):
        payload = self._base_payload()
        payload["is_draft"] = False
        payload["images"] = [
            self._make_png_upload("direct_1.png"),
            self._make_png_upload("direct_2.png"),
            self._make_png_upload("direct_3.png"),
        ]

        response = self.client.post(
            "/api/public/ads/cars/",
            payload,
            format="multipart",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)
        self.assertIn("color", response.data)
        self.assertEqual(
            response.data["message"],
            "category: This field is required for publishing in the 'cars' public API endpoint.",
        )

    def test_publish_draft_cannot_change_main_category(self):
        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = BaseListing.objects.get(id=create_response.data["listing"]["id"])
        response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            {"main_category": "trucks"},
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("main_category", response.data)
        listing.refresh_from_db()
        self.assertTrue(listing.is_draft)

    def test_publish_draft_as_top_charges_user_balance(self):
        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = BaseListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_payload = self._cars_publish_fields()
        publish_payload.update({"listing_type": "top", "top_plan": "1"})

        publish_response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            publish_payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        listing.refresh_from_db()
        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(listing.is_draft)
        self.assertEqual(listing.listing_type, "top")
        self.assertEqual(listing.top_plan, "1d")
        self.assertIsNotNone(listing.top_expires_at)
        self.assertEqual(profile.balance, Decimal("17.51"))
        self.assertEqual(publish_response.data["charged_amount"], "2.49")

    def test_publish_with_insufficient_balance_returns_400_and_keeps_draft(self):
        profile = UserProfile.objects.get(user=self.user)
        profile.balance = Decimal("0.00")
        profile.save(update_fields=["balance"])

        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = BaseListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_payload = self._cars_publish_fields()
        publish_payload.update({"listing_type": "vip", "vip_plan": "7"})

        publish_response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            publish_payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(publish_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(publish_response.data["message"], "Insufficient funds.")
        self.assertEqual(publish_response.data["detail"], "Insufficient funds.")
        listing.refresh_from_db()
        profile.refresh_from_db()
        self.assertTrue(listing.is_draft)
        self.assertEqual(listing.listing_type, "normal")
        self.assertEqual(profile.balance, Decimal("0.00"))

    def test_direct_publish_with_uploaded_images_and_top_plan(self):
        payload = self._base_payload()
        payload.update(self._cars_publish_fields())
        payload["is_draft"] = False
        payload["listing_type"] = "top"
        payload["top_plan"] = "1"
        payload["images"] = [
            self._make_png_upload("direct_1.png"),
            self._make_png_upload("direct_2.png"),
            self._make_png_upload("direct_3.png"),
        ]

        response = self.client.post(
            "/api/public/ads/cars/",
            payload,
            format="multipart",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        listing = BaseListing.objects.get(id=response.data["listing"]["id"])
        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(listing.is_draft)
        self.assertEqual(listing.listing_type, "top")
        self.assertEqual(listing.top_plan, "1d")
        self.assertEqual(listing.images.count(), 3)
        self.assertEqual(profile.balance, Decimal("17.51"))
        self.assertEqual(response.data["charged_amount"], "2.49")

    def test_public_api_rejects_legacy_top_plan_alias(self):
        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = BaseListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_payload = self._cars_publish_fields()
        publish_payload.update({"listing_type": "top", "top_plan": "1d"})

        response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            publish_payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["top_plan"],
            "Use top_plan values '1', '7' in the public API.",
        )

    def test_public_api_rejects_legacy_vip_plan_alias(self):
        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = BaseListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_payload = self._cars_publish_fields()
        publish_payload.update({"listing_type": "vip", "vip_plan": "7d"})

        response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            publish_payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["vip_plan"],
            "Use vip_plan values '7', 'lifetime' in the public API.",
        )

    def test_public_api_rejects_too_many_images(self):
        payload = self._base_payload()
        payload["images"] = [
            self._make_png_upload(f"too_many_{index}.png")
            for index in range(PUBLIC_API_MAX_IMAGES + 1)
        ]

        response = self.client.post(
            "/api/public/ads/cars/",
            payload,
            format="multipart",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("images_upload", response.data)
        self.assertEqual(
            response.data["message"],
            "images_upload: You can upload at most 12 images per request.",
        )

    def test_public_api_rate_limit_returns_429_on_third_request(self):
        first_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        second_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )
        third_response = self.client.post(
            "/api/public/ads/cars/",
            self._base_payload(),
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(third_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(
            third_response.data["message"],
            "Rate limit exceeded. Maximum 2 requests per minute.",
        )
        self.assertEqual(
            third_response.data["detail"],
            "Rate limit exceeded. Maximum 2 requests per minute.",
        )
        self.assertGreaterEqual(third_response.data["wait_seconds"], 1)

    def test_docs_page_is_public(self):
        response = self.client.get("/api/public/docs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "Public Listing Upload API")
