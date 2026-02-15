from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from backend.listings.models import CarListing
from backend.reports.models import ListingReport
from backend.reports.views import DUPLICATE_REPORT_MESSAGE


class CreateListingReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', email='owner@example.com', password='pass12345')
        self.reporter = User.objects.create_user(username='reporter', email='reporter@example.com', password='pass12345')
        self.other_user = User.objects.create_user(username='other', email='other@example.com', password='pass12345')
        self.listing = CarListing.objects.create(
            user=self.owner,
            brand='BMW',
            model='X5',
            year_from=2021,
            price='32000.00',
            city='Sofia',
            fuel='dizel',
            gearbox='avtomatik',
            mileage=120000,
            description='Test listing',
            phone='0888123456',
            email='owner@example.com',
        )

    def test_authenticated_user_can_create_report(self):
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(
            f'/api/listings/{self.listing.id}/report/',
            {
                'incorrect_price': True,
                'other_issue': False,
                'message': '',
                'accepted_terms': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ListingReport.objects.count(), 1)
        report = ListingReport.objects.first()
        self.assertEqual(report.user, self.reporter)
        self.assertEqual(report.listing, self.listing)
        self.assertTrue(report.incorrect_price)
        self.assertFalse(report.other_issue)

    def test_same_user_cannot_report_same_listing_twice(self):
        self.client.force_authenticate(user=self.reporter)
        payload = {
            'incorrect_price': False,
            'other_issue': True,
            'message': 'Нередност в обявата',
            'accepted_terms': True,
        }

        first_response = self.client.post(f'/api/listings/{self.listing.id}/report/', payload, format='json')
        second_response = self.client.post(f'/api/listings/{self.listing.id}/report/', payload, format='json')

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(second_response.data.get('detail'), DUPLICATE_REPORT_MESSAGE)
        self.assertEqual(ListingReport.objects.count(), 1)

    def test_different_users_can_report_same_listing(self):
        first_client = APIClient()
        first_client.force_authenticate(user=self.reporter)
        second_client = APIClient()
        second_client.force_authenticate(user=self.other_user)

        payload = {
            'incorrect_price': True,
            'other_issue': False,
            'message': '',
            'accepted_terms': True,
        }

        first_response = first_client.post(f'/api/listings/{self.listing.id}/report/', payload, format='json')
        second_response = second_client.post(f'/api/listings/{self.listing.id}/report/', payload, format='json')

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ListingReport.objects.count(), 2)

    def test_requires_at_least_one_reason(self):
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(
            f'/api/listings/{self.listing.id}/report/',
            {
                'incorrect_price': False,
                'other_issue': False,
                'message': '',
                'accepted_terms': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_terms_acceptance(self):
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(
            f'/api/listings/{self.listing.id}/report/',
            {
                'incorrect_price': True,
                'other_issue': False,
                'message': '',
                'accepted_terms': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
