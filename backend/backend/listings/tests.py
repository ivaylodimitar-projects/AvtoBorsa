from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

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
