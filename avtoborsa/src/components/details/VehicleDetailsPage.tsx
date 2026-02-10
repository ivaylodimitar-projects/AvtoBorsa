import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import RezonGallery from './RezonGallery';
import TechnicalDataSection from './TechnicalDataSection';
import EquipmentSection from './EquipmentSection';
import ContactSidebar from './ContactSidebar';
import SellerCard from './SellerCard';
import SkeletonLoader from './SkeletonLoader';
import { extractIdFromSlug } from '../../utils/slugify';

interface CarImage {
  id: number;
  image: string;
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
  user_email: string;
  created_at?: string;
  listing_type?: 'top' | 'normal' | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
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

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body { width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; color: #333; background: #f5f5f5; }
  #root { width: 100%; }
  input, select, button, textarea { font-family: inherit; }
  [role="button"]:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
`;

const VehicleDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [id, setId] = useState<number | null>(null);
  const [listing, setListing] = useState<CarListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

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
          headers['Authorization'] = `Token ${token}`;
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
  const sellerName = listing.user_email ? listing.user_email.split('@')[0] : 'Потребител';
  const cityLabel = listing.city || listing.location_region || 'Град';
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
            images={listing.images}
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

          {isMobile && (
            <SellerCard
              sellerName={listing.user_email.split('@')[0]}
              sellerEmail={listing.user_email}
              phone={listing.phone}
            />
          )}
        </div>

        {!isMobile && (
          <ContactSidebar
            price={listing.price}
            sellerName={listing.user_email.split('@')[0]}
            sellerEmail={listing.user_email}
            phone={listing.phone}
            listingId={listing.id}
            isMobile={false}
            title={title}
            city={listing.city}
          />
        )}
      </div>

      {isMobile && (
        <ContactSidebar
          price={listing.price}
          sellerName={listing.user_email.split('@')[0]}
          sellerEmail={listing.user_email}
          phone={listing.phone}
          listingId={listing.id}
          isMobile={true}
          title={title}
          city={listing.city}
        />
      )}
    </div>
  );
};

export default VehicleDetailsPage;
