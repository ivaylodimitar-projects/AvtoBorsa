import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CAR_FEATURES } from '../../constants/carFeatures';

interface EquipmentSectionProps {
  features: string[];
}

const EquipmentSection: React.FC<EquipmentSectionProps> = ({ features }) => {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    безопасност: true,
    комфорт: true,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    },
    categoryHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '12px 16px' : '16px 20px',
      background: '#f9f9f9',
      borderBottom: '1px solid #e0e0e0',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background 0.2s',
    },
    categoryTitle: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: 700,
      color: '#1a1a1a',
      textTransform: 'capitalize',
      wordBreak: 'break-word',
    },
    categoryContent: {
      padding: isMobile ? '12px 16px' : '16px 20px',
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : window.innerWidth < 1024 ? 'repeat(auto-fill, minmax(180px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: isMobile ? 10 : 12,
    },
    featureItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: isMobile ? '6px 0' : '8px 0',
    },
    featureCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      background: '#0066cc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    featureLabel: {
      fontSize: isMobile ? 12 : 13,
      color: '#333',
      fontWeight: 500,
      wordBreak: 'break-word',
    },
    emptyMessage: {
      padding: isMobile ? '12px 16px' : '16px 20px',
      color: '#999',
      fontSize: isMobile ? 12 : 13,
      fontStyle: 'italic',
    },
  };

  return (
    <div style={styles.container}>
      {Object.entries(CAR_FEATURES).map(([category, categoryFeatures]) => {
        const categoryFeaturesList = features.filter((f) =>
          categoryFeatures.includes(f)
        );
        const isExpanded = expandedCategories[category];

        return (
          <div key={category}>
            <div
              style={styles.categoryHeader}
              onClick={() => toggleCategory(category)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#f0f0f0')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#f9f9f9')
              }
            >
              <span style={styles.categoryTitle}>{category}</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#666',
                    fontWeight: 600,
                  }}
                >
                  {categoryFeaturesList.length}
                </span>
                <ChevronDown
                  size={20}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    color: '#666',
                  }}
                />
              </div>
            </div>

            {isExpanded && (
              <div style={styles.categoryContent}>
                {categoryFeaturesList.length > 0 ? (
                  categoryFeaturesList.map((feature) => (
                    <div key={feature} style={styles.featureItem}>
                      <div style={styles.featureCheckbox}>
                        <Check size={16} color="#fff" />
                      </div>
                      <span style={styles.featureLabel}>{feature}</span>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyMessage}>
                    Няма характеристики в тази категория
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EquipmentSection;
