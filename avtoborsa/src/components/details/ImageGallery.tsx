import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useThrottle } from '../../hooks/useThrottle';

interface Image {
  id: number;
  image: string;
}

interface ImageGalleryProps {
  images: Image[];
  title: string;
  isMobile: boolean;
}

// Memoized thumbnail component to prevent unnecessary re-renders
const ThumbnailStrip = memo<{
  images: Image[];
  currentIndex: number;
  onSelect: (index: number) => void;
  isMobile: boolean;
  getImageUrl: (path: string) => string;
  styles: any;
}>(({ images, currentIndex, onSelect, isMobile, getImageUrl, styles }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll thumbnail into view
  useEffect(() => {
    if (containerRef.current) {
      const activeThumb = containerRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  return (
    <div style={styles.thumbnailContainer} ref={containerRef}>
      {images.map((img, idx) => (
        <img
          key={img.id}
          src={getImageUrl(img.image)}
          alt={`Thumbnail ${idx + 1}`}
          data-active={idx === currentIndex}
          style={{
            ...styles.thumbnail,
            borderColor: idx === currentIndex ? '#0066cc' : 'transparent',
          } as React.CSSProperties}
          onClick={() => onSelect(idx)}
          loading="lazy"
        />
      ))}
    </div>
  );
});

ThumbnailStrip.displayName = 'ThumbnailStrip';

// Memoized main image component
const MainImage = memo<{
  image: Image;
  title: string;
  getImageUrl: (path: string) => string;
  styles: any;
}>(({ image, title, getImageUrl, styles }) => (
  <img
    src={getImageUrl(image.image)}
    alt={title}
    style={styles.image}
    loading="eager"
  />
));

MainImage.displayName = 'MainImage';

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title, isMobile }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartRef = useRef<number>(0);

  const getImageUrl = useCallback((imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `http://localhost:8000${imagePath}`;
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Throttle keyboard navigation to prevent rapid firing
  const throttledHandlePrevious = useThrottle(handlePrevious, 300);
  const throttledHandleNext = useThrottle(handleNext, 300);

  // Handle touch swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        throttledHandleNext();
      } else {
        throttledHandlePrevious();
      }
    }
  }, [throttledHandleNext, throttledHandlePrevious]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        throttledHandlePrevious();
      } else if (e.key === 'ArrowRight') {
        throttledHandleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [throttledHandlePrevious, throttledHandleNext]);

  const styles = useMemo(() => ({
    container: {
      width: '100%',
      background: '#fff',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } as React.CSSProperties,
    galleryWrapper: {
      width: '100%',
      paddingBottom: isMobile ? '100%' : '56.25%',
      position: 'relative',
      background: '#f0f0f0',
      minHeight: isMobile ? 300 : 400,
    } as React.CSSProperties,
    galleryInner: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      willChange: 'transform',
    } as React.CSSProperties,
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      willChange: 'opacity',
    } as React.CSSProperties,
    controls: {
      position: 'absolute',
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
      position: 'absolute',
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
      position: 'absolute',
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
    lightbox: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? 12 : 20,
    } as React.CSSProperties,
    lightboxImage: {
      maxWidth: '90vw',
      maxHeight: '90vh',
      objectFit: 'contain',
    } as React.CSSProperties,
    lightboxClose: {
      position: 'absolute',
      top: isMobile ? 12 : 20,
      right: isMobile ? 12 : 20,
      background: 'rgba(255,255,255,0.2)',
      color: '#fff',
      border: 'none',
      width: isMobile ? 36 : 44,
      height: isMobile ? 36 : 44,
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
      transition: 'background 0.2s, transform 0.2s',
    } as React.CSSProperties,
    thumbnailContainer: {
      display: 'flex',
      gap: isMobile ? 6 : 8,
      padding: isMobile ? 8 : 12,
      background: '#fff',
      borderTop: '1px solid #e0e0e0',
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth',
      willChange: 'transform',
    } as React.CSSProperties,
    thumbnail: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: 4,
      border: '2px solid transparent',
      cursor: 'pointer',
      flexShrink: 0,
      objectFit: 'cover',
      transition: 'border-color 0.2s, transform 0.2s',
      willChange: 'transform',
      transform: 'translate3d(0, 0, 0)',
    } as React.CSSProperties,
  }), [isMobile]);

  if (!images || images.length === 0) {
    return (
      <div style={{ ...styles.container, minHeight: isMobile ? 300 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        📷 Нема слики
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <>
      <div style={styles.container}>
        {/* Main Gallery */}
        <div
          style={styles.galleryWrapper}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div style={styles.galleryInner}>
            <MainImage
              image={currentImage}
              title={title}
              getImageUrl={getImageUrl}
              styles={styles}
            />
          </div>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => throttledHandlePrevious()}
                style={{ ...styles.controls, ...styles.prevButton } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
                aria-label="Previous image"
              >
                <ChevronLeft size={isMobile ? 20 : 24} />
              </button>
              <button
                onClick={() => throttledHandleNext()}
                style={{ ...styles.controls, ...styles.nextButton } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
                aria-label="Next image"
              >
                <ChevronRight size={isMobile ? 20 : 24} />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsLightboxOpen(true)}
            style={styles.fullscreenButton as React.CSSProperties}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.7)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.5)')}
            aria-label="View fullscreen"
          >
            <Maximize2 size={isMobile ? 16 : 20} />
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div style={styles.counter as React.CSSProperties}>
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnails - Using Memoized Component */}
        {images.length > 1 && (
          <ThumbnailStrip
            images={images}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            isMobile={isMobile}
            getImageUrl={getImageUrl}
            styles={styles}
          />
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div style={styles.lightbox as React.CSSProperties} onClick={() => setIsLightboxOpen(false)}>
          <button
            onClick={() => setIsLightboxOpen(false)}
            style={styles.lightboxClose as React.CSSProperties}
            aria-label="Close fullscreen"
          >
            <X size={isMobile ? 24 : 28} />
          </button>
          <img
            src={getImageUrl(currentImage.image)}
            alt={title}
            style={styles.lightboxImage as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
            loading="eager"
          />
        </div>
      )}
    </>
  );
};

export default ImageGallery;

