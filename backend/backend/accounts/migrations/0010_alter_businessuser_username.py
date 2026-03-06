from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_alter_importapiusageevent_imported_listing"),
    ]

    operations = [
        migrations.AlterField(
            model_name="businessuser",
            name="username",
            field=models.CharField(max_length=150, unique=True),
        ),
    ]
