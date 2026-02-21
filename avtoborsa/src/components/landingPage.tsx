import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CAR_FEATURES } from "../constants/carFeatures";
import { AdvancedSearch } from "./AdvancedSearch";
import { useRecentSearches } from "../hooks/useRecentSearches";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";
import ListingPromoBadge from "./ListingPromoBadge";
import KapariranoBadge from "./KapariranoBadge";
import {
  readLatestListingsCache,
  writeLatestListingsCache,
} from "../utils/latestListingsCache";
import { CAR_BRANDS, CAR_MODELS } from "../constants/carBrandModels";
import { APP_MAIN_CATEGORY_OPTIONS, getMainCategoryLabel } from "../constants/mobileBgData";
import { formatFuelLabel, formatGearboxLabel } from "../utils/listingLabels";
import { resolvePriceBadgeState } from "../utils/priceChangeBadge";

type CarListing = {
  id: number;
  slug: string;
  main_category?: string;
  brand: string;
  model: string;
  year_from: number;
  price: number;
  mileage: number;
  fuel: string;
  fuel_display?: string;
  gearbox: string;
  gearbox_display?: string;
  power: number;
  city: string;
  location_region?: string;
  location_country?: string;
  image_url?: string;
  is_active: boolean;
  is_kaparirano?: boolean;
  created_at: string;
  listing_type?: "top" | "vip" | "normal" | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
  part_for?: string;
  part_element?: string;
  price_change?: {
    delta?: number | string;
    direction?: string;
    changed_at?: string;
    old_price?: number | string;
    new_price?: number | string;
  } | null;
};

const isTopListing = (listing: CarListing) => {
  if (listing.is_top || listing.is_top_listing || listing.is_top_ad) return true;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (["top", "top_ad", "top_listing", "topad", "toplisting"].includes(rawType)) return true;
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("топ");
};

const isVipListing = (listing: CarListing) => {
  if (isTopListing(listing)) return false;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 2) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (rawType === "vip") return true;
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("vip");
};

const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;

type Fuel = "Бензин" | "Дизел" | "Газ/Бензин" | "Хибрид" | "Електро";
type Gearbox = "Ръчна" | "Автоматик";
type Condition = "Всички" | "Нова" | "Употребявана";

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceBgn: number;
  year: number;
  mileageKm: number;
  city: string;
  fuel: Fuel;
  gearbox: Gearbox;
  powerHp: number;
  imageUrl?: string; // optional – използва placeholder, ако липсва
  tags?: string[];
};

const BRANDS: string[] = CAR_BRANDS;

const CITIES = [
  "София",
  "Пловдив",
  "Варна",
  "Бургас",
  "Русе",
  "Стара Загора",
  "Плевен",
  "Благоевград",
  "Велико Търново",
  "Шумен",
] as const;

const FUEL: Fuel[] = ["Бензин", "Дизел", "Газ/Бензин", "Хибрид", "Електро"];
const GEARBOX: Gearbox[] = ["Ръчна", "Автоматик"];

const MODELS: Record<string, string[]> = CAR_MODELS;

const CATEGORIES = APP_MAIN_CATEGORY_OPTIONS;
const POPULAR_CAR_BRANDS = [
  {
    name: "Audi",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/audi-logo-dark.503ee884c7adfa3e4dd3..png",
  },
  {
    name: "BMW",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/bmw-logo-dark.360ac732bb2384b16986..png",
  },
  {
    name: "Cupra",
    logoUrl:
      "https://static.classistatic.de/static/resources/images/make-logos/dark/cupra-dark.webp",
  },
  {
    name: "Ford",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/ford-logo-light.828585c16e15b3d507fe..png",
  },
  {
    name: "Mercedes-Benz",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/mercedes-logo-light.d41ca6c5e735131c629b..png",
  },
  {
    name: "Opel",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/opel-logo-dark.babda5123fdbc9a0cfc2..png",
  },
  {
    name: "Renault",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/renault-logo-dark.32d81c08c606a1dcb90d..png",
  },
  {
    name: "Skoda",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/skoda-logo-dark.943964e3340117887756..png",
  },
  {
    name: "Tesla",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/tesla-logo-dark.ea078e6378667d6ed858..png",
  },
  {
    name: "Toyota",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/toyota-logo-dark.66e8219d3e990b307bd8..png",
  },
  {
    name: "Volvo",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/volvo-logo-dark.6de39f8516b0782087e1..png",
  },
  {
    name: "Volkswagen",
    logoUrl:
      "https://static.classistatic.de/consumer-webapp/static/vw-logo-dark.c293639b63fc19f1f082..png",
  },
] as const;

const DEFAULT_BRAND_HERO_IMAGE =
  "https://loremflickr.com/1600/900/car?lock=99";

const BRAND_HERO_IMAGES: Record<string, string> = {
  Audi: "https://loremflickr.com/1600/900/audi,car?lock=11",
  BMW: "https://loremflickr.com/1600/900/bmw,car?lock=12",
  Cupra: "https://loremflickr.com/1600/900/cupra,car?lock=13",
  Ford: "https://loremflickr.com/1600/900/ford,car?lock=14",
  "Mercedes-Benz": "https://loremflickr.com/1600/900/mercedes,car?lock=15",
  Opel: "https://loremflickr.com/1600/900/opel,car?lock=16",
  Renault: "https://loremflickr.com/1600/900/renault,car?lock=17",
  Skoda: "https://loremflickr.com/1600/900/skoda,car?lock=18",
  Tesla: "https://loremflickr.com/1600/900/tesla,car?lock=19",
  Toyota: "https://loremflickr.com/1600/900/toyota,car?lock=20",
  Volvo: "https://loremflickr.com/1600/900/volvo,car?lock=21",
  Volkswagen: "https://loremflickr.com/1600/900/volkswagen,car?lock=22",
};

const getBrandHeroImage = (brandName: string) =>
  BRAND_HERO_IMAGES[brandName] ?? DEFAULT_BRAND_HERO_IMAGE;
const CATEGORY_ICON_WIDTH = 44;
const CATEGORY_ICON_HEIGHT = 44;
const CATEGORY_SYMBOL_SIZE = 34;

type CategoryIconProps = {
  size?: number;
  width?: number;
  height?: number;
  fill?: 0 | 1;
  weight?: number;
};
type CategoryIconComponent = (props: CategoryIconProps) => React.JSX.Element;

type MaterialSymbolName =
  | "directions_car"
  | "tire_repair"
  | "manufacturing"
  | "directions_bus"
  | "local_shipping"
  | "two_wheeler"
  | "agriculture"
  | "front_loader"
  | "forklift"
  | "rv_hookup"
  | "sailing"
  | "commute"
  | "settings"
  | "shopping_cart"
  | "handyman";

const CATEGORY_SYMBOLS: Record<string, MaterialSymbolName> = {
  "1": "directions_car",
  w: "tire_repair",
  u: "manufacturing",
  "3": "directions_bus",
  "4": "local_shipping",
  "5": "two_wheeler",
  "6": "agriculture",
  "7": "front_loader",
  "8": "forklift",
  "9": "rv_hookup",
  a: "sailing",
  b: "commute",
  v: "settings",
  y: "shopping_cart",
  z: "handyman",
};

