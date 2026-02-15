from django.contrib import admin

from .models import ListingReport


@admin.register(ListingReport)
class ListingReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'listing', 'user', 'incorrect_price', 'other_issue', 'accepted_terms', 'created_at')
    list_filter = ('incorrect_price', 'other_issue', 'accepted_terms', 'created_at')
    search_fields = ('listing__id', 'user__username', 'user__email', 'message')
    ordering = ('-created_at',)
