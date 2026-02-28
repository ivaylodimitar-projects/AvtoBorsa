from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.admin_overview, name="admin_overview"),
    path("listings/", views.admin_listings, name="admin_listings"),
    path("listings/<int:listing_id>/", views.admin_listing_update, name="admin_listing_update"),
    path("listings/<int:listing_id>/delete/", views.admin_listing_delete, name="admin_listing_delete"),
    path("users/", views.admin_users, name="admin_users"),
    path("users/<int:user_id>/", views.admin_user_update, name="admin_user_update"),
    path("users/<int:user_id>/delete/", views.admin_user_delete, name="admin_user_delete"),
    path("transactions/", views.admin_transactions, name="admin_transactions"),
    path("site-purchases/", views.admin_site_purchases, name="admin_site_purchases"),
    path("extension-usage/", views.admin_extension_usage, name="admin_extension_usage"),
    path("reports/", views.admin_reports, name="admin_reports"),
    path("reports/<int:report_id>/delete/", views.admin_report_delete, name="admin_report_delete"),
    path("contact-inquiries/", views.admin_contact_inquiries, name="admin_contact_inquiries"),
    path("contact-inquiries/<int:inquiry_id>/reply/", views.admin_contact_inquiry_reply, name="admin_contact_inquiry_reply"),
]
