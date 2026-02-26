from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


TOP_LISTING_DURATION_DAYS = 14


def set_top_listing_expiry(apps, schema_editor):
    CarListing = apps.get_model("listings", "CarListing")
    delta = timedelta(days=TOP_LISTING_DURATION_DAYS)
    now = timezone.now()

    for listing in CarListing.objects.filter(listing_type="top"):
        paid_at = listing.created_at or now
        listing.top_paid_at = paid_at
        listing.top_expires_at = paid_at + delta
        listing.save(update_fields=["top_paid_at", "top_expires_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0006_carimage_is_cover"),
    ]

    operations = [
        migrations.AddField(
            model_name="carlisting",
            name="listing_type",
            field=models.CharField(
                choices=[("normal", "Нормална"), ("top", "Топ")],
                default="normal",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="carlisting",
            name="top_paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="carlisting",
            name="top_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(set_top_listing_expiry, migrations.RunPython.noop),
    ]
