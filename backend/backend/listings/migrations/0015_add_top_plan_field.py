from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0014_add_vip_listing_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="carlisting",
            name="top_plan",
            field=models.CharField(
                blank=True,
                choices=[("1d", "1 day"), ("7d", "7 days")],
                max_length=12,
                null=True,
            ),
        ),
    ]
