import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0010_carlisting_view_count_alter_carlisting_main_category_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="CarsListing",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "listing",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cars_details",
                        to="listings.carlisting",
                    ),
                ),
            ],
        ),
    ]
