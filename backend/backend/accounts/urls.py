from django.urls import path
from . import views

urlpatterns = [
    path('register/private/', views.register_private_user, name='register_private'),
    path('register/business/', views.register_business_user, name='register_business'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('me/', views.get_current_user, name='get_current_user'),
    path('balance/', views.get_user_balance, name='get_balance'),
    path('balance/topup/', views.topup_balance, name='topup_balance'),
    path('dealers/', views.list_dealers, name='list_dealers'),
    path('dealers/<int:pk>/', views.dealer_detail, name='dealer_detail'),
    path('profile/upload-photo/', views.upload_profile_photo, name='upload_profile_photo'),
    path('profile/update-about/', views.update_about, name='update_about'),
]
