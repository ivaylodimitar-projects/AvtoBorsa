import {
  CLASSIFIED_FOR_OPTIONS,
  getMainCategoryLabel,
  getTopmenuFromMainCategory,
  getWheelOfferTypeOptions,
  normalizeMainCategory,
} from "../constants/karbgdata";

export type ListingTitleInput = {
  title?: string | null;
  display_title?: string | null;
  brand?: string | null;
  model?: string | null;
  main_category?: string | null;
  year_from?: number | string | null;
  category?: string | null;
  wheel_for?: string | null;
  offer_type?: string | null;
  tire_brand?: string | null;
  wheel_brand?: string | null;
  part_for?: string | null;
  part_category?: string | null;
  part_element?: string | null;
  classified_for?: string | null;
  accessory_category?: string | null;
  buy_service_category?: string | null;
};

const TITLE_WITH_YEAR_MAIN_CATEGORIES = new Set([
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

const GENERIC_TITLE_PLACEHOLDERS = new Set([
  "автомобил",
  "автомобил модел",
  "автомобил марка модел",
  "марка",
  "марка модел",
  "модел",
  "обява",
]);

const trimToValue = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const normalizeForCompare = (value: string): string =>
  value
    .toLocaleLowerCase("bg-BG")
    .replace(/[^0-9a-zа-я]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");

const stripYearTokens = (value: string): string =>
  value
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/(^|\s)г\.?(?=\s|$)/gi, " ")
    .trim();

const joinTitleParts = (...parts: Array<string | null | undefined>): string =>
  parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");

const resolveMainCategory = (value?: string | null): string =>
  normalizeMainCategory(value) || trimToValue(value).toLocaleLowerCase("bg-BG");

const getClassifiedForLabel = (value?: string | null): string => {
  const normalized = trimToValue(value);
  if (!normalized) return "";
  return CLASSIFIED_FOR_OPTIONS.find((option) => option.value === normalized)?.label || normalized;
};

const getWheelOfferTypeLabel = (wheelFor?: string | null, offerType?: string | null): string => {
  const normalizedOfferType = trimToValue(offerType);
  if (!normalizedOfferType) return "";

  const topmenu = trimToValue(wheelFor);
  const options = getWheelOfferTypeOptions(topmenu);
  const match = options.find(
    (option) => option.value === normalizedOfferType || option.label === normalizedOfferType
  );
  return match?.label || normalizedOfferType;
};

const buildStructuredListingTitle = (listing: ListingTitleInput): string => {
  const mainCategory = resolveMainCategory(listing.main_category);

  switch (mainCategory) {
    case "wheels": {
      const wheelForLabel = getClassifiedForLabel(listing.wheel_for);
      const offerLabel =
        getWheelOfferTypeLabel(listing.wheel_for, listing.offer_type) || "Гуми/джанти";
      const brandLabel = trimToValue(listing.wheel_brand) || trimToValue(listing.tire_brand);
      const mainPart = joinTitleParts(offerLabel, brandLabel);
      return joinTitleParts(mainPart, wheelForLabel ? `за ${wheelForLabel}` : "");
    }
    case "parts": {
      const partForLabel = getClassifiedForLabel(
        listing.part_for || getTopmenuFromMainCategory(mainCategory)
      );
      const partCategory = trimToValue(listing.part_category);
      const partElement = trimToValue(listing.part_element);
      const partBase = partElement || partCategory || "Авточаст";
      const partCategoryTag = partElement && partCategory ? `(${partCategory})` : "";
      return joinTitleParts(partBase, partCategoryTag, partForLabel ? `за ${partForLabel}` : "");
    }
    case "accessories": {
      const accessoryForLabel = getClassifiedForLabel(listing.classified_for);
      const accessoryCategory = trimToValue(listing.accessory_category) || "Аксесоари";
      return joinTitleParts(
        accessoryCategory,
        accessoryForLabel ? `за ${accessoryForLabel}` : ""
      );
    }
    case "buy":
    case "services": {
      const serviceAction = mainCategory === "buy" ? "Купува" : "Услуга";
      const serviceForLabel = getClassifiedForLabel(listing.classified_for);
      const serviceCategory = trimToValue(listing.buy_service_category) || trimToValue(listing.category);
      return joinTitleParts(serviceAction, serviceCategory, serviceForLabel ? `за ${serviceForLabel}` : "");
    }
    default: {
      const baseTitle = joinTitleParts(trimToValue(listing.brand), trimToValue(listing.model));
      if (baseTitle) {
        return baseTitle;
      }

      const categoryLabel = trimToValue(listing.category);
      if (categoryLabel) {
        return categoryLabel;
      }

      return "";
    }
  }
};

const isPlaceholderListingTitle = (title: string, mainCategory: string): boolean => {
  if (/^обява\s*#/i.test(title.trim())) {
    return true;
  }

  const normalizedTitle = normalizeForCompare(title);
  if (!normalizedTitle) {
    return true;
  }

  const normalizedWithoutYears = normalizeForCompare(stripYearTokens(title));
  if (
    GENERIC_TITLE_PLACEHOLDERS.has(normalizedTitle) ||
    GENERIC_TITLE_PLACEHOLDERS.has(normalizedWithoutYears)
  ) {
    return true;
  }

  const mainCategoryLabel = getMainCategoryLabel(mainCategory);
  const normalizedCategoryTitle = normalizeForCompare(mainCategoryLabel);
  const genericCategoryTitle = normalizeForCompare(`${mainCategoryLabel} обява`);
  if (!normalizedCategoryTitle && !genericCategoryTitle) {
    return false;
  }

  return (
    normalizedTitle === normalizedCategoryTitle ||
    normalizedWithoutYears === normalizedCategoryTitle ||
    normalizedTitle === genericCategoryTitle ||
    normalizedWithoutYears === genericCategoryTitle
  );
};

export const resolveListingBaseTitle = (listing: ListingTitleInput): string => {
  const mainCategory = resolveMainCategory(listing.main_category);
  const displayTitle = trimToValue(listing.display_title);
  const rawTitle = trimToValue(listing.title);
  const structuredTitle = buildStructuredListingTitle(listing);

  if (displayTitle && !isPlaceholderListingTitle(displayTitle, mainCategory)) {
    return displayTitle;
  }

  if (rawTitle && !isPlaceholderListingTitle(rawTitle, mainCategory)) {
    return rawTitle;
  }

  if (structuredTitle) {
    return structuredTitle;
  }

  return getMainCategoryLabel(mainCategory) || "Обява";
};

type ResolveListingDisplayTitleOptions = {
  includeYear?: boolean;
};

const toYearNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const resolveListingDisplayTitle = (
  listing: ListingTitleInput,
  options: ResolveListingDisplayTitleOptions = {}
): string => {
  const { includeYear = true } = options;
  const baseTitle = resolveListingBaseTitle(listing);
  const mainCategory = resolveMainCategory(listing.main_category);
  const year = toYearNumber(listing.year_from);

  if (!includeYear || !year || !TITLE_WITH_YEAR_MAIN_CATEGORIES.has(mainCategory)) {
    return baseTitle;
  }

  const yearRegex = new RegExp(`\\b${year}\\b`);
  if (yearRegex.test(baseTitle)) {
    return baseTitle;
  }

  return `${year} ${baseTitle}`.trim();
};

export const resolveListingCategoryLabel = (mainCategory?: string | null): string =>
  getMainCategoryLabel(resolveMainCategory(mainCategory)) || "Обяви";
