from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0031_delete_carlisting"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RenameModel(
                    old_name="CarListingPriceHistory",
                    new_name="BaseListingPriceHistory",
                ),
                migrations.AlterModelTable(
                    name="baselistingpricehistory",
                    table="listings_carlistingpricehistory",
                ),
            ],
        ),
    ]
