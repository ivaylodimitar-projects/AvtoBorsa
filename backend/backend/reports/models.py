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


class ContactInquiry(models.Model):
    STATUS_NEW = "new"
    STATUS_REPLIED = "replied"
    STATUS_CHOICES = (
        (STATUS_NEW, "New"),
        (STATUS_REPLIED, "Replied"),
    )

    name = models.CharField(max_length=120)
    email = models.EmailField()
    topic = models.CharField(max_length=120, blank=True, default="")
    message = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_NEW,
        db_index=True,
    )
    admin_reply = models.TextField(blank=True, default="")
    replied_at = models.DateTimeField(null=True, blank=True)
    customer_reply = models.TextField(blank=True, default="")
    customer_replied_at = models.DateTimeField(null=True, blank=True)
    last_inbound_message_id = models.CharField(max_length=255, blank=True, default="")
    replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_inquiry_replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="reports_contact_status_idx"),
            models.Index(fields=["email", "created_at"], name="reports_contact_email_idx"),
        ]

    def __str__(self):
        return f"Contact inquiry {self.id} from {self.email}"
