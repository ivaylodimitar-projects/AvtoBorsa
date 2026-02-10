from django.urls import path

from . import views

urlpatterns = [
    path("create-checkout-session/", views.create_checkout_session_view, name="create_checkout_session"),
    path("session-status/", views.checkout_session_status_view, name="checkout_session_status"),
    path("webhook/", views.stripe_webhook_view, name="stripe_webhook"),
]
