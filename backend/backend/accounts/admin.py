from django.contrib import admin
from .models import (
    UserProfile,
    PrivateUser,
    BusinessUser,
    UserImportApiKey,
    ImportApiUsageEvent,
)

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


@admin.register(UserImportApiKey)
class UserImportApiKeyAdmin(admin.ModelAdmin):
    list_display = ('user', 'key_prefix', 'last_used_at', 'created_at', 'updated_at')
    search_fields = ('user__email', 'user__username', 'key_prefix')
    readonly_fields = ('key_hash', 'created_at', 'updated_at', 'last_used_at')


@admin.register(ImportApiUsageEvent)
class ImportApiUsageEventAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'created_at',
        'user',
        'status_code',
        'success',
        'source',
        'source_host',
        'imported_listing_id_snapshot',
    )
    list_filter = ('success', 'source', 'status_code', 'created_at')
    search_fields = (
        'user__email',
        'user__username',
        'lot_number',
        'source_url',
        'source_host',
        'request_ip',
        'error_message',
    )
    readonly_fields = (
        'created_at',
        'endpoint',
        'request_method',
        'source',
        'status_code',
        'success',
        'request_ip',
        'user_agent',
        'extension_version',
        'payload_bytes',
        'duration_ms',
    )
