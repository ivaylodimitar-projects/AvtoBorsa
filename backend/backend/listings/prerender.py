import hashlib
import json
from decimal import Decimal, InvalidOperation
from html import escape
from urllib.parse import quote

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date, parse_http_date_safe, quote_etag
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import CarImage, BaseListing, get_expiry_cutoff

PRERENDER_PUBLIC_CACHE_SECONDS = 300
PRERENDER_PUBLIC_STALE_SECONDS = 900
PRERENDER_BOT_SIGNATURES = (
    "googlebot",
    "bingbot",
    "duckduckbot",
    "applebot",
    "perplexitybot",
    "gptbot",
    "claudebot",
    "facebookexternalhit",
    "twitterbot",
    "linkedinbot",
    "whatsapp",
)


def _to_positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _trim_to_value(value, fallback=""):
    normalized = str(value or "").strip()
    return normalized or fallback


def _resolve_site_name():
    return _trim_to_value(
        getattr(settings, "SITE_NAME", "") or getattr(settings, "SEO_SITE_NAME", ""),
        fallback="Kar.bg",
    )


def _resolve_frontend_base_url():
    configured = _trim_to_value(getattr(settings, "FRONTEND_BASE_URL", ""))
    if configured:
        return configured.rstrip("/")
    return "https://www.kar.bg"


def _is_supported_prerender_bot(user_agent):
    normalized = _trim_to_value(user_agent).lower()
    if not normalized:
        return False
    return any(signature in normalized for signature in PRERENDER_BOT_SIGNATURES)


def _format_price_label(price):
    try:
        normalized_price = Decimal(price)
    except (InvalidOperation, TypeError, ValueError):
        return "Цена по запитване"

    if normalized_price <= 0:
        return "Цена по запитване"

    quantized = normalized_price.quantize(Decimal("0.01"))
    if quantized == quantized.to_integral():
        formatted = f"{int(quantized):,}".replace(",", " ")
    else:
        formatted = f"{quantized:,.2f}".replace(",", " ")
    return f"{formatted} €"


def _format_price_for_schema(price):
    try:
        normalized_price = Decimal(price)
    except (InvalidOperation, TypeError, ValueError):
        return None
    if normalized_price <= 0:
        return None
    return f"{normalized_price.quantize(Decimal('0.01'))}"


def _format_mileage_label(mileage):
    normalized_mileage = _to_positive_int(mileage)
    if normalized_mileage is None:
        return "непосочен пробег"
    return f"{normalized_mileage:,}".replace(",", " ") + " км"


def _join_url(base_url, path):
    return f"{base_url.rstrip('/')}/{str(path or '').lstrip('/')}"


def _to_absolute_asset_url(raw_value, frontend_base_url):
    value = _trim_to_value(raw_value)
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("//"):
        protocol = "https:" if frontend_base_url.startswith("https://") else "http:"
        return f"{protocol}{value}"
    if value.startswith("/"):
        return f"{frontend_base_url}{value}"
    media_url = _trim_to_value(getattr(settings, "MEDIA_URL", "/media/"), fallback="/media/")
    if media_url.startswith("http://") or media_url.startswith("https://"):
        return _join_url(media_url, value)
    return f"{frontend_base_url}/{media_url.strip('/').strip()}/{value.lstrip('/')}".replace("//", "/").replace(":/", "://")


