import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, ImageOff, MapPin } from 'lucide-react';
import RezonGallery from './RezonGallery';
import TechnicalDataSection from './TechnicalDataSection';
import EquipmentSection from './EquipmentSection';
import ContactSidebar from './ContactSidebar';
import SellerCard from './SellerCard';
import SkeletonLoader from './SkeletonLoader';
import { extractIdFromSlug } from '../../utils/slugify';
import { useImageUrl } from '../../hooks/useGalleryLazyLoad';

interface CarImage {
  id: number;
  image: string;
}

interface PriceHistoryEntry {
  old_price: number | string;
  new_price: number | string;
  delta: number | string;
  changed_at: string;
}

interface CarListing {
  id: number;
  slug: string;
  main_category: string;
  category: string;
  title: string;
  brand: string;
  model: string;
  year_from: number;
  month: number;
  vin: string;
  price: number;
  location_country: string;
  location_region: string;
  city: string;
  fuel: string;
  gearbox: string;
  mileage: number;
  color: string;
  condition: string;
  power: number;
  displacement: number;
  euro_standard: string;
  description: string;
  phone: string;
  email: string;
  features: string[];
  images: CarImage[];
  image_url?: string;
  user_email: string;
  seller_name?: string;
  seller_type?: string;
  seller_created_at?: string;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  price_history?: PriceHistoryEntry[];
  listing_type?: 'top' | 'normal' | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
}

interface SimilarListing {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year_from?: number;
  price: number | string;
  mileage: number | string;
  power?: number | string;
  city?: string;
  created_at?: string;
  listing_type?: 'top' | 'normal' | string | number;
  listing_type_display?: string;
  image_url?: string;
  images?: CarImage[];
}

const isTopListing = (listing: CarListing) => {
  if (listing.is_top || listing.is_top_listing || listing.is_top_ad) return true;

  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;

  const rawType = (listing.listing_type || '').toString().toLowerCase().trim();
  if (['top', 'top_ad', 'top_listing', 'topad', 'toplisting'].includes(rawType)) {
    return true;
  }

  const display = (listing.listing_type_display || '').toString().toLowerCase();
  return display.includes('топ');
};

const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const NEW_LISTING_BADGE_REFRESH_MS = 30_000;
const RECENTLY_VIEWED_STORAGE_KEY = "recently_viewed_listings";
const MAX_RECENTLY_VIEWED = 12;

const persistRecentlyViewed = (listing: CarListing) => {
  if (!listing?.id || !listing.slug) return;
  try {
    const entry = {
      id: listing.id,
      slug: listing.slug,
      brand: listing.brand,
      model: listing.model,
      price: listing.price,
      image_url: listing.image_url || listing.images?.[0]?.image || undefined,
      year_from: listing.year_from,
      mileage: listing.mileage,
      power: listing.power,
      city: listing.city,
      created_at: listing.created_at,
      listing_type: listing.listing_type,
    };
    const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const filtered = list.filter(
      (item: { id?: number; slug?: string }) =>
        item?.id !== entry.id && item?.slug !== entry.slug
    );
    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body { width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; color: #333; background: #f5f5f5; }
  #root { width: 100%; }
  input, select, button, textarea { font-family: inherit; }
  [role="button"]:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
  .similar-card:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12); }
  .similar-nav-button:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12); }
  .similar-nav-button:active { transform: translateY(0); }
  .similar-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
  .similar-scroll::-webkit-scrollbar { height: 8px; }
  .similar-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .similar-scroll::-webkit-scrollbar-track { background: transparent; }
