import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'lucide-react';

interface GalleryImage {
  id: number;
  image: string;
}

interface ThumbnailStripProps {
  images: GalleryImage[];
  currentIndex: number;
  onSlideTo: (index: number) => void;
  getImageUrl: (path: string) => string;
  isMobile: boolean;
}

type LazyThumbnailImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  borderRadius: number;
  rootRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
};

const LazyThumbnailImage = memo<LazyThumbnailImageProps>(
  ({ src, alt, width, height, borderRadius, rootRef, style }) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
      setShouldLoad(false);
    }, [src]);

    useEffect(() => {
      if (shouldLoad) return;
      const node = mountRef.current;
      if (!node) return;
      if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
        setShouldLoad(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              observer.disconnect();
            }
          });
        },
        {
          root: rootRef.current,
          rootMargin: '120px',
        }
      );
      observer.observe(node);

      return () => observer.disconnect();
    }, [rootRef, shouldLoad]);

    return (
      <div
        ref={mountRef}
        style={{
          width,
          height,
          borderRadius,
          overflow: 'hidden',
          background: '#0f172a',
        }}
      >
        {shouldLoad ? (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            draggable={false}
            style={style}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(110deg, rgba(148,163,184,0.3) 8%, rgba(148,163,184,0.18) 18%, rgba(148,163,184,0.3) 33%)',
              backgroundSize: '200% 100%',
              animation: 'thumb-shimmer 1.35s linear infinite',
            }}
          />
        )}
      </div>
    );
  }
);

LazyThumbnailImage.displayName = 'LazyThumbnailImage';

const ThumbnailStrip = memo<ThumbnailStripProps>(
  ({ images, currentIndex, onSlideTo, getImageUrl, isMobile }) => {
    const thumbSize = isMobile ? 64 : 80;
    const gap = isMobile ? 8 : 8;
    const minThumbnails = 5;
    const [visibleSlots, setVisibleSlots] = useState(minThumbnails);
    const [stretchToFill, setStretchToFill] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeThumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const updateSlots = () => {
        const container = containerRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth;
        if (!containerWidth) return;

        const slots = Math.max(minThumbnails, Math.floor((containerWidth + gap) / (thumbSize + gap)));
        const contentWidth = slots * thumbSize + (slots - 1) * gap;
        setVisibleSlots(slots);
        setStretchToFill(images.length <= slots && contentWidth < containerWidth - 1);
      };

      updateSlots();
      window.addEventListener('resize', updateSlots);
      return () => window.removeEventListener('resize', updateSlots);
    }, [gap, images.length, thumbSize]);

    const emptySlots = Math.max(0, visibleSlots - images.length);

    useEffect(() => {
      if (activeThumbRef.current && containerRef.current) {
        const container = containerRef.current;
        const activeThumb = activeThumbRef.current;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;
        const thumbLeft = activeThumb.offsetLeft;
        const thumbRight = thumbLeft + thumbSize;

        if (thumbLeft < scrollLeft) {
          container.scrollTo({
            left: thumbLeft - gap,
            behavior: 'smooth',
          });
        } else if (thumbRight > scrollLeft + containerWidth) {
          container.scrollTo({
            left: thumbRight - containerWidth + gap,
            behavior: 'smooth',
          });
        }
      }
    }, [currentIndex, gap, thumbSize]);

    const styles = useMemo(
      () => ({
        container: {
          display: 'flex',
          gap,
          justifyContent: stretchToFill ? 'space-between' : 'flex-start',
          padding: isMobile ? '10px 10px 12px' : '12px',
          background: '#fff',
          borderTop: '1px solid #e0e0e0',
          overflowX: 'auto' as const,
          overflowY: 'hidden' as const,
          WebkitOverflowScrolling: 'touch' as const,
          scrollBehavior: 'smooth' as const,
          scrollSnapType: 'x mandatory' as const,
          overscrollBehaviorX: 'contain' as const,
          willChange: 'transform',
          backfaceVisibility: 'hidden' as const,
          transform: 'translateZ(0)',
        } as React.CSSProperties,
        thumbnail: {
          width: thumbSize,
          height: thumbSize,
          borderRadius: 14,
          border: '2px solid transparent',
          background: '#0f172a',
          cursor: 'pointer',
          flexShrink: 0,
          objectFit: 'cover' as const,
          objectPosition: 'center' as const,
          transition: 'opacity 0.22s, border-color 0.22s, transform 0.22s',
          transform: 'translateZ(0) scale(1.02)',
          backfaceVisibility: 'hidden' as const,
          touchAction: 'manipulation' as const,
        } as React.CSSProperties,
        placeholder: {
          width: thumbSize,
          height: thumbSize,
          borderRadius: 14,
          border: '1px dashed #d1d5db',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          flexShrink: 0,
        } as React.CSSProperties,
      }),
      [gap, isMobile, stretchToFill, thumbSize]
    );

    return (
      <div style={styles.container} ref={containerRef}>
        <style>{`
          @keyframes thumb-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
        {images.map((img, idx) => (
          <div
            key={img.id}
            ref={idx === currentIndex ? activeThumbRef : null}
            onClick={() => onSlideTo(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSlideTo(idx);
              }
            }}
            style={{
              position: 'relative',
              cursor: 'pointer',
              scrollSnapAlign: 'start',
            }}
          >
            <LazyThumbnailImage
              src={getImageUrl(img.image)}
              alt={`Thumbnail ${idx + 1}`}
              width={thumbSize}
              height={thumbSize}
              borderRadius={14}
              rootRef={containerRef}
              style={{
                ...styles.thumbnail,
                opacity: idx === currentIndex ? 1 : 0.72,
                borderColor: idx === currentIndex ? '#0f766e' : 'transparent',
                transform: idx === currentIndex ? 'translateZ(0) scale(1.04)' : 'translateZ(0)',
              }}
            />
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div key={`placeholder-${idx}`} style={styles.placeholder} aria-hidden="true">
            <Image size={isMobile ? 18 : 20} />
          </div>
        ))}
      </div>
    );
  }
);

ThumbnailStrip.displayName = 'ThumbnailStrip';

export default ThumbnailStrip;
