from django.contrib import admin
from .models import UserProfile, PrivateUser, BusinessUser

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'created_at', 'updated_at')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(PrivateUser)
class PrivateUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'created_at')
    search_fields = ('email',)

@admin.register(BusinessUser)
class BusinessUserAdmin(admin.ModelAdmin):
    list_display = ('dealer_name', 'email', 'created_at')
    search_fields = ('dealer_name', 'email')
