from django.urls import path

from . import views

urlpatterns = [
    path('listings/<int:listing_id>/report/', views.create_listing_report, name='create_listing_report'),
]
