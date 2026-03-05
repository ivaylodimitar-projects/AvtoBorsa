import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0024_alter_carlisting_fuel_alter_carlisting_gearbox"),
    ]

    operations = [
        migrations.AddField(
            model_name="carslisting",
            name="brand",
            field=models.CharField(default="", max_length=100),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("van", "Ван"),
                    ("jeep", "Джип"),
                    ("cabriolet", "Кабрио"),
                    ("wagon", "Комби"),
                    ("coupe", "Купе"),
                    ("minivan", "Миниван"),
                    ("pickup", "Пикап"),
                    ("sedan", "Седан"),
                    ("stretch_limo", "Стреч лимузина"),
                    ("hatchback", "Хечбек"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="color",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="condition",
            field=models.CharField(
                choices=[
                    ("0", "Нов"),
                    ("1", "Употребяван"),
                    ("2", "Повреден/ударен"),
                    ("3", "За части"),
                ],
                default="0",
                max_length=1,
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="displacement",
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="euro_standard",
            field=models.CharField(
                blank=True,
                choices=[
                    ("1", "Евро 1"),
                    ("2", "Евро 2"),
                    ("3", "Евро 3"),
                    ("4", "Евро 4"),
                    ("5", "Евро 5"),
                    ("6", "Евро 6"),
                ],
                max_length=1,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="features",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="fuel",
            field=models.CharField(
                choices=[
                    ("benzin", "Бензин"),
                    ("dizel", "Дизел"),
                    ("gaz_benzin", "Газ/Бензин"),
                    ("hibrid", "Хибрид"),
                    ("elektro", "Електро"),
                ],
                default="benzin",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="gearbox",
            field=models.CharField(
                choices=[("ruchna", "Ръчна"), ("avtomatik", "Автоматик")],
                default="ruchna",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="mileage",
            field=models.IntegerField(
                default=0,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="model",
            field=models.CharField(default="", max_length=100),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="month",
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(12),
                ],
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="power",
            field=models.IntegerField(
                blank=True,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="vin",
            field=models.CharField(blank=True, max_length=17, null=True),
        ),
        migrations.AddField(
            model_name="carslisting",
            name="year_from",
            field=models.IntegerField(
                default=1900,
                validators=[
                    django.core.validators.MinValueValidator(1900),
                    django.core.validators.MaxValueValidator(2100),
                ],
            ),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["brand", "model"], name="cars_brand_model_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["year_from"], name="cars_year_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["mileage"], name="cars_mileage_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["power"], name="cars_power_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["fuel"], name="cars_fuel_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["gearbox"], name="cars_gearbox_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["condition"], name="cars_condition_idx"),
        ),
        migrations.AddIndex(
            model_name="carslisting",
            index=models.Index(fields=["category"], name="cars_category_idx"),
        ),
    ]

