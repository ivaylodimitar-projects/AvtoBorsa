import { formatFuelLabel, formatGearboxLabel } from "../utils/listingLabels";
import { normalizeMainCategory } from "../constants/karbgdata";
import { normalizeListingSlug } from "../utils/slugify";
import { normalizeListingCurrency } from "../utils/listingCurrency";
import {
  resolveListingBaseTitle,
  resolveListingCategoryLabel,
  resolveListingDisplayTitle,
  type ListingTitleInput,
} from "../utils/listingTitle";

type ListingSeoRendition = {
  url?: string | null;
  path?: string | null;
  width?: number | null;
  kind?: string | null;
  format?: string | null;
};

type ListingSeoImage = {
  image?: string | null;
  original_url?: string | null;
  thumbnail?: string | null;
  renditions?: ListingSeoRendition[] | null;
  is_cover?: boolean | null;
};

export type ListingSeoListing = ListingTitleInput & {
  id: number;
  slug?: string | null;
  brand: string;
  model: string;
  year_from?: number | null;
  price?: number | string | null;
  currency?: string | null;
  mileage?: number | string | null;
  fuel?: string | null;
  fuel_display?: string | null;
  gearbox?: string | null;
  gearbox_display?: string | null;
  city?: string | null;
  image_url?: string | null;
  images?: ListingSeoImage[] | null;
};

type BreadcrumbItem = {
  name: string;
  path: string;
  url: string;
};

export type ListingSeoPayload = {
  siteName: string;
  siteUrl: string;
  canonicalUrl: string;
  title: string;
  description: string;
  h1: string;
  priceLabel: string;
  imageAlt: string;
  ogImage: string;
  breadcrumbs: BreadcrumbItem[];
  vehicleSchema: Record<string, unknown>;
  breadcrumbSchema: Record<string, unknown>;
  websiteSchema: Record<string, unknown>;
  aiSummary: {
    whatTheSiteIs: string;
    service: string;
    country: string;
    audience: string;
    marketplaceType: string;
  };
};

type BuildListingSeoOptions = {
  siteName?: string;
  siteUrl?: string;
  priceCurrency?: string;
};

const DEFAULT_SITE_NAME = "Kar.bg";
const DEFAULT_PRICE_CURRENCY = "EUR";
const DEFAULT_OG_IMAGE = "/karbgbannerlogo.jpg";
const VEHICLE_SEO_MAIN_CATEGORIES = new Set([
  "cars",
  "buses",
  "trucks",
  "motorcycles",
  "agriculture",
  "industrial",
  "forklifts",
  "rvs",
  "yachts",
  "trailer",
]);

const trimToValue = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const resolveSiteName = (explicitSiteName?: string) => {
  const envValue = trimToValue(import.meta.env.VITE_SITE_NAME);
  const fallback = trimToValue(explicitSiteName) || envValue || DEFAULT_SITE_NAME;
  return fallback;
};

const resolveSiteUrl = (explicitSiteUrl?: string) => {
  const fromOption = trimToValue(explicitSiteUrl);
  const fromEnv = trimToValue(import.meta.env.VITE_SITE_URL);
  const fromWindow = typeof window !== "undefined" ? trimToValue(window.location.origin) : "";
  const rawValue = fromOption || fromEnv || fromWindow || "https://www.kar.bg";
  return rawValue.replace(/\/+$/, "");
};

const toAbsoluteUrl = (rawValue: string | null | undefined, siteUrl: string) => {
  const value = trimToValue(rawValue);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) {
    const protocol = siteUrl.startsWith("https://") ? "https:" : "http:";
    return `${protocol}${value}`;
  }
  if (value.startsWith("/")) {
    return `${siteUrl}${value}`;
  }
  return `${siteUrl}/${value.replace(/^\/+/, "")}`;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatPriceLabel = (
  value: unknown,
  currency: unknown = DEFAULT_PRICE_CURRENCY,
  locale = "bg-BG"
) => {
  const parsed = toNumber(value);
  if (parsed === null || parsed <= 0) {
    return "Цена по запитване";
  }
  const normalizedCurrency = normalizeListingCurrency(currency);
  const hasFraction = Math.abs(parsed % 1) > 0;
  const formatted = parsed.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  return normalizedCurrency === "EUR"
    ? `${formatted} €`
    : `${formatted} ${normalizedCurrency}`;
};

