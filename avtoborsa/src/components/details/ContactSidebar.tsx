import React from 'react';
import { Phone, Heart, Share2 } from 'lucide-react';
import SellerCard from './SellerCard';

interface ContactSidebarProps {
  price: number;
  sellerName: string;
  sellerEmail: string;
  phone: string;
  isMobile?: boolean;
}

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  price,
  sellerName,
  sellerEmail,
  phone,
  isMobile = false,
}) => {
  const styles: Record<string, React.CSSProperties> = {
    container: isMobile
      ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #e0e0e0',
          padding: '12px 16px',
          display: 'flex',
          gap: 8,
          zIndex: 100,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
          maxHeight: '120px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }
      : {
          position: 'sticky',
          top: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        },
    priceSection: isMobile
      ? {
          display: 'none',
        }
      : {
          background: '#fff',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
    priceLabel: {
      fontSize: 12,
      color: '#666',
      fontWeight: 600,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    price: {
      fontSize: 32,
      fontWeight: 700,
      color: '#0066cc',
      marginBottom: 12,
    },
    priceNote: {
      fontSize: 12,
      color: '#999',
    },
    actionButtons: isMobile
      ? {
          display: 'flex',
          gap: 8,
          flex: 1,
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        },
    primaryButton: {
      flex: isMobile ? 1 : undefined,
      padding: isMobile ? '12px 16px' : '14px 16px',
      background: '#0066cc',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      fontSize: isMobile ? 13 : 14,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'background 0.2s, transform 0.2s',
      minWidth: isMobile ? 'auto' : 'fit-content',
      whiteSpace: 'nowrap',
    },
    secondaryButton: {
      flex: isMobile ? 1 : undefined,
      padding: isMobile ? '12px 16px' : '14px 16px',
      background: '#f0f0f0',
      color: '#1a1a1a',
      border: '1px solid #e0e0e0',
      borderRadius: 6,
      fontSize: isMobile ? 13 : 14,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transition: 'background 0.2s, transform 0.2s',
      minWidth: isMobile ? 'auto' : 'fit-content',
      whiteSpace: 'nowrap',
    },
    sellerCardContainer: isMobile
      ? {
          display: 'none',
        }
      : {
          marginTop: 8,
        },
  };

  return (
    <div style={styles.container}>
      {!isMobile && (
        <div style={styles.priceSection}>
          <div style={styles.priceLabel}>Цена</div>
          <div style={styles.price}>
            {price.toLocaleString('bg-BG')} €
          </div>
          <div style={styles.priceNote}>Договаряне на цена</div>
        </div>
      )}

      <div style={styles.actionButtons}>
        <button
          style={styles.primaryButton}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = '#0052a3')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = '#0066cc')
          }
        >
          <Phone size={isMobile ? 16 : 18} />
          {isMobile ? 'Позвъни' : 'Позвъни на продавача'}
        </button>

        {!isMobile && (
          <>
            <button
              style={styles.secondaryButton}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#e8e8e8')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#f0f0f0')
              }
            >
              <Heart size={18} />
              Запази
            </button>

            <button
              style={styles.secondaryButton}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#e8e8e8')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#f0f0f0')
              }
            >
              <Share2 size={18} />
              Сподели
            </button>
          </>
        )}
      </div>

      {!isMobile && (
        <div style={styles.sellerCardContainer}>
          <SellerCard
            sellerName={sellerName}
            sellerEmail={sellerEmail}
            phone={phone}
          />
        </div>
      )}
    </div>
  );
};

export default ContactSidebar;
