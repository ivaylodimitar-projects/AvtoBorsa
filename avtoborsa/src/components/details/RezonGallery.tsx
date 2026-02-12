import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Monitor, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ThumbnailStrip from './ThumbnailStrip';
import { useThrottle } from '../../hooks/useThrottle';
import { useGalleryLazyLoad, useImageUrl } from '../../hooks/useGalleryLazyLoad';

interface Image {
  id: number;
  image: string;
}

interface RezonGalleryProps {
  images: Image[];
  title: string;
  isMobile: boolean;
  promoLabel?: string;
  showTopBadge?: boolean;
  showNewBadge?: boolean;
}

// Memoized main image component with lazy loading
const MainCarouselImage = memo<{
  image: Image;
  title: string;
  getImageUrl: (path: string) => string;
  isActive: boolean;
}>(({ image, title, getImageUrl, isActive }) => (
  <img
    src={getImageUrl(image.image)}
    alt={title}
    loading={isActive ? 'eager' : 'lazy'}
    draggable={false}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center',
      imageRendering: 'auto',
      display: 'block',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      msUserSelect: 'none',
      WebkitUserDrag: 'none',
    }}
    onDragStart={(e) => e.preventDefault()}
  />
));

MainCarouselImage.displayName = 'MainCarouselImage';

