import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Trash2,
  Edit2,
  ArchiveRestore,
  Heart,
  List,
  Eye,
  FileText,
  Lock,
  Inbox,
  Car,
  PackageOpen,
  Clock,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Fuel,
  Gauge,
  Zap,
  Settings,
  Ruler,
  Palette,
  ShieldCheck,
  Leaf,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  formatConditionLabel,
  formatEuroStandardLabel,
  formatFuelLabel,
  formatGearboxLabel,
} from "../utils/listingLabels";
import { getMainCategoryLabel } from "../constants/mobileBgData";
import {
  readMyAdsCache,
  writeMyAdsCache,
  invalidateMyAdsCache,
} from "../utils/myAdsCache";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";
import topBadgeImage from "../assets/top_badge.png";
import vipBadgeImage from "../assets/vip_badge.jpg";

interface CarListing {
  id: number;
  slug: string;
  main_category: string;
  category: string;
  brand: string;
  model: string;
  year_from: number;
  month: number;
  vin: string;
  price: number;
  location_country: string;
  location_region: string;
  city: string;
  title: string;
  fuel: string;
  gearbox: string;
  mileage: number;
  color: string;
  condition: string;
  power: number;
  displacement: number;
  euro_standard: string;
  description: string;
  images: Array<{ id: number; image: string; thumbnail?: string | null }>;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  is_archived: boolean;
  is_draft: boolean;
  listing_type?: "top" | "vip" | "normal" | string;
  listing_type_display?: string;
  top_expires_at?: string;
  vip_plan?: "7d" | "lifetime" | string;
  vip_expires_at?: string;
  price_history?: Array<{
    old_price: number | string;
    new_price: number | string;
    delta: number | string;
    changed_at: string;
  }>;
  wheel_for?: string;
  offer_type?: string;
  tire_brand?: string;
  tire_width?: string;
  tire_height?: string;
  tire_diameter?: string;
  tire_season?: string;
  tire_speed_index?: string;
  tire_load_index?: string;
  tire_tread?: string;
  wheel_brand?: string;
  material?: string;
  bolts?: number | string | null;
  pcd?: string;
  center_bore?: string;
  offset?: string;
  width?: string;
  diameter?: string;
  count?: number | string | null;
  wheel_type?: string;
  part_for?: string;
  part_category?: string;
  part_element?: string;
  part_year_from?: number | string | null;
  part_year_to?: number | string | null;
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
}

type PreviewImageSource = {
  full: string;
  thumb: string;
};

type MyAdsNavigationState = {
  forceRefresh?: boolean;
  publishMessage?: string;
  publishedListingId?: number | null;
};

type TabType = "active" | "archived" | "drafts" | "liked" | "top" | "expired";
type ListingType = "normal" | "top" | "vip";
type VipPlan = "7d" | "lifetime";
// Change this value to control how long the "Нова" badge remains visible.
const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const NEW_LISTING_BADGE_REFRESH_MS = 30_000;
const TOP_LISTING_PRICE_1D_EUR = 2.49;
const VIP_LISTING_PRICE_7D_EUR = 1.99;
const VIP_LISTING_PRICE_LIFETIME_EUR = 6.99;
const PAGE_SIZE = 21;
const CATEGORY_AS_BRAND_MAIN_CATEGORIES = new Set(["6", "7", "8", "a", "b"]);
const GENERIC_BRAND_TERMS = new Set([
  "трактор",
  "трактори",
  "багер",
  "багери",
  "товарач",
  "товарачи",
  "челен товарач",
  "комбайн",
  "комбайни",
  "кран",
  "кранове",
  "мотокар",
  "мотокари",
  "булдозер",
  "булдозери",
  "грейдер",
  "грейдери",
  "валяк",
  "валяци",
  "tractor",
  "excavator",
  "loader",
  "combine",
  "crane",
  "forklift",
  "bulldozer",
  "grader",
  "roller",
  "telehandler",
]);

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; }
  input, select, button { font-family: inherit; }
