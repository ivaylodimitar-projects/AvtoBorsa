import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  Clock,
  Calendar,
  Fuel,
  Gauge,
  Zap,
  Settings,
  User,
  Building2,
  BadgeCheck,
  HelpCircle,
  ImageOff,
  TrendingUp,
  TrendingDown,
  PencilLine,
  Bookmark,
  Ruler,
  PackageOpen,
  ShieldCheck,
  Leaf,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";
import { formatConditionLabel, formatFuelLabel, formatGearboxLabel } from "../utils/listingLabels";
import { getMainCategoryFromTopmenu, getMainCategoryLabel } from "../constants/mobileBgData";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { resolvePriceBadgeState } from "../utils/priceChangeBadge";
import ListingPromoBadge from "./ListingPromoBadge";
import KapariranoBadge from "./KapariranoBadge";
import { API_BASE_URL } from "../config/api";

type CarListing = {
  id: number;
  slug: string;
  title?: string;
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
  location_country?: string;
  location_region?: string;
  city: string;
  image_url?: string;
  images?: Array<{
    id: number;
    image: string;
    order?: number;
    is_cover?: boolean;
  }>;
  is_active: boolean;
  is_draft: boolean;
  is_archived: boolean;
  is_kaparirano?: boolean;
  is_favorited?: boolean;
  description_preview?: string;
  description?: string;
  category?: string;
  category_display?: string;
  main_category?: string;
  main_category_display?: string;
  condition?: string;
  condition_display?: string;
  created_at: string;
  updated_at?: string;
  seller_name?: string;
  seller_type?: string;
  price_change?: {
    delta: number | string;
    direction?: string;
    changed_at?: string;
    old_price?: number | string;
    new_price?: number | string;
  };
  listing_type?: "top" | "vip" | "normal" | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
  is_vip?: boolean;
  is_vip_listing?: boolean;
  is_vip_ad?: boolean;
  vip_plan?: string | null;
  vip_expires_at?: string | null;
  wheel_for?: string;
  offer_type?: string;
  tire_brand?: string;
  tire_width?: string;
  tire_height?: string;
  tire_diameter?: string;
  tire_season?: string;
  wheel_brand?: string;
  material?: string;
  bolts?: number | string | null;
  pcd?: string;
  part_for?: string;
  part_category?: string;
  part_element?: string;
  part_year_from?: number | string | null;
  part_year_to?: number | string | null;
  displacement?: number | string | null;
  axles?: number | string | null;
  seats?: number | string | null;
  load_kg?: number | string | null;
  transmission?: string;
  engine_type?: string;
  heavy_euro_standard?: string;
  displacement_cc?: number | string | null;
  equipment_type?: string;
  lift_capacity_kg?: number | string | null;
  hours?: number | string | null;
  beds?: number | string | null;
  length_m?: number | string | null;
  has_toilet?: boolean;
  has_heating?: boolean;
  has_air_conditioning?: boolean;
  boat_category?: string;
  engine_count?: number | string | null;
  width_m?: number | string | null;
  draft_m?: number | string | null;
  trailer_category?: string;
  classified_for?: string;
  accessory_category?: string;
  buy_service_category?: string;
};

const isTopListing = (listing: CarListing) => {
  if (listing.is_top || listing.is_top_listing || listing.is_top_ad) return true;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (["top", "top_ad", "top_listing", "topad", "toplisting"].includes(rawType)) {
    return true;
  }
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("топ");
};

const isVipListing = (listing: CarListing) => {
  if (isTopListing(listing)) return false;
  if (listing.is_vip || listing.is_vip_listing || listing.is_vip_ad) return true;

  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 2) return true;

  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (rawType === "vip" || rawType.includes("vip")) return true;

  const display = (listing.listing_type_display || "").toString().toLowerCase();
  if (display.includes("vip")) return true;

  const vipPlan = (listing.vip_plan || "").toString().toLowerCase().trim();
  if (vipPlan && !["none", "normal", "null", "undefined"].includes(vipPlan)) return true;

  if (listing.vip_expires_at) {
    const vipExpiresAtMs = Date.parse(listing.vip_expires_at);
    if (!Number.isNaN(vipExpiresAtMs) && vipExpiresAtMs > Date.now()) return true;
  }

  return false;
};

