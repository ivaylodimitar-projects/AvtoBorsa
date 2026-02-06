# Generated migration to add slug field to CarListing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='carlisting',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, max_length=255, null=True, unique=True),
        ),
    ]

