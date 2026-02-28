from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from backend.accounts.models import BusinessUser, PrivateUser
from .models import CarListing


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

        self.listing = CarListing.objects.create(
            user=self.owner,
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

        self.business_listing = CarListing.objects.create(
            user=self.business_owner,
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
        self.private_listing = CarListing.objects.create(
            user=self.private_owner,
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
        CarListing.objects.filter(pk=self.business_listing.pk).update(is_kaparirano=True)
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
        CarListing.objects.create(
            user=self.private_user,
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
        CarListing.objects.create(
            user=self.business_user,
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
