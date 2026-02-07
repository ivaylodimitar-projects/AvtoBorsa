import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Trash2,
  Edit2,
  ArchiveRestore,
  Heart,
  List,
  FileText,
  Lock,
  Inbox,
  Car,
  PackageOpen
} from "lucide-react";
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
      padding: "32px 20px",
      boxSizing: "border-box",
    },
    header: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "32px",
      borderRadius: 16,
      marginBottom: 32,
      boxShadow: "0 8px 24px rgba(102, 126, 234, 0.25)",
    },
    titleContainer: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 12,
    },
    titleIcon: {
      color: "#fff",
    },
    title: {
      fontSize: 32,
      fontWeight: 800,
      color: "#fff",
      margin: 0,
    },
    subtitle: {
      fontSize: 15,
      color: "rgba(255, 255, 255, 0.9)",
      margin: 0,
      fontWeight: 500,
    },
    emptyState: {
      background: "#fff",
      padding: "64px 32px",
      borderRadius: 16,
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    },
    emptyIconWrapper: {
      width: 80,
      height: 80,
      margin: "0 auto 24px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    emptyIcon: {
      color: "#fff",
    },
    emptyText: {
      fontSize: 20,
      fontWeight: 700,
      color: "#333",
      marginBottom: 12,
    },
    emptySubtext: {
      fontSize: 15,
      color: "#666",
      lineHeight: 1.6,
    },
    ctaButton: {
      marginTop: 24,
      padding: "14px 32px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
      transition: "all 0.2s",
    },
    tabsContainer: {
      display: "flex",
      gap: 12,
      marginBottom: 32,
      flexWrap: "wrap",
    },
    tab: {
      padding: "12px 24px",
      background: "#fff",
      color: "#666",
      border: "2px solid #e0e0e0",
      borderRadius: 12,
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    tabActive: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      border: "2px solid transparent",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    },
    tabBadge: {
      background: "rgba(255, 255, 255, 0.3)",
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
    },
    tabBadgeInactive: {
      background: "#f0f0f0",
      color: "#666",
      padding: "2px 8px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
    },
    listingsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: 24,
    },
    listingCard: {
      background: "#fff",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      transition: "all 0.3s ease",
      cursor: "pointer",
    },
    listingCardHover: {
      transform: "translateY(-8px)",
      boxShadow: "0 12px 32px rgba(102, 126, 234, 0.2)",
    },
    listingImage: {
      width: "100%",
      height: "220px",
      objectFit: "cover",
      background: "#f5f5f5",
    },
    listingContent: {
      padding: "20px",
    },
    listingTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: "#333",
      margin: "0 0 12px 0",
      lineHeight: 1.3,
    },
    listingPrice: {
      fontSize: 22,
      fontWeight: 800,
      color: "#667eea",
      margin: "12px 0",
    },
    listingDetails: {
      fontSize: 14,
      color: "#666",
      margin: "8px 0",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    listingActions: {
      display: "flex",
      gap: 8,
      marginTop: 16,
      paddingTop: 16,
      borderTop: "2px solid #f0f0f0",
      flexWrap: "wrap",
    },
    actionButton: {
      flex: 1,
      padding: "10px 16px",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minWidth: "fit-content",
    },
    editButton: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#fff",
      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
    },
    deleteButton: {
      background: "#f5f5f5",
      color: "#d32f2f",
      border: "2px solid #ffcdd2",
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
            <div style={styles.titleContainer}>
              <List size={32} style={styles.titleIcon} />
              <h1 style={styles.title}>Моите Обяви</h1>
            </div>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              <Lock size={40} style={styles.emptyIcon} />
            </div>
            <p style={styles.emptyText}>Трябва да си логнат</p>
            <p style={styles.emptySubtext}>
              Логни се, за да видиш твоите обяви
            </p>
            <a
              href="/auth"
              style={styles.ctaButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              <Lock size={18} />
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
            <div style={styles.titleContainer}>
              <List size={32} style={styles.titleIcon} />
              <h1 style={styles.title}>Моите Обяви</h1>
            </div>
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
            <div style={styles.titleContainer}>
              <List size={32} style={styles.titleIcon} />
              <h1 style={styles.title}>Моите Обяви</h1>
            </div>
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
            <div style={styles.titleContainer}>
              <List size={32} style={styles.titleIcon} />
              <h1 style={styles.title}>Моите Обяви</h1>
            </div>
            <p style={styles.subtitle}>Твоите публикувани автомобили</p>
          </div>

          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              <Inbox size={40} style={styles.emptyIcon} />
            </div>
            <p style={styles.emptyText}>Нямаш публикувани обяви</p>
            <p style={styles.emptySubtext}>
              Публикувай първата си обява и я управлявай от тук
            </p>
            <a
              href="/publish"
              style={styles.ctaButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              <FileText size={18} />
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
          <div style={styles.titleContainer}>
            <List size={32} style={styles.titleIcon} />
            <h1 style={styles.title}>Моите Обяви</h1>
          </div>
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
        <div style={styles.tabsContainer}>
          {[
            { id: "active", label: "Активни", Icon: List, count: activeListings.length },
            { id: "archived", label: "Архивирани", Icon: Archive, count: archivedListings.length },
            { id: "drafts", label: "Чернови", Icon: FileText, count: draftListings.length },
            { id: "liked", label: "Любими", Icon: Heart, count: likedListings.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#667eea";
                    e.currentTarget.style.color = "#667eea";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#666";
                  }
                }}
              >
                <tab.Icon size={18} />
                {tab.label}
                <span style={isActive ? styles.tabBadge : styles.tabBadgeInactive}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {currentListings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconWrapper}>
              {activeTab === "active" && <Inbox size={40} style={styles.emptyIcon} />}
              {activeTab === "archived" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "drafts" && <FileText size={40} style={styles.emptyIcon} />}
              {activeTab === "liked" && <Heart size={40} style={styles.emptyIcon} />}
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
              <a
                href="/publish"
                style={styles.ctaButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }}
              >
                <FileText size={18} />
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
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  <Car size={60} color="#fff" />
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
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                        }}
                      >
                        <Edit2 size={14} />
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
                          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                        }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#d97706";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (actionLoading !== listing.id) {
                            e.currentTarget.style.background = "#f59e0b";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 158, 11, 0.3)";
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

