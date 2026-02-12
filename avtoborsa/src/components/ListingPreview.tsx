import React from "react";
import { CheckCircle2, ImageOff } from "lucide-react";
import { formatFuelLabel, formatGearboxLabel } from "../utils/listingLabels";

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
  power?: string;
  coverImage?: string;
  description: string;
  completionPercentage: number;
  variant?: "full" | "compact";
  listingType?: "top" | "normal" | string;
  dealershipAbout?: string;
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
  power,
  coverImage,
  description,
  completionPercentage,
  variant = "full",
  listingType = "normal",
  dealershipAbout,
}) => {
  const isCompact = variant === "compact";

  const baseTitle = title?.trim() || `${brand} ${model}`.trim();
  const heading = year ? `${baseTitle} (${year})` : baseTitle;

  const formattedFuel = formatFuelLabel(fuel);
  const formattedGearbox = formatGearboxLabel(gearbox);
  const powerValue = Number(power);
  const powerLabel =
    Number.isFinite(powerValue) && powerValue > 0 ? `${powerValue} к.с.` : "";

  const specs = [
    { label: "Година", value: year },
    { label: "Мощност", value: powerLabel },
    { label: "Гориво", value: formattedFuel },
    { label: "Скоростна кутия", value: formattedGearbox },
    { label: "Пробег", value: mileage ? `${mileage} км` : "" },
    { label: "Град", value: city },
  ].filter((spec) => spec.value);

  const visibleSpecs = isCompact ? specs.slice(0, 3) : specs;

  const styles: Record<string, React.CSSProperties> = {
    container: {
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e2e8f0",
      overflow: "hidden",
      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
    },
    header: {
      background: "#f8fafc",
      padding: isCompact ? "12px 14px" : "16px",
      borderBottom: "1px solid #e2e8f0",
    },
    title: {
      fontSize: isCompact ? 14 : 16,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 8,
    },
    completionRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      color: "#64748b",
      marginTop: 6,
    },
    completionBar: {
      width: "100%",
      height: 6,
      background: "#e2e8f0",
      borderRadius: 999,
      overflow: "hidden",
      marginTop: 6,
    },
    completionFill: {
      height: "100%",
      background: "linear-gradient(90deg, #0f766e, #14b8a6)",
      width: `${completionPercentage}%`,
      transition: "width 0.3s ease",
    },
    content: {
      padding: isCompact ? "12px 14px" : "16px",
    },
    imageContainer: {
      width: "100%",
      height: isCompact ? 150 : 220,
      background: "#f1f5f9",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative" as const,
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
    },
    topBadge: {
      position: "absolute" as const,
      top: 12,
      left: 12,
      padding: "6px 10px",
      borderRadius: 999,
      background: "linear-gradient(135deg, #f59e0b, #f97316)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: "uppercase" as const,
      boxShadow: "0 6px 14px rgba(249, 115, 22, 0.35)",
    },
    noImage: {
      color: "#94a3b8",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: 8,
      fontSize: 12,
    },
    specs: {
      display: "grid",
      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
      gap: 10,
      marginBottom: 16,
    },
    spec: {
      padding: "10px 12px",
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #e2e8f0",
    },
    specLabel: {
      fontSize: 11,
      color: "#94a3b8",
      fontWeight: 700,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    specValue: {
      fontSize: 14,
      fontWeight: 600,
      color: "#0f172a",
    },
    price: {
      fontSize: isCompact ? 18 : 20,
      fontWeight: 800,
      color: "#fff",
      marginBottom: 14,
      padding: "10px",
      background: "#0f766e",
      borderRadius: 10,
      textAlign: "center" as const,
    },
    description: {
      fontSize: 13,
      color: "#475569",
      lineHeight: 1.5,
      padding: "12px",
      background: "#f8fafc",
      borderRadius: 10,
      maxHeight: isCompact ? 90 : 140,
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    footer: {
      padding: "12px 16px",
      background: "#f8fafc",
      borderTop: "1px solid #e2e8f0",
      fontSize: 12,
      color: "#94a3b8",
      textAlign: "center" as const,
    },
    dealershipSection: {
      padding: isCompact ? "12px 14px" : "16px",
      background: "#f8fafc",
      borderTop: "1px solid #e2e8f0",
      borderBottom: "1px solid #e2e8f0",
    },
    dealershipTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    dealershipAboutText: {
      fontSize: 13,
      color: "#475569",
      lineHeight: 1.6,
      whiteSpace: "pre-wrap" as const,
      wordWrap: "break-word" as const,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>{heading}</div>
        <div style={styles.completionBar}>
          <div style={styles.completionFill} />
        </div>
        <div style={styles.completionRow}>
          <CheckCircle2 size={14} />
          <span>Обявата е {completionPercentage}% завършена</span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.imageContainer}>
          {listingType === "top" && <div style={styles.topBadge}>Топ обява</div>}
          {coverImage ? (
            <img src={coverImage} alt="Cover" style={styles.image} />
          ) : (
            <div style={styles.noImage}>
              <ImageOff size={32} />
              <span>Няма снимка</span>
            </div>
          )}
        </div>

        <div style={styles.price}>€{price || "0"}</div>

        <div style={styles.specs}>
          {visibleSpecs.map((spec) => (
            <div key={spec.label} style={styles.spec}>
              <div style={styles.specLabel}>{spec.label}</div>
              <div style={styles.specValue}>{spec.value}</div>
            </div>
          ))}
        </div>

        {!isCompact && description && (
          <div style={styles.description}>{description}</div>
        )}
      </div>

      {!isCompact && dealershipAbout && (
        <div style={styles.dealershipSection}>
          <div style={styles.dealershipTitle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            За автокъщата
          </div>
          <div style={styles.dealershipAboutText}>{dealershipAbout}</div>
        </div>
      )}

      {!isCompact && (
        <div style={styles.footer}>
          Това е как ще изглежда вашата обява за потребителите
        </div>
      )}
    </div>
  );
};

export default ListingPreview;
