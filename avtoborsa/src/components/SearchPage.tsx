import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  Clock,
  Calendar,
  Fuel,
  Gauge,
  Zap,
  Settings,
  User,
  Building2,
  BadgeCheck,
  Tag,
  CheckCircle2,
  HelpCircle,
  ImageOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";

type CarListing = {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year_from: number;
  price: number;
  mileage: number;
  fuel: string;
  fuel_display: string;
  gearbox: string;
  gearbox_display: string;
  power: number;
  city: string;
  image_url?: string;
  images?: Array<{
    id: number;
    image: string;
    order?: number;
    is_cover?: boolean;
  }>;
  is_active: boolean;
  is_draft: boolean;
  is_archived: boolean;
  is_favorited?: boolean;
  description?: string;
  category?: string;
  category_display?: string;
  condition?: string;
  condition_display?: string;
  created_at: string;
  seller_name?: string;
  seller_type?: string;
  listing_type?: "top" | "normal" | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
};

const isTopListing = (listing: CarListing) => {
  if (listing.is_top || listing.is_top_listing || listing.is_top_ad) return true;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (["top", "top_ad", "top_listing", "topad", "toplisting"].includes(rawType)) {
    return true;
  }
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("топ");
};

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteStates, setFavoriteStates] = useState<Record<number, boolean>>({});
  const getImageUrl = useImageUrl();

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) {
      return date.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
    } else if (diffDays > 0) {
      return `Публикувана преди ${diffDays} ${diffDays === 1 ? "ден" : "дни"}`;
    } else if (diffHours > 0) {
      return `Публикувана преди ${diffHours} ${diffHours === 1 ? "час" : "часа"}`;
    } else if (diffMins > 0) {
      return `Публикувана преди ${diffMins} ${diffMins === 1 ? "минута" : "минути"}`;
    } else {
      return "Публикувана току-що";
    }
  };

  // Fetch listings from backend with search parameters
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsLoading(true);

        // Build query string from search parameters
        const queryParams = new URLSearchParams();

        // Add all search parameters to the query
        searchParams.forEach((value, key) => {
          queryParams.append(key, value);
        });

        const url = `http://localhost:8000/api/listings/?${queryParams.toString()}`;
        console.log("Fetching from URL:", url);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch listings");
        const data = await response.json();

        // Handle both paginated and direct array responses
        const listingsData = Array.isArray(data) ? data : (data.results || []);
        setListings(listingsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching listings:", err);
        setError("Failed to load listings");
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [searchParams]);

  // Toggle favorite status
  const toggleFavorite = async (e: React.MouseEvent, listingId: number, isFavorited: boolean) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const endpoint = isFavorited ? "unfavorite" : "favorite";
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/${endpoint}/`, {
        method: isFavorited ? "DELETE" : "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (response.ok) {
        // Update the listing's favorite status
        setListings(listings.map(listing =>
          listing.id === listingId
            ? { ...listing, is_favorited: !isFavorited }
            : listing
        ));
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  // Results are already filtered by backend, but we keep "top" listings first
  const results = useMemo(() => {
    const topListings = listings.filter(isTopListing);
    const normalListings = listings.filter((listing) => !isTopListing(listing));
    return [...topListings, ...normalListings];
  }, [listings]);

  // Build search criteria display
  const searchCriteriaDisplay = useMemo(() => {
    const criteria: string[] = [];

    // Basic filters
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const category = searchParams.get("category");
    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    const maxPrice = searchParams.get("maxPrice");
    const priceFrom = searchParams.get("priceFrom");
    const priceTo = searchParams.get("priceTo");
    const fuel = searchParams.get("fuel");
    const gearbox = searchParams.get("gearbox");

    // Detailed filters
    const mileageFrom = searchParams.get("mileageFrom");
    const mileageTo = searchParams.get("mileageTo");
    const engineFrom = searchParams.get("engineFrom");
    const engineTo = searchParams.get("engineTo");
    const region = searchParams.get("region");
    const color = searchParams.get("color");
    const condition = searchParams.get("condition");

    if (brand) criteria.push(`Марка: ${brand}`);
    if (model) criteria.push(`Модел: ${model}`);
    if (category) criteria.push(`Тип: ${category}`);

    if (yearFrom || yearTo) {
      const yearRange = `${yearFrom || "всички"} - ${yearTo || "всички"}`;
      criteria.push(`Година: ${yearRange}`);
    }

    if (maxPrice) {
      criteria.push(`Цена: до €${maxPrice}`);
    } else if (priceFrom || priceTo) {
      const priceRange = `€${priceFrom || "0"} - €${priceTo || "∞"}`;
      criteria.push(`Цена: ${priceRange}`);
    }

    if (mileageFrom || mileageTo) {
      const mileageRange = `${mileageFrom || "0"} - ${mileageTo || "∞"}`;
      criteria.push(`Пробег: ${mileageRange} км`);
    }

    if (engineFrom || engineTo) {
      const engineRange = `${engineFrom || "0"} - ${engineTo || "∞"}`;
      criteria.push(`Мощност: ${engineRange} к.с.`);
    }

    if (region) criteria.push(`Регион: ${region}`);
    if (fuel) criteria.push(`Гориво: ${fuel}`);
    if (gearbox) criteria.push(`Скоростна кутия: ${gearbox}`);
    if (color) criteria.push(`Цвят: ${color}`);
    if (condition) criteria.push(`Състояние: ${condition}`);

    return criteria;
  }, [searchParams]);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f4f6f9", width: "100%", paddingTop: 20, paddingBottom: 40 },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 20px" },
    header: { marginBottom: 24, background: "#fff", padding: 24, borderRadius: 10, boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)" },
    title: { fontSize: 28, fontWeight: 700, color: "#0f172a", margin: "0 0 16px 0" },
    criteria: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 },
    criteriaTag: { background: "#f1f5f9", padding: "8px 14px", borderRadius: 20, fontSize: 13, color: "#475569", fontWeight: 600 },
    results: { display: "flex", flexDirection: "column", gap: 16 },
    item: { background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e7edf3", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)", display: "flex", cursor: "pointer", transition: "all 0.3s", position: "relative" as const },
    itemPhoto: { width: 280, flexShrink: 0, display: "flex", flexDirection: "column" as const, background: "#fff" },
    photoMain: { height: 210, position: "relative" as const, overflow: "hidden", background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5f5 100%)" },
    itemImage: { width: "100%", height: "100%", objectFit: "cover" },
    itemPhotoOverlay: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 12, background: "linear-gradient(to top, rgba(15, 23, 42, 0.45), transparent)", zIndex: 1 },
    topBadge: { position: "absolute" as const, top: 12, left: 12, background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, boxShadow: "0 6px 14px rgba(249, 115, 22, 0.35)", zIndex: 2 },
    favoriteButton: { background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", padding: 0, boxShadow: "0 6px 14px rgba(15, 23, 42, 0.18)" },
    photoPlaceholder: { width: "100%", height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 6, color: "#94a3b8", fontSize: 13, fontWeight: 600 },
    thumbStrip: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "10px", background: "#fff", borderTop: "1px solid #e2e8f0" },
    thumb: { width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" },
    thumbImage: { width: "100%", height: "100%", objectFit: "cover" },
    thumbPlaceholder: { color: "#94a3b8" },
    thumbMore: { background: "#e2e8f0", color: "#334155", fontSize: 12, fontWeight: 700 },
    itemText: { flex: 1, display: "flex", alignItems: "stretch", minHeight: 210 },
    itemMain: { flex: 1, padding: 20, display: "flex", flexDirection: "column" as const, gap: 12 },
    itemHeader: { marginBottom: 4 },
    itemTitle: { fontSize: 20, fontWeight: 700, color: "#0f5ec7", marginBottom: 10, textDecoration: "none", lineHeight: 1.3 },
    itemPrice: { fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
    itemPriceSmall: { fontSize: 13, color: "#64748b", fontWeight: 500 },
    itemParams: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13, color: "#475569", alignItems: "center" },
    itemParam: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999, fontSize: 13, color: "#475569", fontWeight: 600 },
    paramIcon: { color: "#64748b" },
    itemDescription: { fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 0, maxHeight: 68, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any },
    itemSide: { width: 240, padding: 16, background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", borderLeft: "1px solid #e2e8f0", display: "flex", flexDirection: "column" as const, gap: 12 },
    sideSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
    sideTitle: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.6, textTransform: "uppercase" as const },
    sideDivider: { height: 1, background: "#e2e8f0", width: "100%" },
    metaRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", fontWeight: 600 },
    metaIcon: { color: "#64748b" },
    metaMuted: { color: "#94a3b8", fontWeight: 600 },
    empty: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
    loading: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Резултати от търсене</h1>
          {searchCriteriaDisplay.length > 0 && (
            <div style={styles.criteria}>
              {searchCriteriaDisplay.map((criterion, idx) => (
                <span key={idx} style={styles.criteriaTag}>{criterion}</span>
              ))}
            </div>
          )}
          <p style={{ fontSize: 15, color: "#555", margin: "16px 0 0 0", fontWeight: 500 }}>
            Намерени обяви: <strong style={{ color: "#0066cc" }}>{results.length}</strong>
          </p>
        </div>

        {isLoading ? (
          <div style={styles.loading}>
            <p style={{ fontSize: 16, color: "#666", margin: 0 }}>Зареждане на обяви...</p>
          </div>
        ) : error ? (
          <div style={styles.empty}>
            <h3 style={{ fontSize: 20, color: "#333", marginBottom: 12 }}>Грешка при зареждане</h3>
            <p style={{ fontSize: 14, color: "#666", margin: 0 }}>{error}</p>
          </div>
        ) : results.length > 0 ? (
          <div style={styles.results} className="search-results">
            {results.map((listing) => {
              const categoryLabel = listing.category_display || listing.category;
              const conditionLabel = listing.condition_display || listing.condition;
              const sellerLabel = listing.seller_name || "Не е посочено";
              const locationLabel = listing.city || "Не е посочено";
              const sellerTypeLabel =
                listing.seller_type === "business"
                  ? "Търговец"
                  : listing.seller_type === "private"
                    ? "Частно лице"
                    : "Не е посочено";
              const SellerTypeIcon =
                listing.seller_type === "business"
                  ? Building2
                  : listing.seller_type === "private"
                    ? BadgeCheck
                    : HelpCircle;
              const images = listing.images || [];
              const mainImagePath = listing.image_url || images[0]?.image;
              const mainImageUrl = mainImagePath ? getImageUrl(mainImagePath) : "";
              const extraImages = images.slice(1);
              const maxThumbs = 3;
              const thumbItems: Array<{ type: "image" | "more" | "placeholder"; src?: string; label?: string }> = [];

              if (extraImages.length > maxThumbs) {
                extraImages.slice(0, maxThumbs - 1).forEach((img) => {
                  thumbItems.push({ type: "image", src: getImageUrl(img.image) });
                });
                thumbItems.push({ type: "more", label: `+${extraImages.length - (maxThumbs - 1)}` });
              } else {
                extraImages.forEach((img) => {
                  thumbItems.push({ type: "image", src: getImageUrl(img.image) });
                });
              }

              while (thumbItems.length < maxThumbs) {
                thumbItems.push({ type: "placeholder" });
              }

              return (
                <div
                  key={listing.id}
                  style={styles.item}
                  onClick={() => navigate(`/details/${listing.slug}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 10px 28px rgba(15, 23, 42, 0.16)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={styles.itemPhoto}>
                    <div style={styles.photoMain}>
                      {isTopListing(listing) && (
                        <div style={styles.topBadge}>Топ обява</div>
                      )}
                      {mainImageUrl ? (
                        <>
                          <img src={mainImageUrl} alt={`${listing.brand} ${listing.model}`} style={styles.itemImage} />
                          <div style={styles.itemPhotoOverlay}>
                            <button
                              style={{
                                ...styles.favoriteButton,
                                background: listing.is_favorited ? "#ff4458" : "rgba(255,255,255,0.95)",
                              }}
                              onClick={(e) => toggleFavorite(e, listing.id, listing.is_favorited || false)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              title={listing.is_favorited ? "Премахни от бележника" : "Добави в бележника"}
                            >
                              <Heart
                                size={22}
                                color={listing.is_favorited ? "#fff" : "#ff4458"}
                                fill={listing.is_favorited ? "#fff" : "none"}
                              />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={styles.photoPlaceholder}>
                          <ImageOff size={26} />
                          <span>Снимка</span>
                        </div>
                      )}
                    </div>
                    <div style={styles.thumbStrip}>
                      {thumbItems.map((thumb, index) => {
                        if (thumb.type === "image" && thumb.src) {
                          return (
                            <div key={`thumb-${listing.id}-${index}`} style={styles.thumb}>
                              <img src={thumb.src} alt={`Допълнителна снимка ${index + 1}`} style={styles.thumbImage} />
                            </div>
                          );
                        }

                        if (thumb.type === "more") {
                          return (
                            <div key={`thumb-more-${listing.id}-${index}`} style={{ ...styles.thumb, ...styles.thumbMore }}>
                              {thumb.label}
                            </div>
                          );
                        }

                        return (
                          <div key={`thumb-placeholder-${listing.id}-${index}`} style={styles.thumb}>
                            <ImageOff size={16} style={styles.thumbPlaceholder} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={styles.itemText}>
                    <div style={styles.itemMain}>
                      <div style={styles.itemHeader}>
                        <a href={`/details/${listing.slug}`} style={styles.itemTitle} onClick={(e) => e.stopPropagation()}>
                          {listing.brand} {listing.model}
                        </a>
                        <div style={styles.itemPrice}>
                          € {listing.price.toLocaleString("bg-BG")}
                          <div style={styles.itemPriceSmall}>
                            {(listing.price * 1.96).toLocaleString("bg-BG", { maximumFractionDigits: 2 })} лв.
                          </div>
                        </div>
                      </div>
                      <div style={styles.itemParams}>
                        <span style={styles.itemParam}>
                          <Calendar size={16} style={styles.paramIcon} />
                          {listing.year_from} г.
                        </span>
                        <span style={styles.itemParam}>
                          <Gauge size={16} style={styles.paramIcon} />
                          {listing.mileage.toLocaleString("bg-BG")} км
                        </span>
                        <span style={styles.itemParam}>
                          <Fuel size={16} style={styles.paramIcon} />
                          {listing.fuel_display}
                        </span>
                        <span style={styles.itemParam}>
                          <Zap size={16} style={styles.paramIcon} />
                          {listing.power} к.с.
                        </span>
                        <span style={styles.itemParam}>
                          <Settings size={16} style={styles.paramIcon} />
                          {listing.gearbox_display}
                        </span>
                      </div>
                      {listing.description && (
                        <div style={styles.itemDescription}>{listing.description}</div>
                      )}
                    </div>
                    <div style={styles.itemSide}>
                      <div style={styles.sideSection}>
                        <div style={styles.sideTitle}>Локация</div>
                        <div style={styles.metaRow}>
                          <MapPin size={16} style={styles.metaIcon} />
                          <span style={!listing.city ? styles.metaMuted : undefined}>{locationLabel}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <Clock size={16} style={styles.metaIcon} />
                          <span>{getRelativeTime(listing.created_at)}</span>
                        </div>
                      </div>
                      <div style={styles.sideDivider} />
                      <div style={styles.sideSection}>
                        <div style={styles.sideTitle}>Продавач</div>
                        <div style={styles.metaRow}>
                          <User size={16} style={styles.metaIcon} />
                          <span style={!listing.seller_name ? styles.metaMuted : undefined}>{sellerLabel}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <SellerTypeIcon size={16} style={styles.metaIcon} />
                          <span style={listing.seller_type ? undefined : styles.metaMuted}>{sellerTypeLabel}</span>
                        </div>
                      </div>
                      <div style={styles.sideDivider} />
                      <div style={styles.sideSection}>
                        <div style={styles.sideTitle}>Детайли</div>
                        <div style={styles.metaRow}>
                          <Tag size={16} style={styles.metaIcon} />
                          <span style={!categoryLabel ? styles.metaMuted : undefined}>{categoryLabel || "Не е посочено"}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <CheckCircle2 size={16} style={styles.metaIcon} />
                          <span style={!conditionLabel ? styles.metaMuted : undefined}>{conditionLabel || "Не е посочено"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.empty}>
            <h3 style={{ fontSize: 20, color: "#333", marginBottom: 12 }}>Няма намерени обяви</h3>
            <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Опитайте да промените филтрите или се върнете на начална страница</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

