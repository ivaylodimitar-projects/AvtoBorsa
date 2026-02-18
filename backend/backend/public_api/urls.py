from django.urls import path

from . import views

urlpatterns = [
    path("public/docs/", views.public_api_docs, name="public_api_docs"),
    path("public/ads/cars/", views.PublicCarsCreateView.as_view(), name="public_api_create_cars"),
    path(
        "public/ads/motorcycles/",
        views.PublicMotorcyclesCreateView.as_view(),
        name="public_api_create_motorcycles",
    ),
    path("public/ads/buses/", views.PublicBusesCreateView.as_view(), name="public_api_create_buses"),
    path("public/ads/trucks/", views.PublicTrucksCreateView.as_view(), name="public_api_create_trucks"),
    path(
        "public/listings/<int:listing_id>/publish/",
        views.PublicDraftPublishView.as_view(),
        name="public_api_publish_draft",
    ),
]
