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
}

const VehicleDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [id, setId] = useState<number | null>(null);
  const [listing, setListing] = useState<CarListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
          throw new Error('Failed to fetch listing');
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
    },
    navbar: {
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      padding: isMobile ? '12px 12px' : '12px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
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
      color: '#0066cc',
      padding: 4,
      flexShrink: 0,
      transition: 'opacity 0.2s',
    },
    navbarTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: 700,
      color: '#1a1a1a',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1,
    },
    content: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: isMobile ? '12px 12px' : '24px 16px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : window.innerWidth < 1024 ? '1fr' : '1fr 340px',
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    title: {
      fontSize: isMobile ? 18 : 28,
      fontWeight: 700,
      color: '#1a1a1a',
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    descriptionTitle: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: 700,
      color: '#1a1a1a',
      marginBottom: 12,
    },
    description: {
      fontSize: isMobile ? 13 : 14,
      lineHeight: 1.6,
      color: '#333',
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
      background: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      color: '#856404',
      textAlign: 'center',
      fontSize: isMobile ? 13 : 14,
      margin: isMobile ? 12 : 24,
    },
  };

  if (isLoading) {
    return <SkeletonLoader isMobile={isMobile} />;
  }

  if (error || !listing) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          {error || 'Обявата не е намерена'}
        </div>
      </div>
    );
  }

  const title = `${listing.year_from} ${listing.brand} ${listing.model}`;

  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <div style={styles.navbarContent}>
          <button style={styles.backButton} onClick={() => window.history.back()}>
            ←
          </button>
          <span style={styles.navbarTitle}>{title}</span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.mainContent}>
          <RezonGallery images={listing.images} title={title} isMobile={isMobile} />

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

          {listing.features && listing.features.length > 0 && (
            <EquipmentSection features={listing.features} />
          )}

          <div style={styles.descriptionSection}>
            <h2 style={styles.descriptionTitle}>Описание</h2>
            <p style={styles.description}>{listing.description}</p>
          </div>

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
