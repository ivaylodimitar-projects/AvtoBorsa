from rest_framework import serializers

from backend.payments.models import PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ["id", "amount", "currency", "status", "credited", "created_at"]
        read_only_fields = fields
