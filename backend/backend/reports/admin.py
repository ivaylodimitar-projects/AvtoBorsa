from django.contrib import admin

from .models import ContactInquiry, ListingReport


@admin.register(ListingReport)
class ListingReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'listing', 'user', 'incorrect_price', 'other_issue', 'accepted_terms', 'created_at')
    list_filter = ('incorrect_price', 'other_issue', 'accepted_terms', 'created_at')
    search_fields = ('listing__id', 'user__username', 'user__email', 'message')
    ordering = ('-created_at',)


@admin.register(ContactInquiry)
class ContactInquiryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "topic", "status", "created_at", "replied_at")
    list_filter = ("status", "created_at", "replied_at")
    search_fields = ("name", "email", "topic", "message", "admin_reply", "customer_reply")
    ordering = ("-created_at",)
