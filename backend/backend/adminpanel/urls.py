from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.admin_overview, name="admin_overview"),
    path("listings/", views.admin_listings, name="admin_listings"),
    path("listings/<int:listing_id>/", views.admin_listing_update, name="admin_listing_update"),
    path("listings/<int:listing_id>/delete/", views.admin_listing_delete, name="admin_listing_delete"),
    path("users/", views.admin_users, name="admin_users"),
    path("users/<int:user_id>/", views.admin_user_update, name="admin_user_update"),
    path("transactions/", views.admin_transactions, name="admin_transactions"),
    path("reports/", views.admin_reports, name="admin_reports"),
    path("reports/<int:report_id>/delete/", views.admin_report_delete, name="admin_report_delete"),
]
