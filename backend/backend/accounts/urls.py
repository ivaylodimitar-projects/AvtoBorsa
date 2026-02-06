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
]
