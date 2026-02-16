import React from "react";
import { FiCheckCircle, FiHome, FiImage } from "react-icons/fi";
import { formatFuelLabel, formatGearboxLabel } from "../utils/listingLabels";
import topBadgeImage from "../assets/top_badge.png";
import vipBadgeImage from "../assets/vip_badge.jpg";

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
  listingType?: "top" | "vip" | "normal" | string;
  dealershipAbout?: string;
  imageCount?: number;
  priceRequired?: boolean;
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
  imageCount = 0,
  priceRequired = true,
}) => {
  const isCompact = variant === "compact";

  const baseTitle = title?.trim() || `${brand} ${model}`.trim();
  const heading = year ? `${baseTitle} (${year})` : baseTitle;

  const formattedFuel = formatFuelLabel(fuel);
  const formattedGearbox = formatGearboxLabel(gearbox);
  const powerValue = Number(power);
  const powerLabel =
    Number.isFinite(powerValue) && powerValue > 0 ? `${powerValue} к.с.` : "";
  const numericPrice = Number(price);
  const hasValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  const priceLabel = hasValidPrice
    ? `${new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 0 }).format(numericPrice)} EUR`
    : priceRequired
      ? "Добави цена"
      : "По договаряне";
  const mediaLabel = `${imageCount} ${imageCount === 1 ? "снимка" : "снимки"}`;

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
      overflow: "visible",
      boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
    },
    header: {
      background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
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
      overflow: "visible",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative" as const,
      isolation: "isolate" as const,
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      borderRadius: 12,
    },
    topBadge: {
      position: "absolute" as const,
      top: -8,
      left: -6,
      width: 64,
      height: 64,
      objectFit: "contain" as const,
      transform: "rotate(-9deg)",
      filter: "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))",
      pointerEvents: "none" as const,
      zIndex: 12,
    },
    vipBadge: {
      position: "absolute" as const,
      top: -8,
      left: -6,
      width: 64,
      height: 64,
      objectFit: "contain" as const,
      transform: "rotate(-9deg)",
      filter: "drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35))",
      pointerEvents: "none" as const,
      zIndex: 12,
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
      fontSize: isCompact ? 18 : 21,
      fontWeight: 800,
      color: "#fff",
      marginBottom: 10,
      padding: "12px 14px",
      background: "linear-gradient(135deg, #0f766e 0%, #0ea5a3 100%)",
      borderRadius: 12,
      textAlign: "center" as const,
    },
    priceMeta: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "8px 10px",
      marginBottom: 14,
      borderRadius: 10,
      border: "1px solid #e2e8f0",
      background: "#f8fafc",
      fontSize: 12,
      color: "#475569",
    },
    priceMetaItem: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 600,
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
          <FiCheckCircle size={14} />
          <span>Обявата е {completionPercentage}% завършена</span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.imageContainer}>
          {listingType === "top" && (
            <img
              src={topBadgeImage}
              alt="Топ обява"
              style={styles.topBadge}
              loading="lazy"
              decoding="async"
            />
          )}
          {listingType === "vip" && (
            <img
              src={vipBadgeImage}
              alt="VIP обява"
              style={styles.vipBadge}
              loading="lazy"
              decoding="async"
            />
          )}
          {coverImage ? (
            <img src={coverImage} alt="Cover" style={styles.image} />
          ) : (
            <div style={styles.noImage}>
              <FiImage size={32} />
              <span>Няма снимка</span>
            </div>
          )}
        </div>

        <div style={styles.price}>{priceLabel}</div>
        <div style={styles.priceMeta}>
          <span style={styles.priceMetaItem}>
            <FiImage size={14} />
            {mediaLabel}
          </span>
          <span style={styles.priceMetaItem}>
            <FiCheckCircle size={14} />
            {hasValidPrice || !priceRequired ? "Цена: ОК" : "Цена: липсва"}
          </span>
        </div>

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
            <FiHome size={16} />
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