// Fullscreen modal component
const FullscreenModal = memo<{
  isOpen: boolean;
  image: Image;
  title: string;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  getImageUrl: (path: string) => string;
  isMobile: boolean;
  showTopBadge?: boolean;
  showNewBadge?: boolean;
}>(
  ({
    isOpen,
    image,
    title,
    currentIndex,
    totalImages,
    onClose,
    onPrevious,
    onNext,
    getImageUrl,
    isMobile,
    showTopBadge = false,
    showNewBadge = false,
  }) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const zoomStep = 0.25;
    const minZoom = 1;
    const maxZoom = 3;

    useEffect(() => {
      if (isOpen) {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
      }
    }, [isOpen, image?.image]);

    const getBounds = useCallback((zoom: number) => {
      const container = containerRef.current;
      const img = imageRef.current;
      if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
        return { maxX: 0, maxY: 0 };
      }
      const { width: cW, height: cH } = container.getBoundingClientRect();
      const ratio = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
      const baseW = img.naturalWidth * ratio;
      const baseH = img.naturalHeight * ratio;
      const scaledW = baseW * zoom;
      const scaledH = baseH * zoom;
      return {
        maxX: Math.max(0, (scaledW - cW) / 2),
        maxY: Math.max(0, (scaledH - cH) / 2),
      };
    }, []);

    const clampPan = useCallback(
      (nextPan: { x: number; y: number }, zoom: number) => {
        const { maxX, maxY } = getBounds(zoom);
        return {
          x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
          y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
        };
      },
      [getBounds]
    );

    useEffect(() => {
      setPan((prev) => clampPan(prev, zoomLevel));
    }, [zoomLevel, clampPan]);

    useEffect(() => {
      const handleResize = () => {
        setPan((prev) => clampPan(prev, zoomLevel));
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [clampPan, zoomLevel]);

    const handleZoomIn = (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomLevel((prev) => Math.min(maxZoom, Number((prev + zoomStep).toFixed(2))));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomLevel((prev) => Math.max(minZoom, Number((prev - zoomStep).toFixed(2))));
    };

    const handleZoomReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    };

    const handleWheelZoom = (e: React.WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      const nextZoomRaw = zoomLevel + direction * zoomStep;
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoomRaw.toFixed(2))));
      if (nextZoom === zoomLevel) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        setZoomLevel(nextZoom);
        return;
      }

      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const ratio = nextZoom / zoomLevel;

      setPan((prev) => {
        const nextPan = {
          x: prev.x * ratio + (1 - ratio) * cx,
          y: prev.y * ratio + (1 - ratio) * cy,
        };
        return clampPan(nextPan, nextZoom);
      });
      setZoomLevel(nextZoom);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (zoomLevel <= 1) return;
      isPanningRef.current = true;
      setIsDragging(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const nextPan = { x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy };
      setPan(clampPan(nextPan, zoomLevel));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      setIsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    };

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          backfaceVisibility: 'hidden',
        }}
        onClick={onClose}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '12px' : '20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {showTopBadge && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  padding: isMobile ? '5px 9px' : '6px 11px',
                  borderRadius: 999,
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 14px rgba(220, 38, 38, 0.35)',
                }}
              >
                Топ обява
              </span>
            )}
            {showNewBadge && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  padding: isMobile ? '5px 9px' : '6px 11px',
                  borderRadius: 999,
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                  boxShadow: '0 6px 14px rgba(5, 150, 105, 0.35)',
                }}
              >
                Нова
              </span>
            )}
            <h2 style={{ color: '#fff', margin: 0, fontSize: isMobile ? 14 : 16 }}>
              {title}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: isMobile ? '4px 6px' : '6px 8px',
              }}
            >
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= minZoom}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  cursor: zoomLevel <= minZoom ? 'not-allowed' : 'pointer',
                  opacity: zoomLevel <= minZoom ? 0.5 : 1,
                  padding: isMobile ? '6px' : '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Zoom out"
              >
                <ZoomOut size={isMobile ? 16 : 18} />
              </button>
              <span style={{ color: '#fff', fontSize: isMobile ? 11 : 12, fontWeight: 600, minWidth: 42, textAlign: 'center' }}>
                {zoomLevel.toFixed(2)}x
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= maxZoom}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  cursor: zoomLevel >= maxZoom ? 'not-allowed' : 'pointer',
                  opacity: zoomLevel >= maxZoom ? 0.5 : 1,
                  padding: isMobile ? '6px' : '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Zoom in"
              >
                <ZoomIn size={isMobile ? 16 : 18} />
              </button>
              <button
                onClick={handleZoomReset}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: isMobile ? '6px' : '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Reset zoom"
              >
                <RotateCcw size={isMobile ? 16 : 18} />
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '12px' : '20px',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={containerRef}
            onWheel={handleWheelZoom}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.35)',
              padding: isMobile ? 4 : 8,
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: zoomLevel > 1 ? 'none' : 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            <img
              ref={imageRef}
              src={getImageUrl(image.image)}
              alt={title}
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                willChange: 'transform',
                imageRendering: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                msUserSelect: 'none',
                WebkitUserDrag: 'none',
              }}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>

          {/* Navigation Buttons */}
          {totalImages > 1 && (
            <>
              <button
                onClick={onPrevious}
                style={{
                  position: 'absolute',
                  left: isMobile ? 8 : 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
                }
              >
                <ChevronLeft size={isMobile ? 20 : 28} />
              </button>
              <button
                onClick={onNext}
                style={{
                  position: 'absolute',
                  right: isMobile ? 8 : 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
                }
              >
                <ChevronRight size={isMobile ? 20 : 28} />
              </button>
            </>
          )}
        </div>

        {/* Counter */}
        <div
          style={{
            textAlign: 'center',
            color: '#fff',
            padding: isMobile ? '8px' : '12px',
            fontSize: isMobile ? 12 : 14,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {currentIndex + 1} / {totalImages}
        </div>
      </div>
    );
  }
);

FullscreenModal.displayName = 'FullscreenModal';

const RezonGallery: React.FC<RezonGalleryProps> = ({
  images,
  title,
  isMobile,
  promoLabel,
  showTopBadge = false,
  showNewBadge = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const touchStartRef = useRef<number>(0);
  const getImageUrl = useImageUrl();

  // Lazy load images
  useGalleryLazyLoad(images, currentIndex, getImageUrl);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Throttle navigation
  const throttledPrevious = useThrottle(handlePrevious, 300);
  const throttledNext = useThrottle(handleNext, 300);

  // Touch swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStartRef.current - touchEnd;

      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          throttledNext();
        } else {
          throttledPrevious();
        }
      }
    },
    [throttledNext, throttledPrevious]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        throttledPrevious();
      } else if (e.key === 'ArrowRight') {
        throttledNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throttledPrevious, throttledNext]);

  if (!images || images.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: isMobile ? 300 : 500,
          background: '#f0f0f0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: 16,
        }}
      >
        📷 Нема слики
      </div>
    );
  }

  const currentImage = images[currentIndex];

  const styles = useMemo(
    () => ({
      container: {
        width: '100%',
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e0e0e0',
      } as React.CSSProperties,
      carouselWrapper: {
        position: 'relative' as const,
        width: '100%',
        height: isMobile ? undefined : 500,
        paddingBottom: isMobile ? '100%' : undefined,
        background: '#f0f0f0',
        minHeight: isMobile ? 300 : 500,
        overflow: 'hidden',
        backfaceVisibility: 'hidden' as const,
        transform: 'translateZ(0)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      } as React.CSSProperties,
      carouselInner: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        willChange: 'transform',
        backfaceVisibility: 'hidden' as const,
        transform: 'translateZ(0)',
      } as React.CSSProperties,
      controls: {
        position: 'absolute' as const,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        border: 'none',
        width: isMobile ? 40 : 50,
        height: isMobile ? 40 : 50,
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
      } as React.CSSProperties,
      prevButton: {
        left: isMobile ? 12 : 16,
      } as React.CSSProperties,
      nextButton: {
        right: isMobile ? 12 : 16,
      } as React.CSSProperties,
      fullscreenButton: {
        position: 'absolute' as const,
        top: isMobile ? 8 : 12,
        right: isMobile ? 8 : 12,
        background: 'rgba(15, 23, 42, 0.65)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.2)',
        height: isMobile ? 36 : 40,
        padding: isMobile ? '0 8px' : '0 12px',
        borderRadius: 999,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 0 : 8,
        fontSize: isMobile ? 0 : 12,
        fontWeight: 600,
        zIndex: 10,
        transition: 'background 0.2s, transform 0.2s',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
      } as React.CSSProperties,
      counter: {
        position: 'absolute' as const,
        bottom: isMobile ? 8 : 12,
        left: isMobile ? 8 : 12,
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        padding: isMobile ? '4px 8px' : '6px 12px',
        borderRadius: 4,
        fontSize: isMobile ? 11 : 12,
        fontWeight: 600,
        zIndex: 10,
      } as React.CSSProperties,
      promoLabel: {
        position: 'absolute' as const,
        top: isMobile ? 8 : 12,
        left: isMobile ? 8 : 12,
        zIndex: 9,
      } as React.CSSProperties,
      topBadge: {
        position: 'absolute' as const,
        top: isMobile ? 8 : 12,
        left: isMobile ? 8 : 12,
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff',
        padding: isMobile ? '5px 9px' : '6px 11px',
        borderRadius: 999,
        fontSize: isMobile ? 10 : 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase' as const,
        boxShadow: '0 6px 14px rgba(220, 38, 38, 0.35)',
        zIndex: 11,
      } as React.CSSProperties,
      newBadge: {
        position: 'absolute' as const,
        top: isMobile ? 8 : 12,
        left: isMobile ? 8 : 12,
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#fff',
        padding: isMobile ? '5px 9px' : '6px 11px',
        borderRadius: 999,
        fontSize: isMobile ? 10 : 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase' as const,
        boxShadow: '0 6px 14px rgba(5, 150, 105, 0.35)',
        zIndex: 11,
      } as React.CSSProperties,
    }),
    [isMobile]
  );

  return (
    <>
      <div style={styles.container}>
        {/* Main Carousel */}
        <div
          style={styles.carouselWrapper}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={styles.carouselInner}>
            <MainCarouselImage
              image={currentImage}
              title={title}
              getImageUrl={getImageUrl}
              isActive={true}
            />
          </div>

          {/* Promo Label */}
          {showTopBadge && (
            <div style={styles.topBadge}>Топ обява</div>
          )}
          {showNewBadge && (
            <div
              style={{
                ...styles.newBadge,
                top: showTopBadge ? (isMobile ? 40 : 48) : (isMobile ? 8 : 12),
              }}
            >
              Нова
            </div>
          )}

          {promoLabel && (
            <img
              src={promoLabel}
              alt="Promo"
              style={{
                ...styles.promoLabel,
                top: showTopBadge ? (isMobile ? 40 : 48) : (isMobile ? 8 : 12),
                maxWidth: isMobile ? 60 : 80,
                height: 'auto',
              }}
            />
          )}

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => throttledPrevious()}
                style={{ ...styles.controls, ...styles.prevButton }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
                aria-label="Previous image"
              >
                <ChevronLeft size={isMobile ? 22 : 28} strokeWidth={3} />
              </button>
              <button
                onClick={() => throttledNext()}
                style={{ ...styles.controls, ...styles.nextButton }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }}
                aria-label="Next image"
              >
                <ChevronRight size={isMobile ? 22 : 28} strokeWidth={3} />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreenOpen(true)}
            style={styles.fullscreenButton}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)')
            }
            aria-label="View fullscreen"
          >
            <Monitor size={isMobile ? 16 : 18} />
            {!isMobile && <span>Голям екран</span>}
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 0 && (
          <ThumbnailStrip
            images={images}
            currentIndex={currentIndex}
            onSlideTo={setCurrentIndex}
            getImageUrl={getImageUrl}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Fullscreen Modal */}
      <FullscreenModal
        isOpen={isFullscreenOpen}
        image={currentImage}
        title={title}
        currentIndex={currentIndex}
        totalImages={images.length}
        onClose={() => setIsFullscreenOpen(false)}
        onPrevious={() => throttledPrevious()}
        onNext={() => throttledNext()}
        getImageUrl={getImageUrl}
        isMobile={isMobile}
        showTopBadge={showTopBadge}
        showNewBadge={showNewBadge}
      />
    </>
  );
};

export default RezonGallery;