const formatPriceForSchema = (value: unknown) => {
  const parsed = toNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed.toFixed(2);
};

const formatMileageLabel = (value: unknown, locale = "bg-BG") => {
  const parsed = toNumber(value);
  if (parsed === null || parsed < 0) {
    return "непосочен пробег";
  }
  return `${parsed.toLocaleString(locale)} км`;
};

const resolveSlug = (listing: ListingSeoListing) => {
  const slug = normalizeListingSlug(trimToValue(listing.slug), listing.id);
  if (slug) return slug;
  return `obiava-${listing.id}`;
};

const pickBestShareImageUrl = (images: ListingSeoImage[] | null | undefined) => {
  if (!Array.isArray(images) || images.length === 0) return "";
  const cover = images.find((img) => Boolean(img?.is_cover)) || images[0];
  if (!cover) return "";

  const originalUrl = trimToValue(cover.original_url) || trimToValue(cover.image);
  if (originalUrl && !originalUrl.toLowerCase().endsWith(".webp")) {
    return originalUrl;
  }

  if (Array.isArray(cover.renditions) && cover.renditions.length > 0) {
    const normalized = cover.renditions
      .map((item) => {
        const width = toNumber(item.width);
        if (!width || width <= 0) return null;
        const url = trimToValue(item.url || item.path);
        if (!url) return null;
        return {
          width,
          url,
          kind: trimToValue(item.kind).toLowerCase(),
        };
      })
      .filter((item): item is { width: number; url: string; kind: string } => Boolean(item))
      .sort((a, b) => a.width - b.width);

    const detailCandidate = normalized.find((item) => item.kind === "detail" && item.width >= 1200);
    if (detailCandidate?.url) return detailCandidate.url;
    const widest = normalized[normalized.length - 1];
    if (widest?.url) return widest.url;
  }

  return (
    trimToValue(cover.original_url) ||
    trimToValue(cover.image) ||
    trimToValue(cover.thumbnail) ||
    ""
  );
};

const buildImageAlt = (listing: ListingSeoListing, siteName: string) => {
  const displayTitle = resolveListingDisplayTitle(listing);
  const city = trimToValue(listing.city) || "България";
  return `${displayTitle} - ${city} - обява в ${siteName}`
    .replace(/\s+/g, " ")
    .trim();
};

const buildFuelLabel = (listing: ListingSeoListing) => {
  const fuel = trimToValue(listing.fuel_display) || trimToValue(listing.fuel);
  if (!fuel) return "непосочено гориво";
  return formatFuelLabel(fuel) || fuel;
};

const buildTransmissionLabel = (listing: ListingSeoListing) => {
  const gearbox = trimToValue(listing.gearbox_display) || trimToValue(listing.gearbox);
  if (!gearbox) return "непосочена трансмисия";
  return formatGearboxLabel(gearbox) || gearbox;
};

const buildDescription = (
  listing: ListingSeoListing,
  listingName: string,
  mainCategoryLabel: string,
  cityLabel: string,
  siteName: string
) => {
  const mainCategory = normalizeMainCategory(listing.main_category) || "";
  const details: string[] = [];
  const fuel = trimToValue(listing.fuel_display) || trimToValue(listing.fuel);
  const gearbox = trimToValue(listing.gearbox_display) || trimToValue(listing.gearbox);
  const mileage = toNumber(listing.mileage);

  if (VEHICLE_SEO_MAIN_CATEGORIES.has(mainCategory)) {
    if (mileage !== null && mileage >= 0) {
      details.push(formatMileageLabel(listing.mileage));
    }
    if (fuel) {
      details.push(buildFuelLabel(listing));
    }
    if (gearbox) {
      details.push(buildTransmissionLabel(listing));
    }
  }

  const detailsText = details.length ? `, ${details.join(", ")}` : "";
  return `${listingName}${detailsText}. Обява в категория ${mainCategoryLabel} в ${cityLabel}. Виж повече в ${siteName}.`;
};

const withLeadingSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const buildBreadcrumbs = (
  listing: ListingSeoListing,
  siteUrl: string,
  canonicalPath: string
): BreadcrumbItem[] => {
  const categoryCode = trimToValue(normalizeMainCategory(listing.main_category) || listing.main_category);
  const categoryLabel = resolveListingCategoryLabel(listing.main_category);
  const categoryPath = categoryCode
    ? `/search?mainCategory=${encodeURIComponent(categoryCode)}`
    : "/search";
  const listingPath = withLeadingSlash(canonicalPath);
  const listingLabel = resolveListingDisplayTitle(listing);

  return [
    { name: "Начало", path: "/", url: `${siteUrl}/` },
    { name: categoryLabel, path: categoryPath, url: `${siteUrl}${categoryPath}` },
    { name: listingLabel, path: listingPath, url: `${siteUrl}${listingPath}` },
  ];
};

export const buildListingSeoPayload = (
  listing: ListingSeoListing,
  options: BuildListingSeoOptions = {}
): ListingSeoPayload => {
  const siteName = resolveSiteName(options.siteName);
  const siteUrl = resolveSiteUrl(options.siteUrl);
  const priceCurrency = normalizeListingCurrency(
    trimToValue(options.priceCurrency) || listing.currency || DEFAULT_PRICE_CURRENCY
  );

  const year = toNumber(listing.year_from);
  const priceLabel = formatPriceLabel(listing.price, priceCurrency);
  const fuel = trimToValue(listing.fuel_display) || trimToValue(listing.fuel);
  const gearbox = trimToValue(listing.gearbox_display) || trimToValue(listing.gearbox);
  const fuelLabel = fuel ? buildFuelLabel(listing) : undefined;
  const transmissionLabel = gearbox ? buildTransmissionLabel(listing) : undefined;
  const cityLabel = trimToValue(listing.city) || "България";
  const mainCategoryLabel = resolveListingCategoryLabel(listing.main_category);
  const displayTitle = resolveListingDisplayTitle(listing);
  const baseTitle = resolveListingBaseTitle(listing);
  const brand = trimToValue(listing.brand) || mainCategoryLabel || baseTitle;
  const model = trimToValue(listing.model);

  const slug = resolveSlug(listing);
  const canonicalPath = `/details/${slug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const imageAlt = buildImageAlt(listing, siteName);
  const fallbackShareImage = toAbsoluteUrl(DEFAULT_OG_IMAGE, siteUrl);
  const resolvedShareImage =
    toAbsoluteUrl(pickBestShareImageUrl(listing.images), siteUrl) ||
    toAbsoluteUrl(listing.image_url, siteUrl) ||
    fallbackShareImage;

  const listingName = displayTitle;
  const h1 = `${displayTitle} – ${priceLabel}`;
  const title = `${h1} | ${siteName}`;
  const description = buildDescription(
    listing,
    listingName,
    mainCategoryLabel,
    cityLabel,
    siteName
  );

  const breadcrumbs = buildBreadcrumbs(listing, siteUrl, canonicalPath);

  const vehicleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: listingName,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    model: model || undefined,
    vehicleModelDate: year ? `${year}` : undefined,
    fuelType: fuelLabel,
    vehicleTransmission: transmissionLabel,
    mileageFromOdometer:
      toNumber(listing.mileage) !== null
        ? {
            "@type": "QuantitativeValue",
            value: toNumber(listing.mileage),
            unitCode: "KMT",
          }
        : undefined,
    url: canonicalUrl,
    offers: {
      "@type": "Offer",
      price: formatPriceForSchema(listing.price) || undefined,
      priceCurrency,
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  };

  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const websiteSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: siteName,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?brand={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return {
    siteName,
    siteUrl,
    canonicalUrl,
    title,
    description,
    h1,
    priceLabel,
    imageAlt,
    ogImage: resolvedShareImage,
    breadcrumbs,
    vehicleSchema,
    breadcrumbSchema,
    websiteSchema,
    aiSummary: {
      whatTheSiteIs: `${siteName} е онлайн авто marketplace за обяви на превозни средства и авто услуги.`,
      service:
        "Платформата свързва продавачи и купувачи чрез публикуване, търсене и сравнение на обяви за превозни средства, части и услуги.",
      country: "България",
      audience: "Частни лица, автокъщи, дилъри и търговци на авто услуги.",
      marketplaceType: "C2C и B2C marketplace за превозни средства, части и услуги.",
    },
  };
};
