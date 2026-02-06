import React from "react";

interface ListingPreviewProps {
  title: string;
  brand: string;
  model: string;
  year: string;
  price: string;
  city: string;
  mileage: string;
  fuel: string;
  gearbox: string;
  coverImage?: string;
  description: string;
  completionPercentage: number;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
  title,
  brand,
  model,
  year,
  price,
  city,
  mileage,
  fuel,
  gearbox,
  coverImage,
  description,
  completionPercentage,
}) => {
  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: "#fff",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    header: {
      background: "#f9f9f9",
      padding: "16px",
      borderBottom: "1px solid #e0e0e0",
    },
    title: {
      fontSize: 16,
      fontWeight: 700,
      color: "#333",
      marginBottom: 8,
    },
    completionBar: {
      width: "100%",
      height: 6,
      background: "#e0e0e0",
      borderRadius: 3,
      overflow: "hidden",
    },
    completionFill: {
      height: "100%",
      background: "linear-gradient(90deg, #0066cc, #0052a3)",
      width: `${completionPercentage}%`,
      transition: "width 0.3s ease",
    },
    completionText: {
      fontSize: 12,
      color: "#666",
      marginTop: 6,
    },
    content: {
      padding: "16px",
    },
    imageContainer: {
      width: "100%",
      height: 200,
      background: "#f5f5f5",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    },
    noImage: {
      fontSize: 40,
      color: "#ccc",
    },
    specs: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 16,
    },
    spec: {
      padding: "12px",
      background: "#f9f9f9",
      borderRadius: 6,
      border: "1px solid #e0e0e0",
    },
    specLabel: {
      fontSize: 11,
      color: "#999",
      fontWeight: 600,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    specValue: {
      fontSize: 14,
      fontWeight: 600,
      color: "#333",
    },
    price: {
      fontSize: 20,
      fontWeight: 700,
      color: "#0066cc",
      marginBottom: 16,
      padding: "12px",
      background: "#f0f7ff",
      borderRadius: 6,
      textAlign: "center" as const,
    },
    description: {
      fontSize: 13,
      color: "#666",
      lineHeight: 1.5,
      padding: "12px",
      background: "#fafafa",
      borderRadius: 6,
      maxHeight: 120,
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    footer: {
      padding: "16px",
      background: "#f9f9f9",
      borderTop: "1px solid #e0e0e0",
      fontSize: 12,
      color: "#999",
      textAlign: "center" as const,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          {brand} {model} {year && `(${year})`}
        </div>
        <div style={styles.completionBar}>
          <div
            style={styles.completionFill}
          />
        </div>
        <div style={styles.completionText}>
          ✓ Обявата е {completionPercentage}% завършена
        </div>
      </div>

      <div style={styles.content}>
        {coverImage ? (
          <div style={styles.imageContainer}>
            <img src={coverImage} alt="Cover" style={styles.image} />
          </div>
        ) : (
          <div style={styles.imageContainer}>
            <div style={styles.noImage}>📸</div>
          </div>
        )}

        <div style={styles.price}>
          €{price || "0"}
        </div>

        <div style={styles.specs}>
          {year && (
            <div style={styles.spec}>
              <div style={styles.specLabel}>Година</div>
              <div style={styles.specValue}>{year}</div>
            </div>
          )}
          {mileage && (
            <div style={styles.spec}>
              <div style={styles.specLabel}>Пробег</div>
              <div style={styles.specValue}>{mileage} км</div>
            </div>
          )}
          {fuel && (
            <div style={styles.spec}>
              <div style={styles.specLabel}>Гориво</div>
              <div style={styles.specValue}>{fuel}</div>
            </div>
          )}
          {gearbox && (
            <div style={styles.spec}>
              <div style={styles.specLabel}>Скоростна кутия</div>
              <div style={styles.specValue}>{gearbox}</div>
            </div>
          )}
          {city && (
            <div style={styles.spec}>
              <div style={styles.specLabel}>Град</div>
              <div style={styles.specValue}>{city}</div>
            </div>
          )}
        </div>

        {description && (
          <div style={styles.description}>
            {description}
          </div>
        )}
      </div>

      <div style={styles.footer}>
        Това е как ще изглежда вашата обява за потребителите
      </div>
    </div>
  );
};

export default ListingPreview;

