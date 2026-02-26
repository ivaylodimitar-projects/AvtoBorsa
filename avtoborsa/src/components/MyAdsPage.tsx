import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Trash2,
  Trash,
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
  Tag,
  Printer,
} from "lucide-react";
import Lottie from "lottie-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { useAuth } from "../context/AuthContext";
import {
  formatConditionLabel,
  formatEuroStandardLabel,
  formatFuelLabel,
  formatGearboxLabel,
} from "../utils/listingLabels";
import { resolvePriceBadgeState } from "../utils/priceChangeBadge";
import { getMainCategoryLabel } from "../constants/mobileBgData";
import {
  readMyAdsCache,
  writeMyAdsCache,
  invalidateMyAdsCache,
} from "../utils/myAdsCache";
import { requestDealerListingsSync } from "../utils/dealerSubscriptions";
import { addBalanceUsageRecord } from "../utils/balanceUsageHistory";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";
import ListingPromoBadge from "./ListingPromoBadge";
import KapariranoBadge from "./KapariranoBadge";
import ResponsiveImage, { type ApiPhoto } from "./ResponsiveImage";
import { API_BASE_URL } from "../config/api";
import karBgQrCodeAnimation from "../assets/karbgqrcode.json";
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
  images: ApiPhoto[];
  image_url?: string;
  photo?: ApiPhoto | null;
  created_at: string;
  updated_at?: string;
  is_archived: boolean;
  is_draft: boolean;
  is_kaparirano?: boolean;
  listing_type?: "top" | "vip" | "normal" | string;
  listing_type_display?: string;
  top_plan?: "1d" | "7d" | string;
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
  photo?: ApiPhoto | null;
  fullFallbackPath?: string | null;
  thumbFallbackPath?: string | null;
};

type CardImageSource = {
  photo: ApiPhoto | null;
  fallbackPath: string | null;
  display: string;
  full: string;
  thumb: string;
  hasImage: boolean;
};

type MyAdsNavigationState = {
  forceRefresh?: boolean;
  publishMessage?: string;
  publishedListingId?: number | null;
};

type TabType = "active" | "archived" | "drafts" | "liked" | "top" | "vip" | "expired";
type ListingType = "normal" | "top" | "vip";
type TopPlan = "1d" | "7d";
type VipPlan = "7d" | "lifetime";
// Change this value to control how long the "Нова" badge remains visible.
const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const NEW_LISTING_BADGE_REFRESH_MS = 30_000;
const TOP_LISTING_PRICE_1D_EUR = 2.49;
const TOP_LISTING_PRICE_7D_EUR = 7.49;
const VIP_LISTING_PRICE_7D_EUR = 1.99;
const VIP_LISTING_PRICE_LIFETIME_EUR = 6.99;
const TOP_RENEWAL_DISCOUNT_RATIO = 0.85;
const VIP_RENEWAL_DISCOUNT_RATIO = 0.85;
const TOP_TO_VIP_DISCOUNT_RATIO = 0.9;
const VIP_PREPAY_ALLOWED_REMAINING_DAYS = 3;
const LISTING_EXPIRY_DAYS = 30;
const PAGE_SIZE = 21;
const PROMOTE_LOADING_MIN_MS = 1100;
const QR_BRAND_TAG = "Kar.bg";
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
  @keyframes myadsPromotionSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .myads-icon-btn {
    position: relative;
    overflow: visible;
  }
  .myads-icon-btn > svg {
    width: 20px !important;
    height: 20px !important;
    stroke-width: 2.2;
  }
  .myads-delete-icon-wrap {
    width: 16px;
    height: 16px;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
  }
  .myads-delete-icon {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 16px;
    height: 16px;
    stroke-width: 2.2;
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    transition: opacity 0.24s cubic-bezier(0.22, 1, 0.36, 1), transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .myads-delete-icon--confirm {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7) rotate(-18deg);
  }
  .myads-delete-icon-wrap.is-confirm .myads-delete-icon--primary {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7) rotate(18deg);
  }
  .myads-delete-icon-wrap.is-confirm .myads-delete-icon--confirm {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
  .myads-icon-btn::after {
    content: attr(data-action);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translate(-50%, 6px);
    background: rgba(15, 23, 42, 0.96);
    color: #fff;
    border-radius: 16px;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2px;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease;
    z-index: 25;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.32);
  }
  .myads-icon-btn:hover::after,
  .myads-icon-btn:focus-visible::after {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  .myads-filter-toggle {
    display: none;
  }
  .myads-filter-toggle-icon {
    display: inline-flex;
    transition: transform 0.2s ease;
  }
  .myads-filter-collapse {
    display: block;
  }

  @media (max-width: 639px) {
    .myads-filter-label {
      display: none !important;
    }
    .myads-filter-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.2px;
      cursor: pointer;
    }
    .myads-filter-toggle.is-open .myads-filter-toggle-icon {
      transform: rotate(180deg);
    }
    .myads-filter-count {
      order: 2;
      margin-left: auto;
      text-align: right !important;
      white-space: nowrap;
      font-size: 12px !important;
    }
    .myads-filter-collapse {
      order: 3;
      display: none;
      width: 100%;
    }
    .myads-filter-collapse.is-open {
      display: block;
    }
    .myads-filter-toggle {
      order: 1;
    }
    .myads-filter-controls {
      flex-direction: column !important;
      align-items: stretch !important;
      width: 100%;
      margin-top: 8px;
    }
    .myads-filter-select {
      width: 100% !important;
    }
  }

  @media (max-width: 900px) {
    .myads-listingtype-overlay {
      align-items: flex-start !important;
      padding: 8px 8px calc(env(safe-area-inset-bottom, 0px) + 8px) !important;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .myads-listingtype-modal {
      width: 100% !important;
      max-width: 100% !important;
      min-height: calc(100dvh - 16px);
      max-height: calc(100dvh - 16px);
      border-radius: 18px !important;
      padding: 14px 12px !important;
      gap: 12px !important;
      overflow: hidden;
    }

    .myads-listingtype-header {
      gap: 8px !important;
    }

    .myads-listingtype-title {
      font-size: 18px !important;
      line-height: 1.25 !important;
    }

    .myads-listingtype-subtitle {
      margin-top: 4px !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
    }

    .myads-listingtype-close {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      color: #334155 !important;
      flex: 0 0 auto;
      padding: 0 !important;
    }

    .myads-listingtype-content {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
      flex: 1 1 auto;
      overflow-y: auto;
      min-height: 0;
      padding-right: 2px;
      scrollbar-gutter: stable;
    }

    .myads-listingtype-left,
    .myads-listingtype-right {
      gap: 10px !important;
    }

    .myads-listingtype-grid,
    .myads-listingtype-vip-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .myads-listingtype-card {
      min-height: 56px;
      padding: 14px !important;
    }

    .myads-listingtype-plan-card {
      min-height: 56px;
      padding: 12px !important;
    }

    .myads-listingtype-card-title {
      font-size: 15px !important;
      line-height: 1.25 !important;
      margin-bottom: 4px !important;
    }

    .myads-listingtype-card-desc {
      font-size: 12px !important;
      line-height: 1.45 !important;
    }

    .myads-listingtype-card-price {
      margin-top: 4px !important;
      font-size: 13px !important;
    }

    .myads-listingtype-preview-media {
      height: 160px !important;
    }

    .myads-listingtype-preview-badge-wrap {
      top: 14px !important;
      left: 29px !important;
    }

    .myads-listingtype-actions {
      position: sticky;
      bottom: 0;
      z-index: 2;
      margin-top: 6px !important;
      padding-top: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, #ffffff 36%);
      flex-direction: column-reverse !important;
      gap: 8px !important;
    }

    .myads-listingtype-btn {
      display: inline-flex;
      align-items: center;
      width: 100%;
      min-height: 44px;
      justify-content: center;
    }

    .myads-listingtype-hint {
      font-size: 12px !important;
      line-height: 1.45 !important;
    }
  }

  @media (max-width: 480px) {
    .myads-listingtype-overlay {
      padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px) !important;
    }

    .myads-listingtype-modal {
      min-height: calc(100dvh - 12px);
      max-height: calc(100dvh - 12px);
      border-radius: 16px !important;
      padding: 12px 10px !important;
    }

    .myads-listingtype-preview-media {
      height: 148px !important;
    }

    .myads-listingtype-preview-badge-wrap {
      top: 12px !important;
      left: 25px !important;
    }
  }
