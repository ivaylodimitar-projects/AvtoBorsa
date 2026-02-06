import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

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
  description?: string;
  category?: string;
  category_display?: string;
  condition?: string;
  condition_display?: string;
};

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Results are already filtered by backend, no need for client-side filtering
  const results = listings;

  // Build search criteria display
  const searchCriteriaDisplay = useMemo(() => {
    const criteria: string[] = [];
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const yearFrom = searchParams.get("yearFrom");
    const yearTo = searchParams.get("yearTo");
    const priceFrom = searchParams.get("priceFrom");
    const priceTo = searchParams.get("priceTo");
    const fuel = searchParams.get("fuel");
    const gearbox = searchParams.get("gearbox");

    if (brand) criteria.push(`Марка: ${brand}`);
    if (model) criteria.push(`Модел: ${model}`);
    if (yearFrom || yearTo) {
      const yearRange = `${yearFrom || "всички"} - ${yearTo || "всички"}`;
      criteria.push(`Година: ${yearRange}`);
    }
    if (priceFrom || priceTo) {
      const priceRange = `€${priceFrom || "0"} - €${priceTo || "∞"}`;
      criteria.push(`Цена: ${priceRange}`);
    }
    if (fuel) criteria.push(`Гориво: ${fuel}`);
    if (gearbox) criteria.push(`Скоростна кутия: ${gearbox}`);

    return criteria;
  }, [searchParams]);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", paddingTop: 20 },
    container: { width: "100%", maxWidth: 1000, margin: "0 auto", padding: "0 20px" },
    header: { marginBottom: 24, background: "#fff", padding: 20, borderRadius: 4 },
    title: { fontSize: 28, fontWeight: 700, color: "#333", margin: "0 0 12px 0" },
    criteria: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 },
    criteriaTag: { background: "#f0f0f0", padding: "6px 12px", borderRadius: 4, fontSize: 13, color: "#555" },
    results: { display: "flex", flexDirection: "column", gap: 12 },
    item: { background: "#fff", borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", cursor: "pointer", transition: "box-shadow 0.2s" },
    itemPhoto: { width: 200, height: 150, background: "#e0e0e0", flexShrink: 0, position: "relative" as const, overflow: "hidden" },
    itemImage: { width: "100%", height: "100%", objectFit: "cover" },
    itemText: { flex: 1, padding: 16, display: "flex", flexDirection: "column" as const, justifyContent: "space-between" },
    itemHeader: { marginBottom: 12 },
    itemTitle: { fontSize: 18, fontWeight: 600, color: "#0066cc", marginBottom: 8, textDecoration: "none" },
    itemPrice: { fontSize: 20, fontWeight: 700, color: "#333", marginBottom: 4 },
    itemPriceSmall: { fontSize: 12, color: "#999" },
    itemParams: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#666", marginBottom: 12 },
    itemParam: { display: "flex", alignItems: "center", gap: 4 },
    itemDescription: { fontSize: 13, color: "#666", lineHeight: 1.4, marginBottom: 12, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" },
    itemLocation: { fontSize: 12, color: "#999" },
    empty: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 4 },
    loading: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 4 },
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
          <p style={{ fontSize: 14, color: "#666", margin: "12px 0 0 0" }}>
            Намерени обяви: <strong>{results.length}</strong>
          </p>
        </div>

        {isLoading ? (
          <div style={styles.loading}>
            <p>Зареждане на обяви...</p>
          </div>
        ) : error ? (
          <div style={styles.empty}>
            <h3>Грешка при зареждане</h3>
            <p>{error}</p>
          </div>
        ) : results.length > 0 ? (
          <div style={styles.results} className="search-results">
            {results.map((listing) => (
              <div
                key={listing.id}
                style={styles.item}
                onClick={() => navigate(`/details/${listing.slug}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }}
              >
                <div style={styles.itemPhoto}>
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={`${listing.brand} ${listing.model}`} style={styles.itemImage} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                      Снимка
                    </div>
                  )}
                </div>
                <div style={styles.itemText}>
                  <div>
                    <div style={styles.itemHeader}>
                      <a href={`/details/${listing.slug}`} style={styles.itemTitle} onClick={(e) => e.stopPropagation()}>
                        {listing.brand} {listing.model}
                      </a>
                      <div style={styles.itemPrice}>
                        € {listing.price.toLocaleString("bg-BG")}
                        <div style={styles.itemPriceSmall}>
                          {(listing.price * 1.95).toLocaleString("bg-BG", { maximumFractionDigits: 2 })} лв.
                        </div>
                      </div>
                    </div>
                    <div style={styles.itemParams}>
                      <span>{listing.year_from} г.</span>
                      <span>•</span>
                      <span>{listing.mileage.toLocaleString("bg-BG")} км</span>
                      <span>•</span>
                      <span>{listing.fuel_display}</span>
                      <span>•</span>
                      <span>{listing.power} к.с.</span>
                      <span>•</span>
                      <span>{listing.gearbox_display}</span>
                    </div>
                    {listing.description && (
                      <div style={styles.itemDescription}>{listing.description}</div>
                    )}
                  </div>
                  <div style={styles.itemLocation}>
                    📍 {listing.city}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>
            <h3>Няма намерени обяви</h3>
            <p>Опитайте да промените филтрите или се върнете на начална страница</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