`;

const VehicleDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [id, setId] = useState<number | null>(null);
  const [listing, setListing] = useState<CarListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);
  const [isSimilarLoading, setIsSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const getImageUrl = useImageUrl();
  const similarScrollRef = useRef<HTMLDivElement | null>(null);

  // Extract ID from slug
  useEffect(() => {
    if (slug) {
      const extractedId = extractIdFromSlug(slug);
      setId(extractedId);
    }
  }, [slug]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, NEW_LISTING_BADGE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `http://localhost:8000/api/listings/${id}/`,
          { headers }
        );
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) {
            throw new Error('Обявата е премахната или изтекла.');
          }
          throw new Error('Грешка при зареждане на обявата.');
        }
        const data = await response.json();
        setListing(data);
        persistRecentlyViewed(data);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        console.error('Error fetching listing:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchListing();
    }
  }, [id, slug]);

  useEffect(() => {
    if (!listing) return;
    let isCancelled = false;
    const controller = new AbortController();

    const fetchSimilarListings = async () => {
      setSimilarListings([]);
      setIsSimilarLoading(true);
      setSimilarError(null);
      try {
        const params = new URLSearchParams();
        params.set('compact', '1');
        params.set('page', '1');
        params.set('page_size', '8');
        if (listing.brand) params.set('brand', listing.brand);
        if (listing.model) params.set('model', listing.model);

        const response = await fetch(`http://localhost:8000/api/listings/?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Грешка при зареждане на подобни обяви.');
        }
        const data = await response.json();
        let results: SimilarListing[] = Array.isArray(data.results) ? data.results : [];
        results = results.filter((item) => item.id !== listing.id);

        if (results.length < 3 && listing.brand) {
          const fallbackParams = new URLSearchParams();
          fallbackParams.set('compact', '1');
          fallbackParams.set('page', '1');
          fallbackParams.set('page_size', '8');
          fallbackParams.set('brand', listing.brand);

          const fallbackResponse = await fetch(
            `http://localhost:8000/api/listings/?${fallbackParams.toString()}`,
            { signal: controller.signal }
          );
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackResults: SimilarListing[] = Array.isArray(fallbackData.results) ? fallbackData.results : [];
            const merged = new Map<number, SimilarListing>();
            results.forEach((item) => merged.set(item.id, item));
            fallbackResults
              .filter((item) => item.id !== listing.id)
              .forEach((item) => merged.set(item.id, item));
            results = Array.from(merged.values());
          }
        }

        if (!isCancelled) {
          setSimilarListings(results.slice(0, 6));
        }
      } catch (err) {
        if (isCancelled) return;
        const message = err instanceof Error ? err.message : 'Грешка при зареждане на подобни обяви.';
        setSimilarError(message);
      } finally {
        if (!isCancelled) {
          setIsSimilarLoading(false);
        }
      }
    };

    fetchSimilarListings();
    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [listing?.id, listing?.brand, listing?.model]);

  const scrollSimilar = useCallback((direction: 'left' | 'right') => {
    const container = similarScrollRef.current;
    if (!container) return;
    const scrollAmount = Math.max(container.clientWidth * 0.8, 260);
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const isSimilarTopListing = useCallback((item: SimilarListing) => {
    const rawType = (item.listing_type || '').toString().toLowerCase().trim();
    if (['top', 'top_ad', 'top_listing', 'topad', 'toplisting'].includes(rawType)) {
      return true;
    }
    const numericType = Number(item.listing_type);
    if (!Number.isNaN(numericType) && numericType === 1) return true;
    const display = (item.listing_type_display || '').toString().toLowerCase();
    return display.includes('топ');
  }, []);

  const isRecentListing = useCallback(
    (createdAt?: string) => {
      if (!createdAt) return false;
      const createdAtMs = new Date(createdAt).getTime();
      if (Number.isNaN(createdAtMs)) return false;
      const listingAgeMs = currentTimeMs - createdAtMs;
      return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
    },
    [currentTimeMs]
  );

  const getRelativeTime = useCallback((dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = currentTimeMs - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      return date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (diffDays > 0) {
      return `преди ${diffDays} ${diffDays === 1 ? 'ден' : 'дни'}`;
    }
    if (diffHours > 0) {
      return `преди ${diffHours} ${diffHours === 1 ? 'час' : 'часа'}`;
    }
    if (diffMins > 0) {
      return `преди ${diffMins} ${diffMins === 1 ? 'минута' : 'минути'}`;
    }
    return 'току-що';
  }, [currentTimeMs]);

  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: '#f5f5f5',
      paddingBottom: isMobile ? 120 : 0,
      width: '100%',
      boxSizing: 'border-box',
      color: '#333',
    },
    navbar: {
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      padding: isMobile ? '12px 12px' : '12px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    navbarContent: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      overflow: 'hidden',
      paddingLeft: isMobile ? 0 : 16,
      paddingRight: isMobile ? 0 : 16,
    },
    backButton: {
      background: 'none',
      border: 'none',
      fontSize: isMobile ? 20 : 24,
      cursor: 'pointer',
      color: '#0f766e',
      padding: 6,
      borderRadius: 4,
      flexShrink: 0,
      transition: 'opacity 0.2s',
    },
    navbarTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: 600,
      color: '#333',
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1,
    },
    navbarRouteSegment: {
      color: '#64748b',
      fontWeight: 600,
    },
    navbarRouteStrong: {
      color: '#0f766e',
      fontWeight: 700,
    },
    navbarRouteSeparator: {
      color: '#cbd5f5',
      margin: '0 6px',
    },
    content: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: isMobile ? '12px 12px' : '24px 16px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : window.innerWidth < 1024 ? '1fr' : '660px 340px',
      justifyContent: isMobile || window.innerWidth < 1024 ? 'stretch' : 'center',
      gap: isMobile ? 12 : 24,
      width: '100%',
      boxSizing: 'border-box',
    },
    mainContent: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 12 : 24,
      minWidth: 0,
    },
    heroSection: {
      background: '#fff',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    title: {
      fontSize: isMobile ? 18 : 28,
      fontWeight: 700,
      color: '#333',
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
      marginBottom: 8,
      lineHeight: 1.3,
      wordBreak: 'break-word',
    },
    location: {
      fontSize: isMobile ? 13 : 14,
      color: '#666',
      marginBottom: 12,
    },
    descriptionSection: {
      background: '#fff',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    descriptionTitle: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: 700,
      color: '#333',
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
      marginBottom: 12,
    },
    description: {
      fontSize: isMobile ? 13 : 14,
      lineHeight: 1.6,
      color: '#4b5563',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    },
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? 300 : 400,
      color: '#666',
      fontSize: isMobile ? 14 : 16,
    },
    errorContainer: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      color: '#b91c1c',
      textAlign: 'center',
      fontSize: isMobile ? 13 : 14,
      margin: isMobile ? 12 : 24,
    },
    similarSection: {
      background: '#fff',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e0e0e0',
    },
    similarTitle: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: 700,
      color: '#333',
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
      margin: 0,
    },
    similarHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    similarNavButton: {
      width: 32,
      height: 32,
      borderRadius: 999,
      border: '1px solid #e2e8f0',
      background: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(6px)',
      color: '#0f766e',
      fontSize: 18,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    similarScrollerWrap: {
      position: 'relative',
    },
    similarNavOverlay: {
      position: 'absolute',
      top: 70,
      left: 8,
      right: 8,
      display: 'flex',
      justifyContent: 'space-between',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      zIndex: 3,
    },
    similarScroller: {
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 6,
      scrollSnapType: 'x mandatory',
      WebkitOverflowScrolling: 'touch',
      overscrollBehaviorX: 'contain' as const,
    },
    similarCard: {
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 10,
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      flex: isMobile ? '0 0 78%' : '0 0 260px',
      scrollSnapAlign: 'start',
      position: 'relative',
    },
    similarMedia: {
      position: 'relative',
      width: '100%',
      height: 140,
      overflow: 'hidden',
      background: '#e2e8f0',
    },
    similarBadgeRow: {
      position: 'absolute',
      top: 8,
      left: 8,
      display: 'flex',
      gap: 6,
      zIndex: 2,
    },
    similarBadge: {
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
      color: '#fff',
      background: '#ef4444',
      boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)',
    },
    similarBadgeNew: {
      background: '#10b981',
      boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
    },
    similarImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    similarImagePlaceholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      background: '#f1f5f9',
    },
    similarInfo: {
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    similarName: {
      fontSize: 14,
      fontWeight: 700,
      color: '#1f2937',
      lineHeight: 1.3,
    },
    similarPrice: {
      fontSize: 15,
      fontWeight: 700,
      color: '#0f766e',
    },
    similarFooter: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    similarFooterItem: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    },
    similarFooterIcon: {
      color: '#94a3b8',
    },
    similarFooterIconAccent: {
      color: '#f97316',
    },
    similarDate: {
      fontSize: 12,
      fontWeight: 600,
      color: '#f97316',
    },
    similarMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      fontSize: 12,
      color: '#64748b',
      fontWeight: 600,
    },
    similarMetaItem: {
      padding: '4px 8px',
      borderRadius: 999,
      background: '#ecfdf5',
      border: '1px solid #bbf7d0',
      color: '#111827',
    },
    similarCity: {
      fontSize: 12,
      color: '#64748b',
      fontWeight: 600,
    },
    similarLoading: { fontSize: 13, color: '#64748b' },
    similarEmpty: { fontSize: 13, color: '#94a3b8' },
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <style>{globalCss}</style>
        <SkeletonLoader isMobile={isMobile} />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={styles.container}>
        <style>{globalCss}</style>
        <div style={styles.errorContainer}>
          {error || 'Обявата не е намерена'}
        </div>
      </div>
    );
  }

  const title = `${listing.year_from} ${listing.brand} ${listing.model}`;
  const sellerName = listing.seller_name || 'Частно лице';
  const isBusinessSeller = listing.seller_type === 'business';
  const cityLabel = listing.city || listing.location_region || 'Град';
  const updatedLabel = listing.updated_at ? getRelativeTime(listing.updated_at) : null;
  const priceHistory = listing.price_history || [];
  const routeSegments = [cityLabel, sellerName, title].filter(Boolean);
  const isNewListing = (() => {
    if (!listing.created_at) return false;
    const createdAtMs = new Date(listing.created_at).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = currentTimeMs - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  })();


  return (
    <div style={styles.container}>
      <style>{globalCss}</style>
      <div style={styles.navbar}>
        <div style={styles.navbarContent}>
          <button style={styles.backButton} onClick={() => window.history.back()}>
            ←
          </button>
          <span style={styles.navbarTitle}>
            {routeSegments.map((segment, index) => {
              const isLast = index === routeSegments.length - 1;
              return (
                <span key={`${segment}-${index}`} style={isLast ? styles.navbarRouteStrong : styles.navbarRouteSegment}>
                  {segment}
                  {!isLast && <span style={styles.navbarRouteSeparator}>/</span>}
                </span>
              );
            })}
          </span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.mainContent}>
          <RezonGallery
            images={
              Array.isArray(listing.images) && listing.images.length > 0
                ? listing.images
                : listing.image_url
                  ? [{ id: -1, image: listing.image_url }]
                  : []
            }
            title={title}
            isMobile={isMobile}
            showTopBadge={isTopListing(listing)}
            showNewBadge={isNewListing}
          />

          <TechnicalDataSection
            year={listing.year_from}
            month={listing.month}
            fuel={listing.fuel}
            power={listing.power}
            displacement={listing.displacement}
            gearbox={listing.gearbox}
            category={listing.category}
            mileage={listing.mileage}
            color={listing.color}
            vin={listing.vin}
            condition={listing.condition}
            euroStandard={listing.euro_standard}
            isMobile={isMobile}
          />
          <div style={styles.descriptionSection}>
            <h2 style={styles.descriptionTitle}>Описание</h2>
            <p style={styles.description}>{listing.description}</p>
          </div>
          {listing.features && listing.features.length > 0 && (
            <EquipmentSection features={listing.features} />
          )}
          <div style={styles.similarSection}>
            <div style={styles.similarHeader}>
              <h2 style={styles.similarTitle}>Още обяви</h2>
            </div>
            {isSimilarLoading ? (
              <div style={styles.similarLoading}>Зареждане на подобни обяви...</div>
            ) : similarListings.length > 0 ? (
              <div style={styles.similarScrollerWrap}>
                <div style={styles.similarNavOverlay}>
                  <button
                    type="button"
                    style={{ ...styles.similarNavButton, pointerEvents: 'auto' }}
                    className="similar-nav-button"
                    onClick={() => scrollSimilar('left')}
                    aria-label="Предишни обяви"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.similarNavButton, pointerEvents: 'auto' }}
                    className="similar-nav-button"
                    onClick={() => scrollSimilar('right')}
                    aria-label="Следващи обяви"
                  >
                    ›
                  </button>
                </div>
                <div style={styles.similarScroller} ref={similarScrollRef} className="similar-scroll">
                  {similarListings.map((item) => {
                    const imagePath = item.image_url || item.images?.[0]?.image || '';
                    const imageUrl = imagePath ? getImageUrl(imagePath) : '';
                    const isTop = isSimilarTopListing(item);
                    const isNew = isRecentListing(item.created_at);
                    const priceValue = typeof item.price === 'string' ? Number(item.price) : item.price;
                    const priceLabel =
                      Number.isFinite(priceValue) && priceValue > 0
                        ? `€ ${priceValue.toLocaleString('bg-BG')}`
                        : 'Цена при запитване';
                  const mileageValue = typeof item.mileage === 'string' ? Number(item.mileage) : item.mileage;
                  const mileageLabel =
                    Number.isFinite(mileageValue) && mileageValue > 0
                      ? `${mileageValue.toLocaleString('bg-BG')} км`
                      : '—';
                  const powerValue = typeof item.power === 'string' ? Number(item.power) : item.power;
                  const powerLabel =
                    Number.isFinite(powerValue) && powerValue > 0
                      ? `${powerValue} к.с.`
                      : '—';
                  const yearLabel = item.year_from ? `${item.year_from} г.` : '—';
                  const createdLabel = getRelativeTime(item.created_at);

                    return (
                      <div
                        key={item.id}
                        style={styles.similarCard}
                        className="similar-card"
                        onClick={() => navigate(`/details/${item.slug}`)}
                      >
                        <div style={styles.similarMedia}>
                          {(isTop || isNew) && (
                            <div style={styles.similarBadgeRow}>
                              {isTop && <span style={styles.similarBadge}>Топ</span>}
                              {isNew && <span style={{ ...styles.similarBadge, ...styles.similarBadgeNew }}>Нова</span>}
                            </div>
                          )}
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`${item.brand} ${item.model}`}
                              style={styles.similarImage}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div style={styles.similarImagePlaceholder}>
                              <ImageOff size={20} />
                            </div>
                          )}
                        </div>
                      <div style={styles.similarInfo}>
                        <div style={styles.similarName}>
                          {item.brand} {item.model}
                        </div>
                        <div style={styles.similarPrice}>{priceLabel}</div>
                        <div style={styles.similarMeta}>
                          <span style={styles.similarMetaItem}>{yearLabel}</span>
                          <span style={styles.similarMetaItem}>{mileageLabel}</span>
                          <span style={styles.similarMetaItem}>{powerLabel}</span>
                        </div>
                        <div style={styles.similarFooter}>
                          <div style={styles.similarFooterItem}>
                            <MapPin size={14} style={styles.similarFooterIcon} />
                            <div style={styles.similarCity}>{item.city || 'Без град'}</div>
                          </div>
                          <div style={styles.similarFooterItem}>
                            <Clock size={14} style={styles.similarFooterIconAccent} />
                            <div style={styles.similarDate}>{createdLabel}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ) : (
              <div style={styles.similarEmpty}>{similarError || 'Няма подобни обяви.'}</div>
            )}
          </div>

          {isMobile && (
            <SellerCard
              sellerName={sellerName}
              sellerEmail={listing.user_email}
              phone={listing.phone}
              city={listing.city}
              showAvatar={isBusinessSeller}
            />
          )}
        </div>

        {!isMobile && (
          <ContactSidebar
            price={listing.price}
            sellerName={sellerName}
            sellerEmail={listing.user_email}
            phone={listing.phone}
            sellerType={listing.seller_type}
            sellerCreatedAt={listing.seller_created_at}
            showSellerAvatar={isBusinessSeller}
            listingId={listing.id}
            isMobile={false}
            title={title}
            city={listing.city}
            updatedLabel={updatedLabel}
            updatedAt={listing.updated_at}
            priceHistory={priceHistory}
            viewCount={listing.view_count ?? 0}
          />
        )}
      </div>

      {isMobile && (
        <ContactSidebar
          price={listing.price}
          sellerName={sellerName}
          sellerEmail={listing.user_email}
          phone={listing.phone}
          sellerType={listing.seller_type}
          sellerCreatedAt={listing.seller_created_at}
          showSellerAvatar={isBusinessSeller}
          listingId={listing.id}
          isMobile={true}
          title={title}
          city={listing.city}
          updatedLabel={updatedLabel}
          updatedAt={listing.updated_at}
          priceHistory={priceHistory}
          viewCount={listing.view_count ?? 0}
        />
      )}
    </div>
  );
};

export default VehicleDetailsPage;
