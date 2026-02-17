import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Heart,
  Share2,
  Printer,
  Flag,
  MapPin,
  Mail,
  Check,
  User,
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Link,
  MessageCircle,
  Send,
  Eye,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const API_BASE_URL = 'http://localhost:8000';
const DUPLICATE_REPORT_MESSAGE = 'Можете да съобщите за нередност с тази обява само веднъж, благодаря.';
const SAVE_ACCENT_COLOR = 'rgb(233, 30, 99)';

interface ContactSidebarProps {
  price: number;
  sellerName: string;
  sellerEmail: string;
  phone: string;
  sellerType?: string;
  sellerCreatedAt?: string;
  showSellerAvatar?: boolean;
  updatedLabel?: string | null;
  updatedAt?: string;
  priceHistory?: Array<{
    old_price: number | string;
    new_price: number | string;
    delta: number | string;
    changed_at: string;
  }>;
  viewCount?: number;
  listingId?: number;
  isMobile?: boolean;
  title?: string;
  city?: string;
}

type FavoriteResponseItem = {
  listing?: {
    id?: number;
  };
};

type ReportResponsePayload = {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
};

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  price,
  sellerName,
  phone,
  sellerType,
  sellerCreatedAt,
  showSellerAvatar = true,
  updatedLabel,
  updatedAt,
  priceHistory = [],
  viewCount,
  listingId,
  isMobile = false,
  title = '',
  city = '',
}) => {
  const { showToast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showPriceHistoryTooltip, setShowPriceHistoryTooltip] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportIncorrectPrice, setReportIncorrectPrice] = useState(false);
  const [reportOtherIssue, setReportOtherIssue] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportAcceptedTerms, setReportAcceptedTerms] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token || !listingId) return;

        const response = await fetch(
          `${API_BASE_URL}/api/my-favorites/`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const favorites = Array.isArray(data) ? (data as FavoriteResponseItem[]) : [];
          const isFav = favorites.some((fav) => fav.listing?.id === listingId);
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
        ? `${API_BASE_URL}/api/listings/${listingId}/unfavorite/`
        : `${API_BASE_URL}/api/listings/${listingId}/favorite/`;

      const response = await fetch(endpoint, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const resetReportForm = () => {
    setReportIncorrectPrice(false);
    setReportOtherIssue(false);
    setReportMessage('');
    setReportAcceptedTerms(false);
  };

  const handleSubmitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = localStorage.getItem('authToken');

    if (!token) {
      showToast('Трябва да сте логнати, за да докладвате обява.', { type: 'error' });
      return;
    }

    if (!listingId) {
      showToast('Неуспешно докладване. Невалидна обява.', { type: 'error' });
      return;
    }

    if (!reportIncorrectPrice && !reportOtherIssue) {
      showToast('Изберете поне една причина за доклада.', { type: 'error' });
      return;
    }

    if (reportOtherIssue && !reportMessage.trim()) {
      showToast('Моля, опишете нередността в съобщението.', { type: 'error' });
      return;
    }

    if (!reportAcceptedTerms) {
      showToast('Трябва да приемете общите условия и политиката за защита на личните данни.', { type: 'error' });
      return;
    }

    setIsReporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/report/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incorrect_price: reportIncorrectPrice,
          other_issue: reportOtherIssue,
          message: reportMessage.trim(),
          accepted_terms: reportAcceptedTerms,
        }),
      });

      let payload: ReportResponsePayload | null = null;
      try {
        const parsed = await response.json();
        payload = parsed && typeof parsed === 'object' ? (parsed as ReportResponsePayload) : null;
      } catch {
        payload = null;
      }

      if (response.status === 409) {
        showToast(DUPLICATE_REPORT_MESSAGE, { type: 'error', duration: 4200 });
        return;
      }

      if (!response.ok) {
        const backendMessage =
          (payload && (payload.detail || payload.message || payload.non_field_errors?.[0])) ||
          'Грешка при изпращане на доклада.';
        showToast(String(backendMessage), { type: 'error' });
        return;
      }

      showToast((payload && payload.detail) || 'Сигналът е изпратен успешно.', { type: 'success' });
      resetReportForm();
      setShowReportForm(false);
    } catch (error) {
      console.error('Error creating report:', error);
      showToast('Грешка при изпращане на доклада.', { type: 'error' });
    } finally {
      setIsReporting(false);
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

  const EUR_TO_BGN = 1.9558;
  const priceInBGN = (price * EUR_TO_BGN).toFixed(2);
  const priceHistoryPreview = priceHistory.slice(0, 5);
  const priceHistoryMore = priceHistory.length - priceHistoryPreview.length;
  const hasPriceHistory = priceHistory.length > 0;
  const latestPriceChange = priceHistory[0];
  const latestDeltaValue = latestPriceChange ? Number(latestPriceChange.delta) : Number.NaN;
  const showPriceDelta = Number.isFinite(latestDeltaValue) && latestDeltaValue !== 0;
  const priceDeltaLabel = showPriceDelta
    ? `${Math.abs(latestDeltaValue).toLocaleString('bg-BG')} €`
    : '';
  const PriceDeltaIcon = latestDeltaValue > 0 ? TrendingUp : TrendingDown;

  const formatHistoryTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
  };

  const formatClockTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatAccountDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const updatedTimeLabel = formatClockTime(updatedAt);
  const sellerSinceLabel = sellerType === 'business' ? formatAccountDate(sellerCreatedAt) : '';
  const viewCountValue = Number.isFinite(viewCount ?? Number.NaN) ? Number(viewCount) : null;

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

  const hiddenCheckboxStyle: React.CSSProperties = {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    pointerEvents: 'none',
  };

  const getCustomCheckboxStyle = (checked: boolean, compact = false): React.CSSProperties => ({
    width: compact ? 16 : 18,
    height: compact ? 16 : 18,
    borderRadius: 5,
    border: checked ? '1px solid #0f766e' : '1px solid #cbd5e1',
    background: checked ? 'linear-gradient(135deg, #0f766e 0%, #0b5f58 100%)' : '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: checked
      ? '0 4px 10px rgba(15, 118, 110, 0.25)'
      : 'inset 0 1px 0 rgba(255,255,255,0.9)',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  });

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
            background: isFavorite ? '#fff1f7' : '#f8fafc',
            color: isFavorite ? SAVE_ACCENT_COLOR : '#374151',
            border: `1px solid ${isFavorite ? '#f8bbd0' : '#eef2f7'}`,
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
    <div style={{ position: 'sticky', top: "6rem", alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#333',
                  margin: '0 0 6px',
                  lineHeight: 1.35,
                wordBreak: 'break-word',
                fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
                flex: 1,
              }}
            >
              {title}
            </h2>
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: hasPriceHistory ? '#0f766e' : '#94a3b8',
                cursor: hasPriceHistory ? 'pointer' : 'default',
                flexShrink: 0,
              }}
              onMouseEnter={() => {
                if (hasPriceHistory) setShowPriceHistoryTooltip(true);
              }}
              onMouseLeave={() => setShowPriceHistoryTooltip(false)}
              onClick={() => {
                if (!hasPriceHistory) return;
                setShowPriceHistoryTooltip((prev) => !prev);
              }}
              onKeyDown={(event) => {
                if (!hasPriceHistory) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setShowPriceHistoryTooltip((prev) => !prev);
                }
              }}
              role={hasPriceHistory ? 'button' : undefined}
              tabIndex={hasPriceHistory ? 0 : -1}
              title={hasPriceHistory ? 'История на цената' : 'Няма промени в цената'}
            >
              <Info size={14} />
              {showPriceHistoryTooltip && hasPriceHistory && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: 220,
                    maxWidth: 280,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 10,
                    boxShadow: '0 12px 26px rgba(15, 23, 42, 0.12)',
                    padding: 10,
                    zIndex: 20,
                  }}
                >
                  {priceHistoryPreview.map((entry, index) => {
                    const oldPrice = Number(entry.old_price);
                    const newPrice = Number(entry.new_price);
                    const deltaValue = Number(entry.delta);
                    const deltaLabel = Number.isFinite(deltaValue)
                      ? `${deltaValue > 0 ? '+' : ''}${deltaValue.toLocaleString('bg-BG')}`
                      : `${entry.delta}`;
                    const metaLabel =
                      Number.isFinite(oldPrice) && Number.isFinite(newPrice)
                        ? `${oldPrice.toLocaleString('bg-BG')} → ${newPrice.toLocaleString('bg-BG')}`
                        : `${entry.old_price} → ${entry.new_price}`;
                    const deltaColor = deltaValue > 0 ? '#16a34a' : deltaValue < 0 ? '#dc2626' : '#64748b';
                    return (
                      <div
                        key={`${entry.changed_at}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '6px 8px',
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          marginBottom: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{deltaLabel}</div>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                            {metaLabel} · {formatHistoryTime(entry.changed_at)}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: deltaColor }}>
                          {deltaValue > 0 ? '↑' : deltaValue < 0 ? '↓' : '•'}
                        </div>
                      </div>
                    );
                  })}
                  {priceHistoryMore > 0 && (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>
                      + още {priceHistoryMore}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
            Обява: {listingId}
          </div>
        </div>

        {/* Location */}
        <div style={{ padding: '0 20px 16px', fontSize: 13, color: '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} color="#111827" />
            Намира се в {city}
          </div>
          {updatedLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#f97316' }}>
              <Clock size={13} color="#f97316" />
              <span>
                Редактирана {updatedLabel}
              </span>
              {updatedTimeLabel && (
                <span style={{ color: '#f97316', fontWeight: 600 }}>
                  · {updatedTimeLabel}ч.
                </span>
              )}
            </div>
          )}
          {viewCountValue !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#0f766e' }}>
              <Eye size={13} color="#0f766e" />
              Обявата е видяна {viewCountValue.toLocaleString('bg-BG')} {viewCountValue === 1 ? 'път' : 'пъти'}
            </div>
          )}
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
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'rgb(51, 51, 51)',
                fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
              }}
            >
              {price.toLocaleString('bg-BG')} &euro;
            </div>
            {showPriceDelta && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  border: `1px solid ${latestDeltaValue > 0 ? '#bbf7d0' : '#fecaca'}`,
                  background: latestDeltaValue > 0 ? '#dcfce7' : '#fee2e2',
                  color: latestDeltaValue > 0 ? '#16a34a' : '#dc2626',
                }}
                title={latestDeltaValue > 0 ? 'Повишена цена' : 'Намалена цена'}
              >
                <PriceDeltaIcon size={14} />
                {latestDeltaValue > 0 ? '+' : '-'}
                {priceDeltaLabel}
              </span>
            )}
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
                Телефон за връзка
              </div>
              {isPhoneRevealed ? (
                <a
                  href={`tel:${phone}`}
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'rgb(51, 51, 51)',
                    letterSpacing: '0.4px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {phone}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhoneRevealed(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'rgb(51, 51, 51)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    cursor: 'pointer',
                  }}
                >
                  {maskPhoneNumber(phone)}
                </button>
              )}
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                {isPhoneRevealed ? 'Натисни за директно обаждане' : 'Номерът е скрит. Натисни за показване'}
              </div>
            </div>
          </div>
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
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0b5f58')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0f766e')}
          >
            Обади се сега
          </a>
        </div>

        {/* Email link + Seller Info */}
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #eef2f7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {showSellerAvatar && (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f766e 0%, #0b5f58 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials || <User size={18} />}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: '"Space Grotesk", "Manrope", "Segoe UI", sans-serif',
                  }}
                >
                  {sellerName}
                </div>
                {(city || '').trim() !== '' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 12 }}>
                    <MapPin size={12} />
                    {city}
                  </div>
                )}
                {sellerSinceLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    <Clock size={12} />
                    Потребител в Kar.bg от {sellerSinceLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
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
              color: isFavorite ? SAVE_ACCENT_COLOR : '#6b7280',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isFavorite) e.currentTarget.style.color = SAVE_ACCENT_COLOR;
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

        <div
          style={{
            borderTop: '1px solid #eef2f7',
            padding: '14px 20px 20px',
            background: '#fff',
          }}
        >
          <button
            type="button"
            onClick={() => setShowReportForm((prev) => !prev)}
            style={{
              width: '100%',
              padding: '11px 12px',
              borderRadius: 10,
              border: '1px solid #fecaca',
              background: showReportForm ? '#fef2f2' : '#fff',
              color: '#b91c1c',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showReportForm ? '#fef2f2' : '#fff';
            }}
          >
            <Flag size={14} />
            Докладвай обявата
          </button>

          {showReportForm && (
            <form onSubmit={handleSubmitReport} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={reportIncorrectPrice}
                  onChange={(event) => setReportIncorrectPrice(event.target.checked)}
                  style={hiddenCheckboxStyle}
                />
                <span aria-hidden="true" style={getCustomCheckboxStyle(reportIncorrectPrice)}>
                  {reportIncorrectPrice && <Check size={12} color="#fff" strokeWidth={3} />}
                </span>
                Невярна цена
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={reportOtherIssue}
                  onChange={(event) => {
                    const isChecked = event.target.checked;
                    setReportOtherIssue(isChecked);
                    if (!isChecked) {
                      setReportMessage('');
                    }
                  }}
                  style={hiddenCheckboxStyle}
                />
                <span aria-hidden="true" style={getCustomCheckboxStyle(reportOtherIssue)}>
                  {reportOtherIssue && <Check size={12} color="#fff" strokeWidth={3} />}
                </span>
                Друга нередност
              </label>

              <textarea
                rows={6}
                placeholder="Вашето съобщение"
                disabled={!reportOtherIssue}
                value={reportMessage}
                onChange={(event) => setReportMessage(event.target.value)}
                style={{
                  width: '100%',
                  resize: 'none',
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  padding: '10px 11px',
                  fontSize: 13,
                  color: '#111827',
                  background: reportOtherIssue ? '#fff' : '#f9fafb',
                  cursor: reportOtherIssue ? 'text' : 'not-allowed',
                }}
              />

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#4b5563',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={reportAcceptedTerms}
                  onChange={(event) => setReportAcceptedTerms(event.target.checked)}
                  style={hiddenCheckboxStyle}
                />
                <span
                  aria-hidden="true"
                  style={{ ...getCustomCheckboxStyle(reportAcceptedTerms, true), marginTop: 2 }}
                >
                  {reportAcceptedTerms && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span>
                  Съгласявам се с{' '}
                  <a
                    href="https://www.mobile.bg/obshti-uslovia"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#b91c1c', fontWeight: 600 }}
                  >
                    общите условия
                  </a>{' '}
                  и{' '}
                  <a
                    href="https://www.mobile.bg/zashtita-na-lichni-danni"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#b91c1c', fontWeight: 600 }}
                  >
                    политиките за защита на личните данни
                  </a>
                </span>
              </label>

              <button
                type="submit"
                disabled={isReporting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: isReporting ? '#fca5a5' : '#dc2626',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isReporting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                {isReporting ? 'Изпращане...' : 'Изпрати'}
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
};

export default ContactSidebar;