def _collect_image_candidates(image_obj, frontend_base_url):
    candidates = []
    renditions_payload = getattr(image_obj, "renditions", None)
    rendition_rows = renditions_payload.get("webp") if isinstance(renditions_payload, dict) else []

    if isinstance(rendition_rows, list):
        for row in rendition_rows:
            if not isinstance(row, dict):
                continue
            width = _to_positive_int(row.get("width"))
            if width is None:
                continue
            row_url = _trim_to_value(row.get("url") or row.get("path"))
            if not row_url:
                continue
            absolute_url = _to_absolute_asset_url(row_url, frontend_base_url)
            if not absolute_url:
                continue
            kind = _trim_to_value(row.get("kind"), fallback="detail").lower()
            candidates.append(
                {
                    "width": width,
                    "url": absolute_url,
                    "kind": kind,
                }
            )

    image_url = ""
    thumbnail_url = ""
    try:
        image_url = _trim_to_value(getattr(image_obj.image, "url", ""))
    except Exception:
        image_url = _trim_to_value(getattr(image_obj.image, "name", ""))
    try:
        thumbnail_url = _trim_to_value(getattr(image_obj.thumbnail, "url", ""))
    except Exception:
        thumbnail_url = _trim_to_value(getattr(image_obj.thumbnail, "name", ""))

    if image_url:
        candidates.append(
            {
                "width": _to_positive_int(getattr(image_obj, "original_width", None)) or 1200,
                "url": _to_absolute_asset_url(image_url, frontend_base_url),
                "kind": "detail",
            }
        )
    if thumbnail_url:
        candidates.append(
            {
                "width": 300,
                "url": _to_absolute_asset_url(thumbnail_url, frontend_base_url),
                "kind": "grid",
            }
        )

    deduplicated = {}
    for candidate in candidates:
        candidate_url = candidate["url"]
        previous = deduplicated.get(candidate_url)
        if previous is None or candidate["width"] > previous["width"]:
            deduplicated[candidate_url] = candidate
    return sorted(deduplicated.values(), key=lambda item: item["width"])


def _pick_main_image_source(image_candidates):
    if not image_candidates:
        return ""
    detail_candidate = next(
        (item for item in image_candidates if item["kind"] == "detail" and item["width"] >= 1200),
        None,
    )
    if detail_candidate:
        return detail_candidate["url"]
    return image_candidates[-1]["url"]


def _build_image_srcset(image_candidates):
    if not image_candidates:
        return ""
    return ", ".join(f"{item['url']} {item['width']}w" for item in image_candidates)


def _build_listing_image_alt(brand, model, year, city, site_name):
    year_part = str(year) if year else "обява"
    city_part = _trim_to_value(city, fallback="България")
    return f"{brand} {model} {year_part} - {city_part} - обява в {site_name}"


def _normalize_slug(listing):
    slug_value = _trim_to_value(getattr(listing, "slug", ""))
    if slug_value:
        return slug_value
    generated_slug = listing.generate_slug()
    if generated_slug:
        return generated_slug
    return f"obiava-{listing.id}"


def _normalize_listing_title(listing):
    brand = _trim_to_value(listing.brand, fallback="Автомобил")
    model = _trim_to_value(listing.model, fallback="Модел")
    year = _to_positive_int(getattr(listing, "year_from", None))
    if year:
        return f"{brand} {model} {year}".strip()
    return f"{brand} {model}".strip()


def _build_breadcrumb_items(listing, frontend_base_url, canonical_path):
    brand = _trim_to_value(listing.brand, fallback="Марка")
    model = _trim_to_value(listing.model, fallback="Модел")
    cars_path = "/search?mainCategory=cars"
    brand_path = f"{cars_path}&brand={quote(brand)}"
    model_path = f"{brand_path}&model={quote(model)}"
    listing_path = canonical_path if canonical_path.startswith("/") else f"/{canonical_path}"
    return [
        {"name": "Начало", "path": "/", "url": f"{frontend_base_url}/"},
        {"name": "Автомобили", "path": cars_path, "url": f"{frontend_base_url}{cars_path}"},
        {"name": brand, "path": brand_path, "url": f"{frontend_base_url}{brand_path}"},
        {"name": model, "path": model_path, "url": f"{frontend_base_url}{model_path}"},
        {"name": "Обява", "path": listing_path, "url": f"{frontend_base_url}{listing_path}"},
    ]


def _drop_none_values(payload):
    if isinstance(payload, dict):
        normalized = {}
        for key, value in payload.items():
            cleaned = _drop_none_values(value)
            if cleaned is not None:
                normalized[key] = cleaned
        return normalized
    if isinstance(payload, list):
        normalized_list = []
        for item in payload:
            cleaned = _drop_none_values(item)
            if cleaned is not None:
                normalized_list.append(cleaned)
        return normalized_list
    return payload


