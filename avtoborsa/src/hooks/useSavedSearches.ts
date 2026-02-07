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

  // Load saved searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading saved searches:", e);
      }
    }
  }, []);

  const saveSearch = (name: string, criteria: Record<string, any>) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      criteria,
      timestamp: Date.now(),
    };

    const updated = [newSearch, ...savedSearches];
    setSavedSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllSearches = () => {
    setSavedSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    savedSearches,
    saveSearch,
    removeSearch,
    clearAllSearches,
  };
};
