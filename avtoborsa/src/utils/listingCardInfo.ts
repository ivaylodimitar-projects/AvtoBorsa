import {
  CLASSIFIED_FOR_OPTIONS,
  getMainCategoryLabel,
  getWheelOfferTypeOptions,
  normalizeMainCategory,
} from "../constants/karbgdata";
import {
  formatConditionLabel,
  formatEngineTypeLabel,
  formatFuelLabel,
  formatGearboxLabel,
  formatTireSeasonLabel,
  formatTransmissionLabel,
} from "./listingLabels";
import { resolveListingDisplayTitle } from "./listingTitle";

export type ListingCardInfoInput = {
  title?: string | null;
  display_title?: string | null;
  main_category?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  year_from?: number | string | null;
  mileage?: number | string | null;
  fuel?: string | null;
  fuel_display?: string | null;
  gearbox?: string | null;
  gearbox_display?: string | null;
  power?: number | string | null;
  displacement?: number | string | null;
  displacement_cc?: number | string | null;
  color?: string | null;
  condition?: string | null;
  wheel_for?: string | null;
  offer_type?: string | null;
  tire_brand?: string | null;
  tire_width?: string | null;
  tire_height?: string | null;
  tire_diameter?: string | null;
  tire_season?: string | null;
  wheel_brand?: string | null;
  material?: string | null;
  count?: number | string | null;
  part_for?: string | null;
  part_category?: string | null;
  part_element?: string | null;
  part_year_from?: number | string | null;
  part_year_to?: number | string | null;
  axles?: number | string | null;
  seats?: number | string | null;
  load_kg?: number | string | null;
  transmission?: string | null;
  engine_type?: string | null;
  equipment_type?: string | null;
  lift_capacity_kg?: number | string | null;
  hours?: number | string | null;
  beds?: number | string | null;
  length_m?: number | string | null;
  has_toilet?: boolean | string | null;
  has_heating?: boolean | string | null;
  has_air_conditioning?: boolean | string | null;
  boat_category?: string | null;
  engine_count?: number | string | null;
  width_m?: number | string | null;
  draft_m?: number | string | null;
  trailer_category?: string | null;
  classified_for?: string | null;
  accessory_category?: string | null;
  buy_service_category?: string | null;
};

const text = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return "";
};

const positiveNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

const formatInteger = (value: unknown, unit = ""): string => {
  const numeric = positiveNumber(value);
  if (numeric === null) return "";
  const rendered = Math.round(numeric).toLocaleString("bg-BG");
  return unit ? `${rendered} ${unit}` : rendered;
};

const formatDecimal = (value: unknown, unit = ""): string => {
  const numeric = positiveNumber(value);
  if (numeric === null) return "";
  const rendered = Number.isInteger(numeric)
    ? numeric.toLocaleString("bg-BG")
    : numeric.toLocaleString("bg-BG", { maximumFractionDigits: 2 });
  return unit ? `${rendered} ${unit}` : rendered;
};

const formatYear = (value: unknown): string => {
  const year = positiveNumber(value);
  if (year === null) return "";
  return `${Math.round(year)} г.`;
};

const formatYearRange = (from: unknown, to: unknown): string => {
  const fromYear = positiveNumber(from);
  const toYear = positiveNumber(to);
  if (fromYear && toYear) {
    return `${Math.round(fromYear)}-${Math.round(toYear)}`;
  }
  return formatYear(fromYear ?? toYear).replace(/\sг\.$/, "");
};

const formatTireSize = (listing: ListingCardInfoInput): string => {
  const width = text(listing.tire_width);
  const height = text(listing.tire_height);
  const diameter = text(listing.tire_diameter);
  if (width && height && diameter) {
    return `${width}/${height} R${diameter}`;
  }
  if (diameter) {
    return `R${diameter}`;
  }
  return "";
};

const isTruthy = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on", "да"].includes(value.trim().toLowerCase());
};

const getClassifiedForLabel = (value?: string | null): string => {
  const normalized = text(value);
  if (!normalized) return "";
  return CLASSIFIED_FOR_OPTIONS.find(
    (option) => option.value === normalized || option.label === normalized
  )?.label || getMainCategoryLabel(normalized) || normalized;
};

const getWheelOfferTypeLabel = (wheelFor?: string | null, offerType?: string | null): string => {
  const normalizedOfferType = text(offerType);
  if (!normalizedOfferType) return "";

  const options = getWheelOfferTypeOptions(text(wheelFor));
  const match = options.find(
    (option) =>
      option.value === normalizedOfferType || option.label === normalizedOfferType
  );
  return match?.label || normalizedOfferType;
};

const addUnique = (items: string[], value: string) => {
  const normalized = value.trim();
  if (!normalized) return;
  if (items.includes(normalized)) return;
  items.push(normalized);
};

const getGenericFallbackMeta = (listing: ListingCardInfoInput, items: string[], maxItems: number) => {
  if (items.length >= maxItems) return;
  addUnique(items, formatYear(listing.year_from));
  if (items.length >= maxItems) return;
  addUnique(items, formatConditionLabel(text(listing.condition)));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.color));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.buy_service_category));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.accessory_category));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.equipment_type));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.boat_category));
  if (items.length >= maxItems) return;
  addUnique(items, text(listing.trailer_category));
  if (items.length >= maxItems) return;
  addUnique(
    items,
    getMainCategoryLabel(normalizeMainCategory(listing.main_category)) || "Обява"
  );
};

export const getListingCardTitle = (listing: ListingCardInfoInput): string => {
  const displayTitle = text(listing.display_title);
  if (displayTitle && !/^Обява\s*#/i.test(displayTitle)) {
    return displayTitle;
  }

  const resolvedTitle = text(
    resolveListingDisplayTitle(listing, { includeYear: false })
  );
  if (resolvedTitle && !/^Обява\s*#/i.test(resolvedTitle)) {
    return resolvedTitle;
  }

  return (
    getMainCategoryLabel(normalizeMainCategory(listing.main_category)) || "Обява"
  );
};