const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const NEW_LISTING_BADGE_REFRESH_MS = 30_000;
const PAGE_SIZE = 20;

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [pageCache, setPageCache] = useState<Record<number, CarListing[]>>({});
  const pageCacheRef = useRef<Record<number, CarListing[]>>({});
  const prefetchCacheRef = useRef<Record<number, CarListing[]>>({});
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [hasLoadedPrimary, setHasLoadedPrimary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [saveSearchFeedback, setSaveSearchFeedback] = useState("");
  const saveSearchFeedbackTimeoutRef = useRef<number | null>(null);
  const { saveSearch } = useSavedSearches();
  const getImageUrl = useImageUrl();

  const baseQueryString = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    params.delete("page_size");
    return params.toString();
  }, [searchParams]);

  const queryKey = baseQueryString;
  const pageRestoreKey = useMemo(() => `searchPage:${queryKey || "all"}`, [queryKey]);
  const storedPage = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(pageRestoreKey);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
    } catch {
      return null;
    }
  }, [pageRestoreKey]);

  const currentPage = useMemo(() => {
    const rawPage = Number(searchParams.get("page") || "");
    if (Number.isFinite(rawPage) && rawPage > 0) {
      return Math.floor(rawPage);
    }
    if (storedPage !== null) {
      return storedPage;
    }
    return 1;
  }, [searchParams, storedPage]);

  const currentListings = pageCache[currentPage] || prefetchCacheRef.current[currentPage] || [];
  const prefetchTokenRef = useRef(0);
  const prevQueryKeyRef = useRef<string | null>(null);
  const activeQueryRef = useRef(queryKey);
  const scrollRestoreKey = useMemo(
    () => `searchScroll:${queryKey || "all"}:${currentPage}`,
    [queryKey, currentPage]
  );

  // Format relative time
  const getRelativeTime = (dateString: string, label = "Публикувана") => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      return date.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
    } else if (diffDays > 0) {
      return `${label} преди ${diffDays} ${diffDays === 1 ? "ден" : "дни"}`;
    } else if (diffHours > 0) {
      return `${label} преди ${diffHours} ${diffHours === 1 ? "час" : "часа"}`;
    } else if (diffMins > 0) {
      return `${label} преди ${diffMins} ${diffMins === 1 ? "минута" : "минути"}`;
    } else {
      return `${label} току-що`;
    }
  };

  const getRelativeTimeCompact = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      return date.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } else if (diffDays > 0) {
      return `преди ${diffDays}д`;
    } else if (diffHours > 0) {
      return `преди ${diffHours}ч`;
    } else if (diffMins > 0) {
      return `преди ${diffMins}м`;
    }
    return "току-що";
  };

  useEffect(() => {
    pageCacheRef.current = pageCache;
  }, [pageCache]);

  useEffect(() => {
    activeQueryRef.current = queryKey;
  }, [queryKey]);

  useEffect(() => {
    if (!Number.isFinite(currentPage) || currentPage < 1) return;
    try {
      sessionStorage.setItem(pageRestoreKey, String(currentPage));
    } catch {
      // ignore storage errors
    }
  }, [currentPage, pageRestoreKey]);

  const persistScrollPosition = useCallback(() => {
    try {
      sessionStorage.setItem(
        scrollRestoreKey,
        JSON.stringify({ y: window.scrollY || 0, ts: Date.now() })
      );
    } catch {
      // ignore storage errors
    }
  }, [scrollRestoreKey]);

  useEffect(() => {
    if (!hasLoadedPrimary || isLoading) return;
    let payload: { y?: number } | null = null;
    try {
      const raw = sessionStorage.getItem(scrollRestoreKey);
      if (raw) {
        payload = JSON.parse(raw) as { y?: number };
      }
    } catch {
      payload = null;
    }
    if (!payload || typeof payload.y !== "number" || payload.y <= 0) return;

    const targetY = payload.y;
    const attemptRestore = () => {
      window.scrollTo(0, targetY);
    };
    requestAnimationFrame(() => {
      attemptRestore();
      window.setTimeout(attemptRestore, 60);
      window.setTimeout(attemptRestore, 220);
    });
    sessionStorage.removeItem(scrollRestoreKey);
  }, [scrollRestoreKey, hasLoadedPrimary, isLoading, currentListings.length]);

  const openListing = useCallback(
    (slug: string) => {
      persistScrollPosition();
      navigate(`/details/${slug}`);
    },
    [navigate, persistScrollPosition]
  );

  useEffect(() => {
    const pageParam = searchParams.get("page");
    const parsedPage = Number(pageParam || "");
    if (pageParam && Number.isFinite(parsedPage) && parsedPage > 0) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(currentPage));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, currentPage]);

  useEffect(() => {
    if (prevQueryKeyRef.current && prevQueryKeyRef.current !== queryKey) {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      setSearchParams(params, { replace: true });
    }
    prevQueryKeyRef.current = queryKey;
  }, [queryKey, searchParams, setSearchParams]);

  useEffect(() => {
    setPageCache({});
    pageCacheRef.current = {};
    prefetchCacheRef.current = {};
    setTotalCount(null);
    setTotalPages(1);
    setHasLoadedPrimary(false);
    setError(null);
    setIsLoading(true);
  }, [queryKey]);

  const buildListingsUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(baseQueryString);
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      params.set("compact", "1");
      return `${API_BASE_URL}/api/listings/?${params.toString()}`;
    },
    [baseQueryString]
  );

  const loadPage = useCallback(
    async (
      page: number,
      options: { signal?: AbortSignal; cacheOnly?: boolean; updateTotals?: boolean } = {}
    ) => {
      const cachedPage = pageCacheRef.current[page];
      if (cachedPage) {
        return cachedPage;
      }

      const prefetchedPage = prefetchCacheRef.current[page];
      if (prefetchedPage) {
        if (!options.cacheOnly) {
          setPageCache((prev) => ({ ...prev, [page]: prefetchedPage }));
        }
        return prefetchedPage;
      }

      const url = buildListingsUrl(page);

      const response = await fetch(url, { signal: options.signal });
      if (!response.ok) throw new Error("Failed to fetch listings");
      const data = await response.json();

      if (activeQueryRef.current !== queryKey) {
        return [];
      }

      const listingsData = Array.isArray(data.results) ? data.results : [];
      const count = typeof data.count === "number" ? data.count : listingsData.length;
      if (!options.cacheOnly) {
        setPageCache((prev) => ({ ...prev, [page]: listingsData }));
      } else {
        prefetchCacheRef.current[page] = listingsData;
      }
      if (options.updateTotals !== false) {
        setTotalCount(count);
        setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      }
      return listingsData;
    },
    [buildListingsUrl]
  );

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    const hasCached = !!pageCacheRef.current[currentPage] || !!prefetchCacheRef.current[currentPage];

    const fetchCurrentPage = async () => {
      try {
        if (!hasCached) {
          setIsLoading(true);
        }
        await loadPage(currentPage, { signal: controller.signal, updateTotals: true });
        if (!isCancelled) {
          setError(null);
          setHasLoadedPrimary(true);
        }
      } catch (err) {
        if (controller.signal.aborted || isCancelled) return;
        console.error("Error fetching listings:", err);
        if (!hasCached) {
          setError("Failed to load listings");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCurrentPage();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [currentPage, queryKey, loadPage]);

  useEffect(() => {
    if (!hasLoadedPrimary || totalPages <= 1) return;

    prefetchTokenRef.current += 1;
    const token = prefetchTokenRef.current;
    const nextPage = currentPage + 1;
    if (nextPage > totalPages) return;
    if (pageCacheRef.current[nextPage] || prefetchCacheRef.current[nextPage]) return;
    const controller = new AbortController();

    const browserWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const scheduleIdle = (callback: () => void) => {
      if (typeof browserWindow.requestIdleCallback === "function") {
        return browserWindow.requestIdleCallback(callback, { timeout: 1200 });
      }
      return window.setTimeout(callback, 120);
    };
    const cancelScheduledIdle = (id: number) => {
      if (typeof browserWindow.cancelIdleCallback === "function") {
        browserWindow.cancelIdleCallback(id);
        return;
      }
      window.clearTimeout(id);
    };

    let idleHandle: number | null = null;
    const waitForIdle = () =>
      new Promise<void>((resolve) => {
        idleHandle = scheduleIdle(() => {
          idleHandle = null;
          resolve();
        });
      });

    const prefetchSequentially = async () => {
      if (token !== prefetchTokenRef.current) return;
      await waitForIdle();
      if (token !== prefetchTokenRef.current || controller.signal.aborted) return;
      try {
        await loadPage(nextPage, {
          signal: controller.signal,
          cacheOnly: true,
          updateTotals: false,
        });
      } catch (err) {
        if (token !== prefetchTokenRef.current || controller.signal.aborted) return;
        console.error("Error prefetching page:", nextPage, err);
      }
    };

    prefetchSequentially();
    return () => {
      prefetchTokenRef.current += 1;
      controller.abort();
      if (idleHandle !== null) {
        cancelScheduledIdle(idleHandle);
      }
    };
  }, [hasLoadedPrimary, currentPage, totalPages, queryKey, loadPage]);

  useEffect(() => {
    if (totalCount === null) return;
    if (totalPages > 0 && currentPage > totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(totalPages));
      setSearchParams(params, { replace: true });
    }
  }, [currentPage, totalPages, totalCount, searchParams, setSearchParams]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, NEW_LISTING_BADGE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Toggle favorite status
  const toggleFavorite = async (e: React.MouseEvent, listingId: number, isFavorited: boolean) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const endpoint = isFavorited ? "unfavorite" : "favorite";
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/${endpoint}/`, {
        method: isFavorited ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update the listing's favorite status in cache
        setPageCache((prev) => {
          const pageListings = prev[currentPage] || [];
          return {
            ...prev,
            [currentPage]: pageListings.map((listing) =>
              listing.id === listingId
                ? { ...listing, is_favorited: !isFavorited }
                : listing
            ),
          };
        });
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  // Results are already filtered by backend, but we keep "top" listings first
  const results = useMemo(() => {
    const topListings = currentListings.filter(isTopListing);
    const normalListings = currentListings.filter((listing) => !isTopListing(listing));
    return [...topListings, ...normalListings];
  }, [currentListings]);

  const isListingNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = currentTimeMs - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  };

  const toText = (value: unknown) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const toPositiveNumber = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  };

  const formatTopmenuCategory = (value: unknown) => {
    const code = toText(value);
    if (!code) return "";
    return getMainCategoryLabel(code) || code;
  };

  const formatWheelOfferType = (value: unknown) => {
    const code = toText(value);
    if (code === "1") return "Гуми";
    if (code === "2") return "Джанти";
    if (code === "3") return "Гуми с джанти";
    return code;
  };

  const formatTireSize = (listing: CarListing) => {
    const width = toText(listing.tire_width);
    const height = toText(listing.tire_height);
    const diameter = toText(listing.tire_diameter);
    if (width && height && diameter) return `${width}/${height} R${diameter}`;
    if (diameter) return `R${diameter}`;
    return "";
  };

  const formatYearRange = (from: unknown, to: unknown) => {
    const fromYear = toText(from);
    const toYear = toText(to);
    if (fromYear && toYear) return `${fromYear}-${toYear}`;
    return fromYear || toYear;
  };

  const getListingTechnicalParams = (listing: CarListing) => {
    const params: Array<{ label: string; value: string; icon: React.ComponentType<any> }> = [];
    const conditionLabel = formatConditionLabel(
      toText(listing.condition_display) || toText(listing.condition)
    );
    const addParam = (label: string, value: unknown, icon: React.ComponentType<any>) => {
      const normalized = toText(value);
      if (!normalized) return;
      params.push({ label, value: normalized, icon });
    };
    const addNumeric = (
      label: string,
      value: unknown,
      unit: string,
      icon: React.ComponentType<any>,
      formatAsInt = true
    ) => {
      const numeric = toPositiveNumber(value);
      if (numeric === null) return;
      const rendered = formatAsInt ? Math.round(numeric).toString() : numeric.toString();
      addParam(label, unit ? `${rendered} ${unit}` : rendered, icon);
    };

    const mainCategory = toText(listing.main_category);

    switch (mainCategory) {
      case "u":
        addParam("Вид част", listing.part_category, PackageOpen);
        addParam("Част", listing.part_element, Settings);
        addParam("За", formatTopmenuCategory(listing.part_for), MapPin);
        addParam("Години", formatYearRange(listing.part_year_from, listing.part_year_to), Calendar);
        addParam("Състояние", conditionLabel, ShieldCheck);
        break;
      case "w":
        addParam("Оферта", formatWheelOfferType(listing.offer_type), PackageOpen);
        addParam("За", formatTopmenuCategory(listing.wheel_for), MapPin);
        addParam("Размер", formatTireSize(listing), Ruler);
        addParam("Сезон", listing.tire_season, Leaf);
        addParam("Джанти", listing.wheel_brand, Settings);
        addParam("PCD", listing.pcd, Ruler);
        break;
      case "v":
        addParam("Вид", listing.accessory_category, PackageOpen);
        addParam("За", formatTopmenuCategory(listing.classified_for), MapPin);
        addParam("Състояние", conditionLabel, ShieldCheck);
        break;
      case "y":
        addParam("Купува", listing.buy_service_category, PackageOpen);
        addParam("За", formatTopmenuCategory(listing.classified_for), MapPin);
        break;
      case "z":
        addParam("Услуга", listing.buy_service_category, PackageOpen);
        addParam("За", formatTopmenuCategory(listing.classified_for), MapPin);
        break;
      case "3":
      case "4":
        addNumeric("Оси", listing.axles, "", Settings);
        addNumeric("Седалки", listing.seats, "", PackageOpen);
        addNumeric("Товар", listing.load_kg, "кг", Gauge);
        addParam("Двигател", listing.engine_type, Fuel);
        addParam("Трансмисия", listing.transmission, Settings);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        break;
      case "5":
        addNumeric("Кубатура", listing.displacement_cc ?? listing.displacement, "cc", Ruler);
        addParam("Двигател", listing.engine_type, Fuel);
        addParam("Трансмисия", listing.transmission, Settings);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        break;
      case "6":
      case "7":
        addParam("Вид техника", listing.equipment_type, PackageOpen);
        addParam("Двигател", listing.engine_type, Fuel);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addParam("Състояние", conditionLabel, ShieldCheck);
        break;
      case "8":
        addParam("Двигател", listing.engine_type, Fuel);
        addNumeric("Товар", listing.lift_capacity_kg, "кг", Gauge);
        addNumeric("Часове", listing.hours, "ч", Clock);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addParam("Състояние", conditionLabel, ShieldCheck);
        break;
      case "9":
        addNumeric("Легла", listing.beds, "", PackageOpen);
        addNumeric("Дължина", listing.length_m, "м", Ruler, false);
        addParam("Тоалетна", listing.has_toilet ? "Да" : "", ShieldCheck);
        addParam("Отопление", listing.has_heating ? "Да" : "", ShieldCheck);
        addParam("Климатик", listing.has_air_conditioning ? "Да" : "", ShieldCheck);
        break;
      case "a":
        addParam("Вид лодка", listing.boat_category, PackageOpen);
        addParam("Двигател", listing.engine_type, Fuel);
        addNumeric("Брой двиг.", listing.engine_count, "", Settings);
        addNumeric("Дължина", listing.length_m, "м", Ruler, false);
        addNumeric("Ширина", listing.width_m, "м", Ruler, false);
        addNumeric("Часове", listing.hours, "ч", Clock);
        break;
      case "b":
        addParam("Вид ремарке", listing.trailer_category, PackageOpen);
        addNumeric("Товар", listing.load_kg, "кг", Gauge);
        addNumeric("Оси", listing.axles, "", Settings);
        addParam("Състояние", conditionLabel, ShieldCheck);
        break;
      default:
        addParam("Година", listing.year_from ? `${listing.year_from} г.` : "", Calendar);
        addNumeric("Пробег", listing.mileage, "км", Gauge);
        addParam("Гориво", formatFuelLabel(listing.fuel_display || listing.fuel), Fuel);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addParam("Кутия", formatGearboxLabel(listing.gearbox_display || listing.gearbox), Settings);
        break;
    }

    const isCategoryBasedBrandModel = ["6", "7", "8", "9", "a", "b"].includes(mainCategory);
    const fallbackCandidates: Array<{ label: string; value: string; icon: React.ComponentType<any> }> = [
      {
        label: "Легла",
        value:
          mainCategory === "9" && toPositiveNumber(listing.beds) !== null
            ? `${Math.round(Number(listing.beds))}`
            : "",
        icon: PackageOpen,
      },
      {
        label: "Дължина",
        value:
          mainCategory === "9" && toPositiveNumber(listing.length_m) !== null
            ? `${Number(listing.length_m)} м`
            : "",
        icon: Ruler,
      },
      {
        label: "Локация",
        value: [listing.location_country, listing.city].filter(Boolean).join(", "),
        icon: MapPin,
      },
      {
        label: "Състояние",
        value: conditionLabel,
        icon: ShieldCheck,
      },
      {
        label: "Година",
        value: listing.year_from ? `${listing.year_from} г.` : "",
        icon: Calendar,
      },
      {
        label: "Пробег",
        value: toPositiveNumber(listing.mileage) !== null ? `${Math.round(Number(listing.mileage))} км` : "",
        icon: Gauge,
      },
      {
        label: isCategoryBasedBrandModel ? "Категория" : "Марка",
        value: toText(listing.brand),
        icon: PackageOpen,
      },
      {
        label: isCategoryBasedBrandModel ? "Марка" : "Модел",
        value: toText(listing.model),
        icon: Settings,
      },
    ];

    for (const fallback of fallbackCandidates) {
      if (params.length >= 5) break;
      if (mainCategory === "u" && fallback.label === "Пробег") continue;
      if (mainCategory === "u" && fallback.label === "Марка") continue;
      if (mainCategory === "9" && fallback.label === "Локация") continue;
      if (!toText(fallback.value)) continue;
      const exists = params.some((param) => param.label === fallback.label);
      if (!exists) {
        params.push(fallback);
      }
    }

    return params.slice(0, 5);
  };

  // Build search criteria display
  const searchCriteriaDisplay = useMemo(() => {
    const criteria: string[] = [];
    const consumed = new Set<string>();

    const getParam = (...keys: string[]) => {
      for (const key of keys) {
        const value = (searchParams.get(key) || "").trim();
        if (value) {
          keys.forEach((alias) => consumed.add(alias));
          return value;
        }
      }
      return "";
    };

    const addCriterion = (label: string, value: string) => {
      const normalized = value.trim();
      if (!normalized) return;
      criteria.push(`${label}: ${normalized}`);
    };

    const addRangeCriterion = (label: string, fromValue: string, toValue: string, suffix = "") => {
      if (!fromValue && !toValue) return;
      const range = `${fromValue || "0"} - ${toValue || "∞"}${suffix}`;
      criteria.push(`${label}: ${range}`);
    };

    const wheelOfferTypeLabels: Record<string, string> = {
      "1": "Гуми",
      "2": "Джанти",
      "3": "Гуми с джанти",
    };
    const sellerTypeLabels: Record<string, string> = {
      "1": "Частни лица",
      "2": "Търговци",
    };
    const nupStateLabels: Record<string, string> = {
      "1": "Нов",
      "0": "Употребяван",
      "3": "Повреден/ударен",
      "2": "За части",
    };

    const mainCategory = getParam("main_category", "mainCategory");
    const category = getParam("category");
    const year = getParam("year");
    const yearFrom = getParam("yearFrom");
    const yearTo = getParam("yearTo");
    const maxPrice = getParam("maxPrice", "price1");
    const priceFrom = getParam("priceFrom");
    const priceTo = getParam("priceTo");
    const currency = getParam("currency");
    const region = getParam("region", "locat");
    const city = getParam("city", "locatc");
    const topmenu = getParam("topmenu");
    const topmenuMainCategory = getMainCategoryFromTopmenu(topmenu);
    const topmenuLabel = getMainCategoryLabel(topmenuMainCategory);
    const sort = getParam("sortBy", "sort");
    const sellerType = getParam("sellerType");
    const condition = getParam("condition");
    const nup = getParam("nup");

    if (topmenuLabel && ["w", "u", "v", "y", "z"].includes(mainCategory)) {
      addCriterion("За", topmenuLabel);
    }

    if (yearFrom || yearTo) {
      const yearRange = `${yearFrom || "всички"} - ${yearTo || "всички"}`;
      criteria.push(`Година: ${yearRange}`);
    } else if (year) {
      addCriterion("Година от", year);
    }

    if (maxPrice) {
      criteria.push(`Цена: до ${currency || "EUR"} ${maxPrice}`);
    } else if (priceFrom || priceTo) {
      const activeCurrency = currency || "EUR";
      const priceRange = `${activeCurrency} ${priceFrom || "0"} - ${activeCurrency} ${priceTo || "∞"}`;
      criteria.push(`Цена: ${priceRange}`);
    }

    addCriterion("Регион", region);
    addCriterion("Град", city);
    if (sort) addCriterion("Подредба", sort);

    if (condition) {
      addCriterion("Състояние", formatConditionLabel(condition));
    } else if (nup) {
      const states = Array.from(new Set(String(nup).split("").map((flag) => nupStateLabels[flag]).filter(Boolean)));
      if (states.length > 0) {
        addCriterion("Състояние", states.join(", "));
      }
    }

    if (currency) addCriterion("Валута", currency);
    if (getParam("taxCredit") === "1") addCriterion("Данъчен кредит", "Да");
    if (["1", "true", "True"].includes(getParam("hasPhoto"))) addCriterion("Снимка", "Само със снимка");
    if (["1", "true", "True"].includes(getParam("hasVideo"))) addCriterion("Видео/VR360", "Само с видео");
    if (sellerType && sellerTypeLabels[sellerType]) addCriterion("Тип обяви", sellerTypeLabels[sellerType]);

    if (mainCategory === "w") {
      const brand = getParam("brand", "marka");
      const model = getParam("model");
      addCriterion("Марка авто", brand);
      addCriterion("Модел авто", model);
      const wheelOfferType = getParam("twrubr");
      addCriterion("Оферта", wheelOfferTypeLabels[wheelOfferType] || wheelOfferType);
      addCriterion("Марка гуми", getParam("tireBrand"));
      addCriterion("Ширина гуми", getParam("tireWidth"));
      addCriterion("Височина гуми", getParam("tireHeight"));
      addCriterion("Диаметър гуми", getParam("tireDiameter"));
      addCriterion("Сезонност", getParam("tireSeason"));
      addCriterion("Скоростен индекс", getParam("tireSpeedIndex"));
      addCriterion("Тегловен индекс", getParam("tireLoadIndex"));
      addCriterion("Релеф", getParam("tireTread"));
      addCriterion("Марка джанти", getParam("wheelBrand"));
      addCriterion("Материал", getParam("wheelMaterial"));
      addCriterion("Болтове", getParam("wheelBolts"));
      addCriterion("PCD", getParam("wheelPcd"));
      addCriterion("Централен отвор", getParam("wheelCenterBore"));
      addCriterion("Офсет /ET/", getParam("wheelOffset"));
      addCriterion("Ширина", getParam("wheelWidth"));
      addCriterion("Диаметър", getParam("wheelDiameter"));
      addCriterion("Брой", getParam("wheelCount"));
      addCriterion("Вид", getParam("wheelType"));
      return criteria;
    }

    if (mainCategory === "u") {
      addCriterion("Вид част", getParam("partrub"));
      addCriterion("Част", getParam("partelem"));
      addRangeCriterion("Година на част (от)", getParam("partYearFrom", "part_year_from"), "");
      addRangeCriterion("Година на част (до)", "", getParam("partYearTo", "part_year_to"));
      return criteria;
    }

    if (mainCategory === "v") {
      addCriterion("Вид аксесоар", getParam("marka", "accessoryCategory"));
      return criteria;
    }

    if (mainCategory === "y" || mainCategory === "z") {
      addCriterion("Тип", category);
      return criteria;
    }

    if (mainCategory === "6") {
      const equipmentType = getParam("equipmentType", "marka");
      const equipmentBrandOrModel = getParam("model");
      addCriterion("Категория", equipmentType);
      if (equipmentBrandOrModel && equipmentBrandOrModel !== equipmentType) {
        addCriterion("Марка", equipmentBrandOrModel);
      }
      addRangeCriterion("Мощност", getParam("engineFrom"), getParam("engineTo"), " к.с.");
      addCriterion("Цвят", getParam("color"));
      return criteria;
    }

    if (mainCategory === "7") {
      addCriterion("Вид техника", getParam("equipmentType"));
      addCriterion("Марка", getParam("brand", "marka"));
      addCriterion("Модел", getParam("model"));
      addRangeCriterion("Мощност", getParam("engineFrom"), getParam("engineTo"), " к.с.");
      addCriterion("Цвят", getParam("color"));
      return criteria;
    }

    if (mainCategory === "a") {
      addCriterion("Вид лодка", getParam("boatCategory", "marka"));
      addCriterion("Марка", getParam("model"));
      addCriterion("Вид двигател", getParam("fuel"));
      addRangeCriterion("Брой двигатели", getParam("engineCountFrom"), getParam("engineCountTo"));
      addRangeCriterion("Дължина", getParam("lengthFrom"), getParam("lengthTo"), " м");
      addRangeCriterion("Ширина", getParam("widthFrom"), getParam("widthTo"), " м");
      addRangeCriterion("Газене", getParam("draftFrom"), getParam("draftTo"), " м");
      addRangeCriterion("Часове", getParam("hoursFrom"), getParam("hoursTo"));
      addCriterion("Материал", getParam("material"));
      addCriterion("Цвят", getParam("color"));
      return criteria;
    }

    if (mainCategory === "b") {
      addCriterion("Вид ремарке", getParam("trailerCategory", "marka"));
      addCriterion("Марка", getParam("model"));
      addRangeCriterion("Товароносимост", getParam("loadFrom"), getParam("loadTo"), " кг");
      addRangeCriterion("Оси", getParam("axlesFrom"), getParam("axlesTo"));
      addCriterion("Цвят", getParam("color"));
      return criteria;
    }

    if (mainCategory === "8" || mainCategory === "9") {
      addCriterion("Категория", getParam("brand", "marka"));
    } else {
      addCriterion("Марка", getParam("brand", "marka"));
    }
    addCriterion(mainCategory === "8" || mainCategory === "9" ? "Марка" : "Модел", getParam("model"));
    addCriterion("Тип", mainCategory === "5" ? getParam("motoCategory") : category);
    const fuelOrEngineType = getParam("fuel");
    if (mainCategory === "1") {
      addCriterion("Гориво", formatFuelLabel(fuelOrEngineType));
      addCriterion("Скоростна кутия", formatGearboxLabel(getParam("gearbox")));
      addRangeCriterion("Кубатура", getParam("displacementFrom"), getParam("displacementTo"), " куб.см.");
    } else {
      addCriterion("Вид двигател", fuelOrEngineType);
    }
    if (mainCategory === "5") {
      addCriterion("Вид охлаждане", getParam("motoCoolingType"));
      addCriterion("Вид двигател (конфигурация)", getParam("motoEngineKind"));
    }
    addCriterion("Трансмисия", getParam("transmission"));
    addCriterion("Евростандарт", getParam("euroStandard"));
    addRangeCriterion("Пробег", getParam("mileageFrom"), getParam("mileageTo"), " км");
    addRangeCriterion("Мощност", getParam("engineFrom"), getParam("engineTo"), " к.с.");
    addRangeCriterion("Оси", getParam("axlesFrom"), getParam("axlesTo"));
    addRangeCriterion("Места", getParam("seatsFrom"), getParam("seatsTo"));
    addRangeCriterion("Товароносимост", getParam("loadFrom"), getParam("loadTo"), " кг");
    addRangeCriterion("Кубатура", getParam("displacementFrom"), getParam("displacementTo"), " куб.см.");
    addRangeCriterion("Товароподемност", getParam("liftCapacityFrom"), getParam("liftCapacityTo"), " кг");
    addRangeCriterion("Часове", getParam("hoursFrom"), getParam("hoursTo"));
    addRangeCriterion("Спални места", getParam("bedsFrom"), getParam("bedsTo"));
    addRangeCriterion("Дължина", getParam("lengthFrom"), getParam("lengthTo"), " м");
    addRangeCriterion("Ширина", getParam("widthFrom"), getParam("widthTo"), " м");
    addRangeCriterion("Газене", getParam("draftFrom"), getParam("draftTo"), " м");
    addRangeCriterion("Брой двигатели", getParam("engineCountFrom"), getParam("engineCountTo"));
    addCriterion("Материал", getParam("material"));
    if (["1", "true", "True"].includes(getParam("hasToilet"))) addCriterion("Тоалетна", "Да");
    if (["1", "true", "True"].includes(getParam("hasHeating"))) addCriterion("Отопление", "Да");
    if (["1", "true", "True"].includes(getParam("hasAirConditioning"))) addCriterion("Климатик", "Да");
    const listingFeatures = getParam("features");
    if (listingFeatures) {
      const normalizedFeatures = listingFeatures
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (normalizedFeatures.length > 0) {
        addCriterion("Екстри", normalizedFeatures.join(", "));
      }
    }
    addCriterion("Цвят", getParam("color"));

    const fallbackLabels: Record<string, string> = {
      partYearFrom: "Година на част (от)",
      partYearTo: "Година на част (до)",
      equipmentType: "Вид техника",
      boatCategory: "Вид лодка",
      trailerCategory: "Вид ремарке",
      liftCapacityFrom: "Товароподемност от",
      liftCapacityTo: "Товароподемност до",
      hasToilet: "Тоалетна",
      hasHeating: "Отопление",
      hasAirConditioning: "Климатик",
    };
    const ignoredKeys = new Set([
      "page",
      "page_size",
      "compact",
      "features",
      "motoFeatures",
      "boatFeatures",
      "trailerFeatures",
    ]);

    searchParams.forEach((rawValue, key) => {
      const value = rawValue.trim();
      if (!value) return;
      if (ignoredKeys.has(key) || consumed.has(key)) return;
      const label = fallbackLabels[key] || key;
      criteria.push(`${label}: ${value}`);
      consumed.add(key);
    });

    return criteria;
  }, [searchParams]);

  const totalListings = totalCount ?? results.length;
  const listingsScopeLabel = useMemo(() => {
    const getParam = (...keys: string[]) => {
      for (const key of keys) {
        const value = (searchParams.get(key) || "").trim();
        if (value) return value;
      }
      return "";
    };

    const mainCategory = getParam("main_category", "mainCategory");
    const mainCategoryLabel = getMainCategoryLabel(mainCategory || "1") || "Обяви";
    const topmenu = getParam("topmenu");
    const topmenuLabel = getMainCategoryLabel(getMainCategoryFromTopmenu(topmenu));

    if (mainCategory === "6" || mainCategory === "7") {
      const marka = getParam("marka");
      const model = getParam("model");
      const explicitEquipmentType = getParam("equipmentType");
      const equipmentType = explicitEquipmentType || (!explicitEquipmentType ? marka : "");
      const equipmentBrand = getParam("brand") || (explicitEquipmentType ? marka : model);
      const equipmentModel = explicitEquipmentType ? model : "";
      const parts = [mainCategoryLabel];
      if (equipmentType) parts.push(equipmentType);
      if (equipmentBrand && equipmentModel) {
        parts.push(`${equipmentBrand} / ${equipmentModel}`);
      } else if (equipmentBrand) {
        parts.push(equipmentBrand);
      }
      return parts.join(" • ");
    }

    if (mainCategory === "v") {
      const accessoryCategory = getParam("marka");
      return accessoryCategory ? `${mainCategoryLabel} • ${accessoryCategory}` : mainCategoryLabel;
    }

    if (mainCategory === "y" || mainCategory === "z") {
      const category = getParam("category");
      if (category && topmenuLabel) return `${mainCategoryLabel} • ${category} • за ${topmenuLabel}`;
      if (category) return `${mainCategoryLabel} • ${category}`;
      return mainCategoryLabel;
    }

    if (mainCategory === "a") {
      const boatCategory = getParam("boatCategory");
      const brand = getParam("brand", "marka");
      const model = getParam("model");
      if (boatCategory && brand) return `${mainCategoryLabel} • ${boatCategory} • ${brand}${model ? ` / ${model}` : ""}`;
      if (boatCategory) return `${mainCategoryLabel} • ${boatCategory}`;
      if (brand && model) return `${mainCategoryLabel} • ${brand} / ${model}`;
      if (brand) return `${mainCategoryLabel} • ${brand}`;
      return mainCategoryLabel;
    }

    if (mainCategory === "b") {
      const trailerCategory = getParam("trailerCategory");
      const brand = getParam("brand", "marka");
      const model = getParam("model");
      if (trailerCategory && brand) return `${mainCategoryLabel} • ${trailerCategory} • ${brand}${model ? ` / ${model}` : ""}`;
      if (trailerCategory) return `${mainCategoryLabel} • ${trailerCategory}`;
      if (brand && model) return `${mainCategoryLabel} • ${brand} / ${model}`;
      if (brand) return `${mainCategoryLabel} • ${brand}`;
      return mainCategoryLabel;
    }

    if (mainCategory === "9") {
      const caravanCategory = getParam("brand", "marka");
      const caravanBrand = getParam("model");
      if (caravanCategory && caravanBrand) return `${mainCategoryLabel} • ${caravanCategory} • ${caravanBrand}`;
      if (caravanCategory) return `${mainCategoryLabel} • ${caravanCategory}`;
      if (caravanBrand) return `${mainCategoryLabel} • ${caravanBrand}`;
      return mainCategoryLabel;
    }

    if (mainCategory === "5") {
      const motoCategory = getParam("motoCategory");
      const brand = getParam("brand", "marka");
      const model = getParam("model");
      if (motoCategory && brand) {
        return `${mainCategoryLabel} • ${motoCategory} • ${brand}${model ? ` / ${model}` : ""}`;
      }
      if (motoCategory) return `${mainCategoryLabel} • ${motoCategory}`;
      if (brand && model) return `${mainCategoryLabel} • ${brand} / ${model}`;
      if (brand) return `${mainCategoryLabel} • ${brand}`;
      return mainCategoryLabel;
    }

    const brand = getParam("brand", "marka");
    const model = getParam("model");
    if (brand && model) return `${mainCategoryLabel} • ${brand} / ${model}`;
    if (brand) return `${mainCategoryLabel} • ${brand}`;
    if (topmenuLabel && ["w", "u", "v", "y", "z"].includes(mainCategory)) {
      return `${mainCategoryLabel} • за ${topmenuLabel}`;
    }
    return mainCategoryLabel;
  }, [searchParams]);
  const skeletonRows = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, idx) => idx), []);

  const saveableSearchCriteria = useMemo(() => {
    const criteria: Record<string, string> = {};
    searchParams.forEach((rawValue, key) => {
      if (key === "page" || key === "page_size" || key === "compact") return;
      const value = rawValue.trim();
      if (!value) return;
      if (criteria[key]) {
        criteria[key] = `${criteria[key]},${value}`;
      } else {
        criteria[key] = value;
      }
    });
    return criteria;
  }, [searchParams]);

  const defaultSearchName = useMemo(
    () => (listingsScopeLabel ? `Търсене: ${listingsScopeLabel}` : "Запазено търсене"),
    [listingsScopeLabel]
  );

  const openSaveSearchModal = useCallback(() => {
    setSearchName(defaultSearchName);
    setShowSaveModal(true);
  }, [defaultSearchName]);

  const submitSaveSearch = useCallback(() => {
    const finalName = searchName.trim() || defaultSearchName;
    saveSearch(finalName, saveableSearchCriteria);
    setSaveSearchFeedback(`Запазено търсене: ${finalName}`);
    setShowSaveModal(false);
    if (saveSearchFeedbackTimeoutRef.current) {
      window.clearTimeout(saveSearchFeedbackTimeoutRef.current);
    }
    saveSearchFeedbackTimeoutRef.current = window.setTimeout(() => {
      setSaveSearchFeedback("");
      saveSearchFeedbackTimeoutRef.current = null;
    }, 2800);
  }, [defaultSearchName, saveSearch, saveableSearchCriteria, searchName]);

  useEffect(() => {
    return () => {
      if (saveSearchFeedbackTimeoutRef.current) {
        window.clearTimeout(saveSearchFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const visiblePages = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);

    for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
      if (page > 1 && page < totalPages) {
        pages.add(page);
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const skeletonBase: React.CSSProperties = {
    background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)",
    backgroundSize: "200% 100%",
    animation: "skeletonShimmer 1.4s ease-in-out infinite",
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f4f6f9", width: "100%", paddingTop: 20, paddingBottom: 40 },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 20px" },
    header: { marginBottom: 24, background: "#fff", padding: 24, borderRadius: 16, boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)" },
    headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
    title: {
      fontSize: "clamp(2rem, 2.4vw, 2.55rem)",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1.08,
      color: "#0f172a",
      margin: 0,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    headerLead: {
      margin: "8px 0 0",
      color: "#475569",
      fontSize: 16,
      lineHeight: 1.65,
      fontWeight: 600,
    },
    headerDivider: {
      height: 2,
      margin: "18px 0 0",
      width: "100%",
      borderRadius: 999,
      background: "rgb(15, 118, 110)",
      border: "1px solid rgb(15, 118, 110)",
      boxShadow: "0 2px 6px rgba(15, 118, 110, 0.28)",
    },
    saveSearchButton: {
      display: "inline-flex",
      alignItems: "center",
      background: "#d97706",
      border: "1.5px solid #d97706",
      borderRadius: 16, color: "#fff",
      fontSize: 13,
      padding: "8px 20px",
      cursor: "pointer",
      transition: "all 0.2s",
      height: 48,
      whiteSpace: "nowrap" as const,
    },
    saveSearchFeedback: {
      marginTop: 10,
      color: "#047857",
      fontWeight: 700,
      fontSize: 13,
    },
    criteria: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 },
    criteriaTag: { background: "#f1f5f9", padding: "8px 14px", borderRadius: 16, fontSize: 13, color: "#475569", fontWeight: 600 },
    results: { display: "flex", flexDirection: "column", gap: 16 },
    item: {
      background: "#fff",
      borderRadius: 16, overflow: "visible",
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column" as const,
      cursor: "pointer",
      transition: "transform 0.25s ease, box-shadow 0.25s ease",
      position: "relative" as const,
    },
    itemRow: { display: "flex", alignItems: "stretch" },
    itemPhoto: { width: 280, flexShrink: 0, display: "flex", flexDirection: "column" as const, background: "#fff" },
    photoMain: { height: 194, position: "relative" as const, overflow: "visible", borderTopLeftRadius: 6, background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5f5 100%)", isolation: "isolate" as const },
    itemImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      borderTopLeftRadius: 6,
      imageRendering: "auto",
      display: "block",
    },
    itemPhotoOverlay: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 12, background: "linear-gradient(to top, rgba(15, 23, 42, 0.45), transparent)", zIndex: 1 },
    newBadge: { position: "absolute" as const, left: 10, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" as const, boxShadow: "0 4px 10px rgba(5, 150, 105, 0.35)", zIndex: 11 },
    favoriteButton: { background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", padding: 0, boxShadow: "0 6px 14px rgba(15, 23, 42, 0.18)" },
    photoPlaceholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6, color: "#94a3b8", fontSize: 13, fontWeight: 600 },
    thumbStrip: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "10px", background: "#fff", borderTop: "1px solid #e2e8f0" },
    thumb: { width: "100%", aspectRatio: "4 / 3", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" },
    thumbImage: { width: "100%", height: "100%", objectFit: "cover" },
    thumbPlaceholder: { color: "#94a3b8" },
    thumbMore: { background: "#e2e8f0", color: "#334155", fontSize: 12, fontWeight: 700 },
    itemText: { flex: 1, display: "flex", alignItems: "stretch", minHeight: 194 },
    itemMain: { flex: 1, padding: 20, display: "flex", flexDirection: "column" as const, gap: 12 },
    itemHeader: {
      marginBottom: 4,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    itemHeaderMain: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
      flexWrap: "wrap" as const,
    },
    itemCategoryBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      background: "#ccfbf1",
      color: "#000",
      border: "1px solid #5eead4",
      width: "fit-content",
      whiteSpace: "nowrap" as const,
      maxWidth: 220,
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    itemTitle: {
      fontSize: 23,
      fontWeight: 800,
      letterSpacing: "-0.01em",
      color: "#0b1220",
      marginBottom: 0,
      textDecoration: "none",
      lineHeight: 1.22,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    itemPrice: { fontSize: 24, fontWeight: 700, color: "#0f766e", marginBottom: 4, textAlign: "right" as const, flexShrink: 0 },
    itemPriceSmall: { fontSize: 13, color: "#64748b", fontWeight: 500 },
    priceChangeBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      marginLeft: 10,
      lineHeight: 1,
    },
    priceChangeUp: { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" },
    priceChangeDown: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" },
    priceChangeAnnounced: { background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" },
    priceChangeText: { fontWeight: 800 },
    itemParams: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13, color: "#111827", alignItems: "center" },
    itemParam: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#ecfdf5", border: "1px solid #99f6e4", borderRadius: 999, fontSize: 13, color: "#111827", fontWeight: 700 },
    paramIcon: { color: "#0f766e" },
    itemParamValueBlack: { color: "#111827" },
    itemDescription: {
      fontSize: 14.5,
      color: "#0f172a",
      lineHeight: 1.65,
      marginBottom: 0,
      height: 96,
      maxWidth: "100%",
      overflow: "hidden",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      whiteSpace: "normal" as const,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      padding: "10px 12px",
      borderRadius: 16, fontWeight: 500,
      fontFamily: "inherit",
      boxSizing: "border-box" as const,
    },
    itemSide: { width: 240, padding: 16, background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" as const, gap: 12 },
    sideSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
    sideTitle: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.6, textTransform: "uppercase" as const },
    sideTitleLocation: {
      fontSize: 11,
      fontWeight: 700,
      color: "#f97316",
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
    },
    sideTitleSeller: {
      fontSize: 11,
      fontWeight: 700,
      color: "rgb(15, 118, 110)",
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
    },
    sideDivider: { height: 1, background: "#e2e8f0", width: "100%" },
    metaRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 },
    metaIcon: { color: "#64748b" },
    metaMuted: { color: "#94a3b8", fontWeight: 600 },
    empty: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 800,
      color: "#0f172a",
      margin: "0 0 12px 0",
      letterSpacing: "-0.015em",
      lineHeight: 1.2,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    emptyText: {
      fontSize: 15,
      color: "#64748b",
      margin: 0,
      lineHeight: 1.6,
      fontWeight: 500,
    },
    loading: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
    pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, flexWrap: "wrap" },
    paginationButton: { minWidth: 36, height: 36, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", color: "#1f2937", fontWeight: 600, cursor: "pointer", padding: "0 10px" },
    paginationButtonActive: { background: "#0f766e", borderColor: "#0f766e", color: "#fff" },
    paginationButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },
    paginationEllipsis: { color: "#94a3b8", fontWeight: 600, padding: "0 4px" },
    paginationInfo: { fontSize: 13, color: "#64748b", fontWeight: 600 },
    skeletonCard: {
      background: "#fff",
      borderRadius: 16, overflow: "hidden",
      border: "none",
      boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
      display: "flex",
      position: "relative" as const,
    },
    skeletonPhoto: { width: 280, flexShrink: 0, display: "flex", flexDirection: "column" as const },
    skeletonImage: { width: "100%", height: 194, ...skeletonBase },
    skeletonThumb: { width: "100%", aspectRatio: "4 / 3", borderRadius: 16, ...skeletonBase },
    skeletonMain: { flex: 1, padding: 20, display: "flex", flexDirection: "column" as const, gap: 12 },
    skeletonSide: { width: 240, padding: 16, borderLeft: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column" as const, gap: 10 },
    skeletonTitle: { height: 22, width: "60%", borderRadius: 16, ...skeletonBase },
    skeletonPrice: { height: 26, width: "40%", borderRadius: 16, ...skeletonBase },
    skeletonChip: { height: 28, width: 90, borderRadius: 999, ...skeletonBase },
    skeletonDesc: { height: 14, width: "100%", borderRadius: 16, ...skeletonBase },
    skeletonSideLine: { height: 14, width: "80%", borderRadius: 16, ...skeletonBase },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 16,
    },
    modalCard: {
      background: "#fff",
      borderRadius: 16, padding: 24,
      maxWidth: 400,
      width: "100%",
      boxSizing: "border-box",
      boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 800,
      color: "#0f172a",
      margin: "0 0 16px 0",
      letterSpacing: "-0.01em",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    modalInput: {
      width: "100%",
      padding: "10px 12px",
      border: "1.5px solid #e5e7eb",
      borderRadius: 16, fontSize: 14,
      marginBottom: 16,
      outline: "none",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    modalActions: { display: "flex", gap: 12, justifyContent: "flex-end" },
    modalButtonCancel: {
      padding: "10px 20px",
      borderRadius: 16, fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      background: "#f3f4f6",
      border: "1px solid #e5e7eb",
      color: "#6b7280",
    },
    modalButtonSave: {
      padding: "10px 20px",
      borderRadius: 16, fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      background: "#d97706",
      border: "none",
      color: "#fff",
    },
  };

  return (
    <div style={styles.page} className="search-page">
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .search-result-item:hover {
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12) !important;
          transform: translateY(-4px);
        }

        .search-save-btn:hover {
          background: #ea580c !important;
          border-color: #ea580c !important;
        }

        .search-modal-btn-cancel:hover {
          background: #e5e7eb !important;
        }

        .search-modal-btn-save:hover {
          background: #ea580c !important;
        }

        .search-result-item {
          border-color: #dbe3ee !important;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
        }

        .search-photo-main {
          border-top-left-radius: 6px;
          overflow: visible;
        }

        .search-thumb-strip {
          background: #f8fafc !important;
        }

        .search-criteria {
          scrollbar-width: thin;
        }

        .search-item-description {
          max-width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: flex-start;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: normal;
        }

        .search-item-description-content {
          display: -webkit-box;
          width: 100%;
          -webkit-line-clamp: 3;
          line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: normal;
        }

        .search-mobile-promo-badge {
          display: none;
        }

        .search-mobile-main-specs,
        .search-mobile-meta-row {
          display: none;
        }

        @media (max-width: 1023px) {
          .search-page {
            padding-top: 12px !important;
            padding-bottom: 24px !important;
          }
          .search-container {
            padding: 0 14px !important;
          }
          .search-header {
            padding: 18px !important;
            margin-bottom: 18px !important;
          }
          .search-title {
            font-size: clamp(1.85rem, 4.1vw, 2.3rem) !important;
            line-height: 1.1 !important;
          }
          .search-item-row {
            flex-direction: column !important;
          }
          .search-item-photo {
            width: 100% !important;
          }
          .search-photo-main {
            height: clamp(210px, 42vw, 268px) !important;
            border-top-left-radius: 16px !important;
            border-top-right-radius: 16px !important;
          }
          .search-thumb-strip {
            padding: 8px !important;
            gap: 6px !important;
          }
          .search-item-text {
            min-height: 0 !important;
          }
          .search-item-main {
            padding: 14px !important;
          }
          .search-item-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .search-item-header-main {
            width: 100% !important;
          }
          .search-item-price {
            width: 100% !important;
            display: flex !important;
            align-items: baseline !important;
            justify-content: space-between !important;
            gap: 10px !important;
            margin-bottom: 0 !important;
          }
          .search-item-price-small {
            font-size: 12px !important;
            line-height: 1.2 !important;
          }
          .search-item-param {
            font-size: 12px !important;
            padding: 6px 9px !important;
          }
          .search-item-description {
            font-size: 13.5px !important;
            line-height: 1.55 !important;
            -webkit-line-clamp: 3 !important;
          }
          .search-item-side {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid #e2e8f0 !important;
            padding: 12px 14px !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px !important;
          }
          .search-side-section {
            min-width: 0;
          }
          .search-meta-row {
            font-size: 12px !important;
          }
          .search-skeleton-photo,
          .search-skeleton-side {
            width: 100% !important;
          }
          .search-skeleton-card {
            flex-direction: column !important;
          }
          .search-skeleton-side {
            border-left: none !important;
            border-top: 1px solid #e2e8f0 !important;
          }
          .search-skeleton-main {
            padding: 14px !important;
          }
        }

        @media (max-width: 767px) {
          .search-page {
            padding-top: 10px !important;
          }
          .search-container {
            padding: 0 10px !important;
          }
          .search-header {
            padding: 14px !important;
            border-radius: 16px !important;
            margin-bottom: 14px !important;
          }
          .search-header-top {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .search-title {
            font-size: clamp(1.45rem, 6.2vw, 1.85rem) !important;
            line-height: 1.1 !important;
          }
          .search-save-btn {
            width: 100% !important;
            justify-content: center !important;
            min-height: 44px !important;
            border-radius: 14px !important;
          }
          .search-summary-line {
            font-size: 14px !important;
            line-height: 1.45 !important;
            margin-top: 12px !important;
          }
          .search-criteria {
            margin-top: 12px !important;
            gap: 8px !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            padding-bottom: 2px;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .search-criteria::-webkit-scrollbar {
            display: none;
          }
          .search-criteria-tag {
            flex: 0 0 auto;
            font-size: 12px !important;
            padding: 6px 10px !important;
            border-radius: 999px !important;
          }
          .search-results {
            gap: 14px !important;
          }
          .search-result-item {
            border-radius: 16px !important;
            overflow: visible !important;
            border: 1px solid #e5e7eb !important;
            background: #fff !important;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
          }
          .search-inline-promo-badge {
            display: none !important;
          }
          .search-mobile-promo-badge {
            display: inline !important;
          }
          .search-mobile-promo-badge > span {
            left: -18px !important;
          }
          .search-item-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .search-item-photo {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            border-right: none !important;
          }
          .search-photo-main {
            height: clamp(176px, 50vw, 216px) !important;
            min-height: 176px !important;
            border-top-left-radius: 16px !important;
            border-top-right-radius: 16px !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
            overflow: hidden !important;
          }
          .search-favorite-btn {
            width: 38px !important;
            height: 38px !important;
          }
          .search-thumb-strip {
            display: none !important;
          }
          .search-item-text {
            min-height: 0 !important;
            display: block !important;
          }
          .search-item-main {
            min-width: 0 !important;
            padding: 14px 15px 13px !important;
            gap: 9px !important;
          }
          .search-item-header {
            margin-bottom: 0 !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            gap: 8px !important;
          }
          .search-item-header-main {
            width: 100% !important;
            min-width: 0 !important;
            flex: 1 !important;
          }
          .search-item-title {
            font-size: 16.5px !important;
            line-height: 1.3 !important;
            margin: 0 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .search-item-price {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 6px 8px !important;
            font-size: 22px !important;
            text-align: left !important;
            line-height: 1.1 !important;
            flex-shrink: 0 !important;
            margin-bottom: 0 !important;
          }
          .search-price-change-badge {
            margin-left: 0 !important;
            margin-top: 0 !important;
            padding: 3px 8px !important;
            font-size: 10px !important;
            gap: 4px !important;
          }
          .search-item-price-small {
            font-size: 12px !important;
            color: #64748b !important;
            width: auto !important;
          }
          .search-item-params {
            display: none !important;
          }
          .search-mobile-main-specs {
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            gap: 5px !important;
            flex-wrap: nowrap !important;
            overflow: hidden !important;
          }
          .search-mobile-main-spec {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex: 1 1 0 !important;
            min-width: 0 !important;
            padding: 6px 6px !important;
            font-size: 11.5px !important;
            font-weight: 700 !important;
            color: #0f172a !important;
            background: #ecfdf5 !important;
            border: 1px solid #99f6e4 !important;
            border-radius: 999px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .search-mobile-meta-row {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            gap: 10px !important;
            width: 100% !important;
            font-size: 12.5px !important;
            color: #64748b !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 1px !important;
          }
          .search-mobile-meta-row::-webkit-scrollbar {
            display: none;
          }
          .search-mobile-meta-item {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex: 0 0 auto !important;
            min-width: 0 !important;
          }
          .search-mobile-meta-item svg {
            width: 15px !important;
            height: 15px !important;
            flex-shrink: 0 !important;
            color: #0f766e !important;
          }
          .search-mobile-meta-item-text {
            display: block !important;
            font-size: inherit !important;
            font-weight: 600 !important;
            white-space: nowrap !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          .search-item-param {
            font-size: 12px !important;
            padding: 5px 9px !important;
          }
          .search-item-param:nth-child(n + 5) {
            display: none !important;
          }
          .search-item-description,
          .search-item-side,
          .search-side-section,
          .search-side-divider {
            display: none !important;
          }
          .search-skeleton-card {
            flex-direction: column !important;
          }
          .search-skeleton-photo {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            border-right: none !important;
          }
          .search-skeleton-main {
            padding: 14px !important;
          }
          .search-skeleton-side {
            display: none !important;
          }
          .search-pagination {
            justify-content: center !important;
            gap: 6px !important;
            margin-top: 18px !important;
          }
          .search-pagination button {
            min-height: 38px !important;
            border-radius: 12px !important;
          }
          .search-pagination-info {
            width: 100%;
            text-align: center;
            margin-top: 4px;
            font-size: 12px !important;
          }
          .search-modal-card {
            width: min(100%, 420px) !important;
            padding: 16px !important;
            border-radius: 14px !important;
          }
        }

        @media (max-width: 520px) {
          .search-container {
            padding: 0 8px !important;
          }
          .search-result-item {
            border-radius: 14px !important;
          }
          .search-photo-main {
            height: 168px !important;
            min-height: 168px !important;
            border-top-left-radius: 14px !important;
            border-top-right-radius: 14px !important;
          }
          .search-item-main {
            padding: 12px 13px !important;
          }
          .search-item-title {
            font-size: 15px !important;
          }
          .search-item-price {
            font-size: 19px !important;
          }
          .search-item-price-small {
            font-size: 11px !important;
          }
          .search-price-change-badge {
            display: none !important;
          }
          .search-mobile-promo-badge > span {
            left: -14px !important;
          }
          .search-mobile-main-spec {
            font-size: 10.5px !important;
            padding: 5px 5px !important;
          }
          .search-mobile-meta-row {
            font-size: 11.5px !important;
            gap: 7px !important;
          }
          .search-mobile-meta-item svg {
            width: 14px !important;
            height: 14px !important;
          }
          .search-item-param {
            font-size: 11px !important;
            padding: 5px 8px !important;
          }
          .search-item-param:nth-child(n + 4) {
            display: none !important;
          }
          .search-save-btn {
            min-height: 42px !important;
            font-size: 12px !important;
          }
        }

        @media (hover: none) {
          .search-result-item:hover {
            box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important;
            transform: none !important;
          }
        }
      `}</style>
      <div style={styles.container} className="search-container">
        <div style={styles.header} className="search-header">
          <div style={styles.headerTop} className="search-header-top">
            <h1 style={styles.title} className="search-title">Резултати от търсене</h1>
            <button
              type="button"
              className="search-save-btn"
              style={styles.saveSearchButton}
              onClick={openSaveSearchModal}
            >
              <Bookmark size={16} style={{ marginRight: 6 }} />
              Запази търсене
            </button>
          </div>
          <p style={styles.headerLead}>Намерените обяви според избраните филтри</p>
          {saveSearchFeedback && <div style={styles.saveSearchFeedback}>{saveSearchFeedback}</div>}
          {searchCriteriaDisplay.length > 0 && (
            <div style={styles.criteria} className="search-criteria">
              {searchCriteriaDisplay.map((criterion, idx) => (
                <span key={idx} style={styles.criteriaTag} className="search-criteria-tag">{criterion}</span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 15, color: "#555", margin: "16px 0 0 0", fontWeight: 500 }} className="search-summary-line">
            1 - 20 от общо{" "}
            <strong style={{ color: "rgb(15, 118, 110)" }}>{totalListings}</strong> намерени обяви за{" "}
            <strong style={{ color: "rgb(15, 118, 110)" }}>{listingsScopeLabel}</strong>
          </p>
          <div style={styles.headerDivider} />
        </div>

        {isLoading ? (
          <div style={styles.results} className="search-results">
            {skeletonRows.map((index) => (
              <div key={`skeleton-${index}`} style={styles.skeletonCard} className="search-skeleton-card">
                <div style={styles.skeletonPhoto} className="search-skeleton-photo">
                  <div style={styles.skeletonImage} />
                  <div style={styles.thumbStrip} className="search-thumb-strip">
                    {Array.from({ length: 3 }, (_, thumbIndex) => (
                      <div key={`skeleton-thumb-${index}-${thumbIndex}`} style={styles.thumb}>
                        <div style={styles.skeletonThumb} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.itemText}>
                  <div style={styles.skeletonMain} className="search-skeleton-main">
                    <div style={styles.skeletonTitle} />
                    <div style={styles.skeletonPrice} />
                    <div style={styles.itemParams}>
                      {Array.from({ length: 5 }, (_, chipIndex) => (
                        <div key={`skeleton-chip-${index}-${chipIndex}`} style={styles.skeletonChip} />
                      ))}
                    </div>
                    <div style={styles.skeletonDesc} />
                    <div style={{ ...styles.skeletonDesc, width: "85%" }} />
                  </div>
                  <div style={styles.skeletonSide} className="search-skeleton-side">
                    <div style={styles.skeletonSideLine} />
                    <div style={styles.skeletonSideLine} />
                    <div style={{ ...styles.skeletonSideLine, width: "60%" }} />
                    <div style={{ ...styles.skeletonSideLine, width: "70%" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={styles.empty}>
            <h3 style={styles.emptyTitle}>Грешка при зареждане</h3>
            <p style={styles.emptyText}>{error}</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div style={styles.results} className="search-results">
              {results.map((listing, index) => {
                  const isTop = isTopListing(listing);
                  const isVip = isVipListing(listing);
                  const isNewListing = isListingNew(listing.created_at);
                  const isPriorityImage = index < 3;
                  const sellerLabel = listing.seller_name || "Частно лице";
                  const locationLabel =
                    [listing.location_country, listing.city].filter(Boolean).join(", ") || "Не е посочено";
                  const updatedLabel =
                    listing.updated_at && listing.updated_at !== listing.created_at
                      ? getRelativeTime(listing.updated_at, "Редактирана")
                      : null;
                  const priceBadge = resolvePriceBadgeState(listing.price_change);
                  const showPriceChange = Boolean(priceBadge);
                  const PriceChangeIcon =
                    priceBadge?.kind === "announced"
                      ? Clock
                      : priceBadge?.kind === "up"
                        ? TrendingUp
                        : TrendingDown;
              const sellerTypeLabel =
                listing.seller_type === "business"
                  ? "Търговец"
                  : listing.seller_type === "private"
                    ? "Частно лице"
                    : "Не е посочено";
              const SellerTypeIcon =
                listing.seller_type === "business"
                  ? Building2
                  : listing.seller_type === "private"
                    ? BadgeCheck
                    : HelpCircle;
              const images = listing.images || [];
              const mainImagePath = listing.image_url || images[0]?.image;
              const mainImageUrl = mainImagePath ? getImageUrl(mainImagePath) : "";
              const extraImages = images.slice(1);
              const maxThumbs = 3;
              const thumbItems: Array<{ type: "image" | "more" | "placeholder"; src?: string; label?: string }> = [];

              if (extraImages.length > maxThumbs) {
                extraImages.slice(0, maxThumbs - 1).forEach((img) => {
                  thumbItems.push({ type: "image", src: getImageUrl(img.image) });
                });
                thumbItems.push({ type: "more", label: `+${extraImages.length - (maxThumbs - 1)}` });
              } else {
                extraImages.forEach((img) => {
                  thumbItems.push({ type: "image", src: getImageUrl(img.image) });
                });
              }

              while (thumbItems.length < maxThumbs) {
                thumbItems.push({ type: "placeholder" });
              }
              const listingTitle = (listing.title || `${listing.brand} ${listing.model}`).trim() || "Обява";
              const technicalParams = getListingTechnicalParams(listing);
              const mobileYear = listing.year_from ? `${listing.year_from} г.` : "";
              const mobileMileageNumeric = toPositiveNumber(listing.mileage);
              const mobileMileage =
                mobileMileageNumeric !== null
                  ? `${Math.round(mobileMileageNumeric).toLocaleString("bg-BG")} км`
                  : "";
              const mobileFuel = formatFuelLabel(listing.fuel_display || listing.fuel);
              const mobileMainSpecs = [mobileYear, mobileMileage, mobileFuel].filter(Boolean);
              const mobilePublishedLabel = getRelativeTimeCompact(listing.created_at);
              const mobileRegionLabel =
                toText(listing.location_region) || toText(listing.city) || toText(listing.location_country) || "Не е посочено";
              const mobileSellerLabel = sellerTypeLabel || sellerLabel;

                return (
                  <div
                    key={listing.id}
                    className="search-result-item"
                    style={styles.item}
                    onClick={() => openListing(listing.slug)}
                  >
                    {isTop && (
                      <span className="search-mobile-promo-badge">
                        <ListingPromoBadge type="top" size="xs" />
                      </span>
                    )}
                    {isVip && (
                      <span className="search-mobile-promo-badge">
                        <ListingPromoBadge type="vip" size="xs" />
                      </span>
                    )}
                    <div style={styles.itemRow} className="search-item-row">
                      <div style={styles.itemPhoto} className="search-item-photo">
                        <div style={styles.photoMain} className="search-photo-main">
                          {isTop && (
                            <span className="search-inline-promo-badge">
                              <ListingPromoBadge type="top" />
                            </span>
                          )}
                          {isVip && (
                            <span className="search-inline-promo-badge">
                              <ListingPromoBadge type="vip" />
                            </span>
                          )}
                          {listing.is_kaparirano && <KapariranoBadge />}
                          {isNewListing && (
                            <div style={{ ...styles.newBadge, top: "auto", bottom: 10, left: 10 }}>
                              Нова
                            </div>
                          )}
                          {mainImageUrl ? (
                            <>
                              <img
                                src={mainImageUrl}
                                alt={listingTitle}
                                style={styles.itemImage}
                                loading={isPriorityImage ? "eager" : "lazy"}
                                decoding="async"
                                fetchPriority={isPriorityImage ? "high" : "low"}
                              />
                              <div style={styles.itemPhotoOverlay}>
                                <button
                                  className="search-favorite-btn"
                                  style={{
                                    ...styles.favoriteButton,
                                    background: listing.is_favorited ? "#ff4458" : "rgba(255,255,255,0.95)",
                                  }}
                                  onClick={(e) => toggleFavorite(e, listing.id, listing.is_favorited || false)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                  }}
                                  title={listing.is_favorited ? "Премахни от бележника" : "Добави в бележника"}
                                >
                                  <Heart
                                    size={22}
                                    color={listing.is_favorited ? "#fff" : "#ff4458"}
                                    fill={listing.is_favorited ? "#fff" : "none"}
                                  />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div style={styles.photoPlaceholder}>
                              <ImageOff size={26} />
                              <span>Снимка</span>
                            </div>
                          )}
                        </div>
                        <div style={styles.thumbStrip} className="search-thumb-strip">
                          {thumbItems.map((thumb, index) => {
                            if (thumb.type === "image" && thumb.src) {
                              return (
                                <div key={`thumb-${listing.id}-${index}`} style={styles.thumb}>
                                  <img
                                    src={thumb.src}
                                    alt={`Допълнителна снимка ${index + 1}`}
                                    style={styles.thumbImage}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>
                              );
                            }

                            if (thumb.type === "more") {
                              return (
                                <div key={`thumb-more-${listing.id}-${index}`} style={{ ...styles.thumb, ...styles.thumbMore }}>
                                  {thumb.label}
                                </div>
                              );
                            }

                            return (
                              <div key={`thumb-placeholder-${listing.id}-${index}`} style={styles.thumb}>
                                <ImageOff size={16} style={styles.thumbPlaceholder} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={styles.itemText} className="search-item-text">
                        <div style={styles.itemMain} className="search-item-main">
                          <div style={styles.itemHeader} className="search-item-header">
                            <div style={styles.itemHeaderMain} className="search-item-header-main">
                              <a
                                href={`/details/${listing.slug}`}
                                style={styles.itemTitle}
                                className="search-item-title"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.defaultPrevented) return;
                                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
                                  e.preventDefault();
                                  openListing(listing.slug);
                                }}
                              >
                                {listingTitle}
                              </a>
                            </div>
                            <div style={styles.itemPrice} className="search-item-price">
                              € {listing.price.toLocaleString("bg-BG")}
                              {showPriceChange && (
                                <span
                                  className="search-price-change-badge"
                                  style={{
                                    ...styles.priceChangeBadge,
                                    ...(priceBadge?.kind === "up"
                                      ? styles.priceChangeUp
                                      : priceBadge?.kind === "down"
                                        ? styles.priceChangeDown
                                        : styles.priceChangeAnnounced),
                                  }}
                                  title={priceBadge?.title}
                                >
                                  <PriceChangeIcon size={14} />
                                  <span style={styles.priceChangeText}>
                                    {priceBadge?.kind === "up"
                                      ? "Повишена"
                                      : priceBadge?.kind === "down"
                                        ? "Намалена"
                                        : "Обявена цена"}
                                  </span>
                                  {priceBadge?.kind !== "announced" && priceBadge?.amountLabel && (
                                    <span>
                                      {priceBadge.kind === "up" ? "+" : "-"}
                                      {priceBadge.amountLabel}
                                    </span>
                                  )}
                                </span>
                              )}
                              <div style={styles.itemPriceSmall} className="search-item-price-small">
                                {(listing.price * 1.96).toLocaleString("bg-BG", { maximumFractionDigits: 2 })} лв.
                              </div>
                            </div>
                          </div>
                          <div style={styles.itemParams} className="search-item-params">
                            {technicalParams.map((param, paramIndex) => {
                              const Icon = param.icon;
                              return (
                                <span key={`${listing.id}-param-${paramIndex}`} style={styles.itemParam} className="search-item-param">
                                  <Icon size={16} style={styles.paramIcon} />
                                  <span style={styles.itemParamValueBlack}>
                                    {param.label}: {param.value}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                          {mobileMainSpecs.length > 0 && (
                            <div className="search-mobile-main-specs" aria-label="Основни параметри">
                              {mobileMainSpecs.map((spec, specIndex) => (
                                <span key={`${listing.id}-mobile-spec-${specIndex}`} className="search-mobile-main-spec">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="search-mobile-meta-row" aria-label="Информация за обявата">
                            <span className="search-mobile-meta-item">
                              <Clock size={13} />
                              <span className="search-mobile-meta-item-text">{mobilePublishedLabel}</span>
                            </span>
                            <span className="search-mobile-meta-item">
                              <MapPin size={13} />
                              <span className="search-mobile-meta-item-text">{mobileRegionLabel}</span>
                            </span>
                            <span className="search-mobile-meta-item">
                              <User size={13} />
                              <span className="search-mobile-meta-item-text">{mobileSellerLabel}</span>
                            </span>
                          </div>
                          {(listing.description_preview || listing.description) && (
                            <div style={styles.itemDescription} className="search-item-description">
                              <span className="search-item-description-content">
                                {listing.description_preview || listing.description}
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={styles.itemSide} className="search-item-side">
                          <div style={styles.sideSection} className="search-side-section">
                            <div style={styles.sideTitleLocation}>Локация</div>
                            <div style={styles.metaRow} className="search-meta-row">
                              <MapPin size={16} style={styles.metaIcon} />
                              <span style={!locationLabel || locationLabel === "Не е посочено" ? styles.metaMuted : undefined}>
                                {locationLabel}
                              </span>
                            </div>
                          </div>
                          <div style={styles.sideDivider} className="search-side-divider" />
                          <div style={styles.sideSection} className="search-side-section">
                            <div style={styles.sideTitleSeller}>Продавач</div>
                            <div style={styles.metaRow} className="search-meta-row">
                              <User size={16} style={styles.metaIcon} />
                              <span style={!listing.seller_name ? styles.metaMuted : undefined}>
                                {sellerLabel}
                              </span>
                            </div>
                            <div style={styles.metaRow} className="search-meta-row">
                              <SellerTypeIcon size={16} style={styles.metaIcon} />
                              <span style={listing.seller_type ? undefined : styles.metaMuted}>{sellerTypeLabel}</span>
                            </div>
                          </div>
                          <div style={styles.sideDivider} className="search-side-divider" />
                          <div style={styles.sideSection} className="search-side-section">
                            <div style={styles.sideTitle}>Детайли</div>
                            <div style={styles.metaRow} className="search-meta-row">
                              <Clock size={16} style={styles.metaIcon} />
                              <span>{getRelativeTime(listing.created_at, "Публикувана")}</span>
                            </div>
                            {updatedLabel && (
                              <div style={styles.metaRow} className="search-meta-row">
                                <PencilLine size={16} style={styles.metaIcon} />
                                <span>{updatedLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          {totalPages > 1 && (
            <div style={styles.pagination} className="search-pagination">
              <button
                type="button"
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
                }}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Предишна
              </button>
              {visiblePages.map((page, index) => {
                const prevPage = visiblePages[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                return (
                  <React.Fragment key={`page-${page}`}>
                    {showEllipsis && <span style={styles.paginationEllipsis}>...</span>}
                    <button
                      type="button"
                      style={{
                        ...styles.paginationButton,
                        ...(page === currentPage ? styles.paginationButtonActive : {}),
                      }}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
              <button
                type="button"
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages ? styles.paginationButtonDisabled : {}),
                }}
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Следваща
              </button>
              <span style={styles.paginationInfo} className="search-pagination-info">
                Страница {currentPage} от {totalPages}
              </span>
            </div>
          )}
          </>
        ) : (
          <div style={styles.empty}>
            <h3 style={styles.emptyTitle}>Няма намерени обяви</h3>
            <p style={styles.emptyText}>Опитайте да промените филтрите или се върнете на начална страница</p>
          </div>
        )}

        {showSaveModal && (
          <div style={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
            <div style={styles.modalCard} className="search-modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Запази търсене</h3>
              <input
                type="text"
                style={styles.modalInput}
                placeholder="Име на търсенето (напр. BMW 320 София)"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSaveSearch();
                }}
                autoFocus
              />
              <div style={styles.modalActions}>
                <button
                  type="button"
                  className="search-modal-btn-cancel"
                  style={styles.modalButtonCancel}
                  onClick={() => setShowSaveModal(false)}
                >
                  Отказ
                </button>
                <button
                  type="button"
                  className="search-modal-btn-save"
                  style={styles.modalButtonSave}
                  onClick={submitSaveSearch}
                >
                  Запази
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

