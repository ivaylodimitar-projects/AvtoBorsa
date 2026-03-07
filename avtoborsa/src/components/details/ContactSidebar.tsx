import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Heart,
  Share2,
  Flag,
  MapPin,
  Check,
  User,
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Link,
  Eye,
  Calendar,
} from 'lucide-react';
import { FaFacebookF, FaTelegramPlane, FaViber, FaWhatsapp } from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { resolvePriceBadgeState } from '../../utils/priceChangeBadge';
import { getListingPriceSummary } from '../../utils/listingCurrency';

import { API_BASE_URL } from '../../config/api';
const DUPLICATE_REPORT_MESSAGE = 'Можете да съобщите за нередност с тази обява само веднъж, благодаря.';
const SAVE_ACCENT_COLOR = 'rgb(233, 30, 99)';

interface ContactSidebarProps {
  price: number;
  currency?: string;
  priceEur?: number | string;
  priceBgn?: number | string;
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
  createdAt?: string;
  initialIsFavorite?: boolean;
  onFavoriteChange?: (nextIsFavorite: boolean) => void;
}

type FavoriteResponseItem = {
  id?: number | string;
  listing?: {
    id?: number | string;
  } | null;
  listing_id?: number | string;
};

type ReportResponsePayload = {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveFavoriteListingId = (favorite: FavoriteResponseItem): number | null => {
  const nestedListingId = toFiniteNumber(favorite.listing?.id);
  if (nestedListingId !== null) return nestedListingId;

  const directListingId = toFiniteNumber(favorite.listing_id);
  if (directListingId !== null) return directListingId;

  // Some API variants return listing objects directly instead of wrapper favorite objects.
  const hasFavoriteWrapperKeys =
    Object.prototype.hasOwnProperty.call(favorite, 'listing') ||
    Object.prototype.hasOwnProperty.call(favorite, 'listing_id');
  if (hasFavoriteWrapperKeys) return null;

  return toFiniteNumber(favorite.id);
};

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  price,
  currency = 'EUR',
  priceEur,
  priceBgn,
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
  createdAt,
  initialIsFavorite = false,
  onFavoriteChange,
}) => {
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, ensureFreshAccessToken } = useAuth();
  const [isFavorite, setIsFavorite] = useState(Boolean(initialIsFavorite));
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
    if (!isAuthenticated) {
      setIsFavorite(false);
      return;
    }
    setIsFavorite(Boolean(initialIsFavorite));
  }, [initialIsFavorite, listingId, isAuthenticated]);

  useEffect(() => {
    let isCancelled = false;
    const checkFavorite = async () => {
      try {
        if (!listingId) return;
        if (isAuthLoading) return;
        if (!isAuthenticated) {
          if (!isCancelled) setIsFavorite(false);
          return;
        }
        const normalizedListingId = toFiniteNumber(listingId);
        if (normalizedListingId === null) return;

        const token = await ensureFreshAccessToken();
        if (!token) {
          if (!isCancelled) setIsFavorite(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/my-favorites/`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const favorites = Array.isArray(data)
            ? (data as FavoriteResponseItem[])
            : Array.isArray((data as { results?: unknown }).results)
              ? ((data as { results: FavoriteResponseItem[] }).results)
              : [];
          const isFav = favorites.some(
            (fav) => resolveFavoriteListingId(fav) === normalizedListingId
          );
          if (!isCancelled) {
            setIsFavorite((prev) => (isFav ? true : prev));
          }
        } else if (!isCancelled && (response.status === 401 || response.status === 403)) {
          setIsFavorite(false);
        }
      } catch (err) {
        console.error('Грешка при проверка на любима обява:', err);
      }
    };
    checkFavorite();
    return () => {
      isCancelled = true;
    };
  }, [listingId, isAuthenticated, isAuthLoading, ensureFreshAccessToken]);

  const handleToggleFavorite = async () => {
    try {
      if (!listingId) {
        showToast('Трябва да сте влезли в профила си, за да запазвате обяви.', { type: 'error' });
        return;
      }
      const token = await ensureFreshAccessToken();
      if (!token) {
        showToast('Сесията ви е изтекла. Влезте отново, за да запазвате обяви.', { type: 'error' });
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
        setIsFavorite((prev) => {
          const next = !prev;
          onFavoriteChange?.(next);
          return next;
        });
      } else {
        showToast('Грешка при запазване на обявата.', { type: 'error' });
      }
    } catch (err) {
      console.error('Грешка при промяна на любима обява:', err);
      showToast('Грешка при запазване на обявата.', { type: 'error' });
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
      console.error('Грешка при изпращане на сигнал:', error);
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
      console.error('Грешка при копиране на линка:', err);
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

  const priceSummary = getListingPriceSummary({
    price,
    currency,
    priceEur,
    priceBgn,
  });
  const priceHistoryPreview = priceHistory.slice(0, 5);
  const priceHistoryMore = priceHistory.length - priceHistoryPreview.length;
  const hasPriceHistory = priceHistory.length > 0;
  const latestPriceChange = priceHistory[0];
  const latestPriceBadge = resolvePriceBadgeState(
    latestPriceChange ? { ...latestPriceChange, currency } : null
  );
  const showPriceDelta = Boolean(latestPriceBadge);
  const PriceDeltaIcon =
    latestPriceBadge?.kind === 'announced'
      ? Info
      : latestPriceBadge?.kind === 'up'
        ? TrendingUp
        : TrendingDown;

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

  const formatAccountDateTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('bg-BG', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} · ${timePart} ч.`;
  };

  const updatedTimeLabel = formatClockTime(updatedAt);
  const publishedDateLabel = formatAccountDateTime(createdAt);
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
      icon: copied ? <Check size={16} /> : <Link size={16} />,
      tone: copied
        ? {
            background: '#ecfdf5',
            borderColor: '#99f6e4',
            color: '#0f766e',
          }
        : {
            background: '#eff6ff',
            borderColor: '#bfdbfe',
            color: '#2563eb',
          },
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      icon: <FaWhatsapp size={17} />,
      tone: {
        background: '#f0fdf4',
        borderColor: '#bbf7d0',
        color: '#16a34a',
      },
    },
    {
      id: 'telegram',
      label: 'Telegram',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <FaTelegramPlane size={17} />,
      tone: {
        background: '#eff6ff',
        borderColor: '#bfdbfe',
        color: '#0284c7',
      },
    },
    {
      id: 'viber',
      label: 'Viber',
      url: `viber://forward?text=${encodedText}%20${encodedUrl}`,
      icon: <FaViber size={16} />,
      tone: {
        background: '#f5f3ff',
        borderColor: '#ddd6fe',
        color: '#7c3aed',
      },
    },
    {
      id: 'facebook',
      label: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FaFacebookF size={15} />,
      tone: {
        background: '#eff6ff',
        borderColor: '#bfdbfe',
        color: '#1877f2',
      },
    },
    {
      id: 'email',
      label: 'Имейл',
      url: `mailto:?subject=${encodedText}&body=${encodedText}%0A${encodedUrl}`,
      icon: <FiMail size={16} />,
      tone: {
        background: '#fff7ed',
        borderColor: '#fed7aa',
        color: '#ea580c',
      },
    },
  ];

  const renderShareOption = (option: (typeof shareOptions)[number]) => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 40,
      padding: 0,
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      background: '#f8fafc',
      color: '#334155',
      cursor: 'pointer',
      textDecoration: 'none',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      flexShrink: 0,
    };

    const toneStyle: React.CSSProperties = option.tone ?? {};

    if (option.onClick) {
      return (
        <button
          key={option.id}
          type="button"
          onClick={option.onClick}
          title={option.label}
          aria-label={option.label}
          style={{ ...baseStyle, ...toneStyle }}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'translateY(-1px)';
            event.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
            event.currentTarget.style.boxShadow = 'none';
          }}
        >
          {option.icon}
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
          style={{ ...baseStyle, ...toneStyle }}
          onClick={() => setShowShareMenu(false)}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = 'translateY(-1px)';
            event.currentTarget.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = 'translateY(0)';
            event.currentTarget.style.boxShadow = 'none';
          }}
        >
          {option.icon}
        </a>
      );
    }

    return null;
  };

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
    borderRadius: 16,
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
      <>
        {showPriceHistoryTooltip && hasPriceHistory && (
          <div
            style={{
              position: 'fixed',
              left: 12,
              right: 12,
              bottom: 76,
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              background: '#fff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
              padding: '12px 12px 10px',
              maxHeight: 'min(52vh, 420px)',
              overflowY: 'auto',
              zIndex: 160,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Разлики в цената</div>
              <button
                type="button"
                onClick={() => setShowPriceHistoryTooltip(false)}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Затвори
              </button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
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
                      padding: '10px',
                      borderRadius: 14,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{deltaLabel}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        {metaLabel} · {formatHistoryTime(entry.changed_at)}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: deltaColor }}>
                      {deltaValue > 0 ? '↑' : deltaValue < 0 ? '↓' : '•'}
                    </div>
                  </div>
                );
              })}
              {priceHistoryMore > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'right' }}>
                  + още {priceHistoryMore}
                </div>
              )}
            </div>
          </div>
        )}
        <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: 56,
          right: 10,
          background: '#fff',
          border: '1px solid #eef2f7',
          borderRadius: 14,
          padding: '6px 8px',
          display: 'flex',
          gap: 7,
          zIndex: 100,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <button
          style={{
            flex: 1,
            minHeight: 41,
            padding: '10px 12px',
            background: '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: 13,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
          onClick={() => window.open(`tel:${phone}`)}
        >
          <Phone size={15} />
          Позвъни
        </button>
        <button
          type="button"
          onClick={() => {
            setShowShareMenu(false);
            if (!hasPriceHistory) return;
            setShowPriceHistoryTooltip((prev) => !prev);
          }}
          disabled={!hasPriceHistory}
          style={{
            flex: 1,
            minHeight: 41,
            padding: '10px 11px',
            background: hasPriceHistory ? '#ecfdf5' : '#f8fafc',
            color: hasPriceHistory ? '#0f766e' : '#94a3b8',
            border: `1px solid ${hasPriceHistory ? '#99f6e4' : '#eef2f7'}`,
            borderRadius: 13,
            fontSize: 12,
            fontWeight: 700,
            cursor: hasPriceHistory ? 'pointer' : 'not-allowed',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: hasPriceHistory ? 1 : 0.7,
          }}
          title={hasPriceHistory ? 'Разлики в цената' : 'Няма промени в цената'}
        >
          <PriceDeltaIcon size={14} />
          Цена
        </button>
        <button
          ref={shareButtonRef}
          type="button"
          onClick={() => {
            setShowPriceHistoryTooltip(false);
            setShowShareMenu((prev) => !prev);
          }}
          style={{
            flex: 1,
            minHeight: 41,
            minWidth: 0,
            padding: '10px 8px',
            background: showShareMenu ? '#ecfeff' : '#f8fafc',
            color: showShareMenu ? '#0f766e' : '#374151',
            border: `1px solid ${showShareMenu ? '#99f6e4' : '#eef2f7'}`,
            borderRadius: 13,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
          }}
          aria-label="Сподели обявата"
        >
          <Share2 size={14} />
          Сподели
        </button>
        <button
          style={{
            flex: '0 0 46px',
            minHeight: 41,
            minWidth: 46,
            padding: '10px 0',
            background: isFavorite ? '#fff1f7' : '#f8fafc',
            color: isFavorite ? SAVE_ACCENT_COLOR : '#374151',
            border: `1px solid ${isFavorite ? '#f8bbd0' : '#eef2f7'}`,
            borderRadius: 13,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
          }}
          onClick={handleToggleFavorite}
          disabled={isLoading}
          aria-label={isFavorite ? 'Премахни от любими' : 'Запази в любими'}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        </div>
        {showShareMenu && (
          <div
            ref={shareMenuRef}
            style={{
              position: 'fixed',
              left: 56,
              right: 10,
              bottom: 64,
              padding: '10px 12px',
              borderRadius: 16,
              border: '1px solid #e5e7eb',
              background: '#fff',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
              display: 'flex',
              gap: 8,
              zIndex: 120,
              overflowX: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5f5 transparent',
            }}
          >
            {shareOptions.map(renderShareOption)}
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ position: 'sticky', top: "6rem", alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Main Contact Box */}
      <div
          style={{
            background: '#fff',
            borderRadius: 16,
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
                    borderRadius: 16,
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
                          borderRadius: 16,
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
          {publishedDateLabel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#6b7280' }}>
              <Calendar size={13} color="#6b7280" />
              <span>Публикувана на {publishedDateLabel}</span>
            </div>
          )}
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
            borderRadius: 16,
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
              {priceSummary.primary}
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
                  border:
                    latestPriceBadge?.kind === 'up'
                      ? '1px solid #bbf7d0'
                      : latestPriceBadge?.kind === 'down'
                        ? '1px solid #fecaca'
                        : '1px solid #bae6fd',
                  background:
                    latestPriceBadge?.kind === 'up'
                      ? '#dcfce7'
                      : latestPriceBadge?.kind === 'down'
                        ? '#fee2e2'
                        : '#e0f2fe',
                  color:
                    latestPriceBadge?.kind === 'up'
                      ? '#16a34a'
                      : latestPriceBadge?.kind === 'down'
                        ? '#dc2626'
                        : '#0369a1',
                }}
                title={latestPriceBadge?.title}
              >
                <PriceDeltaIcon size={14} />
                {latestPriceBadge?.kind === 'announced'
                  ? 'Обявена цена'
                  : `${latestPriceBadge?.kind === 'up' ? '+' : '-'}${latestPriceBadge?.amountLabel}`}
              </span>
            )}
          </div>
          {priceSummary.secondary.map((label) => (
            <div key={label} style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
              {label}
            </div>
          ))}
        </div>

        {/* Phone */}
        <div
          style={{
            margin: '0 20px 16px',
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: 16,
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
              borderRadius: 16,
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
              borderRadius: 16,
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
          <div
            ref={shareMenuRef}
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: 'calc(100% + 8px)',
              padding: '10px 12px',
              borderRadius: 16,
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
            {shareOptions.map(renderShareOption)}
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
              borderRadius: 16,
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
                  borderRadius: 16,
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
                    href="/legal#terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#b91c1c', fontWeight: 600 }}
                  >
                    общите условия
                  </a>{' '}
                  и{' '}
                  <a
                    href="/legal#privacy"
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
                  borderRadius: 16,
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


