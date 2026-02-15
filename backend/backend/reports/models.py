from django.conf import settings
from django.db import models

from backend.listings.models import CarListing


class ListingReport(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='listing_reports',
    )
    listing = models.ForeignKey(
        CarListing,
        on_delete=models.CASCADE,
        related_name='reports',
    )
    incorrect_price = models.BooleanField(default=False)
    other_issue = models.BooleanField(default=False)
    message = models.TextField(blank=True)
    accepted_terms = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'listing'],
                name='reports_unique_user_listing_report',
            ),
        ]
        indexes = [
            models.Index(fields=['listing', 'created_at'], name='reports_listing_created_idx'),
        ]

    def __str__(self):
        return f"Report {self.id} by {self.user_id} for listing {self.listing_id}"
