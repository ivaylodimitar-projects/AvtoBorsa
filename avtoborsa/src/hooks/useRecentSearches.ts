import { useEffect, useMemo, useState } from "react";
import { getMainCategoryLabel } from "../constants/karbgdata";
import { useAuth } from "../context/AuthContext";
import {
  formatConditionLabel,
  formatEngineTypeLabel,
  formatFuelLabel,
  formatGearboxLabel,
  formatTransmissionLabel,
} from "../utils/listingLabels";

export interface RecentSearch {
  id: string;
  criteria: Record<string, any>;
  timestamp: number;
  displayLabel: string;
}

const STORAGE_KEY_PREFIX = "recent_searches_user_";
const GUEST_STORAGE_KEY = "recent_searches_guest";
const MAX_SEARCHES = 5;

const getRecentSearchesStorageKey = (userId?: number | null) => {
  if (!userId) {
    return GUEST_STORAGE_KEY;
  }
  return `${STORAGE_KEY_PREFIX}${userId}`;
};

const hasBrokenEncoding = (value: string) => /Ð|Ñ|â€|â€¢|â€“|âˆž/.test(value);

const repairBrokenEncoding = (value: string) => {
  if (!value || !hasBrokenEncoding(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded || value;
  } catch {
    return value;
  }
};

const toDisplayText = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }
  return repairBrokenEncoding(String(value).trim());
};

const formatNumericValue = (value: unknown) => {
  const textValue = toDisplayText(value);
  if (!textValue) return "";
  const numeric = Number(textValue);
  if (!Number.isFinite(numeric)) return textValue;
  return numeric.toLocaleString("bg-BG");
};

const formatRange = (
  from: unknown,
  to: unknown,
  suffix = "",
  options?: { allowZeroAsDefault?: boolean }
) => {
  const fromText = toDisplayText(from);
  const toText = toDisplayText(to);
  if (!fromText && !toText) return "";

  const resolvedFrom = fromText || (options?.allowZeroAsDefault ? "0" : "");
  const resolvedTo = toText || "∞";

  if (!resolvedFrom) {
    return `до ${formatNumericValue(resolvedTo)}${suffix}`;
  }
  if (!toText) {
    return `от ${formatNumericValue(resolvedFrom)}${suffix}`;
  }

  return `${formatNumericValue(resolvedFrom)}-${formatNumericValue(resolvedTo)}${suffix}`;
};

const pushPart = (parts: string[], value: unknown) => {
  const text = toDisplayText(value);
  if (!text) return;
  if (parts.includes(text)) return;
  parts.push(text);
};

const generateSearchLabel = (criteria: Record<string, any>): string => {
  const parts: string[] = [];
  const mainCategoryCode = toDisplayText(criteria.mainCategory || criteria.main_category);
  const mainCategoryLabel = getMainCategoryLabel(mainCategoryCode);

  pushPart(parts, mainCategoryLabel);

  if (criteria.equipmentType) {
    pushPart(parts, `Вид: ${criteria.equipmentType}`);
  }

  const brand = toDisplayText(criteria.brand || criteria.marka);
  const model = toDisplayText(criteria.model);
  if (brand) {
    pushPart(parts, brand);
  }
  if (model) {
    pushPart(parts, model);
  }

  pushPart(parts, criteria.category);
  pushPart(parts, criteria.motoCategory);
  pushPart(parts, criteria.partCategory);
  pushPart(parts, criteria.partElement);
  pushPart(parts, criteria.accessoryCategory);
  pushPart(parts, criteria.buyServiceCategory);

  const yearRange = formatRange(criteria.yearFrom, criteria.yearTo, " г.");
  pushPart(parts, yearRange);

  const currency = toDisplayText(criteria.currency) || "EUR";
  if (criteria.maxPrice) {
    pushPart(parts, `до ${formatNumericValue(criteria.maxPrice)} ${currency}`);
  } else {
    const priceRange = formatRange(criteria.priceFrom, criteria.priceTo, ` ${currency}`, {
      allowZeroAsDefault: true,
    });
    pushPart(parts, priceRange);
  }

  pushPart(
    parts,
    formatRange(criteria.mileageFrom, criteria.mileageTo, " км", {
      allowZeroAsDefault: true,
    })
  );

  pushPart(
    parts,
    formatRange(criteria.engineFrom, criteria.engineTo, " к.с.", {
      allowZeroAsDefault: true,
    })
  );

  pushPart(parts, criteria.region);
  pushPart(parts, formatFuelLabel(toDisplayText(criteria.fuel)));
  pushPart(parts, formatGearboxLabel(toDisplayText(criteria.gearbox)));
  pushPart(parts, formatConditionLabel(toDisplayText(criteria.condition)));
  pushPart(parts, formatEngineTypeLabel(toDisplayText(criteria.engineType || criteria.engine_type)));
  pushPart(parts, formatTransmissionLabel(toDisplayText(criteria.transmission)));

  if (parts.length === 0) {
    return "Всички обяви";
  }

  return parts.join(" • ");
};

const normalizeStoredSearches = (value: unknown): RecentSearch[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      const criteria =
        entry && typeof entry === "object" && entry.criteria && typeof entry.criteria === "object"
          ? (entry.criteria as Record<string, any>)
          : {};
      const fallbackLabel =
        entry && typeof entry === "object" && "displayLabel" in entry
          ? toDisplayText((entry as { displayLabel?: unknown }).displayLabel)
          : "";
      const displayLabel = Object.keys(criteria).length > 0
        ? generateSearchLabel(criteria)
        : fallbackLabel || "Всички обяви";

      const rawId =
        entry && typeof entry === "object" && "id" in entry
          ? toDisplayText((entry as { id?: unknown }).id)
          : "";
      const rawTimestamp =
        entry && typeof entry === "object" && "timestamp" in entry
          ? Number((entry as { timestamp?: unknown }).timestamp)
          : Number.NaN;

      return {
        id: rawId || `${Date.now()}-${index}`,
        criteria,
        timestamp: Number.isFinite(rawTimestamp) ? rawTimestamp : Date.now(),
        displayLabel,
      };
    })
    .slice(0, MAX_SEARCHES);
};

export const useRecentSearches = () => {
  const { user } = useAuth();
  const storageKey = useMemo(() => getRecentSearchesStorageKey(user?.id), [user?.id]);
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setSearches([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const normalized = normalizeStoredSearches(parsed);
      setSearches(normalized);
      localStorage.setItem(storageKey, JSON.stringify(normalized));
    } catch (error) {
      console.error("Error loading recent searches:", error);
      setSearches([]);
    }
  }, [storageKey]);

  const addSearch = (criteria: Record<string, any>) => {
    const displayLabel = generateSearchLabel(criteria);

    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      criteria,
      timestamp: Date.now(),
      displayLabel,
    };

    setSearches((prev) => {
      const filtered = prev.filter((search) => JSON.stringify(search.criteria) !== JSON.stringify(criteria));
      const updated = [newSearch, ...filtered].slice(0, MAX_SEARCHES);

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const removeSearch = (id: string) => {
    setSearches((prev) => {
      const updated = prev.filter((search) => search.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllSearches = () => {
    setSearches([]);
    localStorage.removeItem(storageKey);
  };

  return {
    searches,
    addSearch,
    removeSearch,
    clearAllSearches,
  };
};
