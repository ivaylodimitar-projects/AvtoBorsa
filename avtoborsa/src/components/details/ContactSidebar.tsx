import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Heart,
  Share2,
  Printer,
  MapPin,
  Mail,
  Check,
  User,
  Clock,
  Link,
  MessageCircle,
  Send,
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
  const [copied, setCopied] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  useEffect(() => {
    if (!showShareMenu) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(target) &&
        !shareButtonRef.current?.contains(target)
      ) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showShareMenu]);

  const maskPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.length < 6) return p;
    return cleaned.slice(0, 4) + ' *** ' + cleaned.slice(-2);
  };

  const EUR_TO_BGN = 1.9558;
  const priceInBGN = (price * EUR_TO_BGN).toFixed(2);

  const shareUrl = window.location.href;
  const shareText = `${title || 'Обява'}${city ? ` · ${city}` : ''}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const shareOptions = [
    {
      id: 'copy',
      label: copied ? 'Копирано' : 'Копирай линк',
      onClick: async () => {
        await handleCopyLink();
        setShowShareMenu(false);
      },
      isPrimary: true,
      icon: copied ? Check : Link,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: MessageCircle,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: Send,
    },
    {
      id: 'viber',
      label: 'Viber',
      url: `viber://forward?text=${encodedText}%20${encodedUrl}`,
      icon: Share2,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: User,
    },
    {
      id: 'email',
      label: 'Email',
      url: `mailto:?subject=${encodedText}&body=${encodedText}%0A${encodedUrl}`,
      icon: Mail,
    },
  ];

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
            background: '#0f766e',
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
            overflow: 'visible',
          }}
      >
        {/* Title + ID */}
        <div style={{ padding: '20px 20px 16px' }}>
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#333',
              margin: '0 0 6px',
              lineHeight: 1.35,
              wordBreak: 'break-word',
              fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
            }}
          >
            {title}
          </h2>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
            Обява: {listingId}
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
          Намира се в {city}
        </div>

        {/* Price */}
        <div
          style={{
            margin: '0 20px',
            padding: '16px',
            background: '#ecfdf5',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#0f766e',
              marginBottom: 4,
              fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
            }}
          >
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
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Phone size={16} color="#0f766e" />
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
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0b5f58')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0f766e')}
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
                background: '#0f766e',
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
              background: '#fff7ed',
              color: '#d97706',
              border: '1px solid #fed7aa',
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
            position: 'relative',
            overflow: 'visible',
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
              if (!isFavorite) e.currentTarget.style.color = '#0f766e';
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
          <div style={{ flex: 1 }}>
            <button
              ref={shareButtonRef}
              onClick={() => setShowShareMenu((prev) => !prev)}
              style={{
                width: '100%',
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
                color: '#6b7280',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f766e';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'none';
              }}
            >
              <Share2 size={15} />
              Сподели
            </button>
          </div>
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
              e.currentTarget.style.color = '#0f766e';
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
          <div
            ref={shareMenuRef}
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: 'calc(100% + 8px)',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
              display: 'flex',
              flexDirection: 'row',
              gap: 8,
              zIndex: 20,
              overflowX: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5f5 transparent',
              opacity: showShareMenu ? 1 : 0,
              transform: showShareMenu ? 'translateY(0)' : 'translateY(-6px)',
              pointerEvents: showShareMenu ? 'auto' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {shareOptions.map((option) => {
              const Icon = option.icon;
              const baseStyle: React.CSSProperties = {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 40,
                padding: 0,
                borderRadius: 8,
                border: '1px solid transparent',
                background: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                textDecoration: 'none',
              };

              const primaryStyle: React.CSSProperties = option.isPrimary
                ? {
                    background: '#ecfdf5',
                    borderColor: '#99f6e4',
                    color: '#0f766e',
                  }
                : {};

                if (option.onClick) {
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={option.onClick}
                      title={option.label}
                      aria-label={option.label}
                      style={{ ...baseStyle, ...primaryStyle }}
                    >
                      {Icon ? <Icon size={16} /> : null}
                    </button>
                  );
                }

                if (option.url) {
                  const isHttp = option.url.startsWith('http');
                  return (
                    <a
                      key={option.id}
                      href={option.url}
                      target={isHttp ? '_blank' : undefined}
                      rel={isHttp ? 'noopener noreferrer' : undefined}
                      title={option.label}
                      aria-label={option.label}
                      style={{ ...baseStyle, ...primaryStyle }}
                      onClick={() => setShowShareMenu(false)}
                    >
                      {Icon ? <Icon size={16} /> : null}
                    </a>
                  );
                }

              return null;
            })}
          </div>
        </div>
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
              background: 'linear-gradient(135deg, #0f766e 0%, #0b5f58 100%)',
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
                color: '#333',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
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
              color: '#0f766e',
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
