import { useState, useEffect, useMemo } from "react";
import { getMainCategoryLabel } from "../constants/mobileBgData";
import { useAuth } from "../context/AuthContext";

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

export const useRecentSearches = () => {
  const { user } = useAuth();
  const storageKey = useMemo(() => getRecentSearchesStorageKey(user?.id), [user?.id]);
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  // Load searches from user-scoped localStorage key
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setSearches([]);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setSearches(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      console.error("Error loading recent searches:", e);
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
      // Remove duplicate search if it exists (by criteria)
      const filtered = prev.filter((s) => JSON.stringify(s.criteria) !== JSON.stringify(criteria));

      // Add new search at the beginning and keep only MAX_SEARCHES
      const updated = [newSearch, ...filtered].slice(0, MAX_SEARCHES);

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const removeSearch = (id: string) => {
    setSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
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

const generateSearchLabel = (criteria: Record<string, any>): string => {
  const parts: string[] = [];
  const mainCategoryCode = String(criteria.mainCategory || criteria.main_category || "").trim();
  const mainCategoryLabel = getMainCategoryLabel(mainCategoryCode);

  if (mainCategoryLabel) {
    parts.push(mainCategoryLabel);
  }

  // Brand and Model
  if (criteria.equipmentType) {
    parts.push(`Вид: ${criteria.equipmentType}`);
  }

  const brand = criteria.brand || criteria.marka;
  if (brand) {
    parts.push(brand);
    if (criteria.model) parts.push(criteria.model);
  }

  // Category
  if (criteria.category) {
    parts.push(criteria.category);
  }
  if (criteria.motoCategory) {
    parts.push(criteria.motoCategory);
  }

  // Year Range
  if (criteria.yearFrom) {
    if (criteria.yearTo) {
      parts.push(`${criteria.yearFrom}–${criteria.yearTo} г.`);
    } else {
      parts.push(`от ${criteria.yearFrom} г.`);
    }
  } else if (criteria.yearTo) {
    parts.push(`до ${criteria.yearTo} г.`);
  }

  // Price Range
  if (criteria.maxPrice) {
    parts.push(`до €${criteria.maxPrice}`);
  } else if (criteria.priceFrom || criteria.priceTo) {
    const from = criteria.priceFrom || "0";
    const to = criteria.priceTo || "∞";
    parts.push(`€${from}–${to}`);
  }

  // Mileage Range
  if (criteria.mileageFrom || criteria.mileageTo) {
    const from = criteria.mileageFrom || "0";
    const to = criteria.mileageTo || "∞";
    parts.push(`${from}–${to} км`);
  }

  // Engine/Power Range
  if (criteria.engineFrom || criteria.engineTo) {
    const from = criteria.engineFrom || "0";
    const to = criteria.engineTo || "∞";
    parts.push(`${from}–${to} к.с.`);
  }

  // Region
  if (criteria.region) {
    parts.push(criteria.region);
  }

  // Fuel
  if (criteria.fuel) {
    parts.push(criteria.fuel);
  }

  // Gearbox
  if (criteria.gearbox) {
    parts.push(criteria.gearbox);
  }

  // Color
  if (criteria.color) {
    parts.push(criteria.color);
  }

  // Condition
  if (criteria.condition) {
    parts.push(criteria.condition);
  }

  if (parts.length === 0) {
    return "Всички обяви";
  }

  return parts.join(" • ");
};
