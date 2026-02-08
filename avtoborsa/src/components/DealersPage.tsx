import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Dealer = {
  id: number;
  dealer_name: string;
  city: string;
  phone: string;
  email: string;
  profile_image_url: string | null;
  listing_count: number;
  created_at: string;
};

const DealersPage: React.FC = () => {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("Всички");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/auth/dealers/");
        if (res.ok) {
          const data = await res.json();
          setDealers(data);
        }
      } catch (err) {
        console.error("Failed to fetch dealers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDealers();
  }, []);

  const cities = ["Всички", ...Array.from(new Set(dealers.map((d) => d.city)))];
  const filteredDealers =
    searchCity === "Всички" ? dealers : dealers.filter((d) => d.city === searchCity);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

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

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f8fafc",
      width: "100%",
    },
    hero: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      padding: "60px 20px 50px",
      textAlign: "center",
    },
    heroIconWrap: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px",
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: 800,
      color: "#fff",
      margin: "0 0 10px",
    },
    heroSubtitle: {
      fontSize: 16,
      color: "rgba(255,255,255,0.6)",
      margin: 0,
      fontWeight: 400,
    },
    container: {
      width: "100%",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "30px 20px 60px",
      boxSizing: "border-box",
    },
    filterBar: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 30,
      flexWrap: "wrap",
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: 600,
      color: "#374151",
    },
    filterSelect: {
      padding: "10px 16px",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      fontSize: 14,
      color: "#374151",
      background: "#fff",
      minWidth: 180,
      cursor: "pointer",
      outline: "none",
    },
    dealerCount: {
      fontSize: 14,
      color: "#6b7280",
      marginLeft: "auto",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: 20,
    },
    card: {
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #eef2f7",
      padding: 24,
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
    cardHover: {
      transform: "translateY(-4px)",
      boxShadow: "0 12px 32px rgba(0,0,0,0.1)",
      borderColor: "#0066cc",
    },
    cardTop: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 18,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      flexShrink: 0,
      overflow: "hidden",
    },
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontSize: 22,
      fontWeight: 700,
    },
    dealerName: {
      fontSize: 17,
      fontWeight: 700,
      color: "#111827",
      marginBottom: 4,
    },
    dealerCity: {
      fontSize: 13,
      color: "#6b7280",
      display: "flex",
      alignItems: "center",
      gap: 4,
    },
    statsRow: {
      display: "flex",
      gap: 16,
      marginBottom: 18,
    },
    statBadge: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      background: "#f0f4ff",
      borderRadius: 8,
      fontSize: 13,
      color: "#374151",
      fontWeight: 500,
    },
    contactRow: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingTop: 16,
      borderTop: "1px solid #f0f0f0",
    },
    contactItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "#6b7280",
    },
    viewBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: "100%",
      padding: "12px",
      background: "#0066cc",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      marginTop: 18,
      transition: "all 0.3s ease",
    },
    empty: {
      textAlign: "center",
      padding: 60,
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #eef2f7",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: "#374151",
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: "#9ca3af",
    },
    loadingWrap: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 80,
    },
    spinner: {
      width: 36,
      height: 36,
      border: "3px solid #e5e7eb",
      borderTopColor: "#0066cc",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 767px) {
          .dealers-hero { padding: 40px 16px 35px !important; }
          .dealers-hero h1 { font-size: 24px !important; }
          .dealers-container { padding: 20px 12px 40px !important; }
          .dealers-grid { grid-template-columns: 1fr !important; }
          .dealers-filter { flex-direction: column; align-items: stretch !important; }
          .dealers-filter select { width: 100%; }
          .dealer-count { display: none; }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .dealers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dealers-container { padding: 24px 16px 50px !important; }
        }
      `}</style>

      {/* Hero */}
      <div style={styles.hero} className="dealers-hero">
        <div style={styles.heroIconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h1 style={styles.heroTitle}>Дилъри и автосалони</h1>
        <p style={styles.heroSubtitle}>
          Намерете проверени дилъри и автосалони в България
        </p>
      </div>

      {/* Content */}
      <div style={styles.container} className="dealers-container">
        {/* Filter Bar */}
        <div style={styles.filterBar} className="dealers-filter">
          <span style={styles.filterLabel}>Филтър по град:</span>
          <select
            style={styles.filterSelect}
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <span style={styles.dealerCount} className="dealer-count">
            {filteredDealers.length} {filteredDealers.length === 1 ? "дилър" : "дилъра"}
          </span>
        </div>

        {/* Loading */}
        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
          </div>
        ) : filteredDealers.length > 0 ? (
          <div style={styles.grid} className="dealers-grid">
            {filteredDealers.map((dealer) => (
              <div
                key={dealer.id}
                style={{
                  ...styles.card,
                  ...(hoveredCard === dealer.id ? styles.cardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(dealer.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(`/dealers/${dealer.id}`)}
              >
                {/* Top: Avatar + Name */}
                <div style={styles.cardTop}>
                  <div style={styles.avatar}>
                    {dealer.profile_image_url ? (
                      <img
                        src={dealer.profile_image_url}
                        alt={dealer.dealer_name}
                        style={styles.avatarImg}
                      />
                    ) : (
                      <div style={styles.avatarFallback}>
                        {getInitial(dealer.dealer_name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={styles.dealerName}>{dealer.dealer_name}</div>
                    <div style={styles.dealerCity}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {dealer.city}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={styles.statsRow}>
                  <div style={styles.statBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    {dealer.listing_count} обяви
                  </div>
                  <div style={styles.statBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {getRelativeTime(dealer.created_at)}
                  </div>
                </div>

                {/* Contact */}
                <div style={styles.contactRow}>
                  <div style={styles.contactItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {dealer.phone}
                  </div>
                  <div style={styles.contactItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {dealer.email}
                  </div>
                </div>

                {/* View Button */}
                <button
                  style={styles.viewBtn}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#0052a3";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#0066cc";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dealers/${dealer.id}`);
                  }}
                >
                  Виж профил
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>
            <div style={styles.emptyTitle}>Няма намерени дилъри</div>
            <div style={styles.emptyText}>
              {searchCity !== "Всички"
                ? "Опитайте да промените филтъра за град"
                : "Все още няма регистрирани дилъри"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealersPage;
