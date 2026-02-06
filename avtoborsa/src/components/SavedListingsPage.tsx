import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CarListing {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year_from: number;
  price: number;
  mileage: number;
  fuel_display: string;
  gearbox_display: string;
  power: number;
  city: string;
  image_url?: string;
  is_favorited?: boolean;
  description?: string;
}

interface Favorite {
  id: number;
  listing: CarListing;
  created_at: string;
}

const SavedListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("authToken");

        if (!token) {
          setError("Please log in to view your saved listings");
          setIsLoading(false);
          return;
        }

        const response = await fetch("http://localhost:8000/api/my-favorites/", {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch favorites");
        const data = await response.json();
        setFavorites(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching favorites:", err);
        setError("Failed to load your saved listings");
        setFavorites([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  // Remove from favorites
  const removeFavorite = async (listingId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/unfavorite/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (response.ok) {
        setFavorites(favorites.filter(fav => fav.listing.id !== listingId));
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      width: "100%",
      boxSizing: "border-box",
    },
    container: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "20px",
      boxSizing: "border-box",
    },
    header: {
      background: "#fff",
      padding: "20px",
      borderRadius: 8,
      marginBottom: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    title: {
      fontSize: 28,
      fontWeight: 700,
      color: "#333",
      margin: 0,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: "#666",
      margin: 0,
    },
    results: { display: "flex", flexDirection: "column" as const, gap: 12 },
    item: { background: "#fff", borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", cursor: "pointer", transition: "box-shadow 0.2s" },
    itemPhoto: { width: 200, height: 150, background: "#e0e0e0", flexShrink: 0, position: "relative" as const, overflow: "hidden" },
    itemImage: { width: "100%", height: "100%", objectFit: "cover" },
    itemPhotoOverlay: { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 8, background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)" },
    favoriteButton: { background: "#ff4458", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", padding: 0 },
    itemText: { flex: 1, padding: 16, display: "flex", flexDirection: "column" as const, justifyContent: "space-between" },
    itemHeader: { marginBottom: 12 },
    itemTitle: { fontSize: 18, fontWeight: 600, color: "#0066cc", marginBottom: 8, textDecoration: "none" },
    itemPrice: { fontSize: 20, fontWeight: 700, color: "#333", marginBottom: 4 },
    itemPriceSmall: { fontSize: 12, color: "#999" },
    itemParams: { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#666", marginBottom: 12 },
    itemDescription: { fontSize: 13, color: "#666", lineHeight: 1.4, marginBottom: 12, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" },
    itemLocation: { fontSize: 12, color: "#999" },
    emptyState: {
      background: "#fff",
      padding: "40px 20px",
      borderRadius: 8,
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: "#666",
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: "#999",
    },
    loading: { textAlign: "center", padding: 60, background: "#fff", borderRadius: 4 },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>❤️ Запазени обяви</h1>
          <p style={styles.subtitle}>Твоите любими автомобили</p>
        </div>

        {isLoading ? (
          <div style={styles.loading}>
            <p>Зареждане на запазени обяви...</p>
          </div>
        ) : error ? (
          <div style={styles.emptyState}>
            <h3>{error}</h3>
          </div>
        ) : favorites.length > 0 ? (
          <div style={styles.results}>
            {favorites.map((favorite) => {
              const listing = favorite.listing;
              return (
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
                      <>
                        <img src={listing.image_url} alt={`${listing.brand} ${listing.model}`} style={styles.itemImage} />
                        <div style={styles.itemPhotoOverlay}>
                          <button
                            style={styles.favoriteButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(listing.id);
                            }}
                            title="Премахни от бележника"
                          >
                            <Heart size={20} color="#fff" fill="#fff" />
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
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={styles.emptyText}>Нямаш запазени обяви</p>
            <p style={styles.emptySubtext}>
              Запази интересуващи те обяви, за да ги видиш по-късно
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedListingsPage;