`;

const MyAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = (location.state as MyAdsNavigationState | null) ?? null;
  const forceRefreshFromPublish = navigationState?.forceRefresh === true;
  const { isAuthenticated, user, updateBalance } = useAuth();
  const getImageUrl = useImageUrl();
  const [activeListings, setActiveListings] = useState<CarListing[]>([]);
  const [archivedListings, setArchivedListings] = useState<CarListing[]>([]);
  const [draftListings, setDraftListings] = useState<CarListing[]>([]);
  const [expiredListings, setExpiredListings] = useState<CarListing[]>([]);
  const [likedListings, setLikedListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showTopConfirm, setShowTopConfirm] = useState(false);
  const [topConfirmApproved, setTopConfirmApproved] = useState(false);
  const [listingTypeModal, setListingTypeModal] = useState<{
    isOpen: boolean;
    listingId: number | null;
    listingTitle: string;
    mode: "republish" | "promote";
    selectedType: ListingType;
    vipPlan: VipPlan;
  }>({
    isOpen: false,
    listingId: null,
    listingTitle: "",
    mode: "republish",
    selectedType: "normal",
    vipPlan: "7d",
  });
  const [previewListing, setPreviewListing] = useState<CarListing | null>(null);
  const [previewTab, setPreviewTab] = useState<TabType | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      invalidateMyAdsCache();
      setIsLoading(false);
      return;
    }

    if (forceRefreshFromPublish) {
      invalidateMyAdsCache(user?.id);
    }

    const cachedPayload = forceRefreshFromPublish ? null : readMyAdsCache<CarListing>(user?.id);
    if (cachedPayload) {
      setActiveListings(cachedPayload.activeListings);
      setArchivedListings(cachedPayload.archivedListings);
      setDraftListings(cachedPayload.draftListings);
      setExpiredListings(cachedPayload.expiredListings);
      setLikedListings(cachedPayload.likedListings);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchUserListings = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Липсва токен за достъп");
        }

        const normalizeArrayPayload = (payload: unknown): unknown[] => {
          if (Array.isArray(payload)) return payload;
          if (
            payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { results?: unknown[] }).results)
          ) {
            return (payload as { results: unknown[] }).results;
          }
          return [];
        };

        const fetchList = async (url: string): Promise<unknown[]> => {
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error(`${url} -> ${response.status}`);
          }

          const raw = await response.text();
          if (!raw) return [];

          try {
            return normalizeArrayPayload(JSON.parse(raw));
          } catch {
            return [];
          }
        };

        const [activeRes, archivedRes, draftsRes, expiredRes, favoritesRes] = await Promise.allSettled([
          fetchList("http://localhost:8000/api/my-listings/"),
          fetchList("http://localhost:8000/api/my-archived/"),
          fetchList("http://localhost:8000/api/my-drafts/"),
          fetchList("http://localhost:8000/api/my-expired/"),
          fetchList("http://localhost:8000/api/my-favorites/"),
        ]);

        const allResults = [activeRes, archivedRes, draftsRes, expiredRes, favoritesRes];
        const hasAnySuccess = allResults.some((result) => result.status === "fulfilled");
        if (!hasAnySuccess) {
          throw new Error("Failed to fetch listings");
        }

        const settledValue = (result: PromiseSettledResult<unknown[]>) =>
          result.status === "fulfilled" ? result.value : [];

        const activeData = settledValue(activeRes) as CarListing[];
        const archivedData = settledValue(archivedRes) as CarListing[];
        const draftsData = settledValue(draftsRes) as CarListing[];
        const expiredData = settledValue(expiredRes) as CarListing[];
        const favoritesData = settledValue(favoritesRes);

        const likedFromFavorites = favoritesData
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const favoriteItem = item as { listing?: unknown };
            if (favoriteItem.listing && typeof favoriteItem.listing === "object") {
              return favoriteItem.listing as CarListing;
            }
            return item as CarListing;
          })
          .filter(
            (listing): listing is CarListing =>
              Boolean(listing && typeof listing === "object" && "id" in listing)
          );

        setActiveListings(activeData);
        setArchivedListings(archivedData);
        setDraftListings(draftsData);
        setExpiredListings(expiredData);
        setLikedListings(likedFromFavorites);

        const hasFailedRequests = allResults.some((result) => result.status === "rejected");
        if (!hasFailedRequests) {
          writeMyAdsCache<CarListing>(user?.id, {
            activeListings: activeData,
            archivedListings: archivedData,
            draftListings: draftsData,
            expiredListings: expiredData,
            likedListings: likedFromFavorites,
          });
        } else {
          invalidateMyAdsCache(user?.id);
          console.warn("MyAds: partial fetch failure", allResults);
        }

        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An error occurred";
        setError(errorMsg);
        invalidateMyAdsCache(user?.id);
        setActiveListings([]);
        setArchivedListings([]);
        setDraftListings([]);
        setExpiredListings([]);
        setLikedListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserListings();
  }, [forceRefreshFromPublish, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!navigationState?.publishMessage) return;
    setToast({ message: navigationState.publishMessage, type: "success" });
  }, [navigationState?.publishMessage]);

  // Toast notification effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, NEW_LISTING_BADGE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const refreshBalance = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const response = await fetch("http://localhost:8000/api/auth/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.balance === "number") {
        updateBalance(data.balance);
      }
    } catch {
      // ignore balance refresh errors
    }
  };

  const goToEdit = (listing: CarListing) => {
    invalidateMyAdsCache(user?.id);
    navigate(`/publish?edit=${listing.id}`, { state: { listing } });
  };

  const openPreview = (listing: CarListing) => {
    setPreviewListing(listing);
    setPreviewTab(activeTab);
    setPreviewImageIndex(0);
  };

  const closePreview = () => {
    setPreviewListing(null);
    setPreviewTab(null);
  };

  const getCardImageSources = (listing: CarListing) => {
    const coverImage = (listing.images || []).find((img) => Boolean(img.image));
    const fullRaw = (listing.image_url || coverImage?.image || coverImage?.thumbnail || "").trim();
    const thumbRaw = (coverImage?.thumbnail || "").trim();
    const displayRaw = (thumbRaw || fullRaw).trim();
    const full = fullRaw ? getImageUrl(fullRaw) : "";
    const thumb = thumbRaw ? getImageUrl(thumbRaw) : full;
    const display = displayRaw ? getImageUrl(displayRaw) : "";
    if (!display) {
      return { display: "", full: "", thumb: "" };
    }
    return { display, full, thumb };
  };

  const getPreviewImages = (listing: CarListing): PreviewImageSource[] => {
    const orderedImages = listing.images || [];
    const resolved: PreviewImageSource[] = [];
    const seen = new Set<string>();

    const pushImage = (fullCandidate?: string | null, thumbCandidate?: string | null) => {
      const fullRaw = (fullCandidate || thumbCandidate || "").trim();
      const full = fullRaw ? getImageUrl(fullRaw) : "";
      if (!full || seen.has(full)) return;
      seen.add(full);
      const thumbRaw = (thumbCandidate || fullCandidate || "").trim();
      const thumb = thumbRaw ? getImageUrl(thumbRaw) : full;
      resolved.push({ full, thumb: thumb || full });
    };

    if (listing.image_url) {
      const coverMatch = orderedImages.find((img) => img.image === listing.image_url);
      pushImage(listing.image_url, coverMatch?.thumbnail);
    }

    orderedImages.forEach((img) => {
      pushImage(img.image, img.thumbnail || img.image);
    });

    return resolved;
  };

  const getPreviewStatusLabel = (tab: TabType | null) => {
    switch (tab) {
      case "archived":
        return "Архивирана";
      case "expired":
        return "Изтекла";
      case "drafts":
        return "Чернова";
      default:
        return "";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const getShortDescription = (text?: string, maxLength = 140) => {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength).trim()}…`;
  };

  const isListingNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = currentTimeMs - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  };

  const getTopRemainingLabel = (listing: CarListing) => {
    if (listing.listing_type !== "top") return "";
    if (!listing.top_expires_at) return "";
    const expiresAtMs = new Date(listing.top_expires_at).getTime();
    if (Number.isNaN(expiresAtMs)) return "";
    const diffMs = expiresAtMs - currentTimeMs;
    if (diffMs <= 0) return "";
    const totalMinutes = Math.ceil(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const minutes = totalMinutes - days * 24 * 60 - hours * 60;
    if (days > 0) return `ТОП изтича: ${days}д ${hours}ч`;
    if (hours > 0) return `ТОП изтича: ${hours}ч ${minutes}мин`;
    return `ТОП изтича: ${minutes}мин`;
  };

  const getVipRemainingLabel = (listing: CarListing) => {
    if (listing.listing_type !== "vip") return "";
    if (!listing.vip_expires_at) return "VIP активно";
    const expiresAtMs = new Date(listing.vip_expires_at).getTime();
    if (Number.isNaN(expiresAtMs)) return "";
    const diffMs = expiresAtMs - currentTimeMs;
    if (diffMs <= 0) return "";
    const totalMinutes = Math.ceil(diffMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const minutes = totalMinutes - days * 24 * 60 - hours * 60;
    if (days > 0) return `VIP изтича: ${days}д ${hours}ч`;
    if (hours > 0) return `VIP изтича: ${hours}ч ${minutes}мин`;
    return `VIP изтича: ${minutes}мин`;
  };

  const getVipPrice = (vipPlan: VipPlan) =>
    vipPlan === "lifetime" ? VIP_LISTING_PRICE_LIFETIME_EUR : VIP_LISTING_PRICE_7D_EUR;

  const getVipPlanLabel = (vipPlan: VipPlan) =>
    vipPlan === "lifetime" ? "до изтичане на обявата (30 дни)" : "за 7 дни";

  const openListingTypeModal = (
    listing: CarListing,
    mode: "republish" | "promote",
    defaultType: ListingType
  ) => {
    setTopConfirmApproved(false);
    setShowTopConfirm(false);
    setListingTypeModal({
      isOpen: true,
      listingId: listing.id,
      listingTitle: `${listing.brand} ${listing.model}`,
      mode,
      selectedType: defaultType,
      vipPlan: listing.vip_plan === "lifetime" ? "lifetime" : "7d",
    });
  };

  const closeListingTypeModal = () => {
    setShowTopConfirm(false);
    setTopConfirmApproved(false);
    setListingTypeModal((prev) => ({
      ...prev,
      isOpen: false,
      listingId: null,
    }));
  };

  const submitRepublish = async (
    listingId: number,
    listingType: ListingType,
    vipPlan: VipPlan
  ) => {
    if (listingType === "top") {
      const balance = user?.balance;
      if (typeof balance === "number" && balance < TOP_LISTING_PRICE_1D_EUR) {
        showToast("Недостатъчни средства", "error");
        return false;
      }
    } else if (listingType === "vip") {
      const balance = user?.balance;
      const vipPrice = getVipPrice(vipPlan);
      if (typeof balance === "number" && balance < vipPrice) {
        showToast("Недостатъчни средства", "error");
        return false;
      }
    }

    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/republish/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_type: listingType,
          top_plan: listingType === "top" ? "1d" : undefined,
          vip_plan: listingType === "vip" ? vipPlan : undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Неуспешно повторно публикуване на обявата";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const updatedListing = await response.json();

      setExpiredListings((prev) => prev.filter((l) => l.id !== listingId));
      setActiveListings((prev) => [
        updatedListing,
        ...prev.filter((l) => l.id !== listingId),
      ]);
      invalidateMyAdsCache(user?.id);
      showToast(
        listingType === "top"
          ? "Обявата е публикувана отново като ТОП!"
          : listingType === "vip"
            ? `Обявата е публикувана отново като VIP ${getVipPlanLabel(vipPlan)}.`
            : "Обявата е публикувана отново като нормална."
      );
      if (listingType === "top" || listingType === "vip") {
        await refreshBalance();
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Грешка при повторно публикуване";
      showToast(errorMsg, "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const submitListingTypeUpdate = async (
    listingId: number,
    listingType: ListingType,
    vipPlan: VipPlan
  ) => {
    if (listingType === "top") {
      const balance = user?.balance;
      if (typeof balance === "number" && balance < TOP_LISTING_PRICE_1D_EUR) {
        showToast("Недостатъчни средства", "error");
        return false;
      }
    } else if (listingType === "vip") {
      const balance = user?.balance;
      const vipPrice = getVipPrice(vipPlan);
      if (typeof balance === "number" && balance < vipPrice) {
        showToast("Недостатъчни средства", "error");
        return false;
      }
    }

    setActionLoading(listingId);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/listing-type/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_type: listingType,
          top_plan: listingType === "top" ? "1d" : undefined,
          vip_plan: listingType === "vip" ? vipPlan : undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Неуспешна промяна на типа на обявата";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const updatedListing = await response.json();
      setActiveListings((prev) =>
        prev.map((l) => (l.id === listingId ? updatedListing : l))
      );
      invalidateMyAdsCache(user?.id);
      showToast(
        listingType === "top"
          ? "Обявата е промотирана до ТОП!"
          : listingType === "vip"
            ? `Обявата е маркирана като VIP ${getVipPlanLabel(vipPlan)}.`
            : "Типът на обявата е обновен."
      );
      if (listingType === "top" || listingType === "vip") {
        await refreshBalance();
      }
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Грешка при промяна на типа";
      showToast(errorMsg, "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const executeListingTypeConfirm = async () => {
    if (!listingTypeModal.listingId) return;
    const { listingId, selectedType, mode, vipPlan } = listingTypeModal;
    const success =
      mode === "republish"
        ? await submitRepublish(listingId, selectedType, vipPlan)
        : await submitListingTypeUpdate(listingId, selectedType, vipPlan);
    if (success) {
      closeListingTypeModal();
    }
  };

  const handleListingTypeConfirm = async () => {
    if (!listingTypeModal.listingId) return;
    if (listingTypeModal.selectedType === "top" && !topConfirmApproved) {
      setShowTopConfirm(true);
      return;
    }
    await executeListingTypeConfirm();
  };

  const confirmTopListingAction = async () => {
    setTopConfirmApproved(true);
    setShowTopConfirm(false);
    await executeListingTypeConfirm();
  };

  const cancelTopListingAction = () => {
    setShowTopConfirm(false);
  };

  const handleArchive = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/archive/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to archive listing");

      // Optimistic UI update
      const listing = activeListings.find((l) => l.id === listingId);
      setActiveListings((prev) => prev.filter((l) => l.id !== listingId));
      if (listing) {
        setArchivedListings((prev) => [listing, ...prev]);
      }
      invalidateMyAdsCache(user?.id);
      showToast("Обявата е архивирана успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to archive listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/unarchive/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let errorMessage = "Failed to unarchive listing";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      // Optimistic UI update
      const listing = archivedListings.find((l) => l.id === listingId);
      setArchivedListings((prev) => prev.filter((l) => l.id !== listingId));
      if (listing) {
        setActiveListings((prev) => [listing, ...prev]);
      }
      invalidateMyAdsCache(user?.id);
      showToast("Обявата е активирана успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to unarchive listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deleteConfirm !== listingId) {
      setDeleteConfirm(listingId);
      return;
    }

    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete listing");

      // Optimistic UI update - remove from all lists
      setActiveListings((prev) => prev.filter((l) => l.id !== listingId));
      setArchivedListings((prev) => prev.filter((l) => l.id !== listingId));
      setDraftListings((prev) => prev.filter((l) => l.id !== listingId));
      setExpiredListings((prev) => prev.filter((l) => l.id !== listingId));
      setLikedListings((prev) => prev.filter((l) => l.id !== listingId));
      invalidateMyAdsCache(user?.id);
      setDeleteConfirm(null);
      showToast("Обявата е изтрита успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromFavorites = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/unfavorite/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to remove from favorites");

      // Optimistic UI update
      setLikedListings((prev) => prev.filter((l) => l.id !== listingId));
      invalidateMyAdsCache(user?.id);
      showToast("Премахнато от любими!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to remove from favorites";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
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
    if (fromYear && toYear) return `${fromYear} - ${toYear}`;
    return fromYear || toYear;
  };

  const normalizeBrandText = (value: unknown) =>
    toText(value)
      .toLowerCase()
      .replace(/[^a-zA-Z0-9а-яА-Я]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isGenericBrandLabel = (value: unknown) => {
    const normalized = normalizeBrandText(value);
    if (!normalized) return false;
    return GENERIC_BRAND_TERMS.has(normalized);
  };

  const pickBrandFromTitle = (title: string, blockedNormalized: Set<string>) => {
    const parts = title
      .split(/\s+/)
      .map((token) => token.replace(/[^a-zA-Z0-9а-яА-Я]+/g, "").trim())
      .filter(Boolean);

    for (const token of parts) {
      const normalized = normalizeBrandText(token);
      if (!normalized || normalized.length < 2) continue;
      if (!/^[a-zA-Zа-яА-Я]/.test(token)) continue;
      if (isGenericBrandLabel(token)) continue;
      if (blockedNormalized.has(normalized)) continue;
      return token;
    }
    return "";
  };

  const getEffectiveListingBrand = (listing: CarListing) => {
    const mainCategory = toText(listing.main_category);
    const rawBrand = toText(listing.brand);
    const rawModel = toText(listing.model);

    // For these categories, listing.brand stores type/category, and listing.model stores the actual brand.
    if (CATEGORY_AS_BRAND_MAIN_CATEGORIES.has(mainCategory)) {
      if (rawModel && !isGenericBrandLabel(rawModel)) return rawModel;
      if (rawBrand && !isGenericBrandLabel(rawBrand)) return rawBrand;
    }

    if (rawBrand && !isGenericBrandLabel(rawBrand)) return rawBrand;

    const wheelOrTireBrand = toText(listing.wheel_brand || listing.tire_brand);
    if (wheelOrTireBrand && !isGenericBrandLabel(wheelOrTireBrand)) return wheelOrTireBrand;

    const modelFirstToken = rawModel.split(/\s+/).find(Boolean) || "";
    if (
      modelFirstToken &&
      /^[a-zA-Zа-яА-Я]/.test(modelFirstToken) &&
      !isGenericBrandLabel(modelFirstToken)
    ) {
      return modelFirstToken;
    }

    const blockedNormalized = new Set<string>(
      [
        normalizeBrandText(rawBrand),
        normalizeBrandText(rawModel),
        normalizeBrandText(modelFirstToken),
        normalizeBrandText(listing.category),
      ].filter(Boolean)
    );
    const brandFromTitle = pickBrandFromTitle(toText(listing.title), blockedNormalized);
    if (brandFromTitle) return brandFromTitle;

    return rawBrand || modelFirstToken || rawModel;
  };

  const getTechnicalSpecs = (listing: CarListing) => {
    const specs: Array<{ label: string; value: string; icon: React.ComponentType<any> }> = [];
    const addSpec = (label: string, value: unknown, icon: React.ComponentType<any>) => {
      const normalized = toText(value);
      if (!normalized) return;
      specs.push({ label, value: normalized, icon });
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
      addSpec(label, unit ? `${rendered} ${unit}` : rendered, icon);
    };
    const addBoolean = (label: string, value: unknown, icon: React.ComponentType<any>) => {
      if (value === true || toText(value).toLowerCase() === "true") {
        addSpec(label, "Да", icon);
      }
    };

    const mainCategory = toText(listing.main_category);
    const conditionLabel = formatConditionLabel(listing.condition);

    switch (mainCategory) {
      case "u":
        addSpec("Категория", listing.part_category, PackageOpen);
        addSpec("Част", listing.part_element, Settings);
        addSpec("За", formatTopmenuCategory(listing.part_for), Car);
        addSpec("Години", formatYearRange(listing.part_year_from, listing.part_year_to), Calendar);
        addSpec("Състояние", conditionLabel, ShieldCheck);
        break;
      case "w":
        addSpec("Оферта", formatWheelOfferType(listing.offer_type), PackageOpen);
        addSpec("За", formatTopmenuCategory(listing.wheel_for), Car);
        addSpec("Марка гуми", listing.tire_brand, PackageOpen);
        addSpec("Размер гуми", formatTireSize(listing), Ruler);
        addSpec("Сезон", listing.tire_season, Leaf);
        addSpec("Марка джанти", listing.wheel_brand, PackageOpen);
        addSpec("Материал", listing.material, Palette);
        addSpec("Болтове", listing.bolts, Settings);
        addSpec("PCD", listing.pcd, Ruler);
        break;
      case "v":
        addSpec("Категория", listing.accessory_category, PackageOpen);
        addSpec("За", formatTopmenuCategory(listing.classified_for), Car);
        addSpec("Състояние", conditionLabel, ShieldCheck);
        break;
      case "y":
        addSpec("Купува", listing.buy_service_category, PackageOpen);
        addSpec("За", formatTopmenuCategory(listing.classified_for), Car);
        break;
      case "z":
        addSpec("Услуга", listing.buy_service_category, PackageOpen);
        addSpec("За", formatTopmenuCategory(listing.classified_for), Car);
        break;
      case "3":
      case "4":
        addNumeric("Оси", listing.axles, "", Settings);
        addNumeric("Седалки", listing.seats, "", PackageOpen);
        addNumeric("Товар", listing.load_kg, "кг", Gauge);
        addSpec("Трансмисия", listing.transmission, Settings);
        addSpec("Двигател", listing.engine_type, Fuel);
        addSpec(
          "Еко",
          formatEuroStandardLabel(toText(listing.heavy_euro_standard) || toText(listing.euro_standard)),
          Leaf
        );
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        break;
      case "5":
        addNumeric("Кубатура", listing.displacement_cc ?? listing.displacement, "cc", Ruler);
        addSpec("Двигател", listing.engine_type, Fuel);
        addSpec("Трансмисия", listing.transmission, Settings);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        break;
      case "6":
      case "7":
        addSpec("Категория", listing.equipment_type, PackageOpen);
        addSpec("Двигател", listing.engine_type, Fuel);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addSpec("Състояние", conditionLabel, ShieldCheck);
        break;
      case "8":
        addSpec("Двигател", listing.engine_type, Fuel);
        addNumeric("Товар", listing.lift_capacity_kg, "кг", Gauge);
        addNumeric("Часове", listing.hours, "ч", Clock);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addSpec("Състояние", conditionLabel, ShieldCheck);
        break;
      case "9":
        addNumeric("Легла", listing.beds, "", PackageOpen);
        addNumeric("Дължина", listing.length_m, "м", Ruler, false);
        addBoolean("Тоалетна", listing.has_toilet, ShieldCheck);
        addBoolean("Отопление", listing.has_heating, ShieldCheck);
        addBoolean("Климатик", listing.has_air_conditioning, ShieldCheck);
        break;
      case "a":
        addSpec("Категория", listing.boat_category, PackageOpen);
        addSpec("Двигател", listing.engine_type, Fuel);
        addNumeric("Брой двигатели", listing.engine_count, "", Settings);
        addSpec("Материал", listing.material, Palette);
        addNumeric("Дължина", listing.length_m, "м", Ruler, false);
        addNumeric("Ширина", listing.width_m, "м", Ruler, false);
        addNumeric("Газене", listing.draft_m, "м", Ruler, false);
        addNumeric("Часове", listing.hours, "ч", Clock);
        break;
      case "b":
        addSpec("Категория", listing.trailer_category, PackageOpen);
        addNumeric("Товар", listing.load_kg, "кг", Gauge);
        addNumeric("Оси", listing.axles, "", Settings);
        break;
      default:
        addSpec("Гориво", formatFuelLabel(listing.fuel), Fuel);
        addSpec("Кутия", formatGearboxLabel(listing.gearbox), Settings);
        addNumeric("Пробег", listing.mileage, "км", Gauge);
        addNumeric("Мощност", listing.power, "к.с.", Zap);
        addNumeric("Кубатура", listing.displacement, "cc", Ruler);
        addSpec(
          "Еко",
          listing.euro_standard && listing.euro_standard !== "0"
            ? formatEuroStandardLabel(listing.euro_standard)
            : "",
          Leaf
        );
        addSpec("Цвят", listing.color, Palette);
        break;
    }

    if (specs.length === 0) {
      addSpec("Състояние", conditionLabel, ShieldCheck);
      addSpec("Град", listing.city, MapPin);
    }

    return specs;
  };

  const getListingCategoryBadge = (listing: CarListing) => {
    const mainCode = toText(listing.main_category);
    const mainLabel = getMainCategoryLabel(mainCode) || mainCode;
    return mainLabel || "";
  };

  const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    color: "#333",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "\"Manrope\", \"Segoe UI\", sans-serif",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "20px 20px 60px",
    boxSizing: "border-box",
  },
  header: {
    background: "#fff",
    padding: "24px",
    borderRadius: 8,
    marginBottom: 24,
    border: "1px solid #e0e0e0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  titleIcon: {
    color: "#0f766e",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    margin: 0,
    fontWeight: 500,
  },
  emptyState: {
    background: "#fff",
    padding: "64px 32px",
    borderRadius: 8,
    textAlign: "center",
    border: "1px solid #e0e0e0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    margin: "0 auto 24px",
    borderRadius: "50%",
    background: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    color: "#fff",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 700,
    color: "#333", // По-тъмно сиво за текста
    marginBottom: 12,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  emptySubtext: {
    fontSize: 15,
    color: "#666", // Леко по-светло сиво
    lineHeight: 1.6,
  },
  ctaButton: {
    marginTop: 24,
    padding: "14px 32px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "all 0.2s",
  },
  addButton: {
    padding: "12px 20px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  tabsContainer: {
    display: "flex",
    gap: 12,
    marginBottom: 32,
  },
  tab: {
    padding: "12px 24px",
    background: "#fff",
    color: "#333",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  tabActive: {
    background: "#0f766e",
    color: "#fff",
    border: "1px solid #0f766e",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  tabBadge: {
    background: "rgba(255, 255, 255, 0.3)",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
  },
  tabBadgeInactive: {
    background: "#f5f5f5",
    color: "#666",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "12px 16px",
    marginBottom: 24,
    borderRadius: 10,
    border: "1px solid rgb(15, 118, 110)",
    background: "rgb(15, 118, 110)",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  filterControls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  filterSelect: {
    height: 38,
    minWidth: 180,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.24)",
    background: "#ffffff",
    color: "#000",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
  },
  filterEmpty: {
    padding: "24px 20px",
    background: "#fff",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    textAlign: "center",
    color: "#0f766e",
    fontWeight: 600,
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: "24px",
  },
  confirmOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(2, 6, 23, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1300,
    padding: "24px",
  },
  confirmModal: {
    width: "min(420px, 92vw)",
    background: "#fff",
    borderRadius: 14,
    padding: "22px",
    border: "1px solid #e0e0e0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
  },
  confirmTitle: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: 800,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  confirmText: {
    margin: "0 0 18px 0",
    fontSize: 14,
    lineHeight: 1.5,
    color: "#666",
  },
  confirmActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  confirmButtonGhost: {
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #e0e0e0",
    background: "#fff",
    color: "#333",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  confirmButtonPrimary: {
    height: 40,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #0f766e",
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  modal: {
    width: "min(560px, 92vw)",
    background: "#fff",
    borderRadius: 18,
    padding: "22px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666",
    margin: "6px 0 0 0",
    lineHeight: 1.5,
  },
  modalClose: {
    border: "none",
    background: "transparent",
    color: "#666",
    cursor: "pointer",
    padding: 4,
  },
  listingTypeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  listingTypeCard: {
    position: "relative" as const,
    borderRadius: 14,
    border: "1px solid #e0e0e0",
    padding: "16px",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
  },
  listingTypeCardSelected: {
    borderColor: "#0f766e",
    boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.16)",
  },
  listingTypeTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#333",
    margin: "0 0 6px",
  },
  listingTypeDesc: {
    fontSize: 12,
    color: "#666",
    margin: 0,
  },
  vipPlanGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  vipPlanCard: {
    borderRadius: 12,
    border: "1px solid #e0e0e0",
    background: "#fff",
    padding: "12px",
    textAlign: "left" as const,
    cursor: "pointer",
  },
  vipPlanCardSelected: {
    borderColor: "#0284c7",
    boxShadow: "0 0 0 3px rgba(2, 132, 199, 0.14)",
    background: "#f0f9ff",
  },
  vipPlanTitle: {
    margin: "0 0 4px",
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
  },
  vipPlanDesc: {
    margin: 0,
    fontSize: 12,
    color: "#475569",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  modalButton: {
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  modalButtonSecondary: {
    background: "#f5f5f5",
    color: "#333",
    borderColor: "#e0e0e0",
  },
  modalButtonPrimary: {
    background: "#0f766e",
    color: "#fff",
    boxShadow: "0 6px 16px rgba(15, 118, 110, 0.3)",
  },
  modalHint: {
    fontSize: 12,
    color: "#999",
    margin: 0,
  },
  previewModal: {
    width: "min(980px, 96vw)",
    background: "#fff",
    borderRadius: 18,
    padding: "22px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  previewHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  previewMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  previewMetaText: {
    fontSize: 13,
    color: "#666",
  },
  previewStatusPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 999,
    background: "#f5f5f5",
    color: "#666",
    border: "1px solid #e0e0e0",
  },
  previewStatusPillExpired: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
  },
  previewMedia: {
    position: "relative" as const,
    borderRadius: 14,
    overflow: "hidden",
    background: "#f0f0f0",
    minHeight: 260,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    objectPosition: "center" as const,
    imageRendering: "auto" as const,
    display: "block",
  },
  previewPlaceholder: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    fontSize: 14,
    gap: 8,
  },
  previewThumbs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },
  previewThumbButton: {
    width: 64,
    height: 48,
    borderRadius: 8,
    border: "1px solid #e0e0e0",
    background: "#fff",
    padding: 0,
    overflow: "hidden",
    cursor: "pointer",
  },
  previewThumbButtonActive: {
    borderColor: "#0f766e",
    boxShadow: "0 0 0 2px rgba(15, 118, 110, 0.2)",
  },
  previewThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    objectPosition: "center" as const,
    imageRendering: "auto" as const,
    display: "block",
  },
  previewInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  previewPrice: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    background: "#0f766e",
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "center" as const,
  },
  previewPriceWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  previewPriceChangeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  previewPriceChangeUp: { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" },
  previewPriceChangeDown: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" },
  previewSpecs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  previewSpec: {
    padding: "10px 12px",
    background: "#ecfdf5",
    borderRadius: 10,
    border: "1px solid #bbf7d0",
  },
  previewSpecHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  previewSpecIcon: {
    color: "#0f766e",
  },
  previewSpecLabel: {
    fontSize: 11,
    color: "#111827",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  previewSpecValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  previewDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 1.6,
    padding: "12px",
    background: "#fafafa",
    borderRadius: 10,
    border: "1px solid #e0e0e0",
    maxHeight: 160,
    overflow: "auto",
    whiteSpace: "pre-line" as const,
  },
  previewActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: 4,
  },
  previewButton: {
    background: "#f5f5f5",
    color: "#333",
    border: "1px solid #e0e0e0",
  },
  listingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    flexWrap: "wrap",
  },
  paginationButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#1f2937",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0 10px",
  },
  paginationButtonActive: {
    background: "#0f766e",
    borderColor: "#0f766e",
    color: "#fff",
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  paginationEllipsis: {
    color: "#94a3b8",
    fontWeight: 600,
    padding: "0 4px",
  },
  paginationInfo: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
  },
    listingCard: {
      background: "#fff",
      borderRadius: 6,
      overflow: "visible",
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      transition: "box-shadow 0.2s",
      cursor: "pointer",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
    },
    listingCardHover: {
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    },
  listingMedia: {
    position: "relative" as const,
    height: 220,
    background: "#f0f0f0",
    overflow: "visible" as const,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    isolation: "isolate" as const,
  },
  listingImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    imageRendering: "auto",
    display: "block",
  },
  listingMediaOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.5) 100%)",
    pointerEvents: "none",
  },
  listingPlaceholder: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    fontSize: 14,
    gap: 8,
  },
  topBadge: {
    position: "absolute" as const,
    top: -8,
    left: -6,
    width: 64,
    height: 64,
    objectFit: "contain" as const,
    transform: "rotate(-9deg)",
    filter: "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))",
    pointerEvents: "none" as const,
    zIndex: 12,
  },
  vipBadge: {
    position: "absolute" as const,
    top: -8,
    left: -6,
    width: 64,
    height: 64,
    objectFit: "contain" as const,
    transform: "rotate(-9deg)",
    filter: "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))",
    pointerEvents: "none" as const,
    zIndex: 12,
  },
  newBadge: {
    position: "absolute" as const,
    left: 12,
    padding: "4px 10px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    boxShadow: "0 4px 10px rgba(5, 150, 105, 0.35)",
    zIndex: 11,
  },
  statusBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(15, 23, 42, 0.75)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
    zIndex: 2,
  },
  listingCategoryBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    maxWidth: "78%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#ffffff",
    color: "#111111",
    border: "1px solid #111111",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase" as const,
    zIndex: 2,
  },
  statusBadgeExpired: {
    background: "#dc2626",
    boxShadow: "0 6px 16px rgba(220, 38, 38, 0.35)",
  },
  listingPricePill: {
    position: "absolute" as const,
    right: 0,
    bottom: 0,
    padding: "8px 12px 7px 14px",
    borderTop: "1px solid #e2e8f0",
    borderLeft: "1px solid #e2e8f0",
    borderTopLeftRadius: 12,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 800,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
    zIndex: 2,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: 4,
  },
  listingPriceChangeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
  },
  listingPriceChangeUp: { background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" },
  listingPriceChangeDown: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" },
  listingContent: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  listingTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  listingTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    lineHeight: 1.3,
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  listingMeta: {
    fontSize: 12,
    color: "#666",
    whiteSpace: "nowrap",
  },
  listingMetaCreated: {
    fontSize: 12,
    color: "rgb(15, 118, 110)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  listingMetaUpdated: {
    fontSize: 12,
    color: "#f97316",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  listingMetaStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  topTimer: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: 700,
  },
  vipTimer: {
    fontSize: 12,
    color: "#0284c7",
    fontWeight: 700,
  },
  nonPromotedTimer: {
    fontSize: 12,
    color: "#111111",
    fontWeight: 700,
  },
  listingSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  listingDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  listingChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  listingChip: {
    fontSize: 12,
    color: "#111827",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    padding: "4px 8px",
    borderRadius: 3,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  listingChipIcon: {
    color: "#0f766e",
  },
  listingActions: {
    display: "flex",
    gap: 8,
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid #e0e0e0",
    flexWrap: "wrap",
  },
  actionButton: {
    flex: 1,
    padding: "10px 16px",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: "fit-content",
  },
  editButton: {
    background: "#d97706",
    color: "#fff",
    border: "1.5px solid #d97706",
    boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
  },
  deleteButton: {
    background: "#f5f5f5",
    color: "#d32f2f",
    border: "2px solid #ffcdd2",
  },
  loadingState: {
    background: "#fff",
    padding: "40px 20px",
    borderRadius: 8,
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  errorState: {
    background: "#fff",
    padding: "20px",
    borderRadius: 8,
    border: "1px solid #d32f2f",
    color: "#d32f2f",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
};

  const activeCountLabel = `Моите активни обяви: ${activeListings.length}`;

  const renderHeader = (subtitleText: string, showAddButton: boolean) => (
    <div style={styles.header}>
      <div style={styles.headerRow}>
        <div style={styles.titleContainer}>
          <List size={32} style={styles.titleIcon} />
          <h1 style={styles.title}>Моите Обяви</h1>
        </div>
        {showAddButton && (
          <button
            type="button"
            style={styles.addButton}
            onClick={() => navigate("/publish")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 118, 110, 0.3)";
              e.currentTarget.style.background = "#0b5f58";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              e.currentTarget.style.background = "#0f766e";
            }}
          >
            <FileText size={18} />
            Добави обява
          </button>
        )}
      </div>
      <p style={styles.subtitle}>{subtitleText}</p>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>
          {renderHeader(activeCountLabel, false)}
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              <Lock size={40} style={styles.emptyIcon} />
            </div>
            <p style={styles.emptyText}>Трябва да си логнат</p>
            <p style={styles.emptySubtext}>
              Логни се, за да видиш твоите обяви
            </p>
            <a
              href="/auth"
              style={styles.ctaButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(15, 118, 110, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.3)";
              }}
            >
              <Lock size={18} />
              Логни се
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>
          {renderHeader(activeCountLabel, true)}
          <div style={styles.loadingState}>
            <p>Зареждане...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>
          {renderHeader(activeCountLabel, true)}
          <div style={styles.errorState}>
            <p>Грешка: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current listings based on active tab
  const getCurrentListings = () => {
    switch (activeTab) {
      case "active":
        return activeListings;
      case "top":
        return activeListings.filter((listing) => listing.listing_type === "top");
      case "archived":
        return archivedListings;
      case "drafts":
        return draftListings;
      case "expired":
        return expiredListings;
      case "liked":
        return likedListings;
      default:
        return [];
    }
  };

  const currentListings = getCurrentListings();
  const categoryOptions = Array.from(
    new Set(
      currentListings
        .map((listing) => (listing.main_category || "").trim())
        .filter(Boolean)
    )
  )
    .map((categoryCode) => ({
      value: categoryCode,
      label: getMainCategoryLabel(categoryCode) || categoryCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "bg", { sensitivity: "base" }));

  const selectedCategory =
    categoryFilter === "all" || categoryOptions.some((option) => option.value === categoryFilter)
      ? categoryFilter
      : "all";

  const categoryScopedListings =
    selectedCategory === "all"
      ? currentListings
      : currentListings.filter((listing) => (listing.main_category || "").trim() === selectedCategory);

  const brandOptions = Array.from(
    new Set(
      categoryScopedListings
        .map((listing) => getEffectiveListingBrand(listing))
        .filter((brand) => Boolean(brand) && !isGenericBrandLabel(brand))
    )
  ).sort((a, b) => a.localeCompare(b, "bg", { sensitivity: "base" }));

  const selectedBrand =
    brandFilter === "all" || brandOptions.includes(brandFilter) ? brandFilter : "all";

  const brandScopedListings =
    selectedBrand === "all"
      ? categoryScopedListings
      : categoryScopedListings.filter(
          (listing) => getEffectiveListingBrand(listing) === selectedBrand
        );

  const modelOptions = Array.from(
    new Set(
      brandScopedListings
        .map((listing) => (listing.model || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "bg", { sensitivity: "base" }));

  const selectedModel =
    modelFilter === "all" || modelOptions.includes(modelFilter) ? modelFilter : "all";

  const filteredListings =
    selectedModel === "all"
      ? brandScopedListings
      : brandScopedListings.filter((listing) => (listing.model || "").trim() === selectedModel);

  const showListingFilters = currentListings.length > 10;
  const hasFilteredListings = filteredListings.length > 0;
  const totalPages = Math.ceil(filteredListings.length / PAGE_SIZE);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedListings = filteredListings.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const visiblePages = (() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let page = safePage - 2; page <= safePage + 2; page += 1) {
      if (page > 1 && page < totalPages) {
        pages.add(page);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  })();
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  const totalListings =
    activeListings.length +
    archivedListings.length +
    draftListings.length +
    expiredListings.length +
    likedListings.length;
  const topListingsCount = activeListings.filter((listing) => listing.listing_type === "top").length;
  const isModalBusy =
    listingTypeModal.isOpen && actionLoading === listingTypeModal.listingId;
  const modalTitle =
    listingTypeModal.mode === "republish" ? "Пусни обявата отново" : "Промотирай обявата";
  const modalSubtitle = listingTypeModal.listingTitle
    ? `Избери тип за "${listingTypeModal.listingTitle}".`
    : "Избери тип на обявата.";
  const modalPrimaryLabel =
    listingTypeModal.mode === "republish" ? "Пусни обявата" : "Запази избора";
  const modalHint =
    listingTypeModal.mode === "republish"
      ? "Обявата ще бъде активна до 30 дни от момента на публикуване."
      : "VIP е визуално открояване, без приоритет в класирането.";
  const isPreviewTab = activeTab === "archived" || activeTab === "expired" || activeTab === "drafts";
  const previewImages = previewListing ? getPreviewImages(previewListing) : [];
  const previewImage = previewImages[previewImageIndex]?.full || "";
  const previewPriceValue = previewListing ? Number(previewListing.price) : Number.NaN;
  const previewPriceLabel =
    Number.isFinite(previewPriceValue) && previewPriceValue > 0
      ? `€${previewPriceValue.toLocaleString("bg-BG")}`
      : "Цена не е зададена";
  const previewLatestHistory = previewListing?.price_history?.[0];
  const previewDeltaValue = previewLatestHistory ? Number(previewLatestHistory.delta) : Number.NaN;
  const showPreviewPriceChange = Number.isFinite(previewDeltaValue) && previewDeltaValue !== 0;
  const previewChangeDirection = previewDeltaValue > 0 ? "up" : "down";
  const previewChangeLabel = showPreviewPriceChange
    ? `${Math.abs(previewDeltaValue).toLocaleString("bg-BG")} €`
    : "";
  const PreviewChangeIcon = previewChangeDirection === "up" ? TrendingUp : TrendingDown;
  const previewSpecs = previewListing ? getTechnicalSpecs(previewListing).slice(0, 4) : [];
  const previewStatusLabel = getPreviewStatusLabel(previewTab);
  const previewStatusStyle =
    previewStatusLabel === "Изтекла"
      ? { ...styles.previewStatusPill, ...styles.previewStatusPillExpired }
      : styles.previewStatusPill;
  const isPreviewListingNew = previewListing ? isListingNew(previewListing.created_at) : false;
  const isPreviewTopActive =
    !!previewListing &&
    previewTab !== "expired" &&
    previewListing.listing_type === "top" &&
    (!previewListing.top_expires_at ||
      (Number.isFinite(new Date(previewListing.top_expires_at).getTime()) &&
        new Date(previewListing.top_expires_at).getTime() > currentTimeMs));
  const isPreviewVipActive =
    !!previewListing &&
    previewTab !== "expired" &&
    previewListing.listing_type === "vip" &&
    (!previewListing.vip_expires_at ||
      (Number.isFinite(new Date(previewListing.vip_expires_at).getTime()) &&
        new Date(previewListing.vip_expires_at).getTime() > currentTimeMs));
  const isPreviewPromotedActive = isPreviewTopActive || isPreviewVipActive;

  if (totalListings === 0) {
    return (
      <div style={styles.page}>
        <style>{globalCss}</style>
        <div style={styles.container}>
          {renderHeader(activeCountLabel, true)}

          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              <Inbox size={40} style={styles.emptyIcon} />
            </div>
            <p style={styles.emptyText}>Нямаш публикувани обяви</p>
            <p style={styles.emptySubtext}>
              Публикувай първата си обява и я управлявай от тук
            </p>
            <a
              href="/publish"
              style={styles.ctaButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(15, 118, 110, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.3)";
              }}
            >
              <FileText size={18} />
              Публикувай обява
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <div style={styles.container}>
        {renderHeader(activeCountLabel, true)}

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            background: toast.type === "success" ? "#4caf50" : "#f44336",
            color: "#fff",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            animation: "slideIn 0.3s ease-in-out",
          }}>
            {toast.message}
          </div>
        )}

        {listingTypeModal.isOpen && (
          <div style={styles.modalOverlay} onClick={closeListingTypeModal}>
            <div
              style={styles.modal}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>{modalTitle}</h2>
                  <p style={styles.modalSubtitle}>{modalSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeListingTypeModal}
                  style={styles.modalClose}
                  aria-label="Затвори"
                  disabled={isModalBusy}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.listingTypeGrid}>
                <button
                  type="button"
                  style={{
                    ...styles.listingTypeCard,
                    ...(listingTypeModal.selectedType === "normal" ? styles.listingTypeCardSelected : {}),
                  }}
                  onClick={() =>
                    setListingTypeModal((prev) => ({ ...prev, selectedType: "normal" }))
                  }
                  disabled={isModalBusy}
                >
                  <h3 style={styles.listingTypeTitle}>Нормална обява</h3>
                  <p style={styles.listingTypeDesc}>
                    Стандартно публикуване без допълнително позициониране.
                  </p>
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.listingTypeCard,
                    ...(listingTypeModal.selectedType === "top" ? styles.listingTypeCardSelected : {}),
                  }}
                  onClick={() =>
                    setListingTypeModal((prev) => ({ ...prev, selectedType: "top" }))
                  }
                  disabled={isModalBusy}
                >
                  <h3 style={styles.listingTypeTitle}>Топ обява</h3>
                  <p style={styles.listingTypeDesc}>
                    Приоритетна видимост и изкарване по-напред в резултатите.
                  </p>
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.listingTypeCard,
                    ...(listingTypeModal.selectedType === "vip" ? styles.listingTypeCardSelected : {}),
                  }}
                  onClick={() =>
                    setListingTypeModal((prev) => ({ ...prev, selectedType: "vip" }))
                  }
                  disabled={isModalBusy}
                >
                  <h3 style={styles.listingTypeTitle}>VIP обява</h3>
                  <p style={styles.listingTypeDesc}>
                    Визуално открояване с VIP етикет без приоритет в класирането.
                  </p>
                </button>
              </div>

              {listingTypeModal.selectedType === "vip" && (
                <div style={styles.vipPlanGrid}>
                  <button
                    type="button"
                    style={{
                      ...styles.vipPlanCard,
                      ...(listingTypeModal.vipPlan === "7d" ? styles.vipPlanCardSelected : {}),
                    }}
                    onClick={() =>
                      setListingTypeModal((prev) => ({ ...prev, vipPlan: "7d" }))
                    }
                    disabled={isModalBusy}
                  >
                    <h4 style={styles.vipPlanTitle}>VIP за 7 дни</h4>
                    <p style={styles.vipPlanDesc}>Цена: €{VIP_LISTING_PRICE_7D_EUR.toFixed(2)}</p>
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.vipPlanCard,
                      ...(listingTypeModal.vipPlan === "lifetime" ? styles.vipPlanCardSelected : {}),
                    }}
                    onClick={() =>
                      setListingTypeModal((prev) => ({ ...prev, vipPlan: "lifetime" }))
                    }
                    disabled={isModalBusy}
                  >
                    <h4 style={styles.vipPlanTitle}>VIP до изтичане</h4>
                    <p style={styles.vipPlanDesc}>
                      Цена: €{VIP_LISTING_PRICE_LIFETIME_EUR.toFixed(2)}
                    </p>
                  </button>
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={{ ...styles.modalButton, ...styles.modalButtonSecondary }}
                  onClick={closeListingTypeModal}
                  disabled={isModalBusy}
                >
                  Отказ
                </button>
                <button
                  type="button"
                  style={{ ...styles.modalButton, ...styles.modalButtonPrimary }}
                  onClick={handleListingTypeConfirm}
                  disabled={isModalBusy}
                >
                  {isModalBusy ? "Запазване..." : modalPrimaryLabel}
                </button>
              </div>

              <p style={styles.modalHint}>{modalHint}</p>
            </div>
          </div>
        )}

        {showTopConfirm && (
          <div style={styles.confirmOverlay} onClick={cancelTopListingAction}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.confirmTitle}>ТОП обява</h3>
              <p style={styles.confirmText}>
                Публикуването на обява като "ТОП" струва 3 EUR.
              </p>
              <div style={styles.confirmActions}>
                <button style={styles.confirmButtonGhost} onClick={cancelTopListingAction}>
                  Отхвърли
                </button>
                <button style={styles.confirmButtonPrimary} onClick={confirmTopListingAction}>
                  Продължи
                </button>
              </div>
            </div>
          </div>
        )}

        {previewListing && (
          <div style={styles.modalOverlay} onClick={closePreview}>
            <div
              style={styles.previewModal}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.previewHeader}>
                <div>
                  <h2 style={styles.previewTitle}>
                    {previewListing.brand} {previewListing.model}
                  </h2>
                  <div style={styles.previewMetaRow}>
                    {previewStatusLabel && (
                      <span style={previewStatusStyle}>{previewStatusLabel}</span>
                    )}
                    {previewListing.year_from ? (
                      <span style={styles.previewMetaText}>Година {previewListing.year_from}</span>
                    ) : (
                      <span style={styles.previewMetaText}>Без година</span>
                    )}
                    {previewListing.city && (
                      <span style={styles.previewMetaText}>{previewListing.city}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  style={styles.modalClose}
                  aria-label="Затвори"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.previewGrid}>
                <div>
                  <div style={styles.previewMedia}>
                    {isPreviewTopActive && (
                      <img
                        src={topBadgeImage}
                        alt="Топ обява"
                        style={styles.topBadge}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    {isPreviewVipActive && (
                      <img
                        src={vipBadgeImage}
                        alt="VIP обява"
                        style={styles.vipBadge}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    {isPreviewListingNew && (
                      <div
                        style={{
                          ...styles.newBadge,
                          top: isPreviewPromotedActive ? 62 : 12,
                        }}
                      >
                        Нова
                      </div>
                    )}
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={previewListing.title || `${previewListing.brand} ${previewListing.model}`}
                        style={styles.previewImage}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                      />
                    ) : (
                      <div style={styles.previewPlaceholder}>
                        <Car size={28} />
                        Няма снимка
                      </div>
                    )}
                  </div>

                  {previewImages.length > 1 && (
                    <div style={styles.previewThumbs}>
                      {previewImages.map((previewSource, idx) => (
                        <button
                          key={`${previewSource.full}-${idx}`}
                          type="button"
                          style={{
                            ...styles.previewThumbButton,
                            ...(idx === previewImageIndex ? styles.previewThumbButtonActive : {}),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageIndex(idx);
                          }}
                          aria-label={`Снимка ${idx + 1}`}
                        >
                          <img
                            src={previewSource.thumb}
                            alt={`Снимка ${idx + 1}`}
                            style={styles.previewThumb}
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.previewInfo}>
                  <div style={styles.previewPriceWrap}>
                    <div style={styles.previewPrice}>{previewPriceLabel}</div>
                    {showPreviewPriceChange && (
                      <span
                        style={{
                          ...styles.previewPriceChangeBadge,
                          ...(previewChangeDirection === "up"
                            ? styles.previewPriceChangeUp
                            : styles.previewPriceChangeDown),
                        }}
                        title={previewChangeDirection === "up" ? "Повишена цена" : "Намалена цена"}
                      >
                        <PreviewChangeIcon size={14} />
                        {previewChangeDirection === "up" ? "+" : "-"}
                        {previewChangeLabel}
                      </span>
                    )}
                  </div>

                  {previewSpecs.length > 0 && (
                    <div style={styles.previewSpecs}>
                      {previewSpecs.map((spec) => {
                        const Icon = spec.icon;
                        return (
                          <div key={spec.label} style={styles.previewSpec}>
                            <div style={styles.previewSpecHeader}>
                              <Icon size={14} style={styles.previewSpecIcon} />
                              <div style={styles.previewSpecLabel}>{spec.label}</div>
                            </div>
                            <div style={styles.previewSpecValue}>{spec.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={styles.previewDescription}>
                    {previewListing.description || "Няма описание към обявата."}
                  </div>

                  <div style={styles.previewActions}>
                    <button
                      type="button"
                      style={{ ...styles.actionButton, ...styles.editButton, flex: "0 0 auto" }}
                      onClick={() => {
                        closePreview();
                        goToEdit(previewListing);
                      }}
                    >
                      <Edit2 size={14} />
                      Редактирай
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.modalButton, ...styles.modalButtonSecondary }}
                      onClick={closePreview}
                    >
                      Затвори
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {[
          { id: "active", label: "Активни", Icon: List, count: activeListings.length },
          { id: "top", label: "Топ обяви", Icon: PackageOpen, count: topListingsCount },
          { id: "archived", label: "Архивирани", Icon: Archive, count: archivedListings.length },
          { id: "expired", label: "Изтекли", Icon: Clock, count: expiredListings.length },
          { id: "drafts", label: "Чернови", Icon: FileText, count: draftListings.length },
          { id: "liked", label: "Любими", Icon: Heart, count: likedListings.length },
        ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setCurrentPage(1);
                  setModelFilter("all");
                }}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#0f766e";
                    e.currentTarget.style.color = "#0f766e";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                <tab.Icon size={18} />
                {tab.label}
                <span style={isActive ? styles.tabBadge : styles.tabBadgeInactive}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {showListingFilters && (
          <div style={styles.filterRow}>
            <div style={styles.filterLabel}>Филтри</div>
            <div style={styles.filterControls}>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setBrandFilter("all");
                  setModelFilter("all");
                  setCurrentPage(1);
                }}
                style={styles.filterSelect}
              >
                <option value="all">Всички категории</option>
                {categoryOptions.map((categoryOption) => (
                  <option key={categoryOption.value} value={categoryOption.value}>
                    {categoryOption.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  setModelFilter("all");
                  setCurrentPage(1);
                }}
                style={styles.filterSelect}
              >
                <option value="all">Всички марки</option>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setModelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={styles.filterSelect}
              >
                <option value="all">Всички модели</option>
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterCount}>
              Показва {filteredListings.length} от {currentListings.length}
            </div>
          </div>
        )}

        {currentListings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              {activeTab === "active" && <Inbox size={40} style={styles.emptyIcon} />}
              {activeTab === "top" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "archived" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "expired" && <Clock size={40} style={styles.emptyIcon} />}
              {activeTab === "drafts" && <FileText size={40} style={styles.emptyIcon} />}
              {activeTab === "liked" && <Heart size={40} style={styles.emptyIcon} />}
            </div>
            <p style={styles.emptyText}>
              {activeTab === "active" && "Нямаш активни обяви"}
              {activeTab === "top" && "Нямаш топ обяви"}
              {activeTab === "archived" && "Нямаш архивирани обяви"}
              {activeTab === "expired" && "Нямаш изтекли обяви"}
              {activeTab === "drafts" && "Нямаш чернови обяви"}
              {activeTab === "liked" && "Нямаш любими обяви"}
            </p>
            <p style={styles.emptySubtext}>
              {activeTab === "active" && "Публикувай нова обява, за да я видиш тук"}
              {activeTab === "top" && "Маркирай обява като топ, за да се появи тук"}
              {activeTab === "archived" && "Архивирани обяви ще се появят тук"}
              {activeTab === "expired" && "Изтеклите обяви ще се появят тук"}
              {activeTab === "drafts" && "Начни да пишеш нова обява"}
              {activeTab === "liked" && "Добави обяви в любими"}
            </p>
            {(activeTab === "active" || activeTab === "top") && (
              <a
                href="/publish"
                style={styles.ctaButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(15, 118, 110, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.3)";
                }}
              >
                <FileText size={18} />
                Публикувай обява
              </a>
            )}
          </div>
        ) : !hasFilteredListings ? (
            <div style={styles.filterEmpty}>
              Няма обяви за избрания модел.
            </div>
          ) : (
            <>
              <div style={styles.listingsGrid}>
                {paginatedListings.map((listing, index) => {
                  const statusLabel = getPreviewStatusLabel(activeTab);
                  const fallbackTitle = `${listing.brand || ""} ${listing.model || ""}`.trim();
                  const listingTitle = (listing.title || fallbackTitle || "Без заглавие").trim();
                  const shouldShowYearInSubtitle = !["v", "y", "z"].includes(
                    toText(listing.main_category)
                  );
                  const subtitleParts = [
                    shouldShowYearInSubtitle && listing.year_from ? `${listing.year_from} г.` : "",
                    listing.city || "",
                    formatConditionLabel(listing.condition),
                  ].filter(Boolean);
                  const subtitle = subtitleParts.join(" · ");
                  const createdLabel = formatDate(listing.created_at);
                  const updatedLabel =
                    listing.updated_at && listing.updated_at !== listing.created_at
                      ? formatDate(listing.updated_at)
                      : "";
                  const descriptionSnippet = getShortDescription(listing.description);
                  const isTopActive =
                    listing.listing_type === "top" &&
                    activeTab !== "expired" &&
                    (!listing.top_expires_at ||
                      (Number.isFinite(new Date(listing.top_expires_at).getTime()) &&
                        new Date(listing.top_expires_at).getTime() > currentTimeMs));
                  const isVipActive =
                    listing.listing_type === "vip" &&
                    activeTab !== "expired" &&
                    (!listing.vip_expires_at ||
                      (Number.isFinite(new Date(listing.vip_expires_at).getTime()) &&
                        new Date(listing.vip_expires_at).getTime() > currentTimeMs));
                  const isPromotedActive = isTopActive || isVipActive;
                  const topRemainingLabel = isTopActive ? getTopRemainingLabel(listing) : "";
                  const vipRemainingLabel = isVipActive ? getVipRemainingLabel(listing) : "";
                  const nonPromotedLabel =
                    !topRemainingLabel && !vipRemainingLabel ? "Непромотирана обява" : "";
                  const priceValue = Number(listing.price);
                  const priceLabel =
                    Number.isFinite(priceValue) && priceValue > 0
                      ? `${priceValue.toLocaleString("bg-BG")} €`
                      : "Цена не е зададена";
                  const latestPriceHistory = listing.price_history?.[0];
                  const latestDeltaValue = latestPriceHistory ? Number(latestPriceHistory.delta) : Number.NaN;
                  const showPriceChange = Number.isFinite(latestDeltaValue) && latestDeltaValue !== 0;
                  const priceChangeDirection = latestDeltaValue > 0 ? "up" : "down";
                  const priceChangeLabel = showPriceChange
                    ? `${Math.abs(latestDeltaValue).toLocaleString("bg-BG")} €`
                    : "";
                  const PriceChangeIcon = priceChangeDirection === "up" ? TrendingUp : TrendingDown;
                  const statusBadgeStyle =
                    statusLabel === "Изтекла"
                      ? { ...styles.statusBadge, ...styles.statusBadgeExpired }
                      : styles.statusBadge;
                  const chips = getTechnicalSpecs(listing);
                  const visibleChips = chips.slice(0, 4);
                  const isNewListing = isListingNew(listing.created_at);
                  const cardImage = getCardImageSources(listing);
                  const isPriorityImage = index < 4;
                  const categoryBadgeLabel = getListingCategoryBadge(listing);

            return (
            <div
              key={listing.id}
              style={{
                ...styles.listingCard,
              }}
              onClick={() => {
                if (isPreviewTab) {
                  openPreview(listing);
                  return;
                }
                navigate(`/details/${listing.slug}`);
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, styles.listingCardHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(0,0,0,0.08)";
              }}
            >
              <div style={styles.listingMedia}>
                {isTopActive && (
                  <img
                    src={topBadgeImage}
                    alt="Топ обява"
                    style={styles.topBadge}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {isVipActive && (
                  <img
                    src={vipBadgeImage}
                    alt="VIP обява"
                    style={styles.vipBadge}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {isNewListing && (
                  <div
                    style={{
                      ...styles.newBadge,
                      top: isPromotedActive ? 62 : 12,
                    }}
                  >
                    Нова
                  </div>
                )}
                {categoryBadgeLabel && (
                  <div style={styles.listingCategoryBadge} title={categoryBadgeLabel}>
                    {categoryBadgeLabel}
                  </div>
                )}
                {statusLabel && (
                  <div
                    style={{
                      ...statusBadgeStyle,
                      top: categoryBadgeLabel ? 42 : 12,
                    }}
                  >
                    {statusLabel}
                  </div>
                )}
                {cardImage.display ? (
                  <img
                    src={cardImage.display}
                    alt={listingTitle}
                    style={styles.listingImage}
                    loading={isPriorityImage ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={isPriorityImage ? "high" : "low"}
                  />
                ) : (
                  <div style={styles.listingPlaceholder}>
                    <Car size={34} />
                    Няма снимка
                  </div>
                )}
                <div style={styles.listingMediaOverlay} />
                <div style={styles.listingPricePill}>
                  <span>{priceLabel}</span>
                  {showPriceChange && (
                    <span
                      style={{
                        ...styles.listingPriceChangeBadge,
                        ...(priceChangeDirection === "up"
                          ? styles.listingPriceChangeUp
                          : styles.listingPriceChangeDown),
                      }}
                      title={priceChangeDirection === "up" ? "Повишена цена" : "Намалена цена"}
                    >
                      <PriceChangeIcon size={12} />
                      {priceChangeDirection === "up" ? "+" : "-"}
                      {priceChangeLabel}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.listingContent}>
                <div style={styles.listingTitleRow}>
                  <h3 style={styles.listingTitle}>{listingTitle}</h3>
                  {(createdLabel || topRemainingLabel || vipRemainingLabel || nonPromotedLabel) && (
                    <div style={styles.listingMetaStack}>
                      {createdLabel && (
                        <span style={styles.listingMetaCreated}>Създадена: {createdLabel}</span>
                      )}
                      {updatedLabel && (
                        <span style={styles.listingMetaUpdated}>Редактирана: {updatedLabel}</span>
                      )}
                      {topRemainingLabel && (
                        <span style={styles.topTimer}>{topRemainingLabel}</span>
                      )}
                      {vipRemainingLabel && (
                        <span style={styles.vipTimer}>{vipRemainingLabel}</span>
                      )}
                      {nonPromotedLabel && (
                        <span style={styles.nonPromotedTimer}>{nonPromotedLabel}</span>
                      )}
                    </div>
                  )}
                </div>

                {subtitle && (
                  <div style={styles.listingSubtitle}>{subtitle}</div>
                )}

                {descriptionSnippet && (
                  <div style={styles.listingDescription}>{descriptionSnippet}</div>
                )}

                {visibleChips.length > 0 && (
                  <div style={styles.listingChips}>
                    {visibleChips.map((chip, index) => {
                      const Icon = chip.icon;
                      return (
                        <span
                          key={`${listing.id}-chip-${index}`}
                          style={styles.listingChip}
                        >
                          <Icon size={12} style={styles.listingChipIcon} />
                          {chip.label}: {chip.value}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div style={styles.listingActions}>
                  {/* Active Tab Actions: Edit, Archive, Delete */}
                  {(activeTab === "active" || activeTab === "top") && (
                    <>
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToEdit(listing);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.background = "#ea580c";
                          e.currentTarget.style.borderColor = "#ea580c";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(234, 88, 12, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.background = "#d97706";
                          e.currentTarget.style.borderColor = "#d97706";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(217, 119, 6, 0.3)";
                        }}
                      >
                        <Edit2 size={14} />
                        Редактирай
                      </button>

                      {activeTab === "active" && listing.listing_type !== "top" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openListingTypeModal(listing, "promote", "top");
                          }}
                          disabled={actionLoading === listing.id}
                          style={{
                            ...styles.actionButton,
                            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "#fff",
                            opacity: actionLoading === listing.id ? 0.6 : 1,
                            cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.35)",
                          }}
                          onMouseEnter={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.45)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.35)";
                            }
                          }}
                        >
                          <PackageOpen size={14} />
                          Промотирай
                        </button>
                      )}

                      <button
                        onClick={(e) => handleArchive(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: "#f5f5f5",
                          color: "#0f766e",
                          border: "1px solid #0f766e",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#ecfdf5";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.2)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#f5f5f5";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                          }
                        }}
                      >
                        <Archive size={14} />
                        {actionLoading === listing.id ? "..." : "Архивирай"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Archived Tab Actions: Unarchive, Delete */}
                  {activeTab === "archived" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(listing);
                        }}
                        style={{ ...styles.actionButton, ...styles.previewButton }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <Eye size={14} />
                        Преглед
                      </button>

                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToEdit(listing);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.background = "#ea580c";
                          e.currentTarget.style.borderColor = "#ea580c";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(234, 88, 12, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.background = "#d97706";
                          e.currentTarget.style.borderColor = "#d97706";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(217, 119, 6, 0.3)";
                        }}
                      >
                        <Edit2 size={14} />
                        Редактирай
                      </button>

                      <button
                        onClick={(e) => handleUnarchive(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: "#4caf50",
                          color: "#fff",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#388e3c";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#4caf50";
                          }
                        }}
                      >
                        <ArchiveRestore size={14} />
                        {actionLoading === listing.id ? "..." : "Върни в активни"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Expired Tab Actions: Republish, Delete */}
                  {activeTab === "expired" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(listing);
                        }}
                        style={{ ...styles.actionButton, ...styles.previewButton }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <Eye size={14} />
                        Преглед
                      </button>

                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToEdit(listing);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.background = "#ea580c";
                          e.currentTarget.style.borderColor = "#ea580c";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(234, 88, 12, 0.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.background = "#d97706";
                          e.currentTarget.style.borderColor = "#d97706";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(217, 119, 6, 0.3)";
                        }}
                      >
                        <Edit2 size={14} />
                        Редактирай
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const defaultType: ListingType =
                            listing.listing_type === "top"
                              ? "top"
                              : listing.listing_type === "vip"
                                ? "vip"
                                : "normal";
                          openListingTypeModal(listing, "republish", defaultType);
                        }}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: "#4caf50",
                          color: "#fff",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#388e3c";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#4caf50";
                          }
                        }}
                      >
                        <ArchiveRestore size={14} />
                        {actionLoading === listing.id ? "..." : "Пусни пак"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Drafts Tab Actions: Continue Editing, Delete */}
                  {activeTab === "drafts" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(listing);
                        }}
                        style={{ ...styles.actionButton, ...styles.previewButton }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <Eye size={14} />
                        Преглед
                      </button>

                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToEdit(listing);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#ea580c";
                          e.currentTarget.style.borderColor = "#ea580c";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#d97706";
                          e.currentTarget.style.borderColor = "#d97706";
                        }}
                      >
                        <Edit2 size={14} style={{ marginRight: "4px" }} />
                        Продължи редакция
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Liked Tab Actions: Remove from Favorites */}
                  {activeTab === "liked" && (
                    <button
                      onClick={(e) => handleRemoveFromFavorites(listing.id, e)}
                      disabled={actionLoading === listing.id}
                      style={{
                        ...styles.actionButton,
                        background: "#e91e63",
                        color: "#fff",
                        opacity: actionLoading === listing.id ? 0.6 : 1,
                        cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (actionLoading !== listing.id) {
                          e.currentTarget.style.background = "#c2185b";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (actionLoading !== listing.id) {
                          e.currentTarget.style.background = "#e91e63";
                        }
                      }}
                    >
                      <Heart size={14} />
                      {actionLoading === listing.id ? "..." : "Премахни от любими"}
                    </button>
                  )}
                </div>

                {deleteConfirm === listing.id && (
                  <div style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "#ffebee",
                    border: "1px solid #ffcdd2",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#d32f2f",
                  }}>
                    Сигурни ли сте, че искате да изтриете тази обява?
                  </div>
                )}
              </div>
            </div>
          )})}
          </div>
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                type="button"
                style={{
                  ...styles.paginationButton,
                  ...(safePage === 1 ? styles.paginationButtonDisabled : {}),
                }}
                disabled={safePage === 1}
                onClick={() => handlePageChange(safePage - 1)}
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
                        ...(page === safePage ? styles.paginationButtonActive : {}),
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
                  ...(safePage === totalPages ? styles.paginationButtonDisabled : {}),
                }}
                disabled={safePage === totalPages}
                onClick={() => handlePageChange(safePage + 1)}
              >
                Следваща
              </button>
              <span style={styles.paginationInfo}>
                Страница {safePage} от {totalPages}
              </span>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyAdsPage;


