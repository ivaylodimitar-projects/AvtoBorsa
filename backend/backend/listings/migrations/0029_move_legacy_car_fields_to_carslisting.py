from django.db import migrations


FORWARD_SQL = """
INSERT INTO listings_carslisting (
    listing_id,
    brand,
    model,
    year_from,
    fuel,
    gearbox,
    mileage,
    features,
    category,
    month,
    vin,
    color,
    condition,
    power,
    displacement,
    euro_standard
)
SELECT
    l.id,
    COALESCE(l.brand, ''),
    COALESCE(l.model, ''),
    COALESCE(l.year_from, 1900),
    COALESCE(l.fuel, 'benzin'),
    COALESCE(l.gearbox, 'ruchna'),
    COALESCE(l.mileage, 0),
    COALESCE(l.features, '[]'::jsonb),
    l.category,
    l.month,
    l.vin,
    l.color,
    COALESCE(l.condition, '0'),
    l.power,
    l.displacement,
    l.euro_standard
FROM listings_carlisting l
LEFT JOIN listings_carslisting c
    ON c.listing_id = l.id
WHERE l.main_category = 'cars'
  AND c.id IS NULL;

ALTER TABLE listings_carlisting
    DROP COLUMN IF EXISTS brand CASCADE,
    DROP COLUMN IF EXISTS model CASCADE,
    DROP COLUMN IF EXISTS year_from CASCADE,
    DROP COLUMN IF EXISTS fuel CASCADE,
    DROP COLUMN IF EXISTS gearbox CASCADE,
    DROP COLUMN IF EXISTS mileage CASCADE,
    DROP COLUMN IF EXISTS features CASCADE,
    DROP COLUMN IF EXISTS category CASCADE,
    DROP COLUMN IF EXISTS month CASCADE,
    DROP COLUMN IF EXISTS vin CASCADE,
    DROP COLUMN IF EXISTS color CASCADE,
    DROP COLUMN IF EXISTS condition CASCADE,
    DROP COLUMN IF EXISTS power CASCADE,
    DROP COLUMN IF EXISTS displacement CASCADE,
    DROP COLUMN IF EXISTS euro_standard CASCADE;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0028_fix_baselisting_main_category_schema"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=migrations.RunSQL.noop),
    ]
