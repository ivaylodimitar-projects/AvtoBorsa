from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'listings', views.CarListingViewSet, basename='listing')

urlpatterns = [
    path('', include(router.urls)),
    path('my-listings/', views.get_user_listings, name='my_listings'),
    path('my-drafts/', views.get_user_drafts, name='my_drafts'),
    path('listings/<int:listing_id>/upload-images/', views.upload_listing_images, name='upload_images'),
]

