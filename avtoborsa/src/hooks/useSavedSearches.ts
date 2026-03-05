import { useState, useEffect } from "react";
import { getCriteriaMainCategoryCode, getMainCategoryLabel } from "../constants/karbgdata";

type SearchCriteria = Record<string, unknown>;

export interface SavedSearch {
  id: string;
  name: string;
  criteria: SearchCriteria;
  mainCategoryCode?: string;
  mainCategoryLabel?: string;
  timestamp: number;
}

const STORAGE_KEY = "saved_searches";

const normalizeSavedSearchCriteria = (
  criteria: SearchCriteria | null | undefined
): SearchCriteria => {
  const nextCriteria =
    criteria && typeof criteria === "object" && !Array.isArray(criteria) ? { ...criteria } : {};
  const mainCategoryCode = getCriteriaMainCategoryCode(nextCriteria);

  if (!mainCategoryCode) {
    delete nextCriteria.mainCategory;
    delete nextCriteria.main_category;
    delete nextCriteria.pubtype;
    return nextCriteria;
  }

  nextCriteria.mainCategory = mainCategoryCode;
  delete nextCriteria.main_category;
  delete nextCriteria.pubtype;
  return nextCriteria;
};

const normalizeSavedSearch = (raw: SavedSearch): SavedSearch => {
  const fallbackMainCategoryCode = getCriteriaMainCategoryCode({
    mainCategory: raw.mainCategoryCode,
  });
  const criteria = normalizeSavedSearchCriteria({
    ...(raw.criteria && typeof raw.criteria === "object" && !Array.isArray(raw.criteria)
      ? raw.criteria
      : {}),
    ...(fallbackMainCategoryCode ? { mainCategory: fallbackMainCategoryCode } : {}),
  });
  const mainCategoryCode = getCriteriaMainCategoryCode(criteria);
  const mainCategoryLabel = getMainCategoryLabel(mainCategoryCode);
  return {
    ...raw,
    criteria,
    mainCategoryCode: mainCategoryCode || raw.mainCategoryCode || "",
    mainCategoryLabel: mainCategoryLabel || raw.mainCategoryLabel || "",
  };
};

const readStoredSearches = (): SavedSearch[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeSavedSearch(item as SavedSearch))
      : [];
  } catch (e) {
    console.error("Error loading saved searches:", e);
    return [];
  }
};

const notifySavedSearchesChanged = () => {
  window.dispatchEvent(new Event("saved-searches-changed"));
};

export const useSavedSearches = () => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Load + keep in sync across components/tabs
  useEffect(() => {
    const syncFromStorage = () => {
      setSavedSearches(readStoredSearches());
    };

    syncFromStorage();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) syncFromStorage();
    };

    window.addEventListener("saved-searches-changed", syncFromStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("saved-searches-changed", syncFromStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const saveSearch = (name: string, criteria: SearchCriteria) => {
    const normalizedCriteria = normalizeSavedSearchCriteria(criteria);
    const mainCategoryCode = getCriteriaMainCategoryCode(normalizedCriteria);
    const mainCategoryLabel = getMainCategoryLabel(mainCategoryCode);
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      criteria: normalizedCriteria,
      mainCategoryCode: mainCategoryCode || "",
      mainCategoryLabel: mainCategoryLabel || "",
      timestamp: Date.now(),
    };

    setSavedSearches((prev) => {
      const updated = [newSearch, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      notifySavedSearchesChanged();
      return updated;
    });
  };

  const removeSearch = (id: string) => {
    setSavedSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      notifySavedSearchesChanged();
      return updated;
    });
  };

  const clearAllSearches = () => {
    setSavedSearches(() => {
      localStorage.removeItem(STORAGE_KEY);
      notifySavedSearchesChanged();
      return [];
    });
  };

  return {
    savedSearches,
    saveSearch,
    removeSearch,
    clearAllSearches,
  };
};
