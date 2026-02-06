from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'listings', views.CarListingViewSet, basename='listing')

urlpatterns = [
    path('', include(router.urls)),
    path('my-listings/', views.get_user_listings, name='my_listings'),
    path('my-drafts/', views.get_user_drafts, name='my_drafts'),
    path('my-archived/', views.get_user_archived, name='my_archived'),
    path('my-favorites/', views.get_user_favorites, name='my_favorites'),
    path('listings/<int:listing_id>/upload-images/', views.upload_listing_images, name='upload_images'),
    path('listings/<int:listing_id>/archive/', views.archive_listing, name='archive_listing'),
    path('listings/<int:listing_id>/unarchive/', views.unarchive_listing, name='unarchive_listing'),
    path('listings/<int:listing_id>/delete/', views.delete_listing, name='delete_listing'),
    path('listings/<int:listing_id>/favorite/', views.add_favorite, name='add_favorite'),
    path('listings/<int:listing_id>/unfavorite/', views.remove_favorite, name='remove_favorite'),
]

