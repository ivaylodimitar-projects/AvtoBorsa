from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/private/', views.register_private_user, name='register_private'),
    path('register/business/', views.register_business_user, name='register_business'),
    path('verify-email/', views.verify_email, name='verify_email'),
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('balance/', views.get_user_balance, name='get_balance'),
    path('change-password/', views.change_password, name='change_password'),
    path('profile/update-names/', views.update_profile_names, name='update_profile_names'),
    path('delete-account/', views.delete_account, name='delete_account'),
    path('dealers/', views.list_dealers, name='list_dealers'),
    path('dealers/<int:pk>/', views.dealer_detail, name='dealer_detail'),
    path('profile/upload-photo/', views.upload_profile_photo, name='upload_profile_photo'),
    path('profile/update-about/', views.update_about, name='update_about'),
]