def _build_prerender_etag(listing, images):
    fingerprint = {
        "id": listing.id,
        "slug": _normalize_slug(listing),
        "updated_at": int(listing.updated_at.timestamp()) if listing.updated_at else 0,
        "price": str(getattr(listing, "price", "")),
        "view_count": int(getattr(listing, "view_count", 0) or 0),
        "images": [
            {
                "id": image.id,
                "updated_at": int(image.created_at.timestamp()) if getattr(image, "created_at", None) else 0,
                "image": _trim_to_value(getattr(image.image, "name", "")),
                "thumbnail": _trim_to_value(getattr(image.thumbnail, "name", "")),
                "renditions": getattr(image, "renditions", None),
            }
            for image in images
        ],
    }
    digest = hashlib.sha256(
        json.dumps(fingerprint, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return quote_etag(digest[:32])


def _if_none_match_matches(request, current_etag):
    raw_header = request.headers.get("If-None-Match")
    if not raw_header:
        return False

    def normalize_tag(tag):
        normalized = str(tag or "").strip()
        if normalized.startswith("W/"):
            normalized = normalized[2:].strip()
        if normalized.startswith('"') and normalized.endswith('"') and len(normalized) >= 2:
            normalized = normalized[1:-1]
        return normalized

    candidate = normalize_tag(current_etag)
    if not candidate:
        return False

    for header_part in raw_header.split(","):
        normalized = normalize_tag(header_part)
        if not normalized:
            continue
        if normalized == "*":
            return True
        if normalized == candidate:
            return True
    return False


@api_view(["GET"])
@permission_classes([AllowAny])
def prerender_listing(request, listing_id):
    """Return pre-rendered HTML for crawler requests on detail listing pages."""
    user_agent = request.headers.get("User-Agent", "")
    force_mode = str(request.query_params.get("force") or "").strip().lower() in {"1", "true", "yes"}
    bot_detected = _is_supported_prerender_bot(user_agent)

    if not bot_detected and not force_mode:
        return HttpResponse(
            "Prerender endpoint is reserved for crawler user-agents.",
            status=403,
            content_type="text/plain; charset=utf-8",
        )

    cutoff = get_expiry_cutoff()
    listing_queryset = (
        BaseListing.objects.filter(
            is_active=True,
            is_draft=False,
            is_archived=False,
            created_at__gte=cutoff,
        )
        .select_related("cars_details")
    )
    listing = get_object_or_404(listing_queryset, pk=listing_id)
    images = list(
        CarImage.objects.filter(listing_id=listing.id)
        .order_by("-is_cover", "order", "id")
    )

    frontend_base_url = _resolve_frontend_base_url()
    site_name = _resolve_site_name()
    canonical_slug = _normalize_slug(listing)
    canonical_path = f"/details/{canonical_slug}"
    canonical_url = f"{frontend_base_url}{canonical_path}"

    listing_name = _normalize_listing_title(listing)
    price_label = _format_price_label(listing.price)
    h1_value = f"{listing_name} – {price_label}"
    fuel_label = _trim_to_value(listing.get_fuel_display() or listing.fuel, fallback="непосочено гориво")
    transmission_label = _trim_to_value(
        listing.get_gearbox_display() or listing.gearbox,
        fallback="непосочена трансмисия",
    )
    mileage_label = _format_mileage_label(listing.mileage)
    city_label = _trim_to_value(listing.city, fallback="България")
    description_value = (
        f"{listing_name}, {mileage_label}, {fuel_label}, {transmission_label}. "
        f"Обява за автомобил в {city_label}. Виж повече в {site_name}."
    )
    title_value = f"{h1_value} | {site_name}"

    default_share_image = f"{frontend_base_url}/karbgbannerlogo.jpg"
    gallery_rows = []
    first_image_url = ""
    image_alt = _build_listing_image_alt(
        _trim_to_value(listing.brand, fallback="Автомобил"),
        _trim_to_value(listing.model, fallback="Модел"),
        _to_positive_int(listing.year_from),
        city_label,
        site_name,
    )

    for index, image_obj in enumerate(images):
        candidates = _collect_image_candidates(image_obj, frontend_base_url)
        if not candidates:
            continue
        main_src = _pick_main_image_source(candidates)
        if not main_src:
            continue
        if not first_image_url:
            first_image_url = main_src
        gallery_rows.append(
            {
                "src": main_src,
                "srcset": _build_image_srcset(candidates),
                "sizes": "(max-width: 768px) 100vw, 50vw",
                "alt": image_alt,
                "loading": "eager" if index == 0 else "lazy",
                "fetchpriority": "high" if index == 0 else "low",
            }
        )

    og_image = first_image_url or default_share_image
    breadcrumbs = _build_breadcrumb_items(listing, frontend_base_url, canonical_path)

    vehicle_schema = _drop_none_values(
        {
            "@context": "https://schema.org",
            "@type": "Vehicle",
            "name": listing_name,
            "brand": {
                "@type": "Brand",
                "name": _trim_to_value(listing.brand, fallback="Автомобил"),
            },
            "model": _trim_to_value(listing.model, fallback="Модел"),
            "vehicleModelDate": str(_to_positive_int(listing.year_from) or ""),
            "fuelType": fuel_label,
            "vehicleTransmission": transmission_label,
            "mileageFromOdometer": {
                "@type": "QuantitativeValue",
                "value": _to_positive_int(listing.mileage),
                "unitCode": "KMT",
            },
            "offers": {
                "@type": "Offer",
                "price": _format_price_for_schema(listing.price),
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
                "url": canonical_url,
            },
            "url": canonical_url,
        }
    )

    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": index + 1,
                "name": item["name"],
                "item": item["url"],
            }
            for index, item in enumerate(breadcrumbs)
        ],
    }

    website_schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": f"{frontend_base_url}/#website",
        "url": f"{frontend_base_url}/",
        "name": site_name,
        "potentialAction": {
            "@type": "SearchAction",
            "target": f"{frontend_base_url}/search?brand={{search_term_string}}",
            "query-input": "required name=search_term_string",
        },
    }

    ai_summary = {
        "what_the_site_is": f"{site_name} е онлайн авто marketplace за обяви на автомобили в България.",
        "service": "Платформата позволява публикуване, търсене и сравнение на автомобилни обяви.",
        "country": "България",
        "audience": "Частни лица, автокъщи и автомобилни дилъри.",
        "marketplace_type": "C2C и B2C marketplace за авто обяви.",
    }

    breadcrumb_html = "".join(
        (
            f'<a href="{escape(item["path"])}">{escape(item["name"])}</a>'
            if index < len(breadcrumbs) - 1
            else f"<span>{escape(item['name'])}</span>"
        )
        + (f'<span class="separator">/</span>' if index < len(breadcrumbs) - 1 else "")
        for index, item in enumerate(breadcrumbs)
    )

    gallery_html = "".join(
        (
            "<figure>"
            f"<img src=\"{escape(row['src'])}\""
            + (f" srcset=\"{escape(row['srcset'])}\"" if row["srcset"] else "")
            + f" sizes=\"{escape(row['sizes'])}\""
            + f" alt=\"{escape(row['alt'])}\""
            + f" loading=\"{escape(row['loading'])}\""
            + f" decoding=\"async\" fetchpriority=\"{escape(row['fetchpriority'])}\""
            + " />"
            "</figure>"
        )
        for row in gallery_rows
    )

    vehicle_schema_json = json.dumps(vehicle_schema, ensure_ascii=False)
    breadcrumb_schema_json = json.dumps(breadcrumb_schema, ensure_ascii=False)
    website_schema_json = json.dumps(website_schema, ensure_ascii=False)

    html_document = f"""<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title_value)}</title>
  <meta name="description" content="{escape(description_value)}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="{escape(canonical_url)}" />
  <meta property="og:site_name" content="{escape(site_name)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{escape(title_value)}" />
  <meta property="og:description" content="{escape(description_value)}" />
  <meta property="og:url" content="{escape(canonical_url)}" />
  <meta property="og:image" content="{escape(og_image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{escape(title_value)}" />
  <meta name="twitter:description" content="{escape(description_value)}" />
  <meta name="twitter:image" content="{escape(og_image)}" />
  <style>
    body {{ margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f8fafc; color: #111827; }}
    main {{ max-width: 1000px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; }}
    nav.breadcrumbs {{ display: flex; flex-wrap: wrap; gap: 6px; font-size: 12px; margin-bottom: 12px; }}
    nav.breadcrumbs a {{ color: #0f766e; text-decoration: none; font-weight: 600; }}
    nav.breadcrumbs span {{ color: #475569; font-weight: 700; }}
    nav.breadcrumbs .separator {{ color: #94a3b8; font-weight: 600; }}
    h1 {{ margin: 0 0 10px; font-size: 32px; line-height: 1.2; }}
    p.meta {{ margin: 0 0 14px; color: #334155; font-size: 15px; }}
    section#ai-summary {{ margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; }}
    section#ai-summary h2 {{ margin: 0 0 10px; font-size: 18px; }}
    section#ai-summary dl {{ margin: 0; display: grid; gap: 8px; }}
    section#ai-summary dt {{ font-size: 12px; font-weight: 700; text-transform: uppercase; color: #334155; }}
    section#ai-summary dd {{ margin: 0; font-size: 14px; font-weight: 600; color: #0f172a; }}
    section.gallery {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 14px; }}
    section.gallery figure {{ margin: 0; }}
    section.gallery img {{ width: 100%; height: auto; display: block; border-radius: 12px; border: 1px solid #e2e8f0; object-fit: cover; }}
  </style>
  <script type="application/ld+json">{vehicle_schema_json}</script>
  <script type="application/ld+json">{breadcrumb_schema_json}</script>
  <script type="application/ld+json">{website_schema_json}</script>
</head>
<body>
  <main>
    <nav class="breadcrumbs" aria-label="Breadcrumb">{breadcrumb_html}</nav>
    <article>
      <h1>{escape(h1_value)}</h1>
      <p class="meta">{escape(description_value)}</p>
      <section id="ai-summary" aria-label="AI Summary">
        <h2>AI Summary</h2>
        <dl>
          <div>
            <dt>What the site is</dt>
            <dd>{escape(ai_summary["what_the_site_is"])}</dd>
          </div>
          <div>
            <dt>What service it provides</dt>
            <dd>{escape(ai_summary["service"])}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{escape(ai_summary["country"])}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{escape(ai_summary["audience"])}</dd>
          </div>
          <div>
            <dt>Marketplace type</dt>
            <dd>{escape(ai_summary["marketplace_type"])}</dd>
          </div>
        </dl>
      </section>
      <section class="gallery" aria-label="Снимки на обявата">
        {gallery_html}
      </section>
    </article>
  </main>
</body>
</html>
"""

    detail_etag = _build_prerender_etag(listing, images)
    last_modified = listing.updated_at or listing.created_at
    last_modified_value = http_date(last_modified.timestamp()) if last_modified else None

    if detail_etag and _if_none_match_matches(request, detail_etag):
        response = HttpResponse(status=304)
        response["ETag"] = detail_etag
        if last_modified_value:
            response["Last-Modified"] = last_modified_value
        response["Cache-Control"] = (
            f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
            f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
        )
        patch_vary_headers(response, ("User-Agent",))
        return response

    if last_modified and not request.headers.get("If-None-Match"):
        if_modified_since = parse_http_date_safe(request.headers.get("If-Modified-Since") or "")
        if if_modified_since is not None and int(last_modified.timestamp()) <= int(if_modified_since):
            response = HttpResponse(status=304)
            if detail_etag:
                response["ETag"] = detail_etag
            if last_modified_value:
                response["Last-Modified"] = last_modified_value
            response["Cache-Control"] = (
                f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
                f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
            )
            patch_vary_headers(response, ("User-Agent",))
            return response

    response = HttpResponse(html_document, content_type="text/html; charset=utf-8")
    response["Cache-Control"] = (
        f"public, max-age={PRERENDER_PUBLIC_CACHE_SECONDS}, "
        f"stale-while-revalidate={PRERENDER_PUBLIC_STALE_SECONDS}"
    )
    response["X-Prerender-Bot-Detected"] = "1" if bot_detected else "0"
    if detail_etag:
        response["ETag"] = detail_etag
    if last_modified_value:
        response["Last-Modified"] = last_modified_value
    patch_vary_headers(response, ("User-Agent",))
    return response
