import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Trash2, Edit2, ArchiveRestore, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface CarListing {
  id: number;
  slug: string;
  main_category: string;
  category: string;
  brand: string;
  model: string;
  year_from: number;
  month: number;
  vin: string;
  price: number;
  location_country: string;
  location_region: string;
  city: string;
  title: string;
  fuel: string;
  gearbox: string;
  mileage: number;
  color: string;
  condition: string;
  power: number;
  displacement: number;
  euro_standard: string;
  description: string;
  images: Array<{ id: number; image: string }>;
  image_url?: string;
  created_at: string;
  is_archived: boolean;
  is_draft: boolean;
}

interface Favorite {
  id: number;
  listing: CarListing;
  created_at: string;
}

type TabType = "active" | "archived" | "drafts" | "liked";

const MyAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeListings, setActiveListings] = useState<CarListing[]>([]);
  const [archivedListings, setArchivedListings] = useState<CarListing[]>([]);
  const [draftListings, setDraftListings] = useState<CarListing[]>([]);
  const [likedListings, setLikedListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchUserListings = async () => {
      try {
        const token = localStorage.getItem("authToken");

        // Fetch all listing types in parallel
        const [activeRes, archivedRes, draftsRes, favoritesRes] = await Promise.all([
          fetch("http://localhost:8000/api/my-listings/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-archived/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-drafts/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-favorites/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!activeRes.ok || !archivedRes.ok || !draftsRes.ok || !favoritesRes.ok) {
          throw new Error("Failed to fetch listings");
        }

        const activeData = await activeRes.json();
        const archivedData = await archivedRes.json();
        const draftsData = await draftsRes.json();
        const favoritesData = await favoritesRes.json();

        setActiveListings(activeData);
        setArchivedListings(archivedData);
        setDraftListings(draftsData);
        // Extract listings from favorites (which have a nested listing property)
        setLikedListings(favoritesData.map((fav: Favorite) => fav.listing));
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An error occurred";
        setError(errorMsg);
        setActiveListings([]);
        setArchivedListings([]);
        setDraftListings([]);
        setLikedListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserListings();
  }, [isAuthenticated]);

  // Toast notification effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handleArchive = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/archive/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) throw new Error("Failed to archive listing");

      // Optimistic UI update
      const listing = activeListings.find((l) => l.id === listingId);
      setActiveListings((prev) => prev.filter((l) => l.id !== listingId));
      if (listing) {
        setArchivedListings((prev) => [listing, ...prev]);
      }
      showToast("Обявата е архивирана успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to archive listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchive = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/unarchive/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) throw new Error("Failed to unarchive listing");

      // Optimistic UI update
      const listing = archivedListings.find((l) => l.id === listingId);
      setArchivedListings((prev) => prev.filter((l) => l.id !== listingId));
      if (listing) {
        setActiveListings((prev) => [listing, ...prev]);
      }
      showToast("Обявата е активирана успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to unarchive listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deleteConfirm !== listingId) {
      setDeleteConfirm(listingId);
      return;
    }

    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete listing");

      // Optimistic UI update - remove from all lists
      setActiveListings((prev) => prev.filter((l) => l.id !== listingId));
      setArchivedListings((prev) => prev.filter((l) => l.id !== listingId));
      setDraftListings((prev) => prev.filter((l) => l.id !== listingId));
      setLikedListings((prev) => prev.filter((l) => l.id !== listingId));
      setDeleteConfirm(null);
      showToast("Обявата е изтрита успешно!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete listing";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromFavorites = async (listingId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/unfavorite/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) throw new Error("Failed to remove from favorites");

      // Optimistic UI update
      setLikedListings((prev) => prev.filter((l) => l.id !== listingId));
      showToast("Премахнато от любими!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to remove from favorites";
      showToast(errorMsg, "error");
    } finally {
      setActionLoading(null);
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
    ctaButton: {
      marginTop: 16,
      padding: "12px 24px",
      background: "#0066cc",
      color: "#fff",
      border: "none",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-block",
    },
    listingsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "20px",
    },
    listingCard: {
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    },
    listingCardHover: {
      transform: "translateY(-4px)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    },
    listingImage: {
      width: "100%",
      height: "200px",
      objectFit: "cover",
      background: "#f0f0f0",
    },
    listingContent: {
      padding: "16px",
    },
    listingTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: "#333",
      margin: "0 0 8px 0",
    },
    listingPrice: {
      fontSize: 18,
      fontWeight: 700,
      color: "#0066cc",
      margin: "8px 0",
    },
    listingDetails: {
      fontSize: 13,
      color: "#666",
      margin: "4px 0",
    },
    listingActions: {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
      paddingTop: "12px",
      borderTop: "1px solid #eee",
    },
    actionButton: {
      flex: 1,
      padding: "8px 12px",
      border: "none",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    editButton: {
      background: "#0066cc",
      color: "#fff",
    },
    deleteButton: {
      background: "#f0f0f0",
      color: "#d32f2f",
    },
    loadingState: {
      background: "#fff",
      padding: "40px 20px",
      borderRadius: 8,
      textAlign: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    errorState: {
      background: "#fff",
      padding: "20px",
      borderRadius: 8,
      border: "1px solid #d32f2f",
      color: "#d32f2f",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>📋 Моите Обяви</h1>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🔐</div>
            <p style={styles.emptyText}>Трябва да си логнат</p>
            <p style={styles.emptySubtext}>
              Логни се, за да видиш твоите обяви
            </p>
            <a href="/auth" style={styles.ctaButton}>
              Логни се
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>📋 Моите Обяви</h1>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>
          <div style={styles.loadingState}>
            <p>Зареждане...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>📋 Моите Обяви</h1>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>
          <div style={styles.errorState}>
            <p>Грешка: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current listings based on active tab
  const getCurrentListings = () => {
    switch (activeTab) {
      case "active":
        return activeListings;
      case "archived":
        return archivedListings;
      case "drafts":
        return draftListings;
      case "liked":
        return likedListings;
      default:
        return [];
    }
  };

  const currentListings = getCurrentListings();
  const totalListings = activeListings.length + archivedListings.length + draftListings.length + likedListings.length;

  if (totalListings === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>📋 Моите Обяви</h1>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>

          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={styles.emptyText}>Нямаш публикувани обяви</p>
            <p style={styles.emptySubtext}>
              Публикувай първата си обява и я управлявай от тук
            </p>
            <a href="/publish" style={styles.ctaButton}>
              Публикувай обява
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📋 Моите Обяви</h1>
          <p style={styles.subtitle}>
            Твоите публикувани автомобили ({totalListings})
          </p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            background: toast.type === "success" ? "#4caf50" : "#f44336",
            color: "#fff",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            animation: "slideIn 0.3s ease-in-out",
          }}>
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          borderBottom: "2px solid #e0e0e0",
          overflowX: "auto",
        }}>
          {[
            { id: "active", label: "Активни", icon: "📋", count: activeListings.length },
            { id: "archived", label: "Архивирани", icon: "📦", count: archivedListings.length },
            { id: "drafts", label: "Чернови", icon: "📝", count: draftListings.length },
            { id: "liked", label: "Любими", icon: "❤️", count: likedListings.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                padding: "12px 20px",
                background: activeTab === tab.id ? "#0066cc" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#666",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #0066cc" : "none",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#0066cc";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = "#666";
                }
              }}
            >
              {tab.icon} {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {currentListings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              {activeTab === "active" && "📭"}
              {activeTab === "archived" && "📦"}
              {activeTab === "drafts" && "📝"}
              {activeTab === "liked" && "❤️"}
            </div>
            <p style={styles.emptyText}>
              {activeTab === "active" && "Нямаш активни обяви"}
              {activeTab === "archived" && "Нямаш архивирани обяви"}
              {activeTab === "drafts" && "Нямаш чернови обяви"}
              {activeTab === "liked" && "Нямаш любими обяви"}
            </p>
            <p style={styles.emptySubtext}>
              {activeTab === "active" && "Публикувай нова обява, за да я видиш тук"}
              {activeTab === "archived" && "Архивирани обяви ще се появят тук"}
              {activeTab === "drafts" && "Начни да пишеш нова обява"}
              {activeTab === "liked" && "Добави обяви в любими"}
            </p>
            {activeTab === "active" && (
              <a href="/publish" style={styles.ctaButton}>
                Публикувай обява
              </a>
            )}
          </div>
        ) : (
          <div style={styles.listingsGrid}>
            {currentListings.map((listing) => (
            <div
              key={listing.id}
              style={styles.listingCard}
              onClick={() => navigate(`/details/${listing.slug}`)}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, styles.listingCardHover);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.08)";
              }}
            >
              {listing.image_url ? (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  style={styles.listingImage}
                />
              ) : (
                <div
                  style={{
                    ...styles.listingImage,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f0f0f0",
                    fontSize: 48,
                  }}
                >
                  🚗
                </div>
              )}

              <div style={styles.listingContent}>
                <h3 style={styles.listingTitle}>
                  {listing.brand} {listing.model}
                </h3>
                <div style={styles.listingPrice}>
                  {listing.price.toLocaleString("bg-BG")} лв.
                </div>

                <div style={styles.listingDetails}>
                  <strong>Година:</strong> {listing.year_from}
                </div>
                <div style={styles.listingDetails}>
                  <strong>Град:</strong> {listing.city}
                </div>
                <div style={styles.listingDetails}>
                  <strong>Гориво:</strong> {listing.fuel}
                </div>
                <div style={styles.listingDetails}>
                  <strong>Пробег:</strong>{" "}
                  {listing.mileage.toLocaleString("bg-BG")} км
                </div>

                <div style={styles.listingActions}>
                  {/* Active Tab Actions: Edit, Archive, Delete */}
                  {activeTab === "active" && (
                    <>
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#0052a3";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#0066cc";
                        }}
                      >
                        <Edit2 size={14} style={{ marginRight: "4px" }} />
                        Редактирай
                      </button>

                      <button
                        onClick={(e) => handleArchive(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: "#f59e0b",
                          color: "#fff",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#d97706";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#f59e0b";
                          }
                        }}
                      >
                        <Archive size={14} />
                        {actionLoading === listing.id ? "..." : "Архивирай"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Archived Tab Actions: Unarchive, Delete */}
                  {activeTab === "archived" && (
                    <>
                      <button
                        onClick={(e) => handleUnarchive(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: "#4caf50",
                          color: "#fff",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#388e3c";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#4caf50";
                          }
                        }}
                      >
                        <ArchiveRestore size={14} />
                        {actionLoading === listing.id ? "..." : "Върни в активни"}
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Drafts Tab Actions: Continue Editing, Delete */}
                  {activeTab === "drafts" && (
                    <>
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#0052a3";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#0066cc";
                        }}
                      >
                        <Edit2 size={14} style={{ marginRight: "4px" }} />
                        Продължи редакция
                      </button>

                      <button
                        onClick={(e) => handleDelete(listing.id, e)}
                        disabled={actionLoading === listing.id}
                        style={{
                          ...styles.actionButton,
                          background: deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0",
                          color: deleteConfirm === listing.id ? "#fff" : "#d32f2f",
                          opacity: actionLoading === listing.id ? 0.6 : 1,
                          cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          fontWeight: deleteConfirm === listing.id ? 700 : 600,
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#b71c1c" : "#e0e0e0";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = deleteConfirm === listing.id ? "#d32f2f" : "#f0f0f0";
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        {deleteConfirm === listing.id ? "Потвърди" : "Изтрий"}
                      </button>
                    </>
                  )}

                  {/* Liked Tab Actions: Remove from Favorites */}
                  {activeTab === "liked" && (
                    <button
                      onClick={(e) => handleRemoveFromFavorites(listing.id, e)}
                      disabled={actionLoading === listing.id}
                      style={{
                        ...styles.actionButton,
                        background: "#e91e63",
                        color: "#fff",
                        opacity: actionLoading === listing.id ? 0.6 : 1,
                        cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                      onMouseEnter={(e) => {
                        if (actionLoading !== listing.id) {
                          e.currentTarget.style.background = "#c2185b";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (actionLoading !== listing.id) {
                          e.currentTarget.style.background = "#e91e63";
                        }
                      }}
                    >
                      <Heart size={14} />
                      {actionLoading === listing.id ? "..." : "Премахни от любими"}
                    </button>
                  )}
                </div>

                {deleteConfirm === listing.id && (
                  <div style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "#ffebee",
                    border: "1px solid #ffcdd2",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#d32f2f",
                  }}>
                    Сигурни ли сте, че искате да изтриете тази обява?
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAdsPage;

