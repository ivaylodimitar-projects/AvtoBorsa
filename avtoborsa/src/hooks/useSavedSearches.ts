import { useState, useEffect } from "react";

export interface SavedSearch {
  id: string;
  name: string;
  criteria: Record<string, any>;
  timestamp: number;
}

const STORAGE_KEY = "saved_searches";

export const useSavedSearches = () => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const readStoredSearches = (): SavedSearch[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Error loading saved searches:", e);
      return [];
    }
  };

  const notifySavedSearchesChanged = () => {
    window.dispatchEvent(new Event("saved-searches-changed"));
  };

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

  const saveSearch = (name: string, criteria: Record<string, any>) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      criteria,
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
