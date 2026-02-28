from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'listings', views.CarListingViewSet, basename='listing')

urlpatterns = [
    path('listings/latest/', views.latest_listings, name='latest_listings'),
    path('profiles/<slug:profile_slug>/', views.get_public_profile_listings, name='public_profile_listings'),
    path('', include(router.urls)),
    path('my-listings/', views.get_user_listings, name='my_listings'),
    path('my-drafts/', views.get_user_drafts, name='my_drafts'),
    path('my-archived/', views.get_user_archived, name='my_archived'),
    path('my-expired/', views.get_user_expired, name='my_expired'),
    path('my-favorites/', views.get_user_favorites, name='my_favorites'),
    path('listings/<int:listing_id>/upload-images/', views.upload_listing_images, name='upload_images'),
    path('listings/<int:listing_id>/update-images/', views.update_listing_images, name='update_images'),
    path('listings/<int:listing_id>/archive/', views.archive_listing, name='archive_listing'),
    path('listings/<int:listing_id>/unarchive/', views.unarchive_listing, name='unarchive_listing'),
    path('listings/<int:listing_id>/delete/', views.delete_listing, name='delete_listing'),
    path('listings/<int:listing_id>/republish/', views.republish_listing, name='republish_listing'),
    path('listings/<int:listing_id>/listing-type/', views.update_listing_type, name='update_listing_type'),
    path('listings/<int:listing_id>/kaparirano/', views.update_kaparirano_status, name='update_kaparirano_status'),
    path('listings/<int:listing_id>/photos/', views.listing_photos, name='listing_photos'),
    path('listings/<int:listing_id>/favorite/', views.add_favorite, name='add_favorite'),
    path('listings/<int:listing_id>/unfavorite/', views.remove_favorite, name='remove_favorite'),
]
