import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
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
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      willChange: 'opacity',
      backfaceVisibility: 'hidden',
      transform: 'translateZ(0)',
    }}
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
  }) => {
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
        >
          <h2 style={{ color: '#fff', margin: 0, fontSize: isMobile ? 14 : 16 }}>
            {title}
          </h2>
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
          >
            <X size={24} />
          </button>
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
          <img
            src={getImageUrl(image.image)}
            alt={title}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
          />

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
          minHeight: isMobile ? 300 : 400,
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      } as React.CSSProperties,
      carouselWrapper: {
        position: 'relative' as const,
        width: '100%',
        paddingBottom: isMobile ? '100%' : '56.25%',
        background: '#f0f0f0',
        minHeight: isMobile ? 300 : 400,
        overflow: 'hidden',
        backfaceVisibility: 'hidden' as const,
        transform: 'translateZ(0)',
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
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        border: 'none',
        width: isMobile ? 36 : 44,
        height: isMobile ? 36 : 44,
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'background 0.2s, transform 0.2s',
      } as React.CSSProperties,
      prevButton: {
        left: isMobile ? 8 : 12,
      } as React.CSSProperties,
      nextButton: {
        right: isMobile ? 8 : 12,
      } as React.CSSProperties,
      fullscreenButton: {
        position: 'absolute' as const,
        top: isMobile ? 8 : 12,
        right: isMobile ? 8 : 12,
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        border: 'none',
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: 4,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'background 0.2s, transform 0.2s',
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
          {promoLabel && (
            <img
              src={promoLabel}
              alt="Promo"
              style={{
                ...styles.promoLabel,
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')
                }
                aria-label="Previous image"
              >
                <ChevronLeft size={isMobile ? 20 : 24} />
              </button>
              <button
                onClick={() => throttledNext()}
                style={{ ...styles.controls, ...styles.nextButton }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')
                }
                aria-label="Next image"
              >
                <ChevronRight size={isMobile ? 20 : 24} />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreenOpen(true)}
            style={styles.fullscreenButton}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')
            }
            aria-label="View fullscreen"
          >
            <Maximize2 size={isMobile ? 16 : 20} />
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
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
      />
    </>
  );
};

export default RezonGallery;

