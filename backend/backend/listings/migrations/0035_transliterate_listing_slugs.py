from django.core.exceptions import ObjectDoesNotExist
from django.db import migrations
from django.utils.text import slugify
import unicodedata


CYRILLIC_TO_LATIN_SLUG_MAP = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sht",
    "ъ": "a",
    "ь": "y",
    "ю": "yu",
    "я": "ya",
    "ѝ": "i",
    "ё": "yo",
    "ы": "y",
    "э": "e",
    "є": "e",
    "і": "i",
    "ї": "yi",
    "ґ": "g",
}

TOPMENU_TO_MAIN_CATEGORY = {
    "1": "cars",
    "3": "buses",
    "4": "trucks",
    "5": "motorcycles",
    "6": "agriculture",
    "7": "industrial",
    "8": "forklifts",
    "9": "rvs",
    "10": "yachts",
    "11": "trailer",
}

MAIN_CATEGORY_LABELS = {
    "cars": "Автомобили и Джипове",
    "wheels": "Гуми и джанти",
    "parts": "Части",
    "buses": "Бусове",
    "trucks": "Камиони",
    "motorcycles": "Мотоциклети",
    "agriculture": "Селскостопански",
    "industrial": "Индустриални",
    "forklifts": "Кари",
    "rvs": "Каравани",
    "yachts": "Яхти и Лодки",
    "trailer": "Ремаркета",
    "accessories": "Аксесоари",
    "buy": "Купува",
    "services": "Услуги",
}

WHEEL_OFFER_TYPE_LABELS = {
    "1": "Гуми",
    "2": "Джанти",
    "3": "Гуми с джанти",
}

RELATION_BY_MAIN_CATEGORY = {
    "cars": "cars_details",
    "wheels": "wheels_details",
    "parts": "parts_details",
    "buses": "buses_details",
    "trucks": "trucks_details",
    "motorcycles": "moto_details",
    "agriculture": "agri_details",
    "industrial": "industrial_details",
    "forklifts": "forklift_details",
    "rvs": "caravan_details",
    "yachts": "boats_details",
    "trailer": "trailers_details",
    "accessories": "accessories_details",
    "buy": "buy_details",
    "services": "services_details",
}


def transliterate_slug_text(value):
    text = unicodedata.normalize("NFKC", str(value or "").strip())
    if not text:
        return ""
    return "".join(CYRILLIC_TO_LATIN_SLUG_MAP.get(char, char) for char in text.lower())


def slugify_segment(value):
    text = str(value or "").strip()
    if not text:
        return ""
    return slugify(transliterate_slug_text(text))[:80]


def build_category_slug(listing_id, *values):
    slug_parts = [part for part in (slugify_segment(value) for value in values) if part]
    if not slug_parts:
        return f"obiava-{listing_id}"
    return f"obiava-{listing_id}-{'-'.join(slug_parts)}"


def safe_related(instance, relation_name):
    if not relation_name:
        return None
    try:
        return getattr(instance, relation_name)
    except (AttributeError, ObjectDoesNotExist):
        return None


def get_topmenu_slug_label(value):
    code = str(value or "").strip()
    if not code:
        return ""
    main_category = TOPMENU_TO_MAIN_CATEGORY.get(code)
    if not main_category:
        return code
    return MAIN_CATEGORY_LABELS.get(main_category, code)


def get_wheel_offer_slug_label(value):
    code = str(value or "").strip()
    if not code:
        return ""
    return WHEEL_OFFER_TYPE_LABELS.get(code, code)


def generate_listing_slug(listing):
    if not listing.id:
        return None

    details = safe_related(listing, RELATION_BY_MAIN_CATEGORY.get(listing.main_category))
    if details is None:
        return f"obiava-{listing.id}"

    if listing.main_category in {"cars", "buses", "trucks", "motorcycles"}:
        return build_category_slug(listing.id, details.brand, details.model)

    if listing.main_category == "wheels":
        wheel_brand = getattr(details, "wheel_brand", "") or getattr(details, "tire_brand", "")
        offer_type = get_wheel_offer_slug_label(getattr(details, "offer_type", ""))
        return build_category_slug(listing.id, offer_type, wheel_brand)

    if listing.main_category == "parts":
        return build_category_slug(
            listing.id,
            getattr(details, "part_category", ""),
            getattr(details, "part_element", ""),
        )

    if listing.main_category in {"agriculture", "industrial", "forklifts", "rvs"}:
        return build_category_slug(listing.id, getattr(details, "equipment_type", ""), getattr(details, "model", ""))

    if listing.main_category == "yachts":
        return build_category_slug(listing.id, getattr(details, "boat_category", ""), getattr(details, "model", ""))

    if listing.main_category == "trailer":
        return build_category_slug(listing.id, getattr(details, "trailer_category", ""), getattr(details, "model", ""))

    if listing.main_category == "accessories":
        classified_for = get_topmenu_slug_label(getattr(details, "classified_for", ""))
        return build_category_slug(listing.id, classified_for, getattr(details, "accessory_category", ""))

    if listing.main_category == "buy":
        classified_for = get_topmenu_slug_label(getattr(details, "classified_for", ""))
        return build_category_slug(listing.id, classified_for, getattr(details, "buy_category", ""))

    if listing.main_category == "services":
        classified_for = get_topmenu_slug_label(getattr(details, "classified_for", ""))
        return build_category_slug(listing.id, classified_for, getattr(details, "service_category", ""))

    return f"obiava-{listing.id}"


def forwards(apps, schema_editor):
    BaseListing = apps.get_model("listings", "BaseListing")
    queryset = BaseListing.objects.select_related(
        "cars_details",
        "wheels_details",
        "parts_details",
        "buses_details",
        "trucks_details",
        "moto_details",
        "agri_details",
        "industrial_details",
        "forklift_details",
        "caravan_details",
        "boats_details",
        "trailers_details",
        "accessories_details",
        "buy_details",
        "services_details",
    )

    for listing in queryset.iterator():
        new_slug = generate_listing_slug(listing)
        if new_slug and new_slug != (listing.slug or ""):
            BaseListing.objects.filter(pk=listing.pk).update(slug=new_slug)


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0034_baselisting_currency"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
