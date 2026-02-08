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
  PackageOpen,
  Clock,
  X
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
  listing_type?: "top" | "normal" | string;
  listing_type_display?: string;
}

interface Favorite {
  id: number;
  listing: CarListing;
  created_at: string;
}

type TabType = "active" | "archived" | "drafts" | "liked" | "top" | "expired";
type ListingType = "normal" | "top";

const MyAdsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeListings, setActiveListings] = useState<CarListing[]>([]);
  const [archivedListings, setArchivedListings] = useState<CarListing[]>([]);
  const [draftListings, setDraftListings] = useState<CarListing[]>([]);
  const [expiredListings, setExpiredListings] = useState<CarListing[]>([]);
  const [likedListings, setLikedListings] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [listingTypeModal, setListingTypeModal] = useState<{
    isOpen: boolean;
    listingId: number | null;
    listingTitle: string;
    mode: "republish" | "promote";
    selectedType: ListingType;
  }>({
    isOpen: false,
    listingId: null,
    listingTitle: "",
    mode: "republish",
    selectedType: "normal",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchUserListings = async () => {
      try {
        const token = localStorage.getItem("authToken");

        // Fetch all listing types in parallel
        const [activeRes, archivedRes, draftsRes, expiredRes, favoritesRes] = await Promise.all([
          fetch("http://localhost:8000/api/my-listings/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-archived/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-drafts/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-expired/", {
            headers: { Authorization: `Token ${token}` },
          }),
          fetch("http://localhost:8000/api/my-favorites/", {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        if (!activeRes.ok || !archivedRes.ok || !draftsRes.ok || !expiredRes.ok || !favoritesRes.ok) {
          throw new Error("Failed to fetch listings");
        }

        const activeData = await activeRes.json();
        const archivedData = await archivedRes.json();
        const draftsData = await draftsRes.json();
        const expiredData = await expiredRes.json();
        const favoritesData = await favoritesRes.json();

        setActiveListings(activeData);
        setArchivedListings(archivedData);
        setDraftListings(draftsData);
        setExpiredListings(expiredData);
        // Extract listings from favorites (which have a nested listing property)
        setLikedListings(favoritesData.map((fav: Favorite) => fav.listing));
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An error occurred";
        setError(errorMsg);
        setActiveListings([]);
        setArchivedListings([]);
        setDraftListings([]);
        setExpiredListings([]);
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

  const openListingTypeModal = (
    listing: CarListing,
    mode: "republish" | "promote",
    defaultType: ListingType
  ) => {
    setListingTypeModal({
      isOpen: true,
      listingId: listing.id,
      listingTitle: `${listing.brand} ${listing.model}`,
      mode,
      selectedType: defaultType,
    });
  };

  const closeListingTypeModal = () => {
    setListingTypeModal((prev) => ({
      ...prev,
      isOpen: false,
      listingId: null,
    }));
  };

  const submitRepublish = async (listingId: number, listingType: ListingType) => {
    setActionLoading(listingId);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/republish/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ listing_type: listingType }),
      });

      if (!response.ok) {
        let errorMessage = "Неуспешно повторно публикуване на обявата";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const updatedListing = await response.json();

      setExpiredListings((prev) => prev.filter((l) => l.id !== listingId));
      setActiveListings((prev) => [
        updatedListing,
        ...prev.filter((l) => l.id !== listingId),
      ]);
      showToast(
        listingType === "top"
          ? "Обявата е публикувана отново като ТОП!"
          : "Обявата е публикувана отново като нормална."
      );
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Грешка при повторно публикуване";
      showToast(errorMsg, "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const submitListingTypeUpdate = async (listingId: number, listingType: ListingType) => {
    setActionLoading(listingId);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Не сте логнати. Моля, влезте отново.");

      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/listing-type/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ listing_type: listingType }),
      });

      if (!response.ok) {
        let errorMessage = "Неуспешна промяна на типа на обявата";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      const updatedListing = await response.json();
      setActiveListings((prev) =>
        prev.map((l) => (l.id === listingId ? updatedListing : l))
      );
      showToast(
        listingType === "top"
          ? "Обявата е промотирана до ТОП!"
          : "Типът на обявата е обновен."
      );
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Грешка при промяна на типа";
      showToast(errorMsg, "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleListingTypeConfirm = async () => {
    if (!listingTypeModal.listingId) return;
    const { listingId, selectedType, mode } = listingTypeModal;
    const success =
      mode === "republish"
        ? await submitRepublish(listingId, selectedType)
        : await submitListingTypeUpdate(listingId, selectedType);
    if (success) {
      closeListingTypeModal();
    }
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

      if (!response.ok) {
        let errorMessage = "Failed to unarchive listing";
        try {
          const errorData = await response.json();
          if (errorData?.detail) errorMessage = errorData.detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

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
      setExpiredListings((prev) => prev.filter((l) => l.id !== listingId));
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
    background: "#f7f7f7", // По-светъл фон за страницата
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
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)", // По-мек и не толкова ярък син
    padding: "32px",
    borderRadius: 16,
    marginBottom: 32,
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)", // Лека сянка
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  titleIcon: {
    color: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
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
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)", // Същото синьо като за заглавието
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
    color: "#333", // По-тъмно сиво за текста
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#777", // Леко по-светло сиво
    lineHeight: 1.6,
  },
  ctaButton: {
    marginTop: 24,
    padding: "14px 32px",
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)", // По-мек син цвят за бутона
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
  addButton: {
    padding: "12px 20px",
    background: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.2s",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.15)",
    backdropFilter: "blur(6px)",
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
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)",
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
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: "24px",
  },
  modal: {
    width: "min(560px, 92vw)",
    background: "#fff",
    borderRadius: 18,
    padding: "22px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    margin: "6px 0 0 0",
    lineHeight: 1.5,
  },
  modalClose: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    padding: 4,
  },
  listingTypeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  listingTypeCard: {
    position: "relative" as const,
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    padding: "16px",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
  },
  listingTypeCardSelected: {
    borderColor: "#60a5fa",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.16)",
  },
  listingTypeTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 6px",
  },
  listingTypeDesc: {
    fontSize: 12,
    color: "#64748b",
    margin: 0,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  modalButton: {
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  modalButtonSecondary: {
    background: "#f1f5f9",
    color: "#475569",
    borderColor: "#e2e8f0",
  },
  modalButtonPrimary: {
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)",
    color: "#fff",
    boxShadow: "0 6px 16px rgba(102, 126, 234, 0.3)",
  },
  modalHint: {
    fontSize: 12,
    color: "#94a3b8",
    margin: 0,
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
    position: "relative",
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
    zIndex: 2,
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
    background: "linear-gradient(135deg, #667eea 0%, #4f5f89 100%)",
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

  const renderHeader = (subtitleText: string, showAddButton: boolean) => (
    <div style={styles.header}>
      <div style={styles.headerRow}>
        <div style={styles.titleContainer}>
          <List size={32} style={styles.titleIcon} />
          <h1 style={styles.title}>Моите Обяви</h1>
        </div>
        {showAddButton && (
          <button
            type="button"
            style={styles.addButton}
            onClick={() => navigate("/publish")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 22px rgba(15, 23, 42, 0.2)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 23, 42, 0.15)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
            }}
          >
            <FileText size={18} />
            Добави обява
          </button>
        )}
      </div>
      <p style={styles.subtitle}>{subtitleText}</p>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {renderHeader("Твоите публикувани автомобили", false)}
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
          {renderHeader("Твоите публикувани автомобили", true)}
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
          {renderHeader("Твоите публикувани автомобили", true)}
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
      case "top":
        return activeListings.filter((listing) => listing.listing_type === "top");
      case "archived":
        return archivedListings;
      case "drafts":
        return draftListings;
      case "expired":
        return expiredListings;
      case "liked":
        return likedListings;
      default:
        return [];
    }
  };

  const currentListings = getCurrentListings();
  const totalListings =
    activeListings.length +
    archivedListings.length +
    draftListings.length +
    expiredListings.length +
    likedListings.length;
  const topListingsCount = activeListings.filter((listing) => listing.listing_type === "top").length;
  const isModalBusy =
    listingTypeModal.isOpen && actionLoading === listingTypeModal.listingId;
  const modalTitle =
    listingTypeModal.mode === "republish" ? "Пусни обявата отново" : "Промотирай обявата";
  const modalSubtitle = listingTypeModal.listingTitle
    ? `Избери тип за "${listingTypeModal.listingTitle}".`
    : "Избери тип на обявата.";
  const modalPrimaryLabel =
    listingTypeModal.mode === "republish" ? "Пусни обявата" : "Запази избора";
  const modalHint =
    listingTypeModal.mode === "republish"
      ? "Обявата ще бъде активна за 30 минути от момента на публикуване."
      : "Можеш да промениш типа по всяко време.";

  if (totalListings === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          {renderHeader("Твоите публикувани автомобили", true)}

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
        {renderHeader(`Твоите публикувани автомобили (${totalListings})`, true)}

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

        {listingTypeModal.isOpen && (
          <div style={styles.modalOverlay} onClick={closeListingTypeModal}>
            <div
              style={styles.modal}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>{modalTitle}</h2>
                  <p style={styles.modalSubtitle}>{modalSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeListingTypeModal}
                  style={styles.modalClose}
                  aria-label="Затвори"
                  disabled={isModalBusy}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={styles.listingTypeGrid}>
                <button
                  type="button"
                  style={{
                    ...styles.listingTypeCard,
                    ...(listingTypeModal.selectedType === "normal" ? styles.listingTypeCardSelected : {}),
                  }}
                  onClick={() =>
                    setListingTypeModal((prev) => ({ ...prev, selectedType: "normal" }))
                  }
                  disabled={isModalBusy}
                >
                  <h3 style={styles.listingTypeTitle}>Нормална обява</h3>
                  <p style={styles.listingTypeDesc}>
                    Стандартно публикуване без допълнително позициониране.
                  </p>
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.listingTypeCard,
                    ...(listingTypeModal.selectedType === "top" ? styles.listingTypeCardSelected : {}),
                  }}
                  onClick={() =>
                    setListingTypeModal((prev) => ({ ...prev, selectedType: "top" }))
                  }
                  disabled={isModalBusy}
                >
                  <h3 style={styles.listingTypeTitle}>Топ обява</h3>
                  <p style={styles.listingTypeDesc}>
                    Приоритетна видимост и изкарване по-напред в резултатите.
                  </p>
                </button>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={{ ...styles.modalButton, ...styles.modalButtonSecondary }}
                  onClick={closeListingTypeModal}
                  disabled={isModalBusy}
                >
                  Отказ
                </button>
                <button
                  type="button"
                  style={{ ...styles.modalButton, ...styles.modalButtonPrimary }}
                  onClick={handleListingTypeConfirm}
                  disabled={isModalBusy}
                >
                  {isModalBusy ? "Запазване..." : modalPrimaryLabel}
                </button>
              </div>

              <p style={styles.modalHint}>{modalHint}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {[
          { id: "active", label: "Активни", Icon: List, count: activeListings.length },
          { id: "top", label: "Топ обяви", Icon: PackageOpen, count: topListingsCount },
          { id: "archived", label: "Архивирани", Icon: Archive, count: archivedListings.length },
          { id: "expired", label: "Изтекли", Icon: Clock, count: expiredListings.length },
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
              {activeTab === "top" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "archived" && <PackageOpen size={40} style={styles.emptyIcon} />}
              {activeTab === "expired" && <Clock size={40} style={styles.emptyIcon} />}
              {activeTab === "drafts" && <FileText size={40} style={styles.emptyIcon} />}
              {activeTab === "liked" && <Heart size={40} style={styles.emptyIcon} />}
            </div>
            <p style={styles.emptyText}>
              {activeTab === "active" && "Нямаш активни обяви"}
              {activeTab === "top" && "Нямаш топ обяви"}
              {activeTab === "archived" && "Нямаш архивирани обяви"}
              {activeTab === "expired" && "Нямаш изтекли обяви"}
              {activeTab === "drafts" && "Нямаш чернови обяви"}
              {activeTab === "liked" && "Нямаш любими обяви"}
            </p>
            <p style={styles.emptySubtext}>
              {activeTab === "active" && "Публикувай нова обява, за да я видиш тук"}
              {activeTab === "top" && "Маркирай обява като топ, за да се появи тук"}
              {activeTab === "archived" && "Архивирани обяви ще се появят тук"}
              {activeTab === "expired" && "Изтеклите обяви ще се появят тук"}
              {activeTab === "drafts" && "Начни да пишеш нова обява"}
              {activeTab === "liked" && "Добави обяви в любими"}
            </p>
            {(activeTab === "active" || activeTab === "top") && (
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
              style={{
                ...styles.listingCard,
                ...(activeTab === "expired" ? { cursor: "default" } : {}),
              }}
              onClick={() => {
                if (activeTab === "expired") return;
                navigate(`/details/${listing.slug}`);
              }}
              onMouseEnter={(e) => {
                if (activeTab === "expired") return;
                Object.assign(e.currentTarget.style, styles.listingCardHover);
              }}
              onMouseLeave={(e) => {
                if (activeTab === "expired") return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.08)";
              }}
            >
              {listing.listing_type === "top" && (
                <div style={styles.topBadge}>Топ обява</div>
              )}
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
                  {(activeTab === "active" || activeTab === "top") && (
                    <>
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/publish?edit=${listing.id}`);
                        }}
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

                      {activeTab === "active" && listing.listing_type !== "top" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openListingTypeModal(listing, "promote", "top");
                          }}
                          disabled={actionLoading === listing.id}
                          style={{
                            ...styles.actionButton,
                            background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
                            color: "#fff",
                            opacity: actionLoading === listing.id ? 0.6 : 1,
                            cursor: actionLoading === listing.id ? "not-allowed" : "pointer",
                            boxShadow: "0 2px 8px rgba(249, 115, 22, 0.35)",
                          }}
                          onMouseEnter={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(-2px)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.45)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (actionLoading !== listing.id) {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(249, 115, 22, 0.35)";
                            }
                          }}
                        >
                          <PackageOpen size={14} />
                          Промотирай
                        </button>
                      )}

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

                  {/* Expired Tab Actions: Republish, Delete */}
                  {activeTab === "expired" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const defaultType: ListingType =
                            listing.listing_type === "top" ? "top" : "normal";
                          openListingTypeModal(listing, "republish", defaultType);
                        }}
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
                        {actionLoading === listing.id ? "..." : "Пусни пак"}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/publish?edit=${listing.id}`);
                        }}
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