function MaterialCategoryIcon({
  name,
  size = CATEGORY_SYMBOL_SIZE,
  width,
  height,
  fill = 0,
  weight = 500,
}: {
  name: MaterialSymbolName;
} & CategoryIconProps) {
  const iconWidth = width ?? size;
  const iconHeight = height ?? size;
  const fontSize = Math.min(iconWidth, iconHeight);

  return (
    <span
      className="category-material-icon"
      style={{
        width: iconWidth,
        height: iconHeight,
        fontSize,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontVariationSettings: `"FILL" ${fill}, "wght" ${weight}, "GRAD" 0, "opsz" 48`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

const createCategoryIcon = (name: MaterialSymbolName): CategoryIconComponent => (props) => (
  <MaterialCategoryIcon name={name} {...props} />
);

const CATEGORY_ICONS: Record<string, CategoryIconComponent> = Object.fromEntries(
  Object.entries(CATEGORY_SYMBOLS).map(([categoryKey, symbolName]) => [
    categoryKey,
    createCategoryIcon(symbolName),
  ])
);

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 36,
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  color: "#333",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  appearance: "none",
  paddingRight: 32,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { searches } = useRecentSearches();
  const getImageUrl = useImageUrl();
  const initialLatestListingsRef = useRef<CarListing[] | null>(
    readLatestListingsCache<CarListing>()
  );

  // Latest listings
  const [latestListings, setLatestListings] = useState<CarListing[]>(
    () => initialLatestListingsRef.current ?? []
  );
  const [listingsLoading, setListingsLoading] = useState(
    () => initialLatestListingsRef.current === null
  );
  const [activeBrandIndex, setActiveBrandIndex] = useState(() => {
    const mercedesIndex = POPULAR_CAR_BRANDS.findIndex(
      (item) => item.name === "Mercedes-Benz"
    );
    return mercedesIndex >= 0 ? mercedesIndex : 0;
  });
  const [isBrandShowcaseOpen, setIsBrandShowcaseOpen] = useState(true);
  const [brandSlideDirection, setBrandSlideDirection] = useState<"next" | "prev">("next");
  const [brandMotionKey, setBrandMotionKey] = useState(0);
  const [isPopularBrandsInView, setIsPopularBrandsInView] = useState(false);
  const [isBrandShowcaseHovered, setIsBrandShowcaseHovered] = useState(false);
  const popularBrandsSectionRef = useRef<HTMLElement | null>(null);
  const lastBrandsManualActionRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const cachedLatestListings = initialLatestListingsRef.current;

    if (cachedLatestListings) {
      setLatestListings(cachedLatestListings);
      setListingsLoading(false);
    }

    const parseListingPayload = (payload: unknown): CarListing[] => {
      if (Array.isArray(payload)) return payload as CarListing[];
      if (
        payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { results?: unknown[] }).results)
      ) {
        return (payload as { results: CarListing[] }).results;
      }
      return [];
    };

    const fetchLatest = async () => {
      try {
        if (!cachedLatestListings) {
          setListingsLoading(true);
        }

        const [latestResponse, fallbackResponse] = await Promise.all([
          fetch("http://localhost:8000/api/listings/latest/", { signal: controller.signal }),
          fetch(
            `http://localhost:8000/api/listings/?page=1&page_size=24&lite=1&sortBy=newest&_ts=${Date.now()}`,
            {
              signal: controller.signal,
            }
          ),
        ]);

        let latestFromDedicated: CarListing[] = [];
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          latestFromDedicated = parseListingPayload(latestData);
        }

        let latestFromFallback: CarListing[] = [];
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          latestFromFallback = parseListingPayload(fallbackData);
        }

        const latest = [...latestFromDedicated, ...latestFromFallback];

        if (latest.length === 0) {
          throw new Error("Failed to fetch latest listings");
        }

        const deduped = Array.from(
          new Map(latest.map((listing) => [listing.id, listing])).values()
        );
        deduped.sort((a, b) => {
          const aTime = new Date(a.created_at || "").getTime();
          const bTime = new Date(b.created_at || "").getTime();
          if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
          if (!Number.isFinite(aTime)) return 1;
          if (!Number.isFinite(bTime)) return -1;
          return bTime - aTime;
        });

        const latestNormalized = deduped.slice(0, 16);
        setLatestListings(latestNormalized);
        writeLatestListingsCache(latestNormalized);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Error fetching latest listings:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setListingsLoading(false);
        }
      }
    };
    fetchLatest();
    return () => controller.abort();
  }, []);

  // filters
  const [category, setCategory] = useState<string>("1");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [fuel, setFuel] = useState<string>("");
  const [gearbox, setGearbox] = useState<string>("");
  const [condition, setCondition] = useState<Condition>("Всички");

  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");

  const [hasPhotosOnly, setHasPhotosOnly] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);

  const yearNow = new Date().getFullYear();

  // Results are now fetched from the search page via navigation
  // This variable is no longer used on the landing page
  const results: Listing[] = [];

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Тук би навигирал към /search?... или би викнал API.
    // Засега само държим резултатите в UI.
  };

  const handleAdvancedSearch = (criteria: any) => {
    // Update filters based on search criteria
    if (criteria.mainCategory) {
      setCategory(criteria.mainCategory);
    }
    setBrand(criteria.brand || "");
    setModel(criteria.model || "");
    setCity(criteria.region || "");
    setFuel(criteria.fuel || "");
    setGearbox(criteria.gearbox || "");
    setPriceFrom(criteria.priceFrom || "");
    setPriceTo(criteria.priceTo || "");
    setYearFrom(criteria.yearFrom || "");
    setYearTo(criteria.yearTo || "");

    // Log the search query to console
    console.log("Advanced Search Criteria:", criteria);
  };

  const resetFilters = () => {
    setCategory("1");
    setBrand("");
    setModel("");
    setCity("");
    setFuel("");
    setGearbox("");
    setCondition("Всички");
    setPriceFrom("");
    setPriceTo("");
    setYearFrom("");
    setYearTo("");
    setHasPhotosOnly(false);
    setSelectedFeatures([]);
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const goToPrevBrand = (source: "manual" | "auto" = "manual") => {
    if (source === "manual") {
      lastBrandsManualActionRef.current = Date.now();
    }
    setIsBrandShowcaseOpen(true);
    setBrandSlideDirection("prev");
    setBrandMotionKey((prev) => prev + 1);
    setActiveBrandIndex((prev) =>
      (prev - 1 + POPULAR_CAR_BRANDS.length) % POPULAR_CAR_BRANDS.length
    );
  };

  const goToNextBrand = (source: "manual" | "auto" = "manual") => {
    if (source === "manual") {
      lastBrandsManualActionRef.current = Date.now();
    }
    setIsBrandShowcaseOpen(true);
    setBrandSlideDirection("next");
    setBrandMotionKey((prev) => prev + 1);
    setActiveBrandIndex((prev) => (prev + 1) % POPULAR_CAR_BRANDS.length);
  };

  const activeBrand = POPULAR_CAR_BRANDS[activeBrandIndex];
  const leftBrand =
    POPULAR_CAR_BRANDS[
      (activeBrandIndex - 1 + POPULAR_CAR_BRANDS.length) % POPULAR_CAR_BRANDS.length
    ];
  const rightBrand =
    POPULAR_CAR_BRANDS[(activeBrandIndex + 1) % POPULAR_CAR_BRANDS.length];

  useEffect(() => {
    const sectionEl = popularBrandsSectionRef.current;
    if (!sectionEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPopularBrandsInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(sectionEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPopularBrandsInView || isBrandShowcaseHovered) return;

    const intervalId = window.setInterval(() => {
      const manualPauseMs = 7000;
      const isManualPauseActive =
        Date.now() - lastBrandsManualActionRef.current < manualPauseMs;

      if (!isManualPauseActive) {
        goToNextBrand("auto");
      }
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [isPopularBrandsInView, isBrandShowcaseHovered]);

  const isListingNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = Date.now() - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 30) return date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
    if (diffDays > 0) return `преди ${diffDays} ${diffDays === 1 ? "ден" : "дни"}`;
    if (diffHours > 0) return `преди ${diffHours} ${diffHours === 1 ? "час" : "часа"}`;
    if (diffMins > 0) return `преди ${diffMins} мин`;
    return "току-що";
  };

  const getListingLocationLabel = (listing: CarListing) => {
    const city = (listing.city || "").toString().trim();
    if (city) return city;
    const region = (listing.location_region || "").toString().trim();
    if (region) return region;
    const country = (listing.location_country || "").toString().trim();
    if (country) return country;
    return "Непосочен";
  };

  const getLatestListingMeta = (listing: CarListing) => {
    const isPartsCategory = (listing.main_category || "").toString() === "u";
    if (isPartsCategory) {
      const partItems: string[] = [];
      const partElement = (listing.part_element || "").toString().trim();
      if (partElement) {
        partItems.push(partElement);
      }
      const partForRaw = (listing.part_for || "").toString().trim();
      const partForLabel = getMainCategoryLabel(partForRaw) || partForRaw;
      if (partForLabel) {
        partItems.push(`За ${partForLabel}`);
      }
      return partItems.slice(0, 2);
    }

    const values: string[] = [];
    const pushValue = (value: string) => {
      const normalized = value.trim();
      if (!normalized) return;
      if (values.includes(normalized)) return;
      values.push(normalized);
    };

    const year = Number(listing.year_from);
    if (Number.isFinite(year) && year > 0) {
      pushValue(`${Math.round(year)} г.`);
    }

    const mileage = Number(listing.mileage);
    if (Number.isFinite(mileage) && mileage > 0) {
      pushValue(`${Math.round(mileage).toLocaleString("bg-BG")} км`);
    }

    pushValue(formatFuelLabel((listing.fuel_display || listing.fuel || "").toString()));

    const power = Number(listing.power);
    if (Number.isFinite(power) && power > 0) {
      pushValue(`${Math.round(power)} к.с.`);
    }

    pushValue(formatGearboxLabel((listing.gearbox_display || listing.gearbox || "").toString()));

    return values.slice(0, 4);
  };

  const selectedCategoryLabel =
    CATEGORIES.find((mainCategory) => mainCategory.value === category)?.label || "";

  return (
    <div style={styles.page}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <style>{globalCss}</style>
      <style>{`
        .adv-search-root .adv-top-content {
          margin: 0 0 8px !important;
          padding: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* Features dropdown table responsive styles */
        .features-dropdown-table {
          width: 100%;
          border-collapse: collapse;
        }

        .features-dropdown-table td {
          vertical-align: top;
          padding: 12px;
          border-right: 1px solid #e0e0e0;
        }

        /* Desktop (1201px+) - 4 columns */
        @media (min-width: 1201px) {
          .features-dropdown-table td {
            width: 25%;
          }
        }

        /* Tablet Large (1024px - 1200px) - 2 columns */
        @media (min-width: 1024px) and (max-width: 1200px) {
          .features-dropdown-table td {
            width: 50%;
          }
          .features-dropdown-table td:nth-child(odd) {
            border-right: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:nth-child(even) {
            border-right: none;
          }
        }

        /* Tablet (768px - 1023px) - 2 columns */
        @media (min-width: 768px) and (max-width: 1023px) {
          .features-dropdown-table td {
            width: 50%;
          }
          .features-dropdown-table td:nth-child(odd) {
            border-right: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:nth-child(even) {
            border-right: none;
          }
        }

        /* Mobile Large (640px - 767px) - 1 column */
        @media (min-width: 640px) and (max-width: 767px) {
          .features-dropdown-table {
            display: block;
          }
          .features-dropdown-table tbody {
            display: block;
          }
          .features-dropdown-table tr {
            display: block;
          }
          .features-dropdown-table td {
            display: block;
            width: 100% !important;
            padding: 12px 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:last-child {
            border-bottom: none;
          }
        }

        /* Mobile Small (< 640px) - 1 column */
        @media (max-width: 639px) {
          .features-dropdown-table {
            display: block;
          }
          .features-dropdown-table tbody {
            display: block;
          }
          .features-dropdown-table tr {
            display: block;
          }
          .features-dropdown-table td {
            display: block;
            width: 100% !important;
            padding: 12px 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:last-child {
            border-bottom: none;
          }
        }

        /* Category buttons: isolate from global button defaults (blue focus/hover border). */
        .category-pill-btn {
          box-sizing: border-box;
          outline: none !important;
          opacity: 1 !important;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }
        .category-material-icon {
          font-family: "Material Symbols Rounded";
          font-style: normal;
          font-weight: normal;
          text-transform: none;
          letter-spacing: normal;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "liga";
          transition: transform 0.22s ease, color 0.22s ease, font-variation-settings 0.22s ease;
        }
        .category-pill-label {
          display: none;
        }
        .category-pill-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 1px);
          transform: translate(-50%, 6px) scale(0.96);
          opacity: 0;
          pointer-events: none;
          background: #0f172a;
          color: #ffffff;
          border-radius: 7px;
          padding: 5px 7px;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.2);
          transition: opacity 0.16s ease, transform 0.16s ease;
          z-index: 25;
        }
        .category-pill-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px 5px 0 5px;
          border-style: solid;
          border-color: #0f172a transparent transparent transparent;
        }
        .category-pill-btn:hover {
          box-shadow: none;
          background: rgba(15, 23, 42, 0.04);
          transform: translateY(-1px);
          opacity: 1 !important;
        }
        .category-pill-btn:hover .category-material-icon {
          transform: scale(1.03);
        }
        .category-pill-btn:hover .category-pill-tooltip,
        .category-pill-btn:focus-visible .category-pill-tooltip {
          opacity: 1;
          transform: translate(-50%, 2px) scale(1);
        }
        .category-pill-btn.category-pill-btn--active .category-material-icon {
          transform: scale(1.05);
        }
        .category-pill-btn:active {
          transform: translateY(0);
          box-shadow: none;
          opacity: 1 !important;
        }
        .category-pill-btn:focus,
        .category-pill-btn:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.24) !important;
        }
        .category-pill-btn:focus:not(:focus-visible) {
          box-shadow: none !important;
        }
        .category-pill-btn.category-pill-btn--active {
          box-shadow: none;
          background: transparent !important;
        }
        .main-category-grid {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .main-category-grid::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <main style={styles.main}>
        <div id="search" style={styles.searchBlock}>
          <AdvancedSearch
            onSearch={handleAdvancedSearch}
            brands={BRANDS}
            models={MODELS}
            categories={CATEGORIES}
            mainCategory={category}
            onMainCategoryChange={setCategory}
            recentSearches={searches}
            hideMainCategoryField
            topContent={
              <div style={styles.mainCategoryWrap}>
                <div style={styles.mainCategoryHeader}>
                  <span style={styles.mainCategoryLabel}>Категория - {selectedCategoryLabel}</span>
                  {/* <span style={styles.mainCategoryHint}>{selectedCategoryLabel}</span> */}
                </div>

                <div
                  className="main-category-grid"
                  style={styles.mainCategoryRow}
                >
                  {CATEGORIES.map((mainCategory) => {
                    const isActive = category === mainCategory.value;
                    const isForkliftCategory = mainCategory.value === "8";
                    const Icon = CATEGORY_ICONS[mainCategory.value] || CATEGORY_ICONS["1"];

                    return (
                      <button
                        key={mainCategory.value}
                        id={`ptico_${mainCategory.value}`}
                        type="button"
                        data-title={mainCategory.label}
                        data-category-value={mainCategory.value}
                        className={`category-pill-btn cat${mainCategory.value}${isActive ? " active category-pill-btn--active" : ""}`}
                        style={{
                          ...styles.mainCategoryButton,
                          ...(isActive ? styles.mainCategoryButtonActive : {}),
                        }}
                        onClick={() => setCategory(mainCategory.value)}
                        aria-pressed={isActive}
                        aria-label={mainCategory.label}
                        title={mainCategory.label}
                      >
                        <span
                          style={{
                            ...styles.mainCategoryIconWrap,
                            ...(isActive
                              ? {
                                  color: "#0f766e",
                                }
                              : {}),
                          }}
                        >
                          <Icon
                            width={isForkliftCategory ? 42 : CATEGORY_ICON_WIDTH}
                            height={isForkliftCategory ? 42 : CATEGORY_ICON_HEIGHT}
                            fill={isForkliftCategory ? 0 : isActive ? 1 : 0}
                            weight={isForkliftCategory ? (isActive ? 500 : 400) : isActive ? 650 : 500}
                          />
                        </span>
                        <span className="category-pill-tooltip" aria-hidden="true">
                          {mainCategory.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            }
          />

          {/* OLD FORM - REPLACED WITH ADVANCEDSEARCH */}
          {false && <form onSubmit={onSubmitSearch} style={styles.form}>
              <div style={styles.grid} className="search-grid">

                  <Field label="Марка">
                    <Select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      options={["", ...BRANDS]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Модел">
                    <Select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      options={["", ...(brand && MODELS[brand] ? MODELS[brand] : [])]}
                      placeholder={brand ? "Избери модел" : "Избери марка първо"}
                    />
                  </Field>

                  <Field label="Град">
                    <Select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      options={["", ...CITIES]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Гориво">
                    <Select
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value)}
                      options={["", ...FUEL]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Скоростна кутия">
                    <Select
                      value={gearbox}
                      onChange={(e) => setGearbox(e.target.value)}
                      options={["", ...GEARBOX]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Състояние">
                    <Select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      options={["Всички", "Употребявана", "Нова"]}
                    />
                  </Field>

                  <Field label="Цена (от)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={priceFrom}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setPriceFrom(v);
                      }}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="Цена (до)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={priceTo}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setPriceTo(v);
                      }}
                      placeholder="напр. 15000"
                    />
                  </Field>

                  <Field label="Година (от)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={yearFrom}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setYearFrom(v ? String(clampNumber(Number(v), 1950, yearNow)) : "");
                      }}
                      placeholder="напр. 2010"
                    />
                  </Field>

                  <Field label="Година (до)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={yearTo}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setYearTo(v ? String(clampNumber(Number(v), 1950, yearNow)) : "");
                      }}
                      placeholder={String(yearNow)}
                    />
                  </Field>

                  {/* Features Dropdown */}
                  <div style={{ gridColumn: "1 / -1", position: "relative" }}>
                    <label style={styles.label}>Характеристики</label>
                    <button
                      type="button"
                      onClick={() => setShowFeaturesDropdown(!showFeaturesDropdown)}
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#333",
                        padding: "0 12px",
                        outline: "none",
                        fontSize: 14,
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0f766e";
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0, 102, 204, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#ccc";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span>{selectedFeatures.length > 0 ? `${selectedFeatures.length} избрани` : "Избери характеристики"}</span>
                      <span style={{ transform: showFeaturesDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 16 }}>▾</span>
                    </button>

                    {/* Modal Overlay */}
                    {showFeaturesDropdown && (
                      <div
                        style={{
                          position: "fixed",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "rgba(0, 0, 0, 0.5)",
                          zIndex: 10000,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => setShowFeaturesDropdown(false)}
                      >
                        {/* Modal Content */}
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 8,
                            padding: 24,
                            maxWidth: 1000,
                            width: "90%",
                            maxHeight: "80vh",
                            overflowY: "auto",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#333", margin: 0 }}>Характеристики</h2>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: 24,
                                cursor: "pointer",
                                color: "#666",
                                padding: 0,
                                width: 32,
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ✕
                            </button>
                          </div>

                          <table className="features-table">
                            <tbody>
                              <tr>
                                {Object.entries(CAR_FEATURES).map(([category, features]) => (
                                  <td key={category}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 12, display: "block", textTransform: "capitalize", paddingBottom: 8, borderBottom: "3px solid #0f766e" }}>
                                      {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </label>
                                    {features.map((feature) => (
                                      <div key={feature}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, cursor: "pointer", padding: "3px 0" }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedFeatures.includes(feature)}
                                            onChange={() => handleFeatureToggle(feature)}
                                            style={{ cursor: "pointer", width: 16, height: 16 }}
                                          />
                                          <span style={{ color: "black", fontWeight: "bold", fontSize: 14 }}>{feature}</span>
                                        </label>
                                      </div>
                                    ))}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>

                          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                padding: "10px 20px",
                                background: "#f0f0f0",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#333",
                              }}
                            >
                              Затвори
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                padding: "10px 20px",
                                background: "#0f766e",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#fff",
                              }}
                            >
                              Готово
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.formBottom} className="form-bottom">
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={hasPhotosOnly}
                      onChange={(e) => setHasPhotosOnly(e.target.checked)}
                    />
                    <span>Само със снимки</span>
                  </label>

                  <div style={styles.actions} className="form-actions">
                    <button
                      type="button"
                      style={{ ...styles.secondaryBtn, ...styles.clearFiltersBtn }}
                      onClick={resetFilters}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#b91c1c";
                        e.currentTarget.style.borderColor = "#b91c1c";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.borderColor = "#dc2626";
                      }}
                    >
                      Изчисти
                    </button>
                    <button type="submit" style={styles.primaryBtnWide}>
                      Търси
                      <span style={{ opacity: 0.85, marginLeft: 10 }}>
                        ({results.length})
                      </span>
                    </button>
                  </div>
                </div>

                <div style={styles.note}>
                  * Демо: резултатите филтрират примерни “топ обяви”. В реален проект тук се връзва API.
                </div>
            </form>}
          </div>

        {/* LATEST LISTINGS */}
        <section id="latest" style={{ ...styles.section, ...styles.latestSection }}>
          <style>{`
            .listing-card-hover {
              transition: transform 0.24s ease, box-shadow 0.24s ease;
              position: relative;
              z-index: 3;
            }
            .listing-card-hover:hover {
              transform: translateY(-5px);
              box-shadow: 0 16px 34px rgba(15,23,42,0.14) !important;
              z-index: 6;
            }
            .listing-new-badge {
              position: absolute;
              top: 10px;
              left: 10px;
              background: linear-gradient(135deg, #10b981, #059669);
              color: #fff;
              padding: 4px 10px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              box-shadow: 0 4px 10px rgba(5,150,105,0.35);
              z-index: 11;
            }
            .listing-image-layer {
              position: absolute;
              inset: 0;
              overflow: hidden;
              border-top-left-radius: 16px;
              border-top-right-radius: 16px;
              z-index: 1;
            }
            .latest-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 18px;
              padding-top: 14px;
              margin-top: 2px;
              overflow: visible;
            }
            .view-more-btn {
              transition: background 0.2s ease, box-shadow 0.2s ease;
            }
            .view-more-btn:hover {
              box-shadow: 0 4px 14px rgba(15,118,110,0.35);
            }
            .brand-showcase {
              margin-top: 6px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
              background: radial-gradient(circle at 14% 8%, rgba(15, 118, 110, 0.14), transparent 52%),
                linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 8px 28px rgba(15, 23, 42, 0.1);
              padding: 14px;
              position: relative;
              perspective: 1400px;
              overflow: hidden;
            }
            .brand-stage {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr) minmax(0, 1fr);
              align-items: stretch;
              gap: 12px;
              transform-style: preserve-3d;
            }
            .brand-stage--next {
              animation: brandShelfDriftNext 0.82s cubic-bezier(0.16, 0.78, 0.18, 1);
              transform-origin: right center;
            }
            .brand-stage--prev {
              animation: brandShelfDriftPrev 0.82s cubic-bezier(0.16, 0.78, 0.18, 1);
              transform-origin: left center;
            }
            .brand-side-card {
              border-radius: 14px;
              border: 1px solid transparent;
              background: #0b1220;
              display: flex;
              justify-content: center;
              align-items: flex-end;
              padding: 12px;
              position: relative;
              overflow: hidden;
              opacity: 0.68;
              transform: scale(0.96);
              transition: transform 0.32s ease, opacity 0.32s ease;
            }
            .brand-showcase.is-open .brand-side-card {
              opacity: 0.86;
              transform: scale(1);
            }
            .brand-stage--next .brand-side-card--left {
              animation: brandSideOutLeft 0.78s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-stage--next .brand-side-card--right {
              animation: brandSideInRight 0.78s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-stage--prev .brand-side-card--left {
              animation: brandSideInLeft 0.78s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-stage--prev .brand-side-card--right {
              animation: brandSideOutRight 0.78s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-side-logo {
              width: 30px;
              height: 30px;
              object-fit: contain;
              margin-bottom: 0;
              filter: saturate(0.95);
            }
            .brand-side-bg {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              transform: scale(1.06);
              filter: grayscale(0.25) brightness(0.46) contrast(0.94) blur(1.4px);
              pointer-events: none;
            }
            .brand-side-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(2, 6, 23, 0.35) 0%, rgba(2, 6, 23, 0.82) 100%);
              pointer-events: none;
            }
            .brand-side-meta {
              position: relative;
              z-index: 2;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(2, 6, 23, 0.78);
              border: 1px solid transparent;
              border-radius: 999px;
              padding: 6px 10px;
              backdrop-filter: blur(1px);
            }
            .brand-side-name {
              font-size: 12px;
              font-weight: 700;
              text-align: center;
              color: #e2e8f0;
              white-space: nowrap;
            }
            .brand-main-card {
              border: none;
              border-radius: 14px;
              background: #0b1220;
              overflow: hidden;
              position: relative;
              color: #fff;
              text-decoration: none;
              cursor: pointer;
              transform: translateY(-2px) scale(1.015);
              box-shadow: 0 18px 36px rgba(15, 118, 110, 0.26);
              transition: transform 0.35s ease, box-shadow 0.35s ease;
              transform-style: preserve-3d;
              backface-visibility: hidden;
              will-change: transform, opacity, filter;
            }
            .brand-main-card--next {
              animation: brandCardFlipInNext 0.86s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-main-card--prev {
              animation: brandCardFlipInPrev 0.86s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-main-card:hover {
              transform: translateY(-4px) scale(1.02);
              box-shadow: 0 20px 40px rgba(15, 118, 110, 0.32);
              text-decoration: none;
            }
            .brand-main-card:focus,
            .brand-main-card:focus-visible,
            .brand-nav:focus,
            .brand-nav:focus-visible {
              outline: none;
            }
            .brand-main-image-wrap {
              height: 150px;
              overflow: hidden;
              transition: height 0.42s cubic-bezier(0.22, 0.78, 0.14, 1);
            }
            .brand-main-image-wrap--next {
              animation: brandImageParallaxNext 0.9s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-main-image-wrap--prev {
              animation: brandImageParallaxPrev 0.9s cubic-bezier(0.16, 0.78, 0.18, 1);
            }
            .brand-showcase.is-open .brand-main-image-wrap {
              height: 300px;
            }
            .brand-main-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transform: scale(1.01);
              will-change: transform, filter;
            }
            .brand-main-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(2,6,23,0.15) 0%, rgba(2,6,23,0.78) 100%);
              pointer-events: none;
            }
            .brand-main-meta {
              position: absolute;
              bottom: 16px;
              left: 16px;
              right: 16px;
              z-index: 2;
              display: flex;
              align-items: center;
              gap: 10px;
              animation: brandMetaRise 0.62s cubic-bezier(0.22, 0.78, 0.14, 1);
            }
            .brand-main-logo {
              width: 44px;
              height: 44px;
              object-fit: contain;
              border-radius: 10px;
              background: rgba(2,6,23,0.82);
              border: none;
              padding: 6px;
              flex-shrink: 0;
            }
            .brand-main-name {
              color: #f8fafc;
              font-size: 28px;
              line-height: 1.1;
              font-weight: 800;
              letter-spacing: 0.01em;
              font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
              text-shadow: 0 4px 16px rgba(2, 6, 23, 0.6);
            }
            .brand-main-name-badge {
              display: inline-flex;
              align-items: center;
              min-height: 42px;
              padding: 8px 14px;
              border-radius: 12px;
              background: rgba(2, 6, 23, 0.64);
              border: 1px solid transparent;
              backdrop-filter: blur(2px);
            }
            .brand-nav {
              position: absolute;
              top: 50%;
              transform: translateY(-50%);
              width: 52px;
              height: 52px;
              border-radius: 999px;
              border: 1.5px solid rgba(255, 255, 255, 0.86);
              background: rgba(2, 6, 23, 0.78);
              color: #ffffff;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              z-index: 5;
              transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
            }
            .brand-nav:hover {
              background: rgba(15, 118, 110, 0.62);
              border-color: #ffffff;
              transform: translateY(-50%) scale(1.04);
            }
            .brand-nav--left { left: 12px; }
            .brand-nav--right { right: 12px; }
            .brand-showcase-hint {
              margin-top: 10px;
              text-align: center;
              color: #0f766e;
              font-size: 12px;
              letter-spacing: 0.03em;
            }
            @keyframes brandCardFlipInNext {
              0% {
                opacity: 1;
                transform: translateY(10px) translateX(190px) translateZ(-90px) rotateY(-14deg) scale(0.92);
                filter: blur(2.8px) saturate(0.88) brightness(0.86);
              }
              62% {
                opacity: 1;
                transform: translateY(-4px) translateX(-18px) translateZ(16px) rotateY(4deg) scale(1.03);
                filter: blur(0.25px) saturate(1.04) brightness(1);
              }
              100% {
                opacity: 1;
                transform: translateY(-2px) translateX(0) rotateY(0deg) scale(1.015);
                filter: blur(0) saturate(1) brightness(1);
              }
            }
            @keyframes brandCardFlipInPrev {
              0% {
                opacity: 1;
                transform: translateY(10px) translateX(-190px) translateZ(-90px) rotateY(14deg) scale(0.92);
                filter: blur(2.8px) saturate(0.88) brightness(0.86);
              }
              62% {
                opacity: 1;
                transform: translateY(-4px) translateX(18px) translateZ(16px) rotateY(-4deg) scale(1.03);
                filter: blur(0.25px) saturate(1.04) brightness(1);
              }
              100% {
                opacity: 1;
                transform: translateY(-2px) translateX(0) rotateY(0deg) scale(1.015);
                filter: blur(0) saturate(1) brightness(1);
              }
            }
            @keyframes brandImageParallaxNext {
              0% { transform: scale(1.22) translateX(170px); filter: brightness(0.82) blur(1.6px); }
              100% { transform: scale(1.01) translateX(0); filter: brightness(1) blur(0); }
            }
            @keyframes brandImageParallaxPrev {
              0% { transform: scale(1.22) translateX(-170px); filter: brightness(0.82) blur(1.6px); }
              100% { transform: scale(1.01) translateX(0); filter: brightness(1) blur(0); }
            }
            @keyframes brandMetaRise {
              0% { opacity: 0; transform: translateY(14px) scale(0.98); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes brandShelfDriftNext {
              0% { transform: translateX(96px) translateZ(-20px) scale(0.975); opacity: 1; }
              68% { transform: translateX(-10px) translateZ(0) scale(1.008); opacity: 1; }
              100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes brandShelfDriftPrev {
              0% { transform: translateX(-96px) translateZ(-20px) scale(0.975); opacity: 1; }
              68% { transform: translateX(10px) translateZ(0) scale(1.008); opacity: 1; }
              100% { transform: translateX(0); opacity: 1; }
            }
            @keyframes brandSideOutLeft {
              0% { opacity: 0.72; transform: translateX(74px) scale(0.9); }
              100% { opacity: 0.86; transform: translateX(0) scale(1); }
            }
            @keyframes brandSideInRight {
              0% { opacity: 0.72; transform: translateX(124px) scale(0.9); }
              100% { opacity: 0.86; transform: translateX(0) scale(1); }
            }
            @keyframes brandSideInLeft {
              0% { opacity: 0.72; transform: translateX(-124px) scale(0.9); }
              100% { opacity: 0.86; transform: translateX(0) scale(1); }
            }
            @keyframes brandSideOutRight {
              0% { opacity: 0.72; transform: translateX(-74px) scale(0.9); }
              100% { opacity: 0.86; transform: translateX(0) scale(1); }
            }

            @media (min-width: 1024px) and (max-width: 1200px) {
              .latest-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              .brand-main-image-wrap { height: 140px; }
              .brand-showcase.is-open .brand-main-image-wrap { height: 260px; }
            }
            @media (min-width: 768px) and (max-width: 1023px) {
              .latest-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .brand-stage { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr); }
              .brand-main-name { font-size: 22px; }
              .brand-main-image-wrap { height: 130px; }
              .brand-showcase.is-open .brand-main-image-wrap { height: 220px; }
            }
            @media (max-width: 767px) {
              .latest-grid { grid-template-columns: 1fr !important; gap: 14px !important; padding-top: 10px !important; }
              .brand-showcase { padding: 10px; }
              .brand-stage { grid-template-columns: 1fr; gap: 8px; }
              .brand-side-card { display: none; }
              .brand-main-image-wrap { height: 140px; }
              .brand-showcase.is-open .brand-main-image-wrap { height: 210px; }
              .brand-main-name { font-size: 18px; }
              .brand-nav { width: 42px; height: 42px; top: 34%; }
              .brand-nav--left { left: 8px; }
              .brand-nav--right { right: 8px; }
            }
          `}</style>

          <div style={{ ...styles.latestContainer, overflow: "visible", position: "relative", zIndex: 1 }}>
            <div style={{ ...styles.sectionHeader, ...styles.containerHeader, marginBottom: 0 }}>
              <h2 style={styles.h2}>Последни обяви</h2>
              <p style={styles.sectionLead}>
                Най-новите публикувани обяви на пазара
              </p>
            </div>

            {listingsLoading ? (
              <div style={{ textAlign: "center", padding: 40, background: "#f8fafc", borderRadius: 10, border: "1px solid #eef2f7" }}>
                <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>Зареждане на обяви...</p>
              </div>
            ) : latestListings.length > 0 ? (
              <>
                <div className="latest-grid">
                {latestListings.map((listing, index) => {
                  const isTop = isTopListing(listing);
                  const isVip = isVipListing(listing);
                  const isNew = isListingNew(listing.created_at);
                  const isAboveFold = index < 4;
                  const listingMeta = getLatestListingMeta(listing);
                  const locationLabel = getListingLocationLabel(listing);
                  const listingImageUrl = listing.image_url ? getImageUrl(listing.image_url) : "";
                  const priceBadge = resolvePriceBadgeState(
                    listing.price_change
                      ? {
                          ...listing.price_change,
                          current_price: listing.price,
                          changed_at: listing.price_change.changed_at || listing.created_at,
                        }
                      : null
                  );
                  const showPriceChange = Boolean(priceBadge);
                  return (
                    <div
                      key={listing.id}
                      className="listing-card-hover"
                      style={{
                        borderRadius: 16,
                        overflow: "visible",
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/details/${listing.slug}`)}
                    >
                      {isTop && (
                        <ListingPromoBadge type="top" size="xs" />
                      )}
                      {isVip && (
                        <ListingPromoBadge type="vip" size="xs" />
                      )}
                      {/* Image */}
                      <div style={{ position: "relative", height: 178, background: "#e5e7eb", overflow: "visible", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                        <div className="listing-image-layer">
                          {listing.image_url ? (
                            <img
                              src={listingImageUrl}
                              alt={`${listing.brand} ${listing.model}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition: "center",
                                imageRendering: "auto",
                                display: "block",
                              }}
                              loading={isAboveFold ? "eager" : "lazy"}
                              decoding="async"
                              fetchPriority={isAboveFold ? "high" : "low"}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {listing.is_kaparirano && <KapariranoBadge size="xs" />}
                        {isNew && (
                          <div
                            className="listing-new-badge"
                            style={{ top: "auto", bottom: 10, left: 10 }}
                          >
                            Нова
                          </div>
                        )}
                        {showPriceChange && (
                          <div
                            style={{
                              position: "absolute",
                              right: 10,
                              top: 10,
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontWeight: 800,
                              fontSize: 12,
                              background:
                                priceBadge?.kind === "up"
                                  ? "#dcfce7"
                                  : priceBadge?.kind === "down"
                                    ? "#fee2e2"
                                    : "#e0f2fe",
                              color:
                                priceBadge?.kind === "up"
                                  ? "#16a34a"
                                  : priceBadge?.kind === "down"
                                    ? "#dc2626"
                                    : "#0369a1",
                              border:
                                priceBadge?.kind === "up"
                                  ? "1px solid #bbf7d0"
                                  : priceBadge?.kind === "down"
                                    ? "1px solid #fecaca"
                                    : "1px solid #bae6fd",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              zIndex: 9,
                            }}
                            title={priceBadge?.title}
                          >
                            <span style={{ fontSize: 13 }}>
                              {priceBadge?.kind === "up" ? "↑" : priceBadge?.kind === "down" ? "↓" : "•"}
                            </span>
                            {priceBadge?.kind === "announced"
                              ? "Обявена цена"
                              : `${priceBadge?.kind === "up" ? "+" : "-"}${priceBadge?.amountLabel}`}
                          </div>
                        )}
                        {/* Price overlay */}
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            bottom: 0,
                            padding: "4px 6px 3px 7px",
                            borderTop: "1px solid #e2e8f0",
                            borderLeft: "1px solid #e2e8f0",
                            borderTopLeftRadius: 12,
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            color: "#0f172a",
                            fontSize: 17,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
                            zIndex: 9,
                            lineHeight: 1,
                          }}
                        >
                          <span>{listing.price.toLocaleString("bg-BG")} €</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: "14px 15px 13px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", lineHeight: 1.3 }}>
                          {listing.brand} {listing.model}
                        </div>
                        {listingMeta.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, color: "#64748b" }}>
                            {listingMeta.map((metaValue, metaIndex) => (
                              <React.Fragment key={`${listing.id}-meta-${metaIndex}`}>
                                {metaIndex > 0 && <span style={{ color: "#d1d5db" }}>|</span>}
                                <span>{metaValue}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginTop: "auto" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {locationLabel}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#d97706" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {getRelativeTime(listing.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* View more button */}
                <div style={{ textAlign: "center", marginTop: 28 }}>
                <button
                  className="view-more-btn"
                  type="button"
                  onClick={() => navigate("/search")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "13px 32px",
                    background: "#0f766e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Разгледайте още обяви
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, background: "#f8fafc", borderRadius: 10, border: "1px solid #eef2f7" }}>
                <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>Няма налични обяви в момента</p>
              </div>
            )}
          </div>
        </section>

        <section
          id="popular-brands"
          ref={popularBrandsSectionRef}
          style={{ ...styles.section, ...styles.popularBrandsSection }}
        >
          <div style={styles.popularBrandsContainer}>
            <div style={{ ...styles.sectionHeader, ...styles.containerHeader, marginBottom: 12 }}>
              <h2 style={styles.h2}>Популярни марки</h2>
              <p style={styles.sectionLead}>
                Навигирай със стрелките и отвори избраната марка.
              </p>
            </div>

            <div
              className={`brand-showcase ${isBrandShowcaseOpen ? "is-open" : ""}`}
              onMouseEnter={() => setIsBrandShowcaseHovered(true)}
              onMouseLeave={() => setIsBrandShowcaseHovered(false)}
            >
              <button
                type="button"
                className="brand-nav brand-nav--left"
                aria-label="Предишна марка"
                onClick={goToPrevBrand}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div
                key={brandMotionKey}
                className={`brand-stage ${brandSlideDirection === "next" ? "brand-stage--next" : "brand-stage--prev"}`}
              >
                <div className="brand-side-card brand-side-card--left" aria-hidden="true">
                  <img src={getBrandHeroImage(leftBrand.name)} alt="" className="brand-side-bg" loading="eager" decoding="async" />
                  <div className="brand-side-overlay" />
                  <div className="brand-side-meta">
                    <img src={leftBrand.logoUrl} alt="" className="brand-side-logo" loading="lazy" decoding="async" />
                    <div className="brand-side-name">{leftBrand.name}</div>
                  </div>
                </div>

                <a
                  href={`/search?brand=${encodeURIComponent(activeBrand.name)}`}
                  className={`brand-main-card ${brandSlideDirection === "next" ? "brand-main-card--next" : "brand-main-card--prev"}`}
                  aria-label={activeBrand.name}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(`/search?brand=${encodeURIComponent(activeBrand.name)}`);
                  }}
                >
                  <div className={`brand-main-image-wrap ${brandSlideDirection === "next" ? "brand-main-image-wrap--next" : "brand-main-image-wrap--prev"}`}>
                    <img
                      src={getBrandHeroImage(activeBrand.name)}
                      alt={activeBrand.name}
                      className="brand-main-image"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                  </div>
                  <div className="brand-main-overlay" />
                  <div className="brand-main-meta">
                    <img src={activeBrand.logoUrl} alt="" className="brand-main-logo" loading="lazy" decoding="async" />
                    <div className="brand-main-name-badge">
                      <div className="brand-main-name">{activeBrand.name}</div>
                    </div>
                  </div>
                </a>

                <div className="brand-side-card brand-side-card--right" aria-hidden="true">
                  <img src={getBrandHeroImage(rightBrand.name)} alt="" className="brand-side-bg" loading="eager" decoding="async" />
                  <div className="brand-side-overlay" />
                  <div className="brand-side-meta">
                    <img src={rightBrand.logoUrl} alt="" className="brand-side-logo" loading="lazy" decoding="async" />
                    <div className="brand-side-name">{rightBrand.name}</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="brand-nav brand-nav--right"
                aria-label="Следваща марка"
                onClick={goToNextBrand}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" style={styles.section}>
          <div style={styles.infoContainer}>
            <div style={{ ...styles.sectionHeader, ...styles.containerHeader }}>
              <h2 style={styles.h2}>За Kar.bg</h2>
              <p style={styles.sectionLead}>
                Ясна платформа за купувачи и продавачи — бързо търсене, честни обяви и лесен контакт.
              </p>
            </div>

            <div style={styles.infoGrid} className="info-grid">
              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>Какво представлява</div>
                <p style={styles.infoText}>
                  Kar.bg е{" "}
                  <span style={styles.infoHighlight}>специализирана платформа</span> за покупко‑продажба на
                  автомобили с{" "}
                  <span style={styles.infoHighlight}>умно търсене</span>, ясни параметри и
                  <span style={styles.infoHighlight}> реални снимки</span>.
                </p>
                <p style={styles.infoText}>
                  Събираме оферти от частни лица и автокъщи на едно място, за да спестим време и да дадем
                  <span style={styles.infoHighlight}> прозрачност</span> във всеки избор.
                </p>
              </div>

              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>С какво сме по‑добри</div>
                <ul style={styles.infoList}>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Бързо търсене</span> по марка, модел, цена и регион.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Чист дизайн</span> — без излишен шум, само важното.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>По‑лесна комуникация</span> между купувач и продавач.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Свежи обяви</span> с приоритет на актуалните оферти.
                  </li>
                </ul>
              </div>

              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>Свържете се с нас</div>
                <p style={styles.infoText}>
                  Имате въпрос или нужда от съдействие? Пишете ни през{" "}
                  <span style={styles.infoHighlight}>контактната форма</span> или използвайте{" "}
                  <span style={styles.infoHighlight}>чат в сайта</span>.
                </p>
                <p style={{ ...styles.infoText, marginBottom: 0 }}>
                  Работим бързо и отговаряме в рамките на{" "}
                  <span style={styles.infoHighlight}>работния ден</span>.
                </p>
                <div style={styles.infoContactRow}>
                  <div style={styles.infoContactPill}>Поддръжка</div>
                  <div style={styles.infoContactText}>Пон‑Пет · 09:00–18:00</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <select style={selectBase} value={value} onChange={onChange}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options
          .filter((x) => x !== "")
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </select>
      <span style={styles.selectChevron}>▾</span>
    </div>
  );
}



/* ---------- Styles (inline, без Tailwind) ---------- */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    color: "#333",
    width: "100%",
    overflow: "hidden",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    width: "100%",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    letterSpacing: 0.5,
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
  },
  brandName: {
    fontSize: 19,
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  brandTag: { fontSize: 12, color: "#666", marginTop: 2 },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navLink: {
    color: "#333",
    textDecoration: "none",
    fontSize: 15,
    padding: "6px 12px",
    borderRadius: 4,
    fontWeight: 500,
  },

  main: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "20px 20px 60px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },

  hero: { position: "relative", padding: "0" },
  heroGlow: {
    display: "none",
  },
  heroInner: {
    position: "relative",
    display: "block",
  },
  heroLeft: {
    padding: "0",
    marginBottom: 24,
  },
  h1: {
    fontSize: 32,
    lineHeight: 1.2,
    margin: "0 0 12px",
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  lead: { margin: 0, color: "#666", fontSize: 15, lineHeight: 1.6, maxWidth: "100%" },

  searchCard: {
    borderRadius: 8,
    border: "1px solid #d0d0d0",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
    marginTop: 0,
  },
  searchHeader: {
    padding: "16px",
    borderBottom: "1px solid #e0e0e0",
    background: "#fafafa",
  },
  searchBlock: { marginBottom: 0 },
  mainCategoryWrap: {
    marginBottom: 0,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: 0,
    boxShadow: "none",
  },
  mainCategoryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  mainCategoryLabel: {
    fontSize: 14,
    color: "#000000",
    fontWeight: 600,
    marginLeft: 16,
  },
  mainCategoryHint: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: 500,
  },
  mainCategoryRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
    overflowX: "auto",
    overflowY: "hidden",
    paddingTop: "2rem",
    paddingBottom: "1rem",
    borderBottom: "3px solid rgb(15, 118, 110)",
  },
  mainCategoryButton: {
    position: "relative",
    borderWidth: 0,
    borderStyle: "none",
    borderColor: "transparent",
    background: "transparent",
    color: "#111827",
    borderRadius: 14,
    padding: "8px 8px 9px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.2,
    minHeight: 58,
    minWidth: 58,
    transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 0,
    textAlign: "center",
    width: "58px",
    flex: "0 0 auto",
    boxShadow: "none",
  },
  mainCategoryButtonActive: {
    background: "transparent",
    borderWidth: 0,
    borderStyle: "none",
    borderColor: "transparent",
    color: "#0f766e",
    boxShadow: "none",
    transform: "scale(1.20)",
  },
  mainCategoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // background: "#f1f5f9",
    color: "#475569",
    transition: "all 0.22s ease",
    flexShrink: 0,
  },
  mainCategoryText: {
    whiteSpace: "normal",
    lineHeight: 1.18,
  },
  searchTitle: {
    fontWeight: 700,
    fontSize: 17,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  searchSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  form: { padding: "16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 12,
  },
  label: { fontSize: 14, color: "#555", fontWeight: 600, marginBottom: 4 },
  selectChevron: {
    position: "absolute",
    right: 12,
    top: 12,
    color: "#666",
    pointerEvents: "none",
  },
  formBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,
  checkboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#333",
  },
  actions: { display: "flex", gap: 10, alignItems: "center" },

  primaryBtn: {
    height: 36,
    padding: "0 20px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  primaryBtnWide: {
    height: 42,
    padding: "0 24px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
  },
  secondaryBtn: {
    height: 42,
    padding: "0 20px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  clearFiltersBtn: {
    border: "1px solid #dc2626",
    background: "#dc2626",
    color: "#fff",
  },
  secondaryBtnSmall: {
    height: 34,
    padding: "0 16px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  },
  primaryBtnSmall: {
    height: 34,
    padding: "0 16px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },

  note: { marginTop: 12, fontSize: 13, color: "#999", fontStyle: "italic" },

  section: { padding: 0 },
  sectionHeader: { marginBottom: 16, marginTop: "3rem" },
  latestSection: { marginBottom: 0 },
  latestContainer: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  popularBrandsSection: { marginBottom: 0 },
  popularBrandsContainer: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  containerHeader: { marginTop: 0, borderBottom: "3px solid #0f766e"},
  h2: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  sectionLead: { margin: "6px 0 0", color: "#666", fontSize: 15, lineHeight: 1.6 },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #e0e0e0",
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    minHeight: 320,
    transition: "box-shadow 0.2s",
  },
  cardMedia: { position: "relative", height: 160, background: "#f0f0f0" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  pricePill: {
    position: "absolute",
    right: 12,
    bottom: 12,
    padding: "6px 12px",
    borderRadius: 4,
    fontWeight: 800,
    fontSize: 14,
    background: "#0f766e",
    color: "#fff",
    border: "1px solid #e0e0e0",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
  },
  cardBody: { padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  cardTitleRow: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 },
  cardTitle: {
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1.3,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  cityPill: {
    fontSize: 13,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #e0e0e0",
    background: "#f5f5f5",
    color: "#666",
    whiteSpace: "nowrap",
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8, color: "#666", fontSize: 14, lineHeight: 1.5 },
  meta: { whiteSpace: "nowrap" },
  tagsRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  tag: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #99f6e4",
    background: "#ecfdf5",
    color: "#0f766e",
  },
  cardActions: { display: "flex", justifyContent: "space-between", gap: 10, marginTop: "auto" },

  empty: {
    gridColumn: "1 / -1",
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    padding: 30,
    textAlign: "center",
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: 19,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  emptyText: { color: "#666", margin: "8px 0 16px", fontSize: 15 },

  infoContainer: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 16,
  },
  infoCard: {
    borderRadius: 8,
    border: "1px solid #e3e7ee",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    padding: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 200,
    transition: "box-shadow 0.2s, transform 0.2s",
  },
  infoTitle: {
    fontWeight: 700,
    fontSize: 18,
    color: "#1f2937",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  infoText: { margin: 0, color: "#4b5563", fontSize: 15, lineHeight: 1.7 },
  infoHighlight: { color: "#0f766e", fontWeight: 700 },
  infoList: { margin: 0, paddingLeft: 18, color: "#4b5563", fontSize: 15, lineHeight: 1.7 },
  infoListItem: { marginBottom: 6 },
  infoContactRow: { marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  infoContactPill: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#0f766e",
    border: "1px solid #99f6e4",
    fontWeight: 600,
  },
  infoContactText: { fontSize: 14, color: "#4b5563" },

  cta: {
    marginTop: 30,
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  ctaInner: {
    padding: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  h3: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  ctaText: { margin: "6px 0 0", color: "#666", fontSize: 15, lineHeight: 1.6, maxWidth: 600 },

  footer: {
    marginTop: 50,
    borderTop: "1px solid #e0e0e0",
    background: "#fff",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 30,
  } as React.CSSProperties & { className?: string },
  footerCol: { display: "flex", flexDirection: "column", gap: 10 },
  footerBrand: {
    fontWeight: 700,
    fontSize: 17,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerText: { color: "#666", fontSize: 14, lineHeight: 1.7, maxWidth: 400 },
  footerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: 14,
    padding: "4px 0",
  },
  footerBottom: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 20px",
    color: "#999",
    fontSize: 12,
    borderTop: "1px solid #f0f0f0",
  },
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body {  width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; }
  #root { width: 100%; }
  a:hover { text-decoration: underline; }
  input::placeholder { color: #999; }
  input, select, button { font-family: inherit; }
  input:focus, select:focus { border-color: #0f766e; outline: none; }
  button:hover { opacity: 0.9; }
  button:active { opacity: 0.8; }
  select option { color: #333; background: #fff; }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }
  .info-card:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.12) !important;
    transform: translateY(-2px);
  }
  [role="button"]:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }

  /* Desktop (1200px+) */
  @media (min-width: 1201px) {
    body { font-size: 16px; }
    .category-grid { grid-template-columns: repeat(5, minmax(0,1fr)) !important; }
    .search-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  }

  /* Tablet Large (1024px - 1200px) */
  @media (min-width: 1024px) and (max-width: 1200px) {
    body { font-size: 15px; }
    .category-grid { grid-template-columns: repeat(5, minmax(0,1fr)) !important; }
    .search-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  }

  /* Tablet (768px - 1023px) */
  @media (min-width: 768px) and (max-width: 1023px) {
    body { font-size: 15px; }
    .category-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .search-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Large (640px - 767px) */
  @media (min-width: 640px) and (max-width: 767px) {
    body { font-size: 14px; }
    .category-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .info-grid { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Small (< 640px) */
  @media (max-width: 639px) {
    body { font-size: 14px; }
    .category-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .info-grid { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
    .form-bottom {
      flex-direction: column;
      align-items: stretch !important;
    }
    .form-actions {
      width: 100%;
      flex-direction: column;
    }
    .form-actions button {
      width: 100%;
    }
    .cta-inner {
      flex-direction: column;
      align-items: stretch !important;
    }
    .cta-buttons {
      flex-direction: column;
      width: 100%;
    }
    .cta-buttons button {
      width: 100%;
    }
  }
`;