`;

const MyAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = (location.state as MyAdsNavigationState | null) ?? null;
  const forceRefreshFromPublish = navigationState?.forceRefresh === true;
  const { isAuthenticated, user, updateBalance } = useAuth();
  const getImageUrl = useImageUrl();
  const isBusinessUser = user?.userType === "business";
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    topPlan: TopPlan;
    vipPlan: VipPlan;
  }>({
    isOpen: false,
    listingId: null,
    listingTitle: "",
    mode: "republish",
    selectedType: "normal",
    topPlan: "1d",
    vipPlan: "7d",
  });
  const [promoteLoadingTailVisible, setPromoteLoadingTailVisible] = useState(false);
  const [previewListing, setPreviewListing] = useState<CarListing | null>(null);
  const [previewTab, setPreviewTab] = useState<TabType | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [qrListing, setQrListing] = useState<CarListing | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [qrTargetUrl, setQrTargetUrl] = useState("");
  const [qrGenerationError, setQrGenerationError] = useState<string | null>(null);
  const [isQrGenerating, setIsQrGenerating] = useState(false);
  const qrGenerationRequestRef = React.useRef(0);
  const tabsSliderRef = React.useRef<HTMLDivElement | null>(null);
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
          fetchList(`${API_BASE_URL}/api/my-listings/`),
          fetchList(`${API_BASE_URL}/api/my-archived/`),
          fetchList(`${API_BASE_URL}/api/my-drafts/`),
          fetchList(`${API_BASE_URL}/api/my-expired/`),
          fetchList(`${API_BASE_URL}/api/my-favorites/`),
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

  useEffect(() => {
    if (!listingTypeModal.isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [listingTypeModal.isOpen]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handleTabsWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    const slider = tabsSliderRef.current;
    if (!slider) return;
    const hasOverflow = slider.scrollWidth > slider.clientWidth + 2;
    if (!hasOverflow) return;

    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;

    const startLeft = slider.scrollLeft;
    slider.scrollLeft += delta;

    if (slider.scrollLeft !== startLeft) {
      event.preventDefault();
    }
  };

  const refreshBalance = async (): Promise<number | null> => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return null;
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (typeof data.balance === "number") {
        updateBalance(data.balance);
        return data.balance;
      }
      return null;
    } catch {
      // ignore balance refresh errors
      return null;
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

  const getListingDisplayTitle = (listing: CarListing) => {
    const fallbackTitle = `${listing.brand || ""} ${listing.model || ""}`.trim();
    return (listing.title || fallbackTitle || "Обява").trim();
  };

  const buildListingQrTargetUrl = (listing: CarListing) => {
    const url = new URL(`/details/${encodeURIComponent(listing.slug)}`, window.location.origin);
    url.searchParams.set("source", QR_BRAND_TAG);
    return url.toString();
  };

  const loadImageFromDataUrl = (dataUrl: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load QR image."));
      image.src = dataUrl;
    });

  const generateBrandedQrDataUrl = async (targetUrl: string) => {
    const baseQrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    const qrImage = await loadImageFromDataUrl(baseQrDataUrl);
    const size = qrImage.naturalWidth || qrImage.width || 720;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return baseQrDataUrl;
    }

    ctx.drawImage(qrImage, 0, 0, size, size);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#0f766e";
    ctx.lineJoin = "round";

    const drawOutlinedCenteredText = (
      text: string,
      y: number,
      fontSize: number,
      fontWeight = 900
    ) => {
      ctx.font = `${fontWeight} ${fontSize}px "Manrope", "Segoe UI", sans-serif`;
      ctx.lineWidth = Math.max(5, Math.round(fontSize * 0.15));
      ctx.strokeText(text, size / 2, y);
      ctx.fillText(text, size / 2, y);
    };

    const textBlockShiftY = Math.round(size * 0.12);
    const karBgY = size / 2 + textBlockShiftY;
    const sellY = Math.round(size * 0.16) + textBlockShiftY;
    const inY = Math.round((sellY + karBgY) / 2);

    const karBgFontSize = Math.max(66, Math.round(size * 0.145));
    const sellFontSize = karBgFontSize;
    const inFontSize = Math.max(52, Math.round(size * 0.115));

    drawOutlinedCenteredText("Продава се", sellY, sellFontSize, 900);
    drawOutlinedCenteredText("В", inY, inFontSize, 900);
    drawOutlinedCenteredText(QR_BRAND_TAG, karBgY, karBgFontSize, 900);

    return canvas.toDataURL("image/png");
  };

  const closeQrModal = () => {
    qrGenerationRequestRef.current += 1;
    setQrListing(null);
    setQrCodeDataUrl("");
    setQrTargetUrl("");
    setQrGenerationError(null);
    setIsQrGenerating(false);
  };

  const openQrModal = async (listing: CarListing) => {
    if (activeTab !== "active" && activeTab !== "top" && activeTab !== "vip") {
      return;
    }

    const requestId = qrGenerationRequestRef.current + 1;
    qrGenerationRequestRef.current = requestId;
    const targetUrl = buildListingQrTargetUrl(listing);
    setQrListing(listing);
    setQrTargetUrl(targetUrl);
    setQrCodeDataUrl("");
    setQrGenerationError(null);
    setIsQrGenerating(true);

    try {
      const generatedQr = await generateBrandedQrDataUrl(targetUrl);
      if (qrGenerationRequestRef.current === requestId) {
        setQrCodeDataUrl(generatedQr);
      }
    } catch (err) {
      if (qrGenerationRequestRef.current === requestId) {
        console.error("MyAds: failed to generate QR code", err);
        setQrGenerationError("Неуспешно генериране на QR кода. Опитайте отново.");
      }
    } finally {
      if (qrGenerationRequestRef.current === requestId) {
        setIsQrGenerating(false);
      }
    }
  };

  const printQrCodeCard = async () => {
    if (!qrListing || !qrCodeDataUrl || !qrTargetUrl) {
      showToast("Няма готов QR код за PDF.", "error");
      return;
    }

    try {
      const listingTitle = getListingDisplayTitle(qrListing);
      const qrImage = await loadImageFromDataUrl(qrCodeDataUrl);

      const canvas = document.createElement("canvas");
      const canvasWidth = 1240;
      const canvasHeight = 1754;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        showToast("Неуспешно генериране на PDF.", "error");
        return;
      }

      const drawWrappedCenteredText = (
        text: string,
        y: number,
        maxWidth: number,
        lineHeight: number,
        maxLines: number
      ) => {
        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const measured = ctx.measureText(testLine).width;
          if (measured <= maxWidth || !currentLine) {
            currentLine = testLine;
          } else if (lines.length < maxLines - 1) {
            lines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine && lines.length < maxLines) {
          lines.push(currentLine);
        }

        lines.forEach((line, index) => {
          ctx.fillText(line, canvasWidth / 2, y + index * lineHeight);
        });
      };

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const cardMargin = 70;
      const cardX = cardMargin;
      const cardY = cardMargin;
      const cardWidth = canvasWidth - cardMargin * 2;
      const cardHeight = canvasHeight - cardMargin * 2;

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      ctx.fillStyle = "#0f766e";
      ctx.font = '800 56px "Manrope", "Segoe UI", sans-serif';
      ctx.fillText(QR_BRAND_TAG, canvasWidth / 2, cardY + 56);

      ctx.fillStyle = "#0f172a";
      ctx.font = '800 48px "Manrope", "Segoe UI", sans-serif';
      drawWrappedCenteredText(listingTitle, cardY + 140, cardWidth - 140, 56, 2);

      ctx.fillStyle = "#334155";
      ctx.font = '700 28px "Manrope", "Segoe UI", sans-serif';
      ctx.fillText("Сканирай за директен достъп до обявата", canvasWidth / 2, cardY + 270);

      const qrBoxSize = Math.round(cardWidth * 0.72);
      const qrBoxX = Math.round((canvasWidth - qrBoxSize) / 2);
      const qrBoxY = cardY + 350;
      const qrPadding = 20;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      ctx.drawImage(
        qrImage,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      );

      ctx.fillStyle = "#475569";
      ctx.font = '600 20px "Manrope", "Segoe UI", sans-serif';
      drawWrappedCenteredText(qrTargetUrl, qrBoxY + qrBoxSize + 44, cardWidth - 120, 28, 4);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasData = canvas.toDataURL("image/png");
      pdf.addImage(canvasData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const normalizedSlug = listingTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const safeName = normalizedSlug || `listing-${qrListing.id}`;
      pdf.save(`karbg-qr-${safeName}.pdf`);
      showToast("PDF файлът е свален.", "success");
    } catch (err) {
      console.error("MyAds: failed to download QR PDF", err);
      showToast("Неуспешно сваляне на PDF файла.", "error");
    }
  };

  const getCoverPhoto = (listing: CarListing): ApiPhoto | null => {
    const orderedImages = Array.isArray(listing.images) ? listing.images : [];
    return (
      listing.photo ||
      orderedImages.find((img) => Boolean(img?.is_cover)) ||
      orderedImages[0] ||
      null
    );
  };

  const getCardImageSources = (listing: CarListing): CardImageSource => {
    const coverPhoto = getCoverPhoto(listing);
    const fallbackRaw =
      (listing.image_url ||
        coverPhoto?.original_url ||
        coverPhoto?.image ||
        coverPhoto?.thumbnail ||
        "").trim();
    const thumbRaw = (coverPhoto?.thumbnail || fallbackRaw).trim();
    const displayRaw = (thumbRaw || fallbackRaw).trim();
    const full = fallbackRaw ? getImageUrl(fallbackRaw) : "";
    const thumb = thumbRaw ? getImageUrl(thumbRaw) : full;
    const display = displayRaw ? getImageUrl(displayRaw) : "";
    const hasImage = Boolean(
      display ||
        (Array.isArray(coverPhoto?.renditions) && coverPhoto.renditions.length > 0)
    );
    return {
      photo: coverPhoto,
      fallbackPath: fallbackRaw || null,
      display,
      full,
      thumb,
      hasImage,
    };
  };

  const getPreviewImages = (listing: CarListing): PreviewImageSource[] => {
    const orderedImages = Array.isArray(listing.images) ? listing.images : [];
    const resolved: PreviewImageSource[] = [];
    const seen = new Set<string>();

    const pushImage = (
      photoCandidate?: ApiPhoto | null,
      fullCandidate?: string | null,
      thumbCandidate?: string | null
    ) => {
      const fullRaw = (fullCandidate || thumbCandidate || "").trim();
      const full = fullRaw ? getImageUrl(fullRaw) : "";
      if (!full || seen.has(full)) return;
      seen.add(full);
      const thumbRaw = (thumbCandidate || fullCandidate || "").trim();
      const thumb = thumbRaw ? getImageUrl(thumbRaw) : full;
      resolved.push({
        full,
        thumb: thumb || full,
        photo: photoCandidate || null,
        fullFallbackPath: fullRaw || null,
        thumbFallbackPath: thumbRaw || fullRaw || null,
      });
    };

    const coverPhoto = getCoverPhoto(listing);
    if (coverPhoto) {
      pushImage(
        coverPhoto,
        coverPhoto.original_url || coverPhoto.image || listing.image_url || null,
        coverPhoto.thumbnail || coverPhoto.original_url || coverPhoto.image || listing.image_url || null
      );
    } else if (listing.image_url) {
      pushImage(null, listing.image_url, listing.image_url);
    }

    orderedImages.forEach((img) => {
      pushImage(
        img,
        img.original_url || img.image || null,
        img.thumbnail || img.original_url || img.image || null
      );
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

  const getListingExpiryLabel = (listing: CarListing) => {
    if (!listing.created_at) return "";
    const createdAtMs = new Date(listing.created_at).getTime();
    if (Number.isNaN(createdAtMs)) return "";

    const expiresAtMs = createdAtMs + LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const formatted = new Date(expiresAtMs).toLocaleDateString("bg-BG", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    if (!formatted) return "";
    return expiresAtMs <= currentTimeMs
      ? `Изтекла на: ${formatted}`
      : `Изтича на: ${formatted}`;
  };


  const getShortDescription = (text?: string, maxLength = 140) => {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength).trim()}…`;
  };

  const getAdaptiveCardChipLimit = (
    chipsCount: number,
    descriptionSnippet: string,
    subtitle: string,
    mainCategory: string
  ) => {
    // Base density for normal cards.
    const isHeavyCard = mainCategory === "3" || mainCategory === "4";
    let limit = isHeavyCard ? 6 : 4;
    const descriptionLength = descriptionSnippet.trim().length;

    // Fill free card space when listing text is short.
    if (descriptionLength === 0) {
      limit += 4;
    } else if (descriptionLength < 60) {
      limit += 3;
    } else if (descriptionLength < 95) {
      limit += 2;
    } else if (descriptionLength < 120) {
      limit += 1;
    }

    if (!subtitle.trim()) {
      limit += 1;
    }

    const maxLimit = isHeavyCard ? 12 : 9;
    const minLimit = isHeavyCard ? 6 : 4;
    return Math.max(minLimit, Math.min(chipsCount, limit, maxLimit));
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

  const getTopPrice = (topPlan: TopPlan) =>
    topPlan === "7d" ? TOP_LISTING_PRICE_7D_EUR : TOP_LISTING_PRICE_1D_EUR;

  const getTopPlanLabel = (topPlan: TopPlan) =>
    topPlan === "7d" ? "за 7 дни" : "за 1 ден";

  const getVipPlanLabel = (vipPlan: VipPlan) =>
    vipPlan === "lifetime" ? "до изтичане на обявата (30 дни)" : "за 7 дни";

  const isTopActive = (listing: CarListing | null) =>
    Boolean(
      listing &&
        listing.listing_type === "top" &&
        listing.top_expires_at &&
        Number.isFinite(new Date(listing.top_expires_at).getTime()) &&
        new Date(listing.top_expires_at).getTime() > currentTimeMs
    );

  const isVipActive = (listing: CarListing | null) =>
    Boolean(
      listing &&
        listing.listing_type === "vip" &&
        listing.vip_expires_at &&
        Number.isFinite(new Date(listing.vip_expires_at).getTime()) &&
        new Date(listing.vip_expires_at).getTime() > currentTimeMs
    );

  const getVipRemainingDays = (listing: CarListing | null) => {
    if (!isVipActive(listing) || !listing?.vip_expires_at) return 0;
    const diffMs = new Date(listing.vip_expires_at).getTime() - currentTimeMs;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  };

  const getPromotePrice = (
    listing: CarListing | null,
    listingType: ListingType,
    topPlan: TopPlan,
    vipPlan: VipPlan
  ) => {
    if (listingType === "normal") {
      return 0;
    }

    if (listingType === "top") {
      const baseTop = getTopPrice(topPlan);
      return isTopActive(listing) ? baseTop * TOP_RENEWAL_DISCOUNT_RATIO : baseTop;
    }

    const baseVip = getVipPrice(vipPlan);
    if (isTopActive(listing)) {
      return baseVip * TOP_TO_VIP_DISCOUNT_RATIO;
    }
    if (isVipActive(listing)) {
      return baseVip * VIP_RENEWAL_DISCOUNT_RATIO;
    }
    return baseVip;
  };

  const resolveSpentAmount = (
    balanceBefore: number | null,
    balanceAfter: number | null,
    fallbackAmount: number
  ) => {
    if (balanceBefore !== null && balanceAfter !== null) {
      const delta = Math.round((balanceBefore - balanceAfter) * 100) / 100;
      return Number.isFinite(delta) && delta > 0 ? delta : 0;
    }

    const normalizedFallback = Math.round(fallbackAmount * 100) / 100;
    return Number.isFinite(normalizedFallback) && normalizedFallback > 0
      ? normalizedFallback
      : 0;
  };

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
      topPlan: listing.top_plan === "7d" ? "7d" : "1d",
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
    topPlan: TopPlan,
    vipPlan: VipPlan
  ) => {
    setActionLoading(listingId);
    const sourceListing =
      expiredListings.find((item) => item.id === listingId) ||
      activeListings.find((item) => item.id === listingId) ||
      archivedListings.find((item) => item.id === listingId) ||
      draftListings.find((item) => item.id === listingId) ||
      null;
    const fallbackSpendAmount =
      listingType === "top" || listingType === "vip"
        ? getPromotePrice(sourceListing, listingType, topPlan, vipPlan)
        : 0;
    const balanceBefore =
      typeof user?.balance === "number" && Number.isFinite(user.balance)
        ? user.balance
        : null;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/republish/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_type: listingType,
          top_plan: listingType === "top" ? topPlan : undefined,
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

      const updatedListing = (await response.json()) as CarListing;

      setExpiredListings((prev) => prev.filter((l) => l.id !== listingId));
      setActiveListings((prev) => [
        updatedListing,
        ...prev.filter((l) => l.id !== listingId),
      ]);
      invalidateMyAdsCache(user?.id);
      showToast(
        listingType === "top"
          ? `Обявата е публикувана отново като ТОП ${getTopPlanLabel(topPlan)}.`
          : listingType === "vip"
            ? `Обявата е публикувана отново като VIP ${getVipPlanLabel(vipPlan)}.`
            : "Обявата е публикувана отново като нормална."
      );
      requestDealerListingsSync(user?.id);
      if (listingType === "top" || listingType === "vip") {
        const balanceAfter = await refreshBalance();
        const spentAmount = resolveSpentAmount(
          balanceBefore,
          balanceAfter,
          fallbackSpendAmount
        );

        if (spentAmount > 0) {
          addBalanceUsageRecord(user?.id, {
            amount: spentAmount,
            currency: "EUR",
            listingType: listingType === "top" ? "top" : "vip",
            plan: listingType === "top" ? topPlan : vipPlan,
            source: "republish",
            listingId: updatedListing.id || listingId,
            listingTitle: getListingDisplayTitle(updatedListing),
          });
        }
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
    topPlan: TopPlan,
    vipPlan: VipPlan
  ) => {
    setActionLoading(listingId);
    const sourceListing =
      activeListings.find((item) => item.id === listingId) ||
      expiredListings.find((item) => item.id === listingId) ||
      null;
    const fallbackSpendAmount =
      listingType === "top" || listingType === "vip"
        ? getPromotePrice(sourceListing, listingType, topPlan, vipPlan)
        : 0;
    const balanceBefore =
      typeof user?.balance === "number" && Number.isFinite(user.balance)
        ? user.balance
        : null;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/listing-type/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_type: listingType,
          top_plan: listingType === "top" ? topPlan : undefined,
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

      const updatedListing = (await response.json()) as CarListing;
      setActiveListings((prev) =>
        prev.map((l) => (l.id === listingId ? updatedListing : l))
      );
      invalidateMyAdsCache(user?.id);
      showToast(
        listingType === "top"
          ? `Обявата е промотирана като ТОП ${getTopPlanLabel(topPlan)}.`
          : listingType === "vip"
            ? `Обявата е маркирана като VIP ${getVipPlanLabel(vipPlan)}.`
            : "Типът на обявата е обновен."
      );
      if (listingType === "top" || listingType === "vip") {
        const balanceAfter = await refreshBalance();
        const spentAmount = resolveSpentAmount(
          balanceBefore,
          balanceAfter,
          fallbackSpendAmount
        );

        if (spentAmount > 0) {
          addBalanceUsageRecord(user?.id, {
            amount: spentAmount,
            currency: "EUR",
            listingType: listingType === "top" ? "top" : "vip",
            plan: listingType === "top" ? topPlan : vipPlan,
            source: "promote",
            listingId: updatedListing.id || listingId,
            listingTitle: getListingDisplayTitle(updatedListing),
          });
        }
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

  const handleKapariranoToggle = async (listing: CarListing, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isBusinessUser) return;

    setActionLoading(listing.id);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`${API_BASE_URL}/api/listings/${listing.id}/kaparirano/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_kaparirano: !Boolean(listing.is_kaparirano),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Неуспешна промяна на статуса Капарирано";
        try {
          const errorData = await response.json();
          if (typeof errorData?.detail === "string" && errorData.detail.trim()) {
            errorMessage = errorData.detail;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const updatedListing: CarListing = await response.json();
      const applyUpdate = (items: CarListing[]) =>
        items.map((item) => (item.id === updatedListing.id ? updatedListing : item));

      setActiveListings((prev) => applyUpdate(prev));
      setArchivedListings((prev) => applyUpdate(prev));
      setDraftListings((prev) => applyUpdate(prev));
      setExpiredListings((prev) => applyUpdate(prev));
      setLikedListings((prev) => applyUpdate(prev));

      invalidateMyAdsCache(user?.id);
      showToast(
        updatedListing.is_kaparirano
          ? "Обявата е маркирана като Капарирано."
          : "Маркировката Капарирано е премахната."
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Грешка при обновяване на статуса Капарирано";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const executeListingTypeConfirm = async () => {
    if (!listingTypeModal.listingId) return;
    const { listingId, selectedType, mode, topPlan, vipPlan } = listingTypeModal;
    const isPromoteFlow = mode === "promote";
    const startedAtMs = Date.now();

    if (isPromoteFlow) {
      setPromoteLoadingTailVisible(true);
    }

    try {
      const success =
        mode === "republish"
          ? await submitRepublish(listingId, selectedType, topPlan, vipPlan)
          : await submitListingTypeUpdate(listingId, selectedType, topPlan, vipPlan);

      if (isPromoteFlow) {
        const elapsedMs = Date.now() - startedAtMs;
        const remainingMs = Math.max(0, PROMOTE_LOADING_MIN_MS - elapsedMs);
        if (remainingMs > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, remainingMs);
          });
        }
      }

      if (success) {
        closeListingTypeModal();
      }
    } finally {
      if (isPromoteFlow) {
        setPromoteLoadingTailVisible(false);
      }
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
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/archive/`, {
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
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/unarchive/`, {
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
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/delete/`, {
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
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/unfavorite/`, {
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
    const seenSpecs = new Set<string>();
    const addSpec = (label: string, value: unknown, icon: React.ComponentType<any>) => {
      const normalized = toText(value);
      if (!normalized) return;
      const dedupeKey = `${label}::${normalized.toLowerCase()}`;
      if (seenSpecs.has(dedupeKey)) return;
      seenSpecs.add(dedupeKey);
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
        addSpec("Марка", getEffectiveListingBrand(listing), Tag);
        addSpec("Модел", listing.model, Car);
        addSpec("Град", listing.city, MapPin);
        addNumeric("Пробег", listing.mileage, "км", Gauge);
        addNumeric("Оси", listing.axles, "", Settings);
        addNumeric("Седалки", listing.seats, "", PackageOpen);
        addNumeric("Товар", listing.load_kg, "кг", Gauge);
        addSpec("Трансмисия", listing.transmission, Settings);
        addSpec("Двигател", listing.engine_type, Fuel);
        addSpec("Гориво", formatFuelLabel(listing.fuel), Fuel);
        addSpec("Кутия", formatGearboxLabel(listing.gearbox), Settings);
        addNumeric("Кубатура", listing.displacement_cc ?? listing.displacement, "cc", Ruler);
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
        addSpec("Двигател", listing.engine_type, Fuel);
        addNumeric("Брой двигатели", listing.engine_count, "", Settings);
        addSpec("Материал", listing.material, Palette);
        addNumeric("Дължина", listing.length_m, "м", Ruler, false);
        addNumeric("Ширина", listing.width_m, "м", Ruler, false);
        addNumeric("Газене", listing.draft_m, "м", Ruler, false);
        addNumeric("Часове", listing.hours, "ч", Clock);
        break;
      case "b":
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

    // Universal fallback so every category can fill spare card space with useful data.
    addSpec("Година", listing.year_from ? `${listing.year_from}` : "", Calendar);
    addSpec("Състояние", conditionLabel, ShieldCheck);
    addSpec("Град", listing.city, MapPin);
    addNumeric("Пробег", listing.mileage, "км", Gauge);
    addNumeric("Кубатура", listing.displacement_cc ?? listing.displacement, "cc", Ruler);
    addNumeric("Мощност", listing.power, "к.с.", Zap);
    addSpec("Гориво", formatFuelLabel(listing.fuel), Fuel);
    addSpec("Кутия", formatGearboxLabel(listing.gearbox), Settings);
    addSpec(
      "Еко",
      formatEuroStandardLabel(toText(listing.heavy_euro_standard) || toText(listing.euro_standard)),
      Leaf
    );
    addSpec("Цвят", listing.color, Palette);
    addNumeric("Седалки", listing.seats, "", PackageOpen);
    addNumeric("Товар", listing.load_kg, "кг", Gauge);
    addNumeric("Оси", listing.axles, "", Settings);

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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    flexWrap: "nowrap",
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    WebkitOverflowScrolling: "touch",
    scrollSnapType: "x proximity",
    gap: 10,
    marginBottom: 24,
    width: "100%",
    paddingBottom: 4,
  },
  tab: {
    padding: "11px 12px",
    background: "#fff",
    color: "#333",
    border: "1px solid #e0e0e0",
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "normal",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "auto",
    minWidth: 148,
    flex: "0 0 auto",
    scrollSnapAlign: "start",
    textAlign: "center",
    lineHeight: 1.25,
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
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 700,
  },
  tabBadgeInactive: {
    background: "#f5f5f5",
    color: "#666",
    padding: "2px 8px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 700,
  },
  tabPromoBadgeImage: {
    width: 22,
    height: 22,
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 2px 4px rgba(15, 23, 42, 0.25))",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "12px 16px",
    marginBottom: 24,
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
    border: "1px solid #0f766e",
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  promotionLoadingOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15, 23, 42, 0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1400,
    backdropFilter: "blur(1.5px)",
    padding: "20px",
  },
  promotionLoadingCard: {
    width: "min(320px, 90vw)",
    background: "rgba(255, 255, 255, 0.96)",
    border: "1px solid #dbeafe",
    borderRadius: 16,
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  promotionLoadingSpinner: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: "3px solid #bfdbfe",
    borderTopColor: "#0f766e",
    animation: "myadsPromotionSpin 0.8s linear infinite",
  },
  promotionLoadingTitle: {
    margin: "2px 0 0 0",
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    textAlign: "center",
  },
  promotionLoadingText: {
    margin: 0,
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
  modal: {
    width: "min(860px, 96vw)",
    background: "#fff",
    borderRadius: 16,
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
  qrModal: {
    width: "min(460px, 96vw)",
    background: "#fff",
    borderRadius: 16,
    padding: "20px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  qrModalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  qrModalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  qrModalSubtitle: {
    margin: "6px 0 0 0",
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.45,
  },
  qrModalBody: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "14px 14px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  qrLoadingText: {
    margin: 0,
    fontSize: 13,
    color: "#334155",
    fontWeight: 700,
    textAlign: "center",
  },
  qrErrorText: {
    margin: 0,
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: 700,
    textAlign: "center",
  },
  qrCodeCard: {
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    background: "#fff",
    padding: 10,
  },
  qrCodeImage: {
    width: 260,
    height: 260,
    display: "block",
  },
  qrBrandPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: "1px solid #0f172a",
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "0.3px",
  },
  qrTargetUrl: {
    margin: 0,
    width: "100%",
    color: "#475569",
    fontSize: 11,
    lineHeight: 1.45,
    wordBreak: "break-all",
    textAlign: "center",
  },
  qrModalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  qrPrintButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 16,
    border: "1px solid #0f766e",
    background: "#0f766e",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  qrPrintButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  qrSecondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  listingTypeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  modalContentSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    alignItems: "start",
  },
  modalContentLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  modalContentRight: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listingTypeCard: {
    position: "relative" as const,
    borderRadius: 16,
    border: "1px solid #e0e0e0",
    padding: "16px",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left" as const,
    display: "flex",
    flexDirection: "column",
    gap: 6,
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
  listingTypePrice: {
    margin: "2px 0 0 0",
    fontSize: 12,
    fontWeight: 800,
    color: "#0f766e",
  },
  vipPlanGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  vipPlanCard: {
    borderRadius: 16,
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
    borderRadius: 16,
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
  promoDetailsBox: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    borderRadius: 16,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  promoDetailsLine: {
    margin: 0,
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: 700,
    lineHeight: 1.35,
  },
  listingTypePreviewCard: {
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    overflow: "visible",
    background: "#fff",
    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
  },
  listingTypePreviewMedia: {
    position: "relative" as const,
    height: 186,
    background: "#f1f5f9",
    overflow: "visible" as const,
    isolation: "isolate" as const,
  },
  listingTypePreviewBadgeWrap: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    zIndex: 8,
    pointerEvents: "none" as const,
  },
  listingTypePreviewFrame: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: "hidden",
  },
  listingTypePreviewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    objectPosition: "center" as const,
    display: "block",
  },
  listingTypePreviewPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: 13,
    gap: 8,
  },
  listingTypePreviewBody: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  listingTypePreviewTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  listingTypePreviewMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
  },
  listingTypePreviewPrice: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    padding: "0 10px",
    borderRadius: 16,
    background: "linear-gradient(135deg, #0f766e 0%, #0ea5a3 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    width: "fit-content",
  },
  listingTypePreviewHint: {
    margin: "2px 0 0 0",
    fontSize: 11,
    color: "#64748b",
    fontWeight: 700,
  },
  listingTypePreviewPromoPrice: {
    margin: 0,
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 800,
  },
  previewModal: {
    width: "min(980px, 96vw)",
    background: "#fff",
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
  previewPriceChangeAnnounced: {
    background: "#e0f2fe",
    color: "#0369a1",
    border: "1px solid #bae6fd",
  },
  previewSpecs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  previewSpec: {
    padding: "10px 12px",
    background: "#ecfdf5",
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
      borderRadius: 16,
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
  listingPriceChangeAnnounced: {
    background: "#e0f2fe",
    color: "#0369a1",
    border: "1px solid #bae6fd",
  },
  listingContent: {
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  listingContentSpacer: {
    marginTop: "auto",
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
  listingMetaUpdated: {
    fontSize: 12,
    color: "#f97316",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  listingPromoStatusStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
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
    borderRadius: 16,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  listingChipIcon: {
    color: "#0f766e",
  },
  listingActionsLabel: {
    marginTop: 10,
    marginBottom: 6,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.4px",
    textTransform: "uppercase" as const,
    color: "#64748b",
  },
  listingActions: {
    display: "flex",
    gap: 8,
    marginTop: 0,
    paddingTop: 16,
    borderTop: "1px solid #e0e0e0",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteConfirmWrap: {
    marginTop: 8,
    overflow: "hidden",
    transition: "max-height 0.28s ease, opacity 0.24s ease, transform 0.24s ease",
    transformOrigin: "top center",
  },
  deleteConfirmWrapOpen: {
    maxHeight: 72,
    opacity: 1,
    transform: "translateY(0)",
  },
  deleteConfirmWrapClosed: {
    maxHeight: 0,
    opacity: 0,
    transform: "translateY(-4px)",
    pointerEvents: "none",
  },
  deleteConfirmBox: {
    padding: "8px 12px",
    background: "#ffebee",
    border: "1px solid #ffcdd2",
    borderRadius: 16,
    fontSize: 12,
    color: "#d32f2f",
  },
  listingExpiryRow: {
    marginTop: 10,
    width: "100%",
    alignSelf: "stretch",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listingExpiryInfo: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    textAlign: "right" as const,
  },
  listingDateRow: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    width: "100%",
    marginBottom: 3,
  },
  listingDateIcon: {
    width: 13,
    height: 13,
    strokeWidth: 2.2,
    flexShrink: 0,
  },
  listingPublishedInfo: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f766e",
    textAlign: "right" as const,
  },
  listingPublishedIcon: {
    color: "#0f766e",
  },
  listingEditedInfo: {
    fontSize: 12,
    fontWeight: 700,
    color: "#ea580c",
    textAlign: "right" as const,
  },
  listingEditedIcon: {
    color: "#ea580c",
  },
  listingExpiryMainInfo: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    textAlign: "right" as const,
    marginBottom: 0,
  },
  listingExpiryIcon: {
    color: "#475569",
  },
  qrTriggerButton: {
    width: 58,
    height: 58,
    minWidth: 58,
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f766e",
    cursor: "pointer",
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.1)",
  },
  qrTriggerButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  qrTriggerIconWrap: {
    width: 44,
    height: 44,
    pointerEvents: "none" as const,
  },
  qrTriggerIcon: {
    width: "100%",
    height: "100%",
  },
  actionButton: {
    flex: "0 0 42px",
    width: 42,
    height: 42,
    padding: 0,
    border: "none",
    borderRadius: 16,
    fontSize: 0,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    minWidth: 42,
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
    borderRadius: 16,
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  errorState: {
    background: "#fff",
    padding: "20px",
    borderRadius: 16,
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
      case "vip":
        return activeListings.filter((listing) => listing.listing_type === "vip");
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
  const vipListingsCount = activeListings.filter((listing) => listing.listing_type === "vip").length;
  const isModalBusy =
    listingTypeModal.isOpen && actionLoading === listingTypeModal.listingId;
  const showPromoteLoadingOverlay =
    listingTypeModal.mode === "promote" &&
    (isModalBusy || promoteLoadingTailVisible);
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
  const modalSourceListing = listingTypeModal.listingId
    ? [...activeListings, ...archivedListings, ...draftListings, ...expiredListings].find(
        (listing) => listing.id === listingTypeModal.listingId
      ) || null
    : null;
  const modalIsTopActive = isTopActive(modalSourceListing);
  const modalIsVipActive = isVipActive(modalSourceListing);
  const modalVipRemainingDays = getVipRemainingDays(modalSourceListing);
  const modalVipPrepayBlocked =
    listingTypeModal.selectedType === "vip" &&
    modalIsVipActive &&
    modalVipRemainingDays > VIP_PREPAY_ALLOWED_REMAINING_DAYS;
  const modalVipPrepayMessage = modalVipPrepayBlocked
    ? `VIP предплащане е позволено само при оставащи до ${VIP_PREPAY_ALLOWED_REMAINING_DAYS} дни (в момента: ${modalVipRemainingDays} дни).`
    : "";
  const modalPromoPrice = getPromotePrice(
    modalSourceListing,
    listingTypeModal.selectedType,
    listingTypeModal.topPlan,
    listingTypeModal.vipPlan
  );
  const topConfirmBasePrice = getTopPrice(listingTypeModal.topPlan);
  const topConfirmPrice = getPromotePrice(
    modalSourceListing,
    "top",
    listingTypeModal.topPlan,
    listingTypeModal.vipPlan
  );
  const topConfirmDiscountAmount = Math.max(0, topConfirmBasePrice - topConfirmPrice);
  const modalBasePromoPrice =
    listingTypeModal.selectedType === "normal"
      ? 0
      : listingTypeModal.selectedType === "top"
        ? getTopPrice(listingTypeModal.topPlan)
        : getVipPrice(listingTypeModal.vipPlan);
  const modalDiscountAmount = Math.max(0, modalBasePromoPrice - modalPromoPrice);
  const modalDiscountPercent =
    modalBasePromoPrice > 0
      ? Math.round((modalDiscountAmount / modalBasePromoPrice) * 100)
      : 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const listingExpiryMs =
    modalSourceListing?.created_at &&
    Number.isFinite(new Date(modalSourceListing.created_at).getTime())
      ? new Date(modalSourceListing.created_at).getTime() + LISTING_EXPIRY_DAYS * dayMs
      : Number.NaN;
  const listingRemainingMs =
    Number.isFinite(listingExpiryMs) && listingExpiryMs > currentTimeMs
      ? listingExpiryMs - currentTimeMs
      : 0;
  const currentTopRemainingMs =
    modalSourceListing?.top_expires_at &&
    Number.isFinite(new Date(modalSourceListing.top_expires_at).getTime()) &&
    new Date(modalSourceListing.top_expires_at).getTime() > currentTimeMs
      ? new Date(modalSourceListing.top_expires_at).getTime() - currentTimeMs
      : 0;
  const currentVipRemainingMs =
    modalSourceListing?.vip_expires_at &&
    Number.isFinite(new Date(modalSourceListing.vip_expires_at).getTime()) &&
    new Date(modalSourceListing.vip_expires_at).getTime() > currentTimeMs
      ? new Date(modalSourceListing.vip_expires_at).getTime() - currentTimeMs
      : 0;
  const formatPromoDuration = (durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return "0мин";
    const totalMinutes = Math.ceil(durationMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const minutes = totalMinutes - days * 24 * 60 - hours * 60;
    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}мин`;
    return `${minutes}мин`;
  };
  const currentPromoLabel = modalIsTopActive ? "TOP" : modalIsVipActive ? "VIP" : "Няма";
  const currentPromoDuration = modalIsTopActive
    ? formatPromoDuration(currentTopRemainingMs)
    : modalIsVipActive
      ? formatPromoDuration(currentVipRemainingMs)
      : "0мин";
  const projectedPromoDurationMs =
    listingTypeModal.selectedType === "normal"
      ? 0
      : listingTypeModal.selectedType === "top"
        ? currentTopRemainingMs + (listingTypeModal.topPlan === "7d" ? 7 * dayMs : dayMs)
        : listingTypeModal.vipPlan === "lifetime"
          ? listingRemainingMs
          : Math.min(
              (modalIsVipActive ? currentVipRemainingMs : 0) + 7 * dayMs,
              listingRemainingMs > 0 ? listingRemainingMs : 7 * dayMs
            );
  const projectedPromoDuration = formatPromoDuration(projectedPromoDurationMs);
  const selectedPromoLabel =
    listingTypeModal.selectedType === "normal"
      ? "Нормална"
      : listingTypeModal.selectedType === "top"
        ? "TOP"
        : "VIP";
  const showModalPromoDetails = listingTypeModal.selectedType !== "normal";
  const modalPreviewImageSource = modalSourceListing
    ? getCardImageSources(modalSourceListing)
    : null;
  const modalPreviewTitle = (modalSourceListing?.title || listingTypeModal.listingTitle || "Обявата").trim();
  const modalPreviewPriceValue = modalSourceListing ? Number(modalSourceListing.price) : Number.NaN;
  const modalPreviewPriceLabel =
    Number.isFinite(modalPreviewPriceValue) && modalPreviewPriceValue > 0
      ? `${modalPreviewPriceValue.toLocaleString("bg-BG")} €`
      : "Цена не е зададена";
  const modalPreviewBadgeType =
    listingTypeModal.selectedType === "top"
      ? "top"
      : listingTypeModal.selectedType === "vip"
        ? "vip"
        : null;
  const modalPreviewPromoPriceLabel =
    listingTypeModal.selectedType === "normal"
      ? "Цена за тип обява: Безплатно"
      : listingTypeModal.selectedType === "top"
        ? `Цена за ТОП ${getTopPlanLabel(listingTypeModal.topPlan)}: €${modalPromoPrice.toFixed(2)}`
        : `Цена за VIP ${getVipPlanLabel(listingTypeModal.vipPlan)}: €${modalPromoPrice.toFixed(2)}`;
  const modalPreviewHint =
    listingTypeModal.selectedType === "top"
      ? modalIsTopActive
        ? "ТОП е активен и ще надчислим дните към оставащия период."
        : "ТОП значката ще се вижда върху обявата."
      : listingTypeModal.selectedType === "vip"
        ? modalIsTopActive
          ? `Преминаване от ТОП към VIP с промо цена (${Math.round((1 - TOP_TO_VIP_DISCOUNT_RATIO) * 100)}% отстъпка).`
          : modalIsVipActive
            ? `VIP ще се поднови с промо цена (${Math.round((1 - VIP_RENEWAL_DISCOUNT_RATIO) * 100)}% отстъпка).`
            : `VIP значка ${getVipPlanLabel(listingTypeModal.vipPlan)}.`
        : "Без промо значка при нормална обява.";
  const isPreviewTab = activeTab === "archived" || activeTab === "expired" || activeTab === "drafts";
  const previewImages = previewListing ? getPreviewImages(previewListing) : [];
  const previewImage = previewImages[previewImageIndex] || null;
  const previewPriceValue = previewListing ? Number(previewListing.price) : Number.NaN;
  const previewPriceLabel =
    Number.isFinite(previewPriceValue) && previewPriceValue > 0
      ? `€${previewPriceValue.toLocaleString("bg-BG")}`
      : "Цена не е зададена";
  const previewLatestHistory = previewListing?.price_history?.[0];
  const previewPriceBadge = resolvePriceBadgeState(previewLatestHistory, currentTimeMs);
  const showPreviewPriceChange = Boolean(previewPriceBadge);
  const PreviewChangeIcon =
    previewPriceBadge?.kind === "announced"
      ? Clock
      : previewPriceBadge?.kind === "up"
        ? TrendingUp
        : TrendingDown;
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
  const qrListingTitle = qrListing ? getListingDisplayTitle(qrListing) : "";
  const isQrPrintReady = Boolean(
    qrListing && qrCodeDataUrl && qrTargetUrl && !isQrGenerating && !qrGenerationError
  );

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
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            animation: "slideIn 0.3s ease-in-out",
          }}>
            {toast.message}
          </div>
        )}

        {showPromoteLoadingOverlay && (
          <div style={styles.promotionLoadingOverlay} role="status" aria-live="polite">
            <div style={styles.promotionLoadingCard}>
              <div style={styles.promotionLoadingSpinner} aria-hidden="true" />
              <p style={styles.promotionLoadingTitle}>Промотираме обявата...</p>
              <p style={styles.promotionLoadingText}>Моля, изчакайте момент.</p>
            </div>
          </div>
        )}

        {listingTypeModal.isOpen && (
          <div
            style={styles.modalOverlay}
            className="myads-listingtype-overlay"
            onClick={closeListingTypeModal}
          >
            <div
              style={styles.modal}
              className="myads-listingtype-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader} className="myads-listingtype-header">
                <div>
                  <h2 style={styles.modalTitle} className="myads-listingtype-title">{modalTitle}</h2>
                  <p style={styles.modalSubtitle} className="myads-listingtype-subtitle">{modalSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeListingTypeModal}
                  style={styles.modalClose}
                  className="myads-listingtype-close"
                  aria-label="Затвори"
                  disabled={isModalBusy}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.modalContentSplit} className="myads-listingtype-content">
                <div style={styles.modalContentLeft} className="myads-listingtype-left">
                  <div style={styles.listingTypeGrid} className="myads-listingtype-grid">
                    <button
                      type="button"
                      style={{
                        ...styles.listingTypeCard,
                        ...(listingTypeModal.selectedType === "normal" ? styles.listingTypeCardSelected : {}),
                      }}
                      className="myads-listingtype-card"
                      onClick={() =>
                        setListingTypeModal((prev) => ({ ...prev, selectedType: "normal" }))
                      }
                      disabled={isModalBusy}
                    >
                      <h3 style={styles.listingTypeTitle} className="myads-listingtype-card-title">Нормална обява</h3>
                      <p style={styles.listingTypeDesc} className="myads-listingtype-card-desc">
                        Стандартно публикуване без допълнително позициониране.
                      </p>
                      <p style={styles.listingTypePrice} className="myads-listingtype-card-price">Цена: Безплатно</p>
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.listingTypeCard,
                        ...(listingTypeModal.selectedType === "top" ? styles.listingTypeCardSelected : {}),
                      }}
                      className="myads-listingtype-card"
                      onClick={() =>
                        setListingTypeModal((prev) => ({ ...prev, selectedType: "top" }))
                      }
                      disabled={isModalBusy}
                    >
                      <h3 style={styles.listingTypeTitle} className="myads-listingtype-card-title">Топ обява</h3>
                      <p style={styles.listingTypeDesc} className="myads-listingtype-card-desc">
                        Приоритетна видимост и изкарване по-напред в резултатите.
                      </p>
                      <p style={styles.listingTypePrice} className="myads-listingtype-card-price">
                        Цена: €{getPromotePrice(modalSourceListing, "top", listingTypeModal.topPlan, listingTypeModal.vipPlan).toFixed(2)}
                      </p>
                    </button>

                    <button
                      type="button"
                      style={{
                        ...styles.listingTypeCard,
                        ...(listingTypeModal.selectedType === "vip" ? styles.listingTypeCardSelected : {}),
                      }}
                      className="myads-listingtype-card"
                      onClick={() =>
                        setListingTypeModal((prev) => ({ ...prev, selectedType: "vip" }))
                      }
                      disabled={isModalBusy}
                    >
                      <h3 style={styles.listingTypeTitle} className="myads-listingtype-card-title">VIP обява</h3>
                      <p style={styles.listingTypeDesc} className="myads-listingtype-card-desc">
                        Визуално открояване с VIP етикет без приоритет в класирането.
                      </p>
                      <p style={styles.listingTypePrice} className="myads-listingtype-card-price">
                        Цена: €{getPromotePrice(modalSourceListing, "vip", listingTypeModal.topPlan, listingTypeModal.vipPlan).toFixed(2)}
                      </p>
                    </button>
                  </div>

                  {listingTypeModal.selectedType === "top" && (
                    <div style={styles.vipPlanGrid} className="myads-listingtype-vip-grid">
                      <button
                        type="button"
                        style={{
                          ...styles.vipPlanCard,
                          ...(listingTypeModal.topPlan === "1d" ? styles.vipPlanCardSelected : {}),
                        }}
                        className="myads-listingtype-plan-card"
                        onClick={() =>
                          setListingTypeModal((prev) => ({ ...prev, topPlan: "1d" }))
                        }
                        disabled={isModalBusy}
                      >
                        <h4 style={styles.vipPlanTitle}>TOP за 1 ден</h4>
                        <p style={styles.vipPlanDesc}>Базова цена: €{TOP_LISTING_PRICE_1D_EUR.toFixed(2)}</p>
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.vipPlanCard,
                          ...(listingTypeModal.topPlan === "7d" ? styles.vipPlanCardSelected : {}),
                        }}
                        className="myads-listingtype-plan-card"
                        onClick={() =>
                          setListingTypeModal((prev) => ({ ...prev, topPlan: "7d" }))
                        }
                        disabled={isModalBusy}
                      >
                        <h4 style={styles.vipPlanTitle}>TOP за 7 дни</h4>
                        <p style={styles.vipPlanDesc}>Базова цена: €{TOP_LISTING_PRICE_7D_EUR.toFixed(2)}</p>
                      </button>
                    </div>
                  )}

                  {listingTypeModal.selectedType === "vip" && (
                    <div style={styles.vipPlanGrid} className="myads-listingtype-vip-grid">
                      <button
                        type="button"
                        style={{
                          ...styles.vipPlanCard,
                          ...(listingTypeModal.vipPlan === "7d" ? styles.vipPlanCardSelected : {}),
                        }}
                        className="myads-listingtype-plan-card"
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
                        className="myads-listingtype-plan-card"
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

                  <div style={styles.modalActions} className="myads-listingtype-actions">
                    <button
                      type="button"
                      style={{ ...styles.modalButton, ...styles.modalButtonSecondary }}
                      className="myads-listingtype-btn"
                      onClick={closeListingTypeModal}
                      disabled={isModalBusy}
                    >
                      Отказ
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.modalButton, ...styles.modalButtonPrimary }}
                      className="myads-listingtype-btn"
                      onClick={handleListingTypeConfirm}
                      disabled={isModalBusy || modalVipPrepayBlocked}
                    >
                      {isModalBusy ? "Запазване..." : modalPrimaryLabel}
                    </button>
                  </div>
                  {modalVipPrepayMessage && (
                    <p
                      style={{ ...styles.modalHint, color: "#b91c1c", fontWeight: 700 }}
                      className="myads-listingtype-hint"
                    >
                      {modalVipPrepayMessage}
                    </p>
                  )}
                  <p style={styles.modalHint} className="myads-listingtype-hint">{modalHint}</p>
                </div>

                <div style={styles.modalContentRight} className="myads-listingtype-right">
                  <div style={styles.listingTypePreviewCard}>
                    <div style={styles.listingTypePreviewMedia} className="myads-listingtype-preview-media">
                      {modalPreviewBadgeType && (
                        <span
                          style={styles.listingTypePreviewBadgeWrap}
                          className="myads-listingtype-preview-badge-wrap"
                        >
                          <ListingPromoBadge type={modalPreviewBadgeType} />
                        </span>
                      )}
                      <div style={styles.listingTypePreviewFrame}>
                        {modalPreviewImageSource?.hasImage ? (
                          <ResponsiveImage
                            photo={modalPreviewImageSource.photo}
                            fallbackPath={
                              modalPreviewImageSource.fallbackPath || modalPreviewImageSource.display
                            }
                            alt={modalPreviewTitle}
                            kind="grid"
                            preventUpscale={false}
                            sizes="320px"
                            loading="eager"
                            decoding="async"
                            fetchPriority="low"
                            containerStyle={{ width: "100%", height: "100%" }}
                            imgStyle={styles.listingTypePreviewImage}
                          />
                        ) : (
                          <div style={styles.listingTypePreviewPlaceholder}>
                            <Car size={22} />
                            Няма снимка
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.listingTypePreviewBody}>
                      <p style={styles.listingTypePreviewTitle}>{modalPreviewTitle}</p>
                      <div style={styles.listingTypePreviewMeta}>
                        Преглед как ще изглежда промо етикетът върху картата
                      </div>
                      <div style={styles.listingTypePreviewPrice}>{modalPreviewPriceLabel}</div>
                      <p style={styles.listingTypePreviewPromoPrice}>{modalPreviewPromoPriceLabel}</p>
                      {showModalPromoDetails && (
                        <div style={styles.promoDetailsBox}>
                          <p style={styles.promoDetailsLine}>
                            Текуща промоция: {currentPromoLabel} ({currentPromoDuration} оставащи)
                          </p>
                          <p style={styles.promoDetailsLine}>
                            След промяна: {selectedPromoLabel} ({projectedPromoDuration})
                          </p>
                          <p style={styles.promoDetailsLine}>
                            Редовна цена: €{modalBasePromoPrice.toFixed(2)} | Крайна цена: €{modalPromoPrice.toFixed(2)}
                          </p>
                          <p style={styles.promoDetailsLine}>
                            Отстъпка: -€{modalDiscountAmount.toFixed(2)} ({modalDiscountPercent}%)
                          </p>
                        </div>
                      )}
                      <p style={styles.listingTypePreviewHint}>{modalPreviewHint}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTopConfirm && (
          <div style={styles.confirmOverlay} onClick={cancelTopListingAction}>
            <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.confirmTitle}>ТОП обява</h3>
              <p style={styles.confirmText}>
                {modalIsTopActive
                  ? topConfirmDiscountAmount > 0
                    ? `Предплащане на ТОП ${getTopPlanLabel(listingTypeModal.topPlan)}: €${topConfirmPrice.toFixed(2)} (вместо €${topConfirmBasePrice.toFixed(2)}).`
                    : `Предплащане на ТОП ${getTopPlanLabel(listingTypeModal.topPlan)}: €${topConfirmPrice.toFixed(2)}.`
                  : topConfirmDiscountAmount > 0
                    ? `Публикуването като "ТОП" ${getTopPlanLabel(listingTypeModal.topPlan)} е €${topConfirmPrice.toFixed(2)} (вместо €${topConfirmBasePrice.toFixed(2)}).`
                    : `Публикуването като "ТОП" ${getTopPlanLabel(listingTypeModal.topPlan)} е €${topConfirmPrice.toFixed(2)}.`}
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

        {qrListing && (
          <div style={styles.modalOverlay} onClick={closeQrModal}>
            <div
              style={styles.qrModal}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.qrModalHeader}>
                <div>
                  <h2 style={styles.qrModalTitle}>QR код за обявата</h2>
                  <p style={styles.qrModalSubtitle}>{qrListingTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeQrModal}
                  style={styles.modalClose}
                  aria-label="Затвори"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.qrModalBody}>
                {isQrGenerating && (
                  <p style={styles.qrLoadingText}>Генерираме QR кода...</p>
                )}
                {qrGenerationError && (
                  <p style={styles.qrErrorText}>{qrGenerationError}</p>
                )}
                {qrCodeDataUrl && (
                  <div style={styles.qrCodeCard}>
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR код за ${qrListingTitle}`}
                      style={styles.qrCodeImage}
                    />
                  </div>
                )}
              </div>

              <div style={styles.qrModalActions}>
                <button
                  type="button"
                  style={styles.qrSecondaryButton}
                  onClick={closeQrModal}
                >
                  Затвори
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.qrPrintButton,
                    ...(isQrPrintReady ? {} : styles.qrPrintButtonDisabled),
                  }}
                  disabled={!isQrPrintReady}
                  onClick={() => {
                    void printQrCodeCard();
                  }}
                >
                  <Printer size={15} />
                  Свали и принтирай QR кода
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
                      <ListingPromoBadge type="top" />
                    )}
                    {isPreviewVipActive && (
                      <ListingPromoBadge type="vip" />
                    )}
                    {previewListing.is_kaparirano && <KapariranoBadge size="sm" />}
                    {isPreviewListingNew && (
                      <div
                        style={{
                          ...styles.newBadge,
                          top: "auto",
                          bottom: 12,
                          left: 12,
                        }}
                      >
                        Нова
                      </div>
                    )}
                    {previewImage ? (
                      <ResponsiveImage
                        photo={previewImage.photo}
                        fallbackPath={previewImage.fullFallbackPath || previewImage.full}
                        alt={previewListing.title || `${previewListing.brand} ${previewListing.model}`}
                        kind="detail"
                        preventUpscale={false}
                        sizes="(max-width: 768px) 100vw, 658px"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        containerStyle={{ width: "100%", height: "100%" }}
                        imgStyle={styles.previewImage}
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
                          <ResponsiveImage
                            photo={previewSource.photo}
                            fallbackPath={previewSource.thumbFallbackPath || previewSource.thumb}
                            alt={`Снимка ${idx + 1}`}
                            kind="grid"
                            preventUpscale={false}
                            sizes="120px"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            containerStyle={{ width: "100%", height: "100%" }}
                            imgStyle={styles.previewThumb}
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
                          ...(previewPriceBadge?.kind === "up"
                            ? styles.previewPriceChangeUp
                            : previewPriceBadge?.kind === "down"
                              ? styles.previewPriceChangeDown
                              : styles.previewPriceChangeAnnounced),
                        }}
                        title={previewPriceBadge?.title}
                      >
                        <PreviewChangeIcon size={14} />
                        {previewPriceBadge?.kind === "announced"
                          ? "Обявена цена"
                          : `${previewPriceBadge?.kind === "up" ? "+" : "-"}${previewPriceBadge?.amountLabel}`}
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
                      className="myads-icon-btn"
                      data-action="Редактирай"
                      aria-label="Редактирай"
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
        <div
          style={styles.tabsContainer}
          ref={tabsSliderRef}
          onWheel={handleTabsWheel}
        >
          {[
          { id: "active", label: "Активни", Icon: List, count: activeListings.length },
          { id: "top", label: "Топ обяви", Icon: PackageOpen, count: topListingsCount, promoBadge: "top" as const },
          { id: "vip", label: "VIP обяви", Icon: Tag, count: vipListingsCount, promoBadge: "vip" as const },
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
                  setMobileFiltersOpen(false);
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
                {tab.promoBadge ? (
                  <img
                    src={tab.promoBadge === "top" ? topBadgeImage : vipBadgeImage}
                    alt={tab.promoBadge === "top" ? "Топ" : "VIP"}
                    style={styles.tabPromoBadgeImage}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <tab.Icon size={18} />
                )}
                {tab.label}
                <span style={isActive ? styles.tabBadge : styles.tabBadgeInactive}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {showListingFilters && (
          <div className="myads-filter-row" style={styles.filterRow}>
            <div className="myads-filter-label" style={styles.filterLabel}>
              Филтри
            </div>
            <button
              type="button"
              className={`myads-filter-toggle${mobileFiltersOpen ? " is-open" : ""}`}
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              aria-label={mobileFiltersOpen ? "Скрий филтри" : "Покажи филтри"}
            >
              <span>Филтри</span>
              <span className="myads-filter-toggle-icon" aria-hidden="true">
                &#9662;
              </span>
            </button>
            <div className={`myads-filter-collapse${mobileFiltersOpen ? " is-open" : ""}`}>
              <div className="myads-filter-controls" style={styles.filterControls}>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setBrandFilter("all");
                    setModelFilter("all");
                    setCurrentPage(1);
                  }}
                  className="myads-filter-select"
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
                  className="myads-filter-select"
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
                  className="myads-filter-select"
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
            </div>
            <div className="myads-filter-count" style={styles.filterCount}>
              Показва {filteredListings.length} от {currentListings.length}
            </div>
          </div>
        )}

        {currentListings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              {activeTab === "active" && <Inbox size={40} style={styles.emptyIcon} />}
              {activeTab === "top" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "vip" && <Tag size={40} style={styles.emptyIcon} />}
              {activeTab === "archived" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "expired" && <Clock size={40} style={styles.emptyIcon} />}
              {activeTab === "drafts" && <FileText size={40} style={styles.emptyIcon} />}
              {activeTab === "liked" && <Heart size={40} style={styles.emptyIcon} />}
            </div>
            <p style={styles.emptyText}>
              {activeTab === "active" && "Нямаш активни обяви"}
              {activeTab === "top" && "Нямаш топ обяви"}
              {activeTab === "vip" && "Нямаш VIP обяви"}
              {activeTab === "archived" && "Нямаш архивирани обяви"}
              {activeTab === "expired" && "Нямаш изтекли обяви"}
              {activeTab === "drafts" && "Нямаш чернови обяви"}
              {activeTab === "liked" && "Нямаш любими обяви"}
            </p>
            <p style={styles.emptySubtext}>
              {activeTab === "active" && "Публикувай нова обява, за да я видиш тук"}
              {activeTab === "top" && "Маркирай обява като топ, за да се появи тук"}
              {activeTab === "vip" && "Маркирай обява като VIP, за да се появи тук"}
              {activeTab === "archived" && "Архивирани обяви ще се появят тук"}
              {activeTab === "expired" && "Изтеклите обяви ще се появят тук"}
              {activeTab === "drafts" && "Начни да пишеш нова обява"}
              {activeTab === "liked" && "Добави обяви в любими"}
            </p>
            {(activeTab === "active" || activeTab === "top" || activeTab === "vip") && (
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
                {paginatedListings.map((listing) => {
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
                  const topRemainingLabel = isTopActive ? getTopRemainingLabel(listing) : "";
                  const vipRemainingLabel = isVipActive ? getVipRemainingLabel(listing) : "";
                  const topRemainingDays =
                    isTopActive && listing.top_expires_at
                      ? Math.ceil(
                          (new Date(listing.top_expires_at).getTime() - currentTimeMs) /
                            (24 * 60 * 60 * 1000)
                        )
                      : 0;
                  const vipRemainingDays =
                    isVipActive && listing.vip_expires_at
                      ? Math.ceil(
                          (new Date(listing.vip_expires_at).getTime() - currentTimeMs) /
                            (24 * 60 * 60 * 1000)
                        )
                      : 0;
                  const isPrepayWindowOpen =
                    !isTopActive && !isVipActive
                      ? true
                      : isTopActive
                        ? topRemainingDays <= VIP_PREPAY_ALLOWED_REMAINING_DAYS
                        : vipRemainingDays <= VIP_PREPAY_ALLOWED_REMAINING_DAYS;
                  const nonPromotedLabel =
                    !topRemainingLabel && !vipRemainingLabel ? "Непромотирана обява" : "";
                  const priceValue = Number(listing.price);
                  const priceLabel =
                    Number.isFinite(priceValue) && priceValue > 0
                      ? `${priceValue.toLocaleString("bg-BG")} €`
                      : "Цена не е зададена";
                  const latestPriceHistory = listing.price_history?.[0];
                  const priceBadge = resolvePriceBadgeState(latestPriceHistory, currentTimeMs);
                  const showPriceChange = Boolean(priceBadge);
                  const PriceChangeIcon =
                    priceBadge?.kind === "announced"
                      ? Clock
                      : priceBadge?.kind === "up"
                        ? TrendingUp
                        : TrendingDown;
                  const statusBadgeStyle =
                    statusLabel === "Изтекла"
                      ? { ...styles.statusBadge, ...styles.statusBadgeExpired }
                      : styles.statusBadge;
                  const chips = getTechnicalSpecs(listing);
                  const visibleChips = chips.slice(
                    0,
                    getAdaptiveCardChipLimit(
                      chips.length,
                      descriptionSnippet,
                      subtitle,
                      toText(listing.main_category)
                    )
                  );
                  const isNewListing = isListingNew(listing.created_at);
                  const cardImage = getCardImageSources(listing);
                  const categoryBadgeLabel = getListingCategoryBadge(listing);
                  const listingExpiryLabel = getListingExpiryLabel(listing);
                  const hasQrTarget = Boolean(listing.slug && listing.slug.trim());
                  const showQrTrigger =
                    activeTab === "active" || activeTab === "top" || activeTab === "vip";

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
                  <ListingPromoBadge type="top" />
                )}
                {isVipActive && (
                  <ListingPromoBadge type="vip" />
                )}
                {listing.is_kaparirano && <KapariranoBadge />}
                {isNewListing && (
                  <div
                    style={{
                      ...styles.newBadge,
                      top: "auto",
                      bottom: 12,
                      left: 12,
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
                {cardImage.hasImage ? (
                  <ResponsiveImage
                    photo={cardImage.photo}
                    fallbackPath={cardImage.fallbackPath || cardImage.display}
                    alt={listingTitle}
                    kind="grid"
                    preventUpscale={false}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    containerStyle={{ width: "100%", height: "100%" }}
                    imgStyle={styles.listingImage}
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
                        ...(priceBadge?.kind === "up"
                          ? styles.listingPriceChangeUp
                          : priceBadge?.kind === "down"
                            ? styles.listingPriceChangeDown
                            : styles.listingPriceChangeAnnounced),
                      }}
                      title={priceBadge?.title}
                    >
                      <PriceChangeIcon size={12} />
                      {priceBadge?.kind === "announced"
                        ? "Обявена цена"
                        : `${priceBadge?.kind === "up" ? "+" : "-"}${priceBadge?.amountLabel}`}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.listingContent}>
                <div style={styles.listingTitleRow}>
                  <h3 style={styles.listingTitle}>{listingTitle}</h3>
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

                <div style={styles.listingContentSpacer} />
                <div style={styles.listingActionsLabel}>Управление на обявата</div>
                {(topRemainingLabel || vipRemainingLabel || nonPromotedLabel) && (
                  <div style={styles.listingPromoStatusStack}>
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
                <div style={styles.listingActions}>
                  {/* Active Tab Actions: Edit, Archive, Delete */}
                  {(activeTab === "active" || activeTab === "top" || activeTab === "vip") && (
                    <>
                      <button
                        className="myads-icon-btn"
                        data-action="Редактирай"
                        aria-label="Редактирай"
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

                      {isPrepayWindowOpen && (
                        <button
                          className="myads-icon-btn"
                          data-action="Промотирай"
                          aria-label="Промотирай"
                          onClick={(e) => {
                            e.stopPropagation();
                            const defaultType: ListingType =
                              listing.listing_type === "top"
                                ? "top"
                                : listing.listing_type === "vip"
                                  ? "vip"
                                  : "top";
                            openListingTypeModal(listing, "promote", defaultType);
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
                          <Tag size={14} />
                          Промотирай
                        </button>
                      )}

                      {isBusinessUser && (
                        <button
                          className="myads-icon-btn"
                          data-action={
                            actionLoading === listing.id
                              ? "Обработва се"
                              : listing.is_kaparirano
                                ? "Махни капаро"
                                : "Капарирай"
                          }
                          aria-label={
                            listing.is_kaparirano ? "Махни капаро" : "Капарирай"
                          }
                          onClick={(e) => handleKapariranoToggle(listing, e)}
                          disabled={actionLoading === listing.id}
                          style={{
                            ...styles.actionButton,
                            background: listing.is_kaparirano
                              ? "linear-gradient(135deg, #0f766e 0%, #115e59 100%)"
                              : "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                            color: "#fff",
                            opacity: actionLoading === listing.id ? 0.6 : 1,
                            cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                            boxShadow: listing.is_kaparirano
                              ? "0 2px 8px rgba(15, 118, 110, 0.35)"
                              : "0 2px 8px rgba(13, 148, 136, 0.35)",
                          }}
                          onMouseEnter={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = listing.is_kaparirano
                                ? "0 4px 12px rgba(15, 118, 110, 0.45)"
                                : "0 4px 12px rgba(13, 148, 136, 0.45)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = listing.is_kaparirano
                                ? "0 2px 8px rgba(15, 118, 110, 0.35)"
                                : "0 2px 8px rgba(13, 148, 136, 0.35)";
                            }
                          }}
                        >
                          <Lock size={14} />
                          {actionLoading === listing.id
                            ? "..."
                            : listing.is_kaparirano
                              ? "Махни капаро"
                              : "Капарирай"}
                        </button>
                      )}

                      <button
                        className="myads-icon-btn"
                        data-action={actionLoading === listing.id ? "Обработва се" : "Архивирай"}
                        aria-label="Архивирай"
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
                        className="myads-icon-btn"
                        data-action={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
                        aria-label={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
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
                        <span
                          className={`myads-delete-icon-wrap${deleteConfirm === listing.id ? " is-confirm" : ""}`}
                          aria-hidden="true"
                        >
                          <Trash2 className="myads-delete-icon myads-delete-icon--primary" size={14} />
                          <Trash className="myads-delete-icon myads-delete-icon--confirm" size={14} />
                        </span>
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Archived Tab Actions: Unarchive, Delete */}
                  {activeTab === "archived" && (
                    <>
                      <button
                        className="myads-icon-btn"
                        data-action="Преглед"
                        aria-label="Преглед"
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
                        className="myads-icon-btn"
                        data-action="Редактирай"
                        aria-label="Редактирай"
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
                        className="myads-icon-btn"
                        data-action={actionLoading === listing.id ? "Обработва се" : "Върни в активни"}
                        aria-label="Върни в активни"
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
                        className="myads-icon-btn"
                        data-action={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
                        aria-label={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
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
                        <span
                          className={`myads-delete-icon-wrap${deleteConfirm === listing.id ? " is-confirm" : ""}`}
                          aria-hidden="true"
                        >
                          <Trash2 className="myads-delete-icon myads-delete-icon--primary" size={14} />
                          <Trash className="myads-delete-icon myads-delete-icon--confirm" size={14} />
                        </span>
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Expired Tab Actions: Republish, Delete */}
                  {activeTab === "expired" && (
                    <>
                      <button
                        className="myads-icon-btn"
                        data-action="Преглед"
                        aria-label="Преглед"
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
                        className="myads-icon-btn"
                        data-action="Редактирай"
                        aria-label="Редактирай"
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
                        className="myads-icon-btn"
                        data-action={actionLoading === listing.id ? "Обработва се" : "Пусни пак"}
                        aria-label="Пусни пак"
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
                        className="myads-icon-btn"
                        data-action={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
                        aria-label={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
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
                        <span
                          className={`myads-delete-icon-wrap${deleteConfirm === listing.id ? " is-confirm" : ""}`}
                          aria-hidden="true"
                        >
                          <Trash2 className="myads-delete-icon myads-delete-icon--primary" size={14} />
                          <Trash className="myads-delete-icon myads-delete-icon--confirm" size={14} />
                        </span>
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Drafts Tab Actions: Continue Editing, Delete */}
                  {activeTab === "drafts" && (
                    <>
                      <button
                        className="myads-icon-btn"
                        data-action="Преглед"
                        aria-label="Преглед"
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
                        className="myads-icon-btn"
                        data-action="Продължи редакция"
                        aria-label="Продължи редакция"
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
                        className="myads-icon-btn"
                        data-action={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
                        aria-label={deleteConfirm === listing.id ? "Потвърди изтриване" : "Изтрий"}
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
                        <span
                          className={`myads-delete-icon-wrap${deleteConfirm === listing.id ? " is-confirm" : ""}`}
                          aria-hidden="true"
                        >
                          <Trash2 className="myads-delete-icon myads-delete-icon--primary" size={14} />
                          <Trash className="myads-delete-icon myads-delete-icon--confirm" size={14} />
                        </span>
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Liked Tab Actions: Remove from Favorites */}
                  {activeTab === "liked" && (
                    <button
                      className="myads-icon-btn"
                      data-action={actionLoading === listing.id ? "Обработва се" : "Премахни от любими"}
                      aria-label="Премахни от любими"
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

                <div
                  style={{
                    ...styles.deleteConfirmWrap,
                    ...(deleteConfirm === listing.id
                      ? styles.deleteConfirmWrapOpen
                      : styles.deleteConfirmWrapClosed),
                  }}
                  aria-hidden={deleteConfirm === listing.id ? undefined : true}
                >
                  <div style={styles.deleteConfirmBox}>
                    Сигурни ли сте, че искате да изтриете тази обява?
                  </div>
                </div>
                {listingExpiryLabel && (
                  <div style={styles.listingExpiryRow}>
                    {showQrTrigger && (
                      <button
                        type="button"
                        aria-label={`QR код за ${listingTitle}`}
                        data-action="QR код"
                        className="myads-icon-btn"
                        style={{
                          ...styles.qrTriggerButton,
                          ...(hasQrTarget ? {} : styles.qrTriggerButtonDisabled),
                        }}
                        disabled={!hasQrTarget}
                        onClick={(e) => {
                          e.stopPropagation();
                          void openQrModal(listing);
                        }}
                        onMouseEnter={(e) => {
                          if (!hasQrTarget) return;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.borderColor = "#0f766e";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 118, 110, 0.28)";
                        }}
                        onMouseLeave={(e) => {
                          if (!hasQrTarget) return;
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                          e.currentTarget.style.boxShadow = "0 2px 10px rgba(15, 23, 42, 0.1)";
                        }}
                      >
                        <span style={styles.qrTriggerIconWrap}>
                          <Lottie
                            animationData={karBgQrCodeAnimation}
                            loop
                            autoplay
                            style={styles.qrTriggerIcon}
                          />
                        </span>
                      </button>
                    )}
                    <div style={styles.listingExpiryInfo}>
                      {createdLabel && (
                        <div style={{ ...styles.listingDateRow, ...styles.listingPublishedInfo }}>
                          <Calendar size={13} style={{ ...styles.listingDateIcon, ...styles.listingPublishedIcon }} />
                          <span>Публикувана на: {createdLabel}</span>
                        </div>
                      )}
                      {updatedLabel && (
                        <div style={{ ...styles.listingDateRow, ...styles.listingEditedInfo }}>
                          <Edit2 size={13} style={{ ...styles.listingDateIcon, ...styles.listingEditedIcon }} />
                          <span>Редактирана на: {updatedLabel}</span>
                        </div>
                      )}
                      <div style={{ ...styles.listingDateRow, ...styles.listingExpiryMainInfo }}>
                        <Clock size={13} style={{ ...styles.listingDateIcon, ...styles.listingExpiryIcon }} />
                        <span>{listingExpiryLabel}</span>
                      </div>
                    </div>
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
