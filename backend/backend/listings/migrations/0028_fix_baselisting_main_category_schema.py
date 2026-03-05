from django.db import migrations


FORWARD_SQL = """
ALTER TABLE listings_carlisting
    ALTER COLUMN main_category TYPE varchar(20);

UPDATE listings_carlisting
SET main_category = CASE main_category
    WHEN '1' THEN 'cars'
    WHEN 'w' THEN 'wheels'
    WHEN 'u' THEN 'parts'
    WHEN '3' THEN 'buses'
    WHEN '4' THEN 'trucks'
    WHEN '5' THEN 'motorcycles'
    WHEN '6' THEN 'agriculture'
    WHEN '7' THEN 'industrial'
    WHEN '8' THEN 'forklifts'
    WHEN '9' THEN 'rvs'
    WHEN 'a' THEN 'yachts'
    WHEN 'b' THEN 'trailer'
    WHEN 'v' THEN 'accessories'
    WHEN 'y' THEN 'buy'
    WHEN 'z' THEN 'services'
    ELSE main_category
END
WHERE main_category IN ('1', 'w', 'u', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'v', 'y', 'z');

ALTER TABLE listings_carlisting
    ALTER COLUMN main_category SET DEFAULT 'cars';
"""


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0027_delete_carlisting_carlisting"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=migrations.RunSQL.noop),
    ]
