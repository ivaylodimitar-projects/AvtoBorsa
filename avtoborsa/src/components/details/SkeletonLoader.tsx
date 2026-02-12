import React from 'react';

interface SkeletonLoaderProps {
  isMobile: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ isMobile }) => {
  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '100vh',
      background: '#f5f5f5',
      paddingBottom: isMobile ? 100 : 0,
    },
    navbar: {
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      padding: isMobile ? '12px 12px' : '12px 16px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    },
    navbarContent: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    navbarSkeleton: {
      height: 20,
      background: '#e0e0e0',
      borderRadius: 4,
      flex: 1,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    content: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: isMobile ? '12px 12px' : '24px 16px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : window.innerWidth < 1024 ? '1fr' : '660px 340px',
      justifyContent: isMobile || window.innerWidth < 1024 ? 'stretch' : 'center',
      gap: isMobile ? 12 : 24,
    },
    mainContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: isMobile ? 12 : 24,
      minWidth: 0,
    },
    galleryContainer: {
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      aspectRatio: isMobile ? '1' : undefined,
      height: isMobile ? undefined : 500,
      minHeight: isMobile ? 300 : 500,
      background: '#e0e0e0',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    thumbnailContainer: {
      display: 'flex',
      gap: isMobile ? 6 : 8,
      padding: isMobile ? 8 : 12,
      background: '#fff',
      borderTop: '1px solid #e0e0e0',
    },
    thumbnail: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: 4,
      background: '#e0e0e0',
      flexShrink: 0,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    section: {
      background: '#fff',
      borderRadius: 8,
      padding: isMobile ? 16 : 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    sectionTitle: {
      height: 20,
      background: '#e0e0e0',
      borderRadius: 4,
      marginBottom: 16,
      width: '30%',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    sectionContent: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? 12 : 16,
    },
    specItem: {
      height: 80,
      background: '#e0e0e0',
      borderRadius: 4,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    sidebar: {
      display: isMobile ? 'none' : 'flex',
      flexDirection: 'column' as const,
      gap: 16,
    },
    sidebarItem: {
      background: '#fff',
      borderRadius: 8,
      padding: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      height: 200,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={styles.navbar}>
        <div style={styles.navbarContent}>
          <div style={{ width: 24, height: 24, background: '#e0e0e0', borderRadius: 4 }} />
          <div style={{ ...styles.navbarSkeleton, width: '60%' }} />
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.mainContent}>
          {/* Gallery Skeleton */}
          <div style={styles.galleryContainer} />

          {/* Thumbnails Skeleton */}
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={styles.thumbnailContainer}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={styles.thumbnail} />
              ))}
            </div>
          </div>

          {/* Title Section Skeleton */}
          <div style={styles.section}>
            <div style={{ ...styles.sectionTitle, width: '50%' }} />
            <div style={{ height: 16, background: '#e0e0e0', borderRadius: 4, width: '30%', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          </div>

          {/* Specs Grid Skeleton */}
          <div style={styles.section}>
            <div style={styles.sectionTitle} />
            <div style={styles.sectionContent}>
              {[...Array(isMobile ? 2 : 4)].map((_, i) => (
                <div key={i} style={styles.specItem} />
              ))}
            </div>
          </div>

          {/* Description Skeleton */}
          <div style={styles.section}>
            <div style={styles.sectionTitle} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ height: 16, background: '#e0e0e0', borderRadius: 4, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div style={styles.sidebar}>
          {[...Array(2)].map((_, i) => (
            <div key={i} style={styles.sidebarItem} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;

