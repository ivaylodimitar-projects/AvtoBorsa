import React, { useState, useEffect } from 'react';
import {
  Phone,
  Heart,
  Share2,
  Printer,
  MapPin,
  Mail,
  Copy,
  Check,
  User,
  Clock,
} from 'lucide-react';

interface ContactSidebarProps {
  price: number;
  sellerName: string;
  sellerEmail: string;
  phone: string;
  listingId?: number;
  isMobile?: boolean;
  title?: string;
  city?: string;
}

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  price,
  sellerName,
  sellerEmail,
  phone,
  listingId,
  isMobile = false,
  title = '',
  city = '',
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token || !listingId) return;

        const response = await fetch(
          `http://localhost:8000/api/my-favorites/`,
          { headers: { 'Authorization': `Token ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const isFav = data.some((fav: any) => fav.listing.id === listingId);
          setIsFavorite(isFav);
        }
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };
    checkFavorite();
  }, [listingId]);

  const handleToggleFavorite = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !listingId) {
        alert('Трябва да си логнат за да запазиш обяви');
        return;
      }
      setIsLoading(true);

      const endpoint = isFavorite
        ? `http://localhost:8000/api/listings/${listingId}/unfavorite/`
        : `http://localhost:8000/api/listings/${listingId}/favorite/`;

      const response = await fetch(endpoint, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
      } else {
        alert('Грешка при запазване на обявата');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      alert('Грешка при запазване на обявата');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.length < 6) return p;
    return cleaned.slice(0, 4) + ' *** ' + cleaned.slice(-2);
  };

  const EUR_TO_BGN = 1.9558;
  const priceInBGN = (price * EUR_TO_BGN).toFixed(2);

  const initials = sellerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #eef2f7',
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          zIndex: 100,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <button
          style={{
            flex: 1,
            padding: '12px 16px',
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onClick={() => window.open(`tel:${phone}`)}
        >
          <Phone size={16} />
          Позвъни
        </button>
        <button
          style={{
            padding: '12px 16px',
            background: isFavorite ? '#fef2f2' : '#f8fafc',
            color: isFavorite ? '#dc2626' : '#374151',
            border: `1px solid ${isFavorite ? '#fecaca' : '#eef2f7'}`,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={handleToggleFavorite}
          disabled={isLoading}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Main Contact Box */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #eef2f7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Title + ID */}
        <div style={{ padding: '20px 20px 16px' }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 6px',
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </h2>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
            ID: {listingId}
          </div>
        </div>

        {/* Location */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 20px 16px',
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          <MapPin size={14} color="#9ca3af" />
          Намира се в гр. {city}
        </div>

        {/* Price */}
        <div
          style={{
            margin: '0 20px',
            padding: '16px',
            background: '#f0f4ff',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0066cc', marginBottom: 4 }}>
            {price.toLocaleString('bg-BG')} &euro;
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
            {Number(priceInBGN).toLocaleString('bg-BG')} лв.
          </div>
        </div>

        {/* Phone */}
        <div
          style={{
            margin: '0 20px 16px',
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #eef2f7',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Phone size={16} color="#0066cc" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 2 }}>
                Телефон
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontFamily: 'inherit' }}>
                {phoneRevealed ? phone : maskPhone(phone)}
              </div>
            </div>
          </div>
          {!phoneRevealed ? (
            <button
              onClick={() => setPhoneRevealed(true)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0052a3')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0066cc')}
            >
              Покажи телефона
            </button>
          ) : (
            <a
              href={`tel:${phone}`}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              Обади се
            </a>
          )}
        </div>

        {/* Email link */}
        <div style={{ padding: '0 20px 16px' }}>
          <a
            href={`mailto:${sellerEmail}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px',
              background: '#f8fafc',
              color: '#0066cc',
              border: '1px solid #eef2f7',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
          >
            <Mail size={15} />
            Изпрати E-mail до продавача
          </a>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid #eef2f7',
          }}
        >
          <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              borderRight: '1px solid #eef2f7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: isFavorite ? '#dc2626' : '#6b7280',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isFavorite) e.currentTarget.style.color = '#0066cc';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (!isFavorite) e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Запазено' : 'Запази'}
          </button>
          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              borderRight: '1px solid #eef2f7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: showShareOptions ? '#0066cc' : '#6b7280',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!showShareOptions) e.currentTarget.style.color = '#0066cc';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              if (!showShareOptions) e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Share2 size={15} />
            Сподели
          </button>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              padding: '14px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#6b7280',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0066cc';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'none';
            }}
          >
            <Printer size={15} />
            Принтирай
          </button>
        </div>

        {/* Share Options Panel */}
        {showShareOptions && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #eef2f7',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 10,
              }}
            >
              Сподели чрез
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCopyLink}
                title="Копирай линка"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid #eef2f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: copied ? '#16a34a' : '#6b7280',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0066cc';
                  e.currentTarget.style.color = '#0066cc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#eef2f7';
                  e.currentTarget.style.color = copied ? '#16a34a' : '#6b7280';
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <a
                href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(title + '\n' + window.location.href)}`}
                title="Сподели по Email"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid #eef2f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#6b7280',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#0066cc';
                  (e.currentTarget as HTMLElement).style.color = '#0066cc';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#eef2f7';
                  (e.currentTarget as HTMLElement).style.color = '#6b7280';
                }}
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Seller Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #eef2f7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials || <User size={20} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {sellerName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPin size={12} />
              {city}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #eef2f7',
          }}
        >
          <Clock size={14} color="#9ca3af" />
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            В АвтоБорса
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <a
            href={`mailto:${sellerEmail}`}
            style={{
              fontSize: 13,
              color: '#0066cc',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Mail size={13} />
            {sellerEmail}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactSidebar;
