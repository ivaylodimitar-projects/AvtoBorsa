from decimal import Decimal
import io

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image as PILImage
from rest_framework import status
from rest_framework.test import APITestCase

from backend.accounts.models import UserImportApiKey, UserProfile
from backend.listings.models import CarImage, CarListing


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class PublicApiListingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="publicapi-user",
            email="publicapi@example.com",
            password="StrongPass123!",
            is_active=True,
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

    def _make_png_upload(self, file_name: str):
        image_buffer = io.BytesIO()
        image = PILImage.new("RGB", (2, 2), color=(255, 0, 0))
        image.save(image_buffer, format="PNG")
        image_buffer.seek(0)
        return SimpleUploadedFile(
            name=file_name,
            content=image_buffer.read(),
            content_type="image/png",
        )

    def _auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"ApiKey {self.raw_api_key}"}

    def _draft_payload(self):
        return {
            "brand": "BMW",
            "model": "X5",
            "year_from": 2020,
            "price": "35500.00",
            "city": "Sofia",
            "fuel": "dizel",
            "gearbox": "avtomatik",
            "mileage": 120000,
            "description": "Imported listing",
            "phone": "+359888123456",
            "email": "dealer@example.com",
            "is_draft": True,
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
            self._draft_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_motorcycles_endpoint_forces_main_category_5(self):
        payload = self._draft_payload()
        payload["main_category"] = "1"
        response = self.client.post(
            "/api/public/ads/motorcycles/",
            payload,
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        listing = CarListing.objects.get(id=response.data["listing"]["id"])
        self.assertEqual(listing.main_category, "5")
        self.assertEqual(listing.user_id, self.user.id)

    def test_publish_draft_as_top_charges_user_balance(self):
        create_response = self.client.post(
            "/api/public/ads/cars/",
            self._draft_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = CarListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            {"listing_type": "top", "top_plan": "1d"},
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
            self._draft_payload(),
            format="json",
            **self._auth_headers(),
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        listing = CarListing.objects.get(id=create_response.data["listing"]["id"])
        self._attach_minimum_images(listing, count=3)

        publish_response = self.client.post(
            f"/api/public/listings/{listing.id}/publish/",
            {"listing_type": "vip", "vip_plan": "7d"},
            format="json",
            **self._auth_headers(),
        )

        self.assertEqual(publish_response.status_code, status.HTTP_400_BAD_REQUEST)
        listing.refresh_from_db()
        profile.refresh_from_db()
        self.assertTrue(listing.is_draft)
        self.assertEqual(listing.listing_type, "normal")
        self.assertEqual(profile.balance, Decimal("0.00"))

    def test_direct_publish_with_uploaded_images_and_top_plan(self):
        payload = self._draft_payload()
        payload["is_draft"] = False
        payload["listing_type"] = "top"
        payload["top_plan"] = "1d"
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
        listing = CarListing.objects.get(id=response.data["listing"]["id"])
        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(listing.is_draft)
        self.assertEqual(listing.listing_type, "top")
        self.assertEqual(listing.top_plan, "1d")
        self.assertEqual(listing.images.count(), 3)
        self.assertEqual(profile.balance, Decimal("17.51"))
        self.assertEqual(response.data["charged_amount"], "2.49")

    def test_docs_page_is_public(self):
        response = self.client.get("/api/public/docs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertContains(response, "Public Listing Upload API")
