import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type CarListing = {
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
  description?: string | null;
  condition?: string | number;
  condition_display?: string;
  created_at: string;
  listing_type?: string | number;
  listing_type_display?: string;
  is_top?: boolean;
};

type DealerDetail = {
  id: number;
  dealer_name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string | null;
  company_name: string;
  description: string | null;
  about_text: string | null;
  profile_image_url: string | null;
  listing_count: number;
  created_at: string;
  listings: CarListing[];
};

const isTopListing = (listing: CarListing) => {
  if (listing.is_top) return true;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (["top", "top_ad", "top_listing", "topad", "toplisting"].includes(rawType)) return true;
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("топ");
};

const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const PAGE_SIZE = 30;

const DealerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dealer, setDealer] = useState<DealerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"listings" | "about" | "contacts">("listings");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const [listingModelFilter, setListingModelFilter] = useState<string>("all");
  const [listingSort, setListingSort] = useState<"default" | "latest">("default");
  const [currentPage, setCurrentPage] = useState(1);

  const isOwner = user?.userType === "business" && dealer && user.email === dealer.email;

  useEffect(() => {
    const fetchDealer = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/auth/dealers/${id}/`);
        if (res.ok) {
          const data = await res.json();
          setDealer(data);
          setAboutDraft(data.about_text || "");
        }
      } catch (err) {
        console.error("Failed to fetch dealer:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDealer();
  }, [id]);

  useEffect(() => {
    setListingModelFilter("all");
    setListingSort("default");
  }, [dealer?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dealer?.id, listingModelFilter, listingSort]);

  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("http://localhost:8000/api/auth/profile/update-about/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ about_text: aboutDraft }),
      });
      if (res.ok) {
        setDealer((prev) => (prev ? { ...prev, about_text: aboutDraft } : prev));
        setEditingAbout(false);
      }
    } catch (err) {
      console.error("Failed to save about:", err);
    } finally {
      setSavingAbout(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "днес";
    if (days === 1) return "вчера";
    if (days < 30) return `преди ${days} дни`;
    const months = Math.floor(days / 30);
    if (months === 1) return "преди 1 месец";
    if (months < 12) return `преди ${months} месеца`;
    const years = Math.floor(months / 12);
    if (years === 1) return "преди 1 година";
    return `преди ${years} години`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("bg-BG", { day: "numeric", month: "long", year: "numeric" });
  };

  const isListingNew = (createdAt: string) => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = Date.now() - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  };

  const getShortDescription = (text?: string | null, maxLength = 120) => {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength).trim()}…`;
  };

  const modelOptions = useMemo(() => {
    if (!dealer?.listings) return [];
    const models = new Set<string>();
    dealer.listings.forEach((listing) => {
      if (listing.model) models.add(listing.model);
    });
    return Array.from(models).sort();
  }, [dealer?.listings]);

  const visibleListings = useMemo(() => {
    if (!dealer?.listings) return [];
    let items = dealer.listings;
    if (listingModelFilter !== "all") {
      items = items.filter((listing) => listing.model === listingModelFilter);
    }
    if (listingSort === "latest") {
      items = [...items].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return items;
  }, [dealer?.listings, listingModelFilter, listingSort]);

  const totalPages = Math.ceil(visibleListings.length / PAGE_SIZE);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedListings = visibleListings.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );
  const visiblePages = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let page = safePage - 2; page <= safePage + 2; page += 1) {
      if (page > 1 && page < totalPages) {
        pages.add(page);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [safePage, totalPages]);
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getGoogleMapsUrl = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Bulgaria`);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${query}`;
  };

  const getGoogleMapsSearchUrl = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Bulgaria`);
    return `https://maps.google.com/?q=${query}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#0066cc", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!dealer) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#374151" }}>Дилърът не е намерен</div>
        <button
          onClick={() => navigate("/dealers")}
          style={{ padding: "10px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Обратно към дилъри
        </button>
      </div>
    );
  }

  const initial = dealer.dealer_name.charAt(0).toUpperCase();

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      color: "#333",
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "\"Manrope\", \"Segoe UI\", sans-serif",
    },
    hero: {
      background: "#f5f5f5",
      padding: "20px 20px 0",
    },
    heroInner: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      gap: 24,
      flexWrap: "wrap",
      background: "#fff",
      padding: "24px",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    heroAvatar: {
      width: 80,
      height: 80,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      border: "2px solid #e5e7eb",
      background: "#f3f4f6",
    },
    heroAvatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    heroAvatarFallback: {
      width: "100%",
      height: "100%",
      background: "#0f766e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 32,
      fontWeight: 700,
    },
    heroInfo: { flex: 1 },
    heroName: {
      fontSize: 26,
      fontWeight: 700,
      color: "#333",
      margin: "0 0 6px",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    heroMeta: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    },
    heroMetaItem: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      color: "#666",
      fontWeight: 500,
    },
    heroMetaItemGreen: {
      color: "#16a34a",
      fontWeight: 600,
    },
    heroMetaItemOrange: {
      color: "#f97316",
      fontWeight: 600,
    },
    backBtn: {
      padding: "12px 20px",
      background: "#0f766e",
      color: "#fff",
      border: "none",
      borderRadius: 4,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "all 0.2s",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      flexShrink: 0,
    },
    tabBar: {
      background: "transparent",
      borderBottom: "none",
      position: "static",
    },
    tabBarInner: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "flex",
      gap: 12,
      padding: "16px 20px 12px",
      flexWrap: "wrap",
    },
    tab: {
      padding: "12px 24px",
      background: "#fff",
      color: "#333",
      border: "1px solid #e0e0e0",
      borderRadius: 6,
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
      background: "#0f766e",
      color: "#fff",
      border: "1px solid #0f766e",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    content: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "0 20px 60px",
    },
    // Listings tab
    listingsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 24,
    },
    pagination: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 24,
      flexWrap: "wrap",
    },
    paginationButton: {
      minWidth: 36,
      height: 36,
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#1f2937",
      fontWeight: 600,
      cursor: "pointer",
      padding: "0 10px",
    },
    paginationButtonActive: {
      background: "#0f766e",
      borderColor: "#0f766e",
      color: "#fff",
    },
    paginationButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    paginationEllipsis: {
      color: "#94a3b8",
      fontWeight: 600,
      padding: "0 4px",
    },
    paginationInfo: {
      fontSize: 13,
      color: "#64748b",
      fontWeight: 600,
    },
    listingsFilters: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 16,
    },
    listingsFilterButton: {
      padding: "8px 14px",
      borderRadius: 999,
      border: "1px solid #e0e0e0",
      background: "#fff",
      fontSize: 12,
      fontWeight: 600,
      color: "#666",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    listingsFilterButtonActive: {
      background: "#0f766e",
      color: "#fff",
      borderColor: "#0f766e",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
    listingsFilterSelect: {
      height: 34,
      padding: "0 12px",
      borderRadius: 999,
      border: "1px solid #e0e0e0",
      background: "#fff",
      fontSize: 12,
      fontWeight: 600,
      color: "#333",
      outline: "none",
      cursor: "pointer",
    },
    listingCard: {
      background: "#fff",
      borderRadius: 6,
      overflow: "hidden",
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "pointer",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
    },
    listingCardHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    },
    listingMedia: {
      position: "relative",
      height: 220,
      background: "#f0f0f0",
    },
    listingImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    listingMediaOverlay: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.5) 100%)",
      pointerEvents: "none",
    },
    listingPlaceholder: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#999",
      fontSize: 14,
      gap: 8,
    },
    topBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      padding: "4px 10px",
      borderRadius: 999,
      background: "linear-gradient(135deg, #ef4444, #dc2626)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      boxShadow: "0 4px 10px rgba(220, 38, 38, 0.3)",
      zIndex: 2,
    },
    newBadge: {
      position: "absolute",
      left: 12,
      padding: "4px 10px",
      borderRadius: 999,
      background: "linear-gradient(135deg, #10b981, #059669)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      boxShadow: "0 4px 10px rgba(5, 150, 105, 0.35)",
      zIndex: 2,
    },
    listingPricePill: {
      position: "absolute",
      right: 12,
      bottom: 12,
      padding: "6px 12px",
      borderRadius: 4,
      background: "#0f766e",
      color: "#fff",
      fontSize: 14,
      fontWeight: 800,
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      zIndex: 2,
    },
    listingContent: {
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      flex: 1,
    },
    listingTitleRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    listingTitle: {
      fontSize: 17,
      fontWeight: 700,
      color: "#333",
      margin: 0,
      lineHeight: 1.3,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    listingSubtitle: {
      fontSize: 13,
      color: "#666",
    },
    listingDescription: {
      fontSize: 13,
      color: "#6b7280",
      lineHeight: 1.5,
    },
    listingFooter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      fontSize: 12,
      color: "#666",
      marginTop: "auto",
      paddingTop: 8,
    },
    listingFooterItem: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "#666",
      fontWeight: 600,
      whiteSpace: "nowrap",
    },
    listingFooterIcon: {
      color: "#94a3b8",
    },
    listingFooterTime: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "#f97316",
      fontWeight: 600,
      whiteSpace: "nowrap",
    },
    listingChips: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    listingChip: {
      fontSize: 12,
      color: "#0f766e",
      background: "#ecfdf5",
      border: "1px solid #99f6e4",
      padding: "4px 8px",
      borderRadius: 3,
      fontWeight: 600,
    },
    // About tab
    aboutCard: {
      background: "#fff",
      borderRadius: 6,
      border: "1px solid #e0e0e0",
      padding: 24,
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      maxWidth: 800,
    },
    aboutTitle: {
      fontSize: 17,
      fontWeight: 700,
      color: "#333",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    aboutText: {
      fontSize: 15,
      lineHeight: 1.7,
      color: "#374151",
      whiteSpace: "pre-wrap",
    },
    aboutEmpty: {
      fontSize: 15,
      color: "#9ca3af",
      fontStyle: "italic",
    },
    aboutTextarea: {
      width: "100%",
      minHeight: 160,
      padding: 16,
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      fontSize: 15,
      lineHeight: 1.7,
      color: "#374151",
      resize: "vertical",
      outline: "none",
      boxSizing: "border-box",
    },
    aboutActions: {
      display: "flex",
      gap: 10,
      marginTop: 16,
    },
    btnPrimary: {
      padding: "10px 20px",
      background: "#0f766e",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },
    btnSecondary: {
      padding: "10px 20px",
      background: "#f3f4f6",
      color: "#374151",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },
    editBtn: {
      padding: "6px 14px",
      background: "#ecfdf5",
      color: "#0f766e",
      border: "1px solid #99f6e4",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    // Contacts tab
    contactsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
      maxWidth: 1000,
    },
    contactCard: {
      background: "#fff",
      borderRadius: 6,
      border: "1px solid #e0e0e0",
      padding: 24,
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    },
    contactCardTitle: {
      fontSize: 17,
      fontWeight: 700,
      color: "#333",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    contactDetail: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "12px 0",
      borderBottom: "1px solid #f5f5f5",
    },
    contactDetailLast: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "12px 0",
    },
    contactDetailLabel: {
      fontSize: 12,
      color: "#9ca3af",
      fontWeight: 500,
      marginBottom: 2,
    },
    contactDetailValue: {
      fontSize: 14,
      color: "#111827",
      fontWeight: 500,
    },
    mapCard: {
      background: "#fff",
      borderRadius: 6,
      border: "1px solid #e0e0e0",
      overflow: "hidden",
      gridColumn: "1 / -1",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    },
    mapHeader: {
      padding: "20px 28px",
      borderBottom: "1px solid #eef2f7",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mapTitle: {
      fontSize: 17,
      fontWeight: 700,
      color: "#333",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    mapLink: {
      fontSize: 13,
      color: "#0f766e",
      fontWeight: 600,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
    },
    mapEmbed: {
      width: "100%",
      height: 350,
      border: "none",
    },
    emptyListings: {
      textAlign: "center",
      padding: 60,
      background: "#fff",
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    },
  };

  const tabs = [
    { key: "listings" as const, label: `Обяви (${dealer.listing_count})` },
    { key: "about" as const, label: "За нас" },
    { key: "contacts" as const, label: "Контакти" },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 767px) {
          .dealer-hero-inner { flex-direction: column; text-align: center; gap: 16px !important; }
          .dealer-hero { padding: 35px 16px 30px !important; }
          .dealer-hero h1 { font-size: 22px !important; }
          .dealer-hero-meta { justify-content: center; }
          .dealer-content { padding: 20px 12px 40px !important; }
          .dealer-listings-grid { grid-template-columns: 1fr !important; }
          .dealer-contacts-grid { grid-template-columns: 1fr !important; }
          .dealer-tab { padding: 14px 16px !important; font-size: 14px !important; }
          .dealer-back-btn { display: none; }
          .dealer-about-card { padding: 20px !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dealer-listings-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dealer-contacts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <div style={styles.hero} className="dealer-hero">
        <div style={styles.heroInner} className="dealer-hero-inner">
          <div style={styles.heroAvatar}>
            {dealer.profile_image_url ? (
              <img src={dealer.profile_image_url} alt={dealer.dealer_name} style={styles.heroAvatarImg} />
            ) : (
              <div style={styles.heroAvatarFallback}>{initial}</div>
            )}
          </div>
          <div style={styles.heroInfo}>
            <h1 style={styles.heroName}>{dealer.dealer_name}</h1>
            <div style={styles.heroMeta} className="dealer-hero-meta">
              <span style={styles.heroMetaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {dealer.city}
              </span>
              <span style={{ ...styles.heroMetaItem, ...styles.heroMetaItemGreen }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                {dealer.listing_count} обяви
              </span>
              <span style={{ ...styles.heroMetaItem, ...styles.heroMetaItemOrange }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Регистриран {getRelativeTime(dealer.created_at)}
              </span>
            </div>
          </div>
          <button
            style={styles.backBtn}
            className="dealer-back-btn"
            onClick={() => navigate("/dealers")}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#115e59";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#0f766e";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Всички дилъри
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        <div style={styles.tabBarInner}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className="dealer-tab"
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.key)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  (e.currentTarget as HTMLElement).style.color = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  (e.currentTarget as HTMLElement).style.color = "#6b7280";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content} className="dealer-content">
        {/* Listings Tab */}
        {activeTab === "listings" && (
          <>
            {dealer.listings && dealer.listings.length > 0 ? (
              <>
                <div style={styles.listingsFilters}>
                  <button
                    type="button"
                    style={{
                      ...styles.listingsFilterButton,
                      ...(listingSort === "latest" ? styles.listingsFilterButtonActive : {}),
                    }}
                    onClick={() => setListingSort(listingSort === "latest" ? "default" : "latest")}
                  >
                    Най-нови
                  </button>
                  <select
                    value={listingModelFilter}
                    onChange={(e) => setListingModelFilter(e.target.value)}
                    style={styles.listingsFilterSelect}
                  >
                    <option value="all">Всички модели</option>
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.listingsGrid} className="dealer-listings-grid">
                {paginatedListings.map((listing) => {
                  const isTop = isTopListing(listing);
                  const isNew = isListingNew(listing.created_at);
                  const priceLabel = `${listing.price.toLocaleString("bg-BG")} лв`;
                  const conditionLabel =
                    listing.condition_display ||
                    (listing.condition ? String(listing.condition) : "");
                  const subtitleParts = [
                    conditionLabel,
                    listing.year_from ? `${listing.year_from} г.` : "",
                  ].filter(Boolean);
                  const subtitle = subtitleParts.join(" · ");
                  const descriptionSnippet = getShortDescription(listing.description);
                  const chips = [
                    listing.fuel_display || "",
                    listing.gearbox_display || "",
                    Number.isFinite(listing.power) && listing.power > 0 ? `${listing.power} к.с.` : "",
                    Number.isFinite(listing.mileage) && listing.mileage > 0
                      ? `${listing.mileage.toLocaleString("bg-BG")} км`
                      : "",
                  ].filter(Boolean);
                  const createdLabel = getRelativeTime(listing.created_at);

                  return (
                  <div
                    key={listing.id}
                    style={{
                      ...styles.listingCard,
                      ...(hoveredCard === listing.id ? styles.listingCardHover : {}),
                    }}
                    onMouseEnter={() => setHoveredCard(listing.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => navigate(`/details/${listing.slug}`)}
                  >
                    <div style={styles.listingMedia}>
                      {isTop && <div style={styles.topBadge}>Топ обява</div>}
                      {isNew && (
                        <div style={{ ...styles.newBadge, top: isTop ? 46 : 12 }}>
                          Нова
                        </div>
                      )}
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={`${listing.brand} ${listing.model}`}
                          style={styles.listingImage}
                        />
                      ) : (
                        <div style={styles.listingPlaceholder}>
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          Няма снимка
                        </div>
                      )}
                      <div style={styles.listingMediaOverlay} />
                      <div style={styles.listingPricePill}>{priceLabel}</div>
                    </div>
                    <div style={styles.listingContent}>
                      <div style={styles.listingTitleRow}>
                        <h3 style={styles.listingTitle}>
                          {listing.brand} {listing.model}
                        </h3>
                      </div>
                      {subtitle && <div style={styles.listingSubtitle}>{subtitle}</div>}
                      {descriptionSnippet && (
                        <div style={styles.listingDescription}>{descriptionSnippet}</div>
                      )}
                      {chips.length > 0 && (
                        <div style={styles.listingChips}>
                          {chips.map((chip, index) => (
                            <span key={`${listing.id}-chip-${index}`} style={styles.listingChip}>
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={styles.listingFooter}>
                        <div style={styles.listingFooterItem}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.listingFooterIcon}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {listing.city || "Без град"}
                        </div>
                        <div style={styles.listingFooterTime}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Качена: {createdLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
                </div>
                {totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      type="button"
                      style={{
                        ...styles.paginationButton,
                        ...(safePage === 1 ? styles.paginationButtonDisabled : {}),
                      }}
                      disabled={safePage === 1}
                      onClick={() => handlePageChange(safePage - 1)}
                    >
                      Предишна
                    </button>
                    {visiblePages.map((page, index) => {
                      const prevPage = visiblePages[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={`page-${page}`}>
                          {showEllipsis && <span style={styles.paginationEllipsis}>...</span>}
                          <button
                            type="button"
                            style={{
                              ...styles.paginationButton,
                              ...(page === safePage ? styles.paginationButtonActive : {}),
                            }}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                    <button
                      type="button"
                      style={{
                        ...styles.paginationButton,
                        ...(safePage === totalPages ? styles.paginationButtonDisabled : {}),
                      }}
                      disabled={safePage === totalPages}
                      onClick={() => handlePageChange(safePage + 1)}
                    >
                      Следваща
                    </button>
                    <span style={styles.paginationInfo}>
                      Страница {safePage} от {totalPages}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyListings}>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Няма активни обяви
                </div>
                <div style={{ fontSize: 14, color: "#9ca3af" }}>
                  Този дилър все още няма публикувани обяви
                </div>
              </div>
            )}
          </>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div style={styles.aboutCard} className="dealer-about-card">
            <div style={styles.aboutTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(15, 118, 110)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              За нас
              {isOwner && !editingAbout && (
                <button style={styles.editBtn} onClick={() => setEditingAbout(true)}>
                  Редактирай
                </button>
              )}
            </div>

            {editingAbout ? (
              <>
                <textarea
                  style={styles.aboutTextarea}
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  placeholder="Разкажете за вашия автосалон..."
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#0066cc";
                    (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(0,102,204,0.1)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                    (e.target as HTMLElement).style.boxShadow = "none";
                  }}
                />
                <div style={styles.aboutActions}>
                  <button style={styles.btnPrimary} onClick={handleSaveAbout} disabled={savingAbout}>
                    {savingAbout ? "Запазване..." : "Запази"}
                  </button>
                  <button style={styles.btnSecondary} onClick={() => { setEditingAbout(false); setAboutDraft(dealer.about_text || ""); }}>
                    Отказ
                  </button>
                </div>
              </>
            ) : (
              <>
                {dealer.about_text ? (
                  <div style={styles.aboutText}>{dealer.about_text}</div>
                ) : dealer.description ? (
                  <div style={styles.aboutText}>{dealer.description}</div>
                ) : (
                  <div style={styles.aboutEmpty}>
                    {isOwner
                      ? "Все още не сте добавили информация за вашия автосалон. Натиснете \"Редактирай\" за да добавите."
                      : "Този дилър все още не е добавил информация за себе си."}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div style={styles.contactsGrid} className="dealer-contacts-grid">
            {/* Contact Info Card */}
            <div style={styles.contactCard}>
              <div style={styles.contactCardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(15, 118, 110)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Контактна информация
              </div>

              <div style={styles.contactDetail}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <div>
                  <div style={styles.contactDetailLabel}>Телефон</div>
                  <div style={styles.contactDetailValue}>{dealer.phone}</div>
                </div>
              </div>

              <div style={styles.contactDetail}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <div>
                  <div style={styles.contactDetailLabel}>Имейл</div>
                  <div style={styles.contactDetailValue}>{dealer.email}</div>
                </div>
              </div>

              {dealer.website && (
                <div style={styles.contactDetail}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <div>
                    <div style={styles.contactDetailLabel}>Уебсайт</div>
                    <div style={styles.contactDetailValue}>
                      <a href={dealer.website} target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "none" }}>
                        {dealer.website}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.contactDetail}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <div style={styles.contactDetailLabel}>Адрес</div>
                  <div style={styles.contactDetailValue}>{dealer.address}, {dealer.city}</div>
                </div>
              </div>

              <div style={styles.contactDetailLast}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div>
                  <div style={styles.contactDetailLabel}>Регистриран на</div>
                  <div style={styles.contactDetailValue}>{formatDate(dealer.created_at)}</div>
                </div>
              </div>
            </div>

            {/* Company Info Card */}
            <div style={styles.contactCard}>
              <div style={styles.contactCardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(15, 118, 110)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Фирмени данни
              </div>

              <div style={styles.contactDetail}>
                <div>
                  <div style={styles.contactDetailLabel}>Фирма</div>
                  <div style={styles.contactDetailValue}>{dealer.company_name}</div>
                </div>
              </div>

              <div style={styles.contactDetailLast}>
                <div>
                  <div style={styles.contactDetailLabel}>Дилърско име</div>
                  <div style={styles.contactDetailValue}>{dealer.dealer_name}</div>
                </div>
              </div>
            </div>

            {/* Map Card */}
            <div style={styles.mapCard}>
              <div style={styles.mapHeader}>
                <div style={styles.mapTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(15, 118, 110)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Местоположение
                </div>
                <a
                  href={getGoogleMapsSearchUrl(dealer.address, dealer.city)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.mapLink}
                >
                  Отвори в Google Maps
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginLeft: 6 }}
                  >
                    <path d="M7 17L17 7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              </div>
              <iframe
                title="Dealer location"
                style={styles.mapEmbed}
                src={getGoogleMapsUrl(dealer.address, dealer.city)}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerDetailPage;
