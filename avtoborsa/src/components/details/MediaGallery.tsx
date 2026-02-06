import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

interface Image {
  id: number;
  image: string;
}

interface MediaGalleryProps {
  images: Image[];
  title: string;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => ({
    container: {
      width: "100%" as const,
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden" as const,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    mainImageContainer: {
      position: "relative" as const,
      width: "100%",
      background: "#f0f0f0",
      paddingBottom: isMobile ? "100%" : "66.67%",
    },
    mainImage: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      display: "block",
    },
    controls: {
      position: "absolute" as const,
      top: "50%",
      transform: "translateY(-50%)",
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      border: "none",
      width: isMobile ? 36 : 44,
      height: isMobile ? 36 : 44,
      borderRadius: "50%",
      cursor: "pointer",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      transition: "background 0.2s",
      zIndex: 10,
    },
    prevButton: {
      left: isMobile ? 8 : 12,
    },
    nextButton: {
      right: isMobile ? 8 : 12,
    },
    fullscreenButton: {
      position: "absolute" as const,
      top: isMobile ? 8 : 12,
      right: isMobile ? 8 : 12,
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      border: "none",
      width: isMobile ? 36 : 40,
      height: isMobile ? 36 : 40,
      borderRadius: 4,
      cursor: "pointer",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      zIndex: 10,
    },
    counter: {
      position: "absolute" as const,
      bottom: isMobile ? 8 : 12,
      left: isMobile ? 8 : 12,
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      padding: isMobile ? "4px 8px" : "6px 12px",
      borderRadius: 4,
      fontSize: isMobile ? 11 : 12,
      fontWeight: 600,
      zIndex: 10,
    },
    thumbnailContainer: {
      display: "flex" as const,
      gap: isMobile ? 6 : 8,
      padding: isMobile ? 8 : 12,
      overflowX: "auto" as const,
      background: "#fafafa",
      borderTop: "1px solid #e0e0e0",
    },
    thumbnail: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: 4,
      cursor: "pointer",
      border: "2px solid transparent",
      overflow: "hidden" as const,
      flexShrink: 0,
      transition: "border-color 0.2s",
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    },
    lightbox: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.95)",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      zIndex: 1000,
    },
    lightboxImage: {
      maxWidth: "90vw",
      maxHeight: "90vh",
      objectFit: "contain" as const,
    },
    lightboxClose: {
      position: "absolute" as const,
      top: isMobile ? 12 : 20,
      right: isMobile ? 12 : 20,
      background: "rgba(255,255,255,0.2)",
      color: "#fff",
      border: "none",
      width: isMobile ? 36 : 44,
      height: isMobile ? 36 : 44,
      borderRadius: "50%",
      cursor: "pointer",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      zIndex: 1001,
    },
  }), [isMobile]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Handle both full URLs and relative paths
  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    return `http://localhost:8000${imagePath}`;
  };

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
        <div style={styles.mainImageContainer}>
          <img
            src={getImageUrl(currentImage.image)}
            alt={title}
            style={styles.mainImage}
            loading="eager"
          />

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                style={{ ...styles.controls, ...styles.prevButton } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
                aria-label="Previous image"
              >
                <ChevronLeft size={isMobile ? 20 : 24} />
              </button>
              <button
                onClick={goToNext}
                style={{ ...styles.controls, ...styles.nextButton } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
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

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={styles.thumbnailContainer as React.CSSProperties}>
            {images.map((img, index) => (
              <div
                key={img.id}
                style={{
                  ...styles.thumbnail,
                  borderColor: index === currentIndex ? "#0066cc" : "transparent",
                } as React.CSSProperties}
                onClick={() => goToSlide(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    goToSlide(index);
                  }
                }}
              >
                <img
                  src={getImageUrl(img.image)}
                  alt={`Thumbnail ${index + 1}`}
                  style={styles.thumbnailImage}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
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

export default MediaGallery;

