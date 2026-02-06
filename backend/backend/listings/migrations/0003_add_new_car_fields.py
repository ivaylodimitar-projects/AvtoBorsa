# Generated migration to add new car listing fields

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0002_add_slug_field'),
    ]

    operations = [
        # Rename category to main_category and add new category field
        migrations.RenameField(
            model_name='carlisting',
            old_name='category',
            new_name='main_category',
        ),
        migrations.AddField(
            model_name='carlisting',
            name='category',
            field=models.CharField(blank=True, choices=[('van', 'Ван'), ('jeep', 'Джип'), ('cabriolet', 'Кабрио'), ('wagon', 'Комби'), ('coupe', 'Купе'), ('minivan', 'Миниван'), ('pickup', 'Пикап'), ('sedan', 'Седан'), ('stretch_limo', 'Стреч лимузина'), ('hatchback', 'Хечбек')], max_length=20, null=True),
        ),
        # Add new fields
        migrations.AddField(
            model_name='carlisting',
            name='month',
            field=models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(12)]),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='vin',
            field=models.CharField(blank=True, max_length=17, null=True),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='location_country',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='location_region',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='color',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='condition',
            field=models.CharField(choices=[('0', 'Нов'), ('1', 'Употребяван'), ('2', 'Повреден/ударен'), ('3', 'За части')], default='0', max_length=1),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='power',
            field=models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='displacement',
            field=models.IntegerField(blank=True, null=True, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AddField(
            model_name='carlisting',
            name='euro_standard',
            field=models.CharField(blank=True, choices=[('1', 'Евро 1'), ('2', 'Евро 2'), ('3', 'Евро 3'), ('4', 'Евро 4'), ('5', 'Евро 5'), ('6', 'Евро 6')], max_length=1, null=True),
        ),
        # Update main_category field to use new choices
        migrations.AlterField(
            model_name='carlisting',
            name='main_category',
            field=models.CharField(choices=[('1', 'Автомобили и Джипове'), ('w', 'Гуми и джанти'), ('u', 'Части'), ('3', 'Бусове'), ('4', 'Камиони'), ('5', 'Мотоциклети'), ('6', 'Селскостопански'), ('7', 'Индустриални'), ('8', 'Кари'), ('9', 'Каравани'), ('a', 'Яхти и Лодки'), ('b', 'Ремаркета'), ('c', 'Велосипеди'), ('v', 'Аксесоари'), ('y', 'Купува'), ('z', 'Услуги')], default='1', max_length=1),
        ),
    ]

