from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0018_wheelslisting_tire_brand_wheelslisting_tire_diameter_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="carlisting",
            name="is_kaparirano",
            field=models.BooleanField(default=False),
        ),
    ]
