import React, { useState } from 'react';
import { Star, Phone, Eye, EyeOff } from 'lucide-react';

interface SellerCardProps {
  sellerName: string;
  sellerEmail: string;
  phone: string;
  // rating?: number;
  reviewCount?: number;
}

const SellerCard: React.FC<SellerCardProps> = ({
  sellerName,
  sellerEmail,
  phone,
  // rating = 4.5,
  reviewCount = 0,
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

  const maskPhone = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 6) return phoneNumber;
    return cleaned.slice(0, 3) + '***' + cleaned.slice(-2);
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
    revealButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#0f766e',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
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
        <div style={styles.avatar}>{initials}</div>
        <div style={styles.sellerInfo}>
          <div style={styles.sellerName}>{sellerName}</div>
          <div style={styles.sellerEmail}>{sellerEmail}</div>
          
        </div>
      </div>

      <div style={styles.contactSection}>
        <div style={styles.phoneContainer}>
          <Phone size={20} style={styles.phoneIcon} />
          <div style={styles.phoneContent}>
            <div style={styles.phoneLabel}>Телефон</div>
            <div style={styles.phoneNumber}>
              {isPhoneRevealed ? phone : maskPhone(phone)}
            </div>
          </div>
          <button
            style={styles.revealButton}
            onClick={() => setIsPhoneRevealed(!isPhoneRevealed)}
            title={isPhoneRevealed ? 'Скрий номера' : 'Покажи номера'}
          >
            {isPhoneRevealed ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
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
