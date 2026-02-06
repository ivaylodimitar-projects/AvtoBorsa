import React, { memo, useEffect, useRef, useMemo } from 'react';

interface Image {
  id: number;
  image: string;
}

interface ThumbnailStripProps {
  images: Image[];
  currentIndex: number;
  onSlideTo: (index: number) => void;
  getImageUrl: (path: string) => string;
  isMobile: boolean;
}

const ThumbnailStrip = memo<ThumbnailStripProps>(
  ({ images, currentIndex, onSlideTo, getImageUrl, isMobile }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeThumbRef = useRef<HTMLDivElement>(null);

    // Auto-scroll active thumbnail into view
    useEffect(() => {
      if (activeThumbRef.current && containerRef.current) {
        const container = containerRef.current;
        const activeThumb = activeThumbRef.current;

        // Calculate scroll position to center active thumbnail
        const thumbWidth = isMobile ? 60 : 80;
        const gap = isMobile ? 6 : 8;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        const thumbLeft = activeThumb.offsetLeft;
        const thumbRight = thumbLeft + thumbWidth;

        // Scroll if thumbnail is outside visible area
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
    }, [currentIndex, isMobile]);

    const styles = useMemo(
      () => ({
        container: {
          display: 'flex',
          gap: isMobile ? 6 : 8,
          padding: isMobile ? 8 : 12,
          background: '#fff',
          borderTop: '1px solid #e0e0e0',
          overflowX: 'auto' as const,
          overflowY: 'hidden' as const,
          WebkitOverflowScrolling: 'touch' as const,
          scrollBehavior: 'smooth' as const,
          willChange: 'transform',
          backfaceVisibility: 'hidden' as const,
          transform: 'translateZ(0)',
        } as React.CSSProperties,
        thumbnail: {
          width: isMobile ? 60 : 80,
          height: isMobile ? 60 : 80,
          borderRadius: 4,
          border: '2px solid transparent',
          cursor: 'pointer',
          flexShrink: 0,
          objectFit: 'cover' as const,
          transition: 'opacity 0.25s, border-color 0.25s, transform 0.25s',
          willChange: 'transform',
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden' as const,
        } as React.CSSProperties,
      }),
      [isMobile]
    );

    return (
      <div style={styles.container} ref={containerRef}>
        {images.map((img, idx) => (
          <div
            key={img.id}
            ref={idx === currentIndex ? activeThumbRef : null}
            onClick={() => onSlideTo(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSlideTo(idx);
              }
            }}
            style={{
              position: 'relative',
              cursor: 'pointer',
            }}
          >
            <img
              src={getImageUrl(img.image)}
              alt={`Thumbnail ${idx + 1}`}
              loading="lazy"
              style={{
                ...styles.thumbnail,
                opacity: idx === currentIndex ? 1 : 0.7,
                borderColor: idx === currentIndex ? '#0066cc' : 'transparent',
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    );
  }
);

ThumbnailStrip.displayName = 'ThumbnailStrip';

export default ThumbnailStrip;

