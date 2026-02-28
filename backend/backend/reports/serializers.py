from rest_framework import serializers

from .models import ContactInquiry, ListingReport


class ListingReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingReport
        fields = ['incorrect_price', 'other_issue', 'message', 'accepted_terms']

    def validate(self, attrs):
        incorrect_price = bool(attrs.get('incorrect_price'))
        other_issue = bool(attrs.get('other_issue'))
        message = (attrs.get('message') or '').strip()
        accepted_terms = bool(attrs.get('accepted_terms'))

        if not incorrect_price and not other_issue:
            raise serializers.ValidationError(
                {'detail': 'Изберете поне една причина за доклада.'}
            )

        if other_issue and not message:
            raise serializers.ValidationError(
                {'detail': 'Моля, опишете нередността в съобщението.'}
            )

        if not accepted_terms:
            raise serializers.ValidationError(
                {'detail': 'Трябва да приемете общите условия и политиката за защита на личните данни.'}
            )

        attrs['message'] = message
        return attrs


class ContactInquiryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInquiry
        fields = ["name", "email", "topic", "message"]

    def validate(self, attrs):
        name = str(attrs.get("name") or "").strip()
        email = str(attrs.get("email") or "").strip().lower()
        topic = str(attrs.get("topic") or "").strip()
        message = str(attrs.get("message") or "").strip()

        if not name:
            raise serializers.ValidationError({"detail": "Името е задължително."})
        if not email:
            raise serializers.ValidationError({"detail": "Имейлът е задължителен."})
        if not message:
            raise serializers.ValidationError({"detail": "Съобщението е задължително."})

        attrs["name"] = name
        attrs["email"] = email
        attrs["topic"] = topic[:120]
        attrs["message"] = message
        return attrs