export const getListingCardMeta = (
  listing: ListingCardInfoInput,
  maxItems = 4
): string[] => {
  const items: string[] = [];
  const mainCategory = normalizeMainCategory(listing.main_category);
  const conditionLabel = formatConditionLabel(text(listing.condition));

  switch (mainCategory) {
    case "parts":
      addUnique(items, text(listing.part_element) || text(listing.part_category));
      addUnique(items, getClassifiedForLabel(listing.part_for) ? `За ${getClassifiedForLabel(listing.part_for)}` : "");
      addUnique(items, formatYearRange(listing.part_year_from, listing.part_year_to));
      addUnique(items, conditionLabel);
      break;
    case "wheels":
      addUnique(items, getWheelOfferTypeLabel(listing.wheel_for, listing.offer_type));
      addUnique(items, getClassifiedForLabel(listing.wheel_for) ? `За ${getClassifiedForLabel(listing.wheel_for)}` : "");
      addUnique(items, formatTireSize(listing));
      addUnique(items, text(listing.tire_brand) || text(listing.wheel_brand));
      addUnique(items, formatTireSeasonLabel(text(listing.tire_season)));
      addUnique(items, text(listing.material));
      addUnique(items, positiveNumber(listing.count) ? `${formatInteger(listing.count)} бр.` : "");
      break;
    case "accessories":
      addUnique(items, text(listing.accessory_category));
      addUnique(items, getClassifiedForLabel(listing.classified_for) ? `За ${getClassifiedForLabel(listing.classified_for)}` : "");
      addUnique(items, conditionLabel);
      addUnique(items, text(listing.color));
      break;
    case "buy":
    case "services":
      addUnique(items, text(listing.buy_service_category) || text(listing.category));
      addUnique(items, getClassifiedForLabel(listing.classified_for) ? `За ${getClassifiedForLabel(listing.classified_for)}` : "");
      break;
    case "buses":
    case "trucks":
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatInteger(listing.mileage, "км"));
      addUnique(items, positiveNumber(listing.load_kg) ? `${formatInteger(listing.load_kg, "кг")}` : "");
      addUnique(items, positiveNumber(listing.axles) ? `${formatInteger(listing.axles)} оси` : "");
      addUnique(items, positiveNumber(listing.seats) ? `${formatInteger(listing.seats)} места` : "");
      addUnique(items, formatEngineTypeLabel(text(listing.engine_type)));
      addUnique(items, formatTransmissionLabel(text(listing.transmission)));
      addUnique(items, formatInteger(listing.power, "к.с."));
      break;
    case "motorcycles":
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatInteger(listing.displacement_cc ?? listing.displacement, "cc"));
      addUnique(items, formatEngineTypeLabel(text(listing.engine_type)));
      addUnique(items, formatTransmissionLabel(text(listing.transmission)));
      addUnique(items, formatInteger(listing.power, "к.с."));
      break;
    case "agriculture":
    case "industrial":
      addUnique(items, text(listing.equipment_type));
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatEngineTypeLabel(text(listing.engine_type)));
      addUnique(items, formatInteger(listing.power, "к.с."));
      addUnique(items, formatInteger(listing.hours, "ч"));
      addUnique(items, conditionLabel);
      break;
    case "forklifts":
      addUnique(items, text(listing.equipment_type));
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatInteger(listing.lift_capacity_kg, "кг"));
      addUnique(items, formatInteger(listing.hours, "ч"));
      addUnique(items, formatEngineTypeLabel(text(listing.engine_type)));
      addUnique(items, formatInteger(listing.power, "к.с."));
      break;
    case "rvs":
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, positiveNumber(listing.beds) ? `${formatInteger(listing.beds)} легла` : "");
      addUnique(items, formatDecimal(listing.length_m, "м"));
      addUnique(items, isTruthy(listing.has_toilet) ? "Тоалетна" : "");
      addUnique(items, isTruthy(listing.has_heating) ? "Отопление" : "");
      addUnique(items, isTruthy(listing.has_air_conditioning) ? "Климатик" : "");
      addUnique(items, conditionLabel);
      break;
    case "yachts":
      addUnique(items, text(listing.boat_category));
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatEngineTypeLabel(text(listing.engine_type)));
      addUnique(items, positiveNumber(listing.engine_count) ? `${formatInteger(listing.engine_count)} двиг.` : "");
      addUnique(items, formatDecimal(listing.length_m, "м"));
      addUnique(items, formatDecimal(listing.width_m, "м"));
      addUnique(items, formatDecimal(listing.draft_m, "м"));
      addUnique(items, formatInteger(listing.hours, "ч"));
      break;
    case "trailer":
      addUnique(items, text(listing.trailer_category));
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatInteger(listing.load_kg, "кг"));
      addUnique(items, positiveNumber(listing.axles) ? `${formatInteger(listing.axles)} оси` : "");
      addUnique(items, conditionLabel);
      break;
    default:
      addUnique(items, formatYear(listing.year_from));
      addUnique(items, formatInteger(listing.mileage, "км"));
      addUnique(items, formatFuelLabel(text(listing.fuel_display || listing.fuel)));
      addUnique(items, formatInteger(listing.power, "к.с."));
      addUnique(items, formatGearboxLabel(text(listing.gearbox_display || listing.gearbox)));
      addUnique(items, formatInteger(listing.displacement, "cc"));
      break;
  }

  getGenericFallbackMeta(listing, items, maxItems);
  return items.slice(0, Math.max(1, maxItems));
};
