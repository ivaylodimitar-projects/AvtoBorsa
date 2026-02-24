import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Monitor, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ThumbnailStrip from './ThumbnailStrip';
import { useThrottle } from '../../hooks/useThrottle';
import { useGalleryLazyLoad, useImageUrl } from '../../hooks/useGalleryLazyLoad';
import ListingPromoBadge from '../ListingPromoBadge';
import KapariranoBadge from '../KapariranoBadge';

interface Image {
  id: number;
  image: string;
  thumbnail?: string | null;
}

interface RezonGalleryProps {
  images: Image[];
  title: string;
  isMobile: boolean;
  promoLabel?: string;
  showTopBadge?: boolean;
  showVipBadge?: boolean;
  showNewBadge?: boolean;
  showKapariranoBadge?: boolean;
}

// Memoized main image component with lazy loading
const MainCarouselImage = memo<{
  src: string;
  title: string;
  isActive: boolean;
}>(({ src, title, isActive }) => (
  <img
    src={src}
    alt={title}
    loading={isActive ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={isActive ? 'high' : 'auto'}
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
    }}
    onDragStart={(e) => e.preventDefault()}
  />
));

MainCarouselImage.displayName = 'MainCarouselImage';

// Fullscreen modal component
const FullscreenModal = memo<{
  isOpen: boolean;
  imageSrc: string;
  title: string;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isMobile: boolean;
  showTopBadge?: boolean;
  showVipBadge?: boolean;
  showNewBadge?: boolean;
  showKapariranoBadge?: boolean;
}>(
  ({
    isOpen,
    imageSrc,
    title,
    currentIndex,
    totalImages,
    onClose,
    onPrevious,
    onNext,
    isMobile,
    showTopBadge = false,
    showVipBadge = false,
    showNewBadge = false,
    showKapariranoBadge = false,
  }) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [maxZoom, setMaxZoom] = useState(isMobile ? 4 : 6);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const minZoom = 1;
    const headerBadgeLabel = showTopBadge ? 'TOP' : showVipBadge ? 'VIP' : null;

    useEffect(() => {
      if (isOpen) {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
      }
    }, [isOpen, imageSrc]);

    const getGeometry = useCallback((zoom: number) => {
      const container = containerRef.current;
      const img = imageRef.current;
      if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
        return null;
      }
      const { width: cW, height: cH } = container.getBoundingClientRect();
      const ratio = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
      const baseW = img.naturalWidth * ratio;
      const baseH = img.naturalHeight * ratio;
      const scaledW = baseW * zoom;
      const scaledH = baseH * zoom;
      return {
        cW,
        cH,
        baseW,
        baseH,
        scaledW,
        scaledH,
        maxX: Math.max(0, (scaledW - cW) / 2),
        maxY: Math.max(0, (scaledH - cH) / 2),
      };
    }, []);

    const getBounds = useCallback((zoom: number) => {
      const geometry = getGeometry(zoom);
      if (!geometry) return { maxX: 0, maxY: 0 };
      return { maxX: geometry.maxX, maxY: geometry.maxY };
    }, [getGeometry]);

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

    const recomputeMaxZoom = useCallback(() => {
      const container = containerRef.current;
      const img = imageRef.current;
      if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
        setMaxZoom(isMobile ? 4 : 6);
        return;
      }

      const { width: cW, height: cH } = container.getBoundingClientRect();
      if (!cW || !cH) {
        setMaxZoom(isMobile ? 4 : 6);
        return;
      }

      const ratio = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
      const baseW = img.naturalWidth * ratio;
      const baseH = img.naturalHeight * ratio;
      const nativeDensity = Math.min(
        img.naturalWidth / Math.max(baseW, 1),
        img.naturalHeight / Math.max(baseH, 1)
      );
      const headroom = isMobile ? 1.5 : 2;
      const computed = Math.min(
        isMobile ? 6 : 10,
        Math.max(isMobile ? 3 : 4, Number((nativeDensity * headroom).toFixed(2)))
      );
      setMaxZoom(computed);
    }, [isMobile]);

    useEffect(() => {
      recomputeMaxZoom();
      const handleResize = () => recomputeMaxZoom();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [recomputeMaxZoom]);

    useEffect(() => {
      setZoomLevel((prev) => Math.min(prev, maxZoom));
    }, [maxZoom]);

    const applyZoom = useCallback(
      (nextZoomRaw: number, anchor?: { x: number; y: number }) => {
        const nextZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoomRaw.toFixed(3))));
        if (nextZoom === zoomLevel) return;

        const ax = anchor?.x ?? 0;
        const ay = anchor?.y ?? 0;
        const ratio = nextZoom / zoomLevel;

        setPan((prev) => {
          const nextPan = {
            x: prev.x * ratio + (1 - ratio) * ax,
            y: prev.y * ratio + (1 - ratio) * ay,
          };
          return clampPan(nextPan, nextZoom);
        });
        setZoomLevel(nextZoom);
      },
      [clampPan, maxZoom, zoomLevel]
    );

    const handleZoomIn = (e: React.MouseEvent) => {
      e.stopPropagation();
      const zoomStep = zoomLevel < 2 ? 0.2 : zoomLevel < 4 ? 0.35 : 0.5;
      applyZoom(zoomLevel + zoomStep);
    };

    const handleZoomOut = (e: React.MouseEvent) => {
      e.stopPropagation();
      const zoomStep = zoomLevel <= 2 ? 0.2 : zoomLevel <= 4 ? 0.35 : 0.5;
      applyZoom(zoomLevel - zoomStep);
    };

    const handleZoomReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    };

    const handleWheelZoom = (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const wheelIntensity = e.ctrlKey ? 0.0042 : 0.0022;
      const factor = Math.exp(-e.deltaY * wheelIntensity);
      applyZoom(zoomLevel * factor, { x: cx, y: cy });
    };

    const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      if (Number.isNaN(next)) return;
      applyZoom(next);
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

    const miniMapData = useMemo(() => {
      if (zoomLevel <= 1) return null;
      const geometry = getGeometry(zoomLevel);
      if (!geometry) return null;

      const visibleWBase = Math.min(geometry.baseW, geometry.cW / zoomLevel);
      const visibleHBase = Math.min(geometry.baseH, geometry.cH / zoomLevel);
      const leftBaseRaw = ((-geometry.cW / 2 - pan.x) / zoomLevel) + geometry.baseW / 2;
      const topBaseRaw = ((-geometry.cH / 2 - pan.y) / zoomLevel) + geometry.baseH / 2;
      const leftBase = Math.max(0, Math.min(geometry.baseW - visibleWBase, leftBaseRaw));
      const topBase = Math.max(0, Math.min(geometry.baseH - visibleHBase, topBaseRaw));

      const miniW = isMobile ? 92 : 150;
      const miniH = Math.max(56, Math.round((geometry.baseH / Math.max(geometry.baseW, 1)) * miniW));
      const rectLeft = (leftBase / geometry.baseW) * miniW;
      const rectTop = (topBase / geometry.baseH) * miniH;
      const rectW = (visibleWBase / geometry.baseW) * miniW;
      const rectH = (visibleHBase / geometry.baseH) * miniH;

      return { miniW, miniH, rectLeft, rectTop, rectW, rectH };
    }, [getGeometry, isMobile, pan.x, pan.y, zoomLevel]);

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
          zIndex: 1000,
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
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
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'linear-gradient(to bottom, rgba(2,6,23,0.6), rgba(2,6,23,0))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {headerBadgeLabel && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: isMobile ? '4px 8px' : '5px 10px',
                  borderRadius: 999,
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  color: '#fff',
                  background:
                    headerBadgeLabel === 'TOP'
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow:
                    headerBadgeLabel === 'TOP'
                      ? '0 6px 14px rgba(239, 68, 68, 0.35)'
                      : '0 6px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                {headerBadgeLabel}
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
              {!isMobile && (
                <input
                  type="range"
                  min={minZoom}
                  max={maxZoom}
                  step={0.01}
                  value={zoomLevel}
                  onChange={handleZoomSlider}
                  aria-label="Zoom level"
                  style={{
                    width: 160,
                    accentColor: '#34d399',
                    cursor: 'pointer',
                  }}
                />
              )}
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
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            overflow: 'hidden',
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
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: 0,
              background: 'rgba(0, 0, 0, 0.92)',
              padding: 0,
              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              touchAction: zoomLevel > 1 ? 'none' : 'pan-y',
              overscrollBehavior: 'contain',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                willChange: 'transform',
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt={title}
                draggable={false}
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                  imageRendering: 'auto',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  msUserSelect: 'none',
                }}
                onDragStart={(e) => e.preventDefault()}
                onLoad={recomputeMaxZoom}
              />
              {showKapariranoBadge && (
                <KapariranoBadge size={isMobile ? 'sm' : 'default'} zIndex={24} />
              )}
              {showNewBadge && (
                <div
                  style={{
                    position: 'absolute',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    padding: isMobile ? '4px 8px' : '5px 10px',
                    borderRadius: 999,
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                    boxShadow: '0 6px 14px rgba(5, 150, 105, 0.35)',
                    top: 'auto',
                    bottom: isMobile ? 8 : 12,
                    left: isMobile ? 8 : 12,
                    zIndex: 25,
                  }}
                >
                  Нова
                </div>
              )}
            </div>
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

          {/* Zoom mini-map */}
          {!isMobile && miniMapData && (
            <div
              style={{
                position: 'absolute',
                right: 18,
                bottom: 18,
                background: 'rgba(15, 23, 42, 0.58)',
                border: '1px solid rgba(255,255,255,0.24)',
                borderRadius: 16,
                padding: 6,
                zIndex: 12,
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: miniMapData.miniW,
                  height: miniMapData.miniH,
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#111827',
                }}
              >
                <img
                  src={imageSrc}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.82,
                    filter: 'saturate(0.9)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: miniMapData.rectLeft,
                    top: miniMapData.rectTop,
                    width: miniMapData.rectW,
                    height: miniMapData.rectH,
                    border: '2px solid #34d399',
                    boxShadow: '0 0 0 999px rgba(15, 23, 42, 0.26)',
                    borderRadius: 16,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Counter */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: isMobile ? 8 : 14,
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: '#fff',
            padding: isMobile ? '6px 10px' : '8px 12px',
            fontSize: isMobile ? 12 : 14,
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999,
            background: 'rgba(2,6,23,0.5)',
            zIndex: 30,
            backdropFilter: 'blur(4px)',
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
  showVipBadge = false,
  showNewBadge = false,
  showKapariranoBadge = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const touchStartRef = useRef<number>(0);
  const getImageUrl = useImageUrl();
  const isThumbnailPath = useCallback((path?: string | null) => {
    const normalized = (path || '').toLowerCase();
    return normalized.includes('/thumbs/') || /_sm\.(webp|jpg|jpeg|png)$/.test(normalized);
  }, []);
  const resolveMainImagePath = useCallback((img: Image) => {
    const originalPath = (img?.image || '').trim();
    const thumbPath = (img?.thumbnail || '').trim();
    if (!originalPath) return thumbPath;
    if (!thumbPath) return originalPath;
    if (isThumbnailPath(originalPath) && !isThumbnailPath(thumbPath)) {
      return thumbPath;
    }
    return originalPath;
  }, [isThumbnailPath]);
  const safeImages = useMemo(
    () =>
      (Array.isArray(images) ? images : []).filter(
        (img): img is Image => !!img && typeof img.image === 'string' && img.image.trim().length > 0
      ),
    [images]
  );

  // Lazy load images
  useGalleryLazyLoad(safeImages, currentIndex, getImageUrl);

  useEffect(() => {
    if (safeImages.length === 0 && currentIndex !== 0) {
      setCurrentIndex(0);
      return;
    }
    if (safeImages.length > 0 && currentIndex >= safeImages.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, safeImages.length]);

  const handlePrevious = useCallback(() => {
    if (safeImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  }, [safeImages.length]);

  const handleNext = useCallback(() => {
    if (safeImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  }, [safeImages.length]);

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

  if (safeImages.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: isMobile ? 300 : 500,
          background: '#f0f0f0',
          borderRadius: 16,
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

  const safeIndex = Math.min(Math.max(currentIndex, 0), safeImages.length - 1);
  const currentImage = safeImages[safeIndex];
  const currentImageSrc = getImageUrl(resolveMainImagePath(currentImage));

  const styles = useMemo(
    () => ({
      container: {
        width: '100%',
        background: '#fff',
        borderRadius: 16,
        overflow: 'visible',
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
        overflow: 'visible',
        borderRadius: 16,
        isolation: 'isolate' as const,
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
        overflow: 'hidden',
        borderRadius: 16,
        background: '#0f172a',
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
        borderRadius: 16,
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
      newBadge: {
        position: 'absolute' as const,
        top: 'auto',
        bottom: isMobile ? 8 : 12,
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
        zIndex: 19,
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
                src={currentImageSrc}
                title={title}
                isActive={true}
            />
          </div>

          {/* Promo Label */}
          {showTopBadge && <ListingPromoBadge type="top" zIndex={20} />}
          {showVipBadge && <ListingPromoBadge type="vip" zIndex={20} />}
          {showKapariranoBadge && (
            <KapariranoBadge size={isMobile ? 'sm' : 'default'} zIndex={20} />
          )}
          {showNewBadge && (
            <div
              style={{
                ...styles.newBadge,
                bottom: isMobile ? 8 : 12,
                left: isMobile ? 8 : 12,
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
                top: (isMobile ? 8 : 12) + (showTopBadge || showVipBadge ? (isMobile ? 56 : 54) : 0),
                maxWidth: isMobile ? 60 : 80,
                height: 'auto',
              }}
            />
          )}

          {/* Navigation Controls */}
          {safeImages.length > 1 && (
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
          {safeImages.length > 1 && (
            <div
              style={{
                ...styles.counter,
                left: (isMobile ? 8 : 12) + (showNewBadge ? (isMobile ? 58 : 66) : 0),
              }}
            >
              {safeIndex + 1} / {safeImages.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {safeImages.length > 0 && (
          <ThumbnailStrip
            images={safeImages}
            currentIndex={safeIndex}
            onSlideTo={setCurrentIndex}
            getImageUrl={getImageUrl}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Fullscreen Modal */}
      <FullscreenModal
        isOpen={isFullscreenOpen}
        imageSrc={currentImageSrc}
        title={title}
        currentIndex={safeIndex}
        totalImages={safeImages.length}
        onClose={() => setIsFullscreenOpen(false)}
        onPrevious={() => throttledPrevious()}
        onNext={() => throttledNext()}
        isMobile={isMobile}
        showTopBadge={showTopBadge}
        showVipBadge={showVipBadge}
        showNewBadge={showNewBadge}
        showKapariranoBadge={showKapariranoBadge}
      />
    </>
  );
};

export default RezonGallery;
