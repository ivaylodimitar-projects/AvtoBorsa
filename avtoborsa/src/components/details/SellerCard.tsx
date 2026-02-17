import React, { useState } from 'react';
import { Phone, MapPin } from 'lucide-react';

interface SellerCardProps {
  sellerName: string;
  sellerEmail: string;
  phone: string;
  city?: string;
  showAvatar?: boolean;
}

const SellerCard: React.FC<SellerCardProps> = ({
  sellerName,
  sellerEmail,
  phone,
  city,
  showAvatar = true,
}) => {
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maskPhoneNumber = (phoneNumber: string): string => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (!digitsOnly) return phoneNumber;

    if (digitsOnly.startsWith('359') && digitsOnly.length >= 7) {
      const localNumber = digitsOnly.slice(3);
      if (localNumber.length < 4) {
        return `+359 ${localNumber}`;
      }
      const localPrefix = localNumber.slice(0, 2);
      const localSuffix = localNumber.slice(-2);
      const maskedMiddle = 'x'.repeat(Math.max(localNumber.length - 4, 3));
      return `+359 ${localPrefix} ${maskedMiddle} ${localSuffix}`;
    }

    if (digitsOnly.length < 6) return phoneNumber;
    const prefix = digitsOnly.slice(0, 3);
    const suffix = digitsOnly.slice(-2);
    const maskedMiddle = 'x'.repeat(Math.max(digitsOnly.length - 5, 3));
    return `${prefix} ${maskedMiddle} ${suffix}`;
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: '#fff',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e0e0e0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 12 : 16,
      marginBottom: isMobile ? 12 : 16,
      paddingBottom: isMobile ? 12 : 16,
      borderBottom: '1px solid #e0e0e0',
    },
    avatar: {
      width: isMobile ? 56 : 64,
      height: isMobile ? 56 : 64,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #0f766e, #0b5f58)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: isMobile ? 20 : 24,
      fontWeight: 700,
      flexShrink: 0,
    },
    sellerInfo: {
      flex: 1,
      minWidth: 0,
    },
    sellerLabel: {
      fontSize: isMobile ? 10 : 11,
      fontWeight: 700,
      color: '#16a34a',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      marginBottom: 4,
    },
    sellerName: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: 700,
      color: '#333',
      marginBottom: 4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
    },
    sellerEmail: {
      fontSize: isMobile ? 11 : 12,
      color: '#666',
      marginBottom: 8,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    locationRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      flexWrap: 'wrap',
    },
    locationLabel: {
      fontSize: isMobile ? 10 : 11,
      fontWeight: 700,
      color: '#f97316',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
    },
    locationText: {
      fontSize: isMobile ? 12 : 13,
      color: '#475569',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    },
    ratingContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    ratingValue: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: 700,
      color: '#1a1a1a',
    },
    ratingCount: {
      fontSize: isMobile ? 11 : 12,
      color: '#999',
    },
    contactSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 10 : 12,
    },
    phoneContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 10 : 12,
      padding: isMobile ? 10 : 12,
      background: '#f9f9f9',
      borderRadius: 6,
      border: '1px solid #e0e0e0',
    },
    phoneIcon: {
      color: '#0f766e',
      flexShrink: 0,
    },
    phoneContent: {
      flex: 1,
      minWidth: 0,
    },
    phoneLabel: {
      fontSize: isMobile ? 10 : 11,
      color: '#999',
      textTransform: 'uppercase',
      fontWeight: 600,
      marginBottom: 2,
    },
    phoneNumber: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: 700,
      color: '#1a1a1a',
      fontFamily: 'monospace',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    revealPhoneButton: {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#0f766e',
      padding: 0,
      fontSize: isMobile ? 13 : 14,
      fontWeight: 700,
      fontFamily: 'inherit',
      textDecoration: 'underline',
      textUnderlineOffset: 2,
    },
    phoneLink: {
      color: '#1a1a1a',
      textDecoration: 'none',
    },
    callButton: {
      width: '100%',
      padding: isMobile ? '10px 14px' : '12px 16px',
      background: '#0f766e',
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
      transition: 'background 0.2s',
    },
  };

  const initials = sellerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {showAvatar && <div style={styles.avatar}>{initials}</div>}
        <div style={styles.sellerInfo}>
          <div style={styles.sellerLabel}>Продавач</div>
          <div style={styles.sellerName}>{sellerName}</div>
          {(city || '').trim() !== '' && (
            <div style={styles.locationRow}>
              <span style={styles.locationLabel}>Локация</span>
              <span style={styles.locationText}>
                <MapPin size={12} />
                {city}
              </span>
            </div>
          )}
          <div style={styles.sellerEmail}>{sellerEmail}</div>
          
        </div>
      </div>

      <div style={styles.contactSection}>
        <div style={styles.phoneContainer}>
          <Phone size={20} style={styles.phoneIcon} />
          <div style={styles.phoneContent}>
            <div style={styles.phoneLabel}>Телефон</div>
            <div style={styles.phoneNumber}>
              {isPhoneRevealed ? (
                <a href={`tel:${phone}`} style={styles.phoneLink}>
                  {phone}
                </a>
              ) : (
                <button
                  type="button"
                  style={styles.revealPhoneButton}
                  onClick={() => setIsPhoneRevealed(true)}
                  title="Покажи телефона"
                >
                  {maskPhoneNumber(phone)}
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          style={styles.callButton}
    onMouseEnter={(e) =>
            (e.currentTarget.style.background = '#0b5f58')
          }
    onMouseLeave={(e) =>
            (e.currentTarget.style.background = '#0f766e')
          }
        >
          <Phone size={18} />
          Позвъни на продавача
        </button>
      </div>
    </div>
  );
};

export default SellerCard;
