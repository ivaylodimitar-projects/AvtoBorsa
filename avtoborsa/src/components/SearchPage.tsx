import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", paddingTop: 20, paddingBottom: 40 },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 20px" },
    header: { marginBottom: 24, background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
    title: { fontSize: 28, fontWeight: 700, color: "#333", margin: "0 0 16px 0" },
    criteria: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 },
    criteriaTag: { background: "#f0f0f0", padding: "8px 14px", borderRadius: 20, fontSize: 13, color: "#555", fontWeight: 500 },
    results: { display: "flex", flexDirection: "column", gap: 16 },
    item: { background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", cursor: "pointer", transition: "all 0.3s", position: "relative" as const },
    itemPhoto: { width: 280, height: 210, background: "linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%)", flexShrink: 0, position: "relative" as const, overflow: "hidden" },
    itemImage: { width: "100%", height: "100%", objectFit: "cover" },
    itemPhotoOverlay: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 12, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)", zIndex: 1 },
    topBadge: { position: "absolute" as const, top: 12, left: 12, background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, boxShadow: "0 6px 14px rgba(249, 115, 22, 0.35)", zIndex: 2 },
    favoriteButton: { background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", padding: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
    itemText: { flex: 1, padding: 20, display: "flex", flexDirection: "column" as const, justifyContent: "space-between", position: "relative" as const },
    itemHeader: { marginBottom: 16, paddingTop: 36 },
    itemTitle: { fontSize: 20, fontWeight: 600, color: "#0066cc", marginBottom: 10, textDecoration: "none", lineHeight: 1.3 },
    itemPrice: { fontSize: 24, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 },
    itemPriceSmall: { fontSize: 13, color: "#888", fontWeight: 400 },
    itemParams: { display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: "#666", marginBottom: 14, alignItems: "center" },
    itemParam: { display: "flex", alignItems: "center", gap: 4 },
    itemDescription: { fontSize: 14, color: "#555", lineHeight: 1.6, marginBottom: 14, maxHeight: 68, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as any },
    itemFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f0f0f0" },
    itemLocation: { fontSize: 13, color: "#666", display: "flex", alignItems: "center", gap: 6 },
    itemDate: { fontSize: 12, color: "#999", fontStyle: "italic" },
    sellerInfo: { position: "absolute" as const, top: 16, right: 16, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.95)", padding: "8px 12px", borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" },
    sellerAvatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 },
    sellerName: { fontSize: 13, color: "#333", fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
    sellerBadge: { fontSize: 10, color: "#fff", background: "#4CAF50", padding: "2px 6px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase" as const },
    empty: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
    loading: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.08)" },
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
            {results.map((listing) => (
              <div
                key={listing.id}
                style={styles.item}
                onClick={() => navigate(`/details/${listing.slug}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={styles.itemPhoto}>
                  {isTopListing(listing) && (
                    <div style={styles.topBadge}>Топ обява</div>
                  )}
                  {listing.image_url ? (
                    <>
                      <img src={listing.image_url} alt={`${listing.brand} ${listing.model}`} style={styles.itemImage} />
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
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                      Снимка
                    </div>
                  )}
                </div>
                <div style={styles.itemText}>
                  {/* Seller info in top-right corner */}
                  <div style={styles.sellerInfo} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.sellerAvatar}>
                      {listing.seller_name ? listing.seller_name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <div style={styles.sellerName}>
                        {listing.seller_name || "Unknown"}
                      </div>
                      {listing.seller_type === "business" && (
                        <div style={styles.sellerBadge}>Търговец</div>
                      )}
                    </div>
                  </div>

                  <div>
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
                      <span style={{ fontWeight: 500 }}>{listing.year_from} г.</span>
                      <span style={{ color: "#ddd" }}>•</span>
                      <span>{listing.mileage.toLocaleString("bg-BG")} км</span>
                      <span style={{ color: "#ddd" }}>•</span>
                      <span>{listing.fuel_display}</span>
                      <span style={{ color: "#ddd" }}>•</span>
                      <span>{listing.power} к.с.</span>
                      <span style={{ color: "#ddd" }}>•</span>
                      <span>{listing.gearbox_display}</span>
                    </div>
                    {listing.description && (
                      <div style={styles.itemDescription}>{listing.description}</div>
                    )}
                  </div>
                  <div style={styles.itemFooter}>
                    <div style={styles.itemLocation}>
                      <span>📍</span>
                      <span>{listing.city}</span>
                    </div>
                    <div style={styles.itemDate}>
                      {getRelativeTime(listing.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

