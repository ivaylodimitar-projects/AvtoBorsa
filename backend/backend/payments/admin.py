from django.contrib import admin
from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "amount",
        "currency",
        "status",
        "credited",
        "stripe_session_id",
        "created_at",
    )
    list_filter = ("status", "credited", "currency", "created_at")
    search_fields = ("user__email", "stripe_session_id", "stripe_payment_intent_id")
    readonly_fields = ("created_at", "updated_at", "credited_at")
