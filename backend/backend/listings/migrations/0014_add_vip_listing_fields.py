from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("listings", "0013_partslisting_part_year_from_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="carlisting",
            name="vip_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="carlisting",
            name="vip_paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="carlisting",
            name="vip_plan",
            field=models.CharField(
                blank=True,
                choices=[("7d", "7 days"), ("lifetime", "Lifetime")],
                max_length=12,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="carlisting",
            name="listing_type",
            field=models.CharField(
                choices=[("normal", "Нормална"), ("top", "Топ"), ("vip", "VIP")],
                default="normal",
                max_length=10,
            ),
        ),
        migrations.AddIndex(
            model_name="carlisting",
            index=models.Index(
                fields=["listing_type", "vip_expires_at"], name="carlist_vip_exp_idx"
            ),
        ),
    ]
