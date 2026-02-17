import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import {
  USER_FOLLOWED_DEALERS_UPDATED_EVENT,
  followDealer,
  getUserFollowedDealers,
  getUserFollowedDealersStorageKey,
  unfollowDealer,
} from "../utils/dealerSubscriptions";

type Dealer = {
  id: number;
  dealer_name: string;
  city: string;
  phone: string;
  email: string;
  profile_image_url: string | null;
  listing_count: number;
  created_at: string;
  description?: string | null;
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body { width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; color: #333; background: #f5f5f5; }
  #root { width: 100%; }
  input, select, button { font-family: inherit; }
  button:hover { opacity: 0.95; }
`;

const DealersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("Всички");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [followedDealerIds, setFollowedDealerIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/auth/dealers/", {
          cache: "no-store",
        });
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

  useEffect(() => {
    if (!user?.id) {
      setFollowedDealerIds(new Set());
      return;
    }

    const storageKey = getUserFollowedDealersStorageKey(user.id);
    const refreshFollowedDealers = () => {
      const subscriptions = getUserFollowedDealers(user.id);
      setFollowedDealerIds(new Set(subscriptions.map((item) => item.dealerId)));
    };

    refreshFollowedDealers();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      refreshFollowedDealers();
    };

    const handleFollowedDealersUpdated = (event: Event) => {
      const { detail } = event as CustomEvent<{ userId?: number }>;
      if (detail?.userId && detail.userId !== user.id) return;
      refreshFollowedDealers();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      USER_FOLLOWED_DEALERS_UPDATED_EVENT,
      handleFollowedDealersUpdated
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        USER_FOLLOWED_DEALERS_UPDATED_EVENT,
        handleFollowedDealersUpdated
      );
    };
  }, [user?.id]);

  const cities = useMemo(
    () => ["Всички", ...Array.from(new Set(dealers.map((d) => d.city)))],
    [dealers]
  );

  const filteredDealers = useMemo(
    () => (searchCity === "Всички" ? dealers : dealers.filter((d) => d.city === searchCity)),
    [dealers, searchCity]
  );

  const rankedDealers = useMemo(
    () =>
      [...filteredDealers].sort((a, b) => {
        if (b.listing_count !== a.listing_count) return b.listing_count - a.listing_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [filteredDealers]
  );

  const topDealers = rankedDealers.slice(0, 3);
  const restDealers = rankedDealers.slice(3);

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

  const getDescription = (text?: string | null, maxLength = 160) => {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "Описание: няма добавено описание.";
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength).trim()}…`;
  };

  const getRankStyles = (rank: number) => {
    if (rank === 1) {
      return { background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#fff" };
    }
    if (rank === 2) {
      return { background: "linear-gradient(135deg, #94a3b8, #64748b)", color: "#fff" };
    }
    return { background: "linear-gradient(135deg, #b45309, #92400e)", color: "#fff" };
  };

  const isDealerFollowed = (dealerId: number) => followedDealerIds.has(dealerId);

  const handleToggleDealerFollow = (event: React.MouseEvent, dealer: Dealer) => {
    event.stopPropagation();

    if (!user?.id) {
      navigate("/auth");
      return;
    }

    if (isDealerFollowed(dealer.id)) {
      unfollowDealer(user.id, dealer.id);
      return;
    }

    followDealer(user.id, {
      id: dealer.id,
      dealer_name: dealer.dealer_name,
      city: dealer.city,
      profile_image_url: dealer.profile_image_url,
      listing_count: dealer.listing_count,
    });
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      width: "100%",
    },
    main: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "20px 20px 60px",
      width: "100%",
    },
    hero: {
      background: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: 12,
      padding: "22px 24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    },
    heroTitle: {
      margin: 0,
      fontSize: 26,
      fontWeight: 700,
      color: "#333",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    heroSubtitle: {
      margin: "6px 0 0",
      color: "#666",
      fontSize: 15,
      lineHeight: 1.6,
    },
    heroBadge: {
      padding: "8px 14px",
      borderRadius: 999,
      border: "1px solid #99f6e4",
      background: "#ecfdf5",
      color: "#0f766e",
      fontWeight: 700,
      fontSize: 13,
      whiteSpace: "nowrap",
    },
    filterBar: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginTop: 18,
      flexWrap: "wrap",
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: 600,
      color: "#555",
    },
    filterSelect: {
      padding: "10px 16px",
      border: "1px solid #d0d0d0",
      borderRadius: 6,
      fontSize: 14,
      color: "#333",
      background: "#fff",
      minWidth: 180,
      cursor: "pointer",
      outline: "none",
    },
    dealerCount: {
      fontSize: 14,
      color: "#666",
      marginLeft: "auto",
    },
    section: {
      marginTop: 24,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 22,
      boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    },
    sectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap",
    },
    h2: {
      margin: 0,
      fontSize: 22,
      fontWeight: 700,
      color: "#333",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    sectionLead: {
      margin: "6px 0 0",
      color: "#666",
      fontSize: 14,
    },
    podiumGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 16,
      alignItems: "end",
    },
    podiumCard: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      padding: 16,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      cursor: "pointer",
      transition: "transform 0.2s, box-shadow 0.2s",
    },
    podiumAvatar: {
      width: 64,
      height: 64,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      border: "2px solid #e5e7eb",
    },
    podiumAvatarFallback: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f766e, #0b5f58)",
      color: "#fff",
      fontSize: 22,
      fontWeight: 700,
    },
    podiumName: {
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    podiumMeta: {
      fontSize: 13,
      color: "#6b7280",
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
    },
    podiumDescription: {
      fontSize: 13,
      color: "#4b5563",
      lineHeight: 1.6,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical" as const,
      overflow: "hidden",
    },
    podiumScore: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f766e",
      background: "#ecfdf5",
      border: "1px solid #99f6e4",
      borderRadius: 999,
      padding: "4px 10px",
      alignSelf: "flex-start",
    },
    podiumRank: {
      position: "absolute",
      top: 12,
      right: 12,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 0.3,
    },
    podiumActions: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    podiumButton: {
      padding: "10px 12px",
      borderRadius: 6,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      flex: 1,
      minWidth: 102,
    },
    followButton: {
      padding: "10px 12px",
      borderRadius: 6,
      border: "1px solid #99f6e4",
      background: "#ecfdf5",
      color: "#0f766e",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minWidth: 112,
      whiteSpace: "nowrap",
    },
    followButtonActive: {
      border: "1px solid #0f766e",
      background: "#0f766e",
      color: "#fff",
    },
    rankList: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 16,
    },
    rankRow: {
      display: "grid",
      gridTemplateColumns: "48px 56px 1fr auto auto",
      gap: 12,
      alignItems: "center",
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#fff",
      cursor: "pointer",
      transition: "box-shadow 0.2s, transform 0.2s",
    },
    rankIndex: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#f5f5f5",
      border: "1px solid #e0e0e0",
      display: "grid",
      placeItems: "center",
      fontWeight: 700,
      color: "#333",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    rankAvatar: {
      width: 52,
      height: 52,
      borderRadius: "50%",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
    },
    rankInfo: {
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    rankName: {
      fontWeight: 700,
      color: "#111827",
      fontSize: 15,
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    rankMeta: {
      fontSize: 12,
      color: "#6b7280",
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    },
    rankDescription: {
      fontSize: 12,
      color: "#4b5563",
      lineHeight: 1.5,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical" as const,
      overflow: "hidden",
    },
    rankStats: {
      textAlign: "right",
      fontSize: 12,
      color: "#6b7280",
      minWidth: 140,
    },
    rankScore: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f766e",
    },
    rankButton: {
      padding: "8px 12px",
      borderRadius: 6,
      border: "none",
      background: "#0f766e",
      color: "#fff",
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    rankActions: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      justifySelf: "end",
    },
    empty: {
      textAlign: "center",
      padding: 50,
      background: "#fff",
      borderRadius: 10,
      border: "1px solid #e0e0e0",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: "#333",
      fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
    },
    emptyText: {
      fontSize: 14,
      color: "#666",
      marginTop: 6,
    },
    loadingWrap: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 60,
    },
    spinner: {
      width: 36,
      height: 36,
      border: "3px solid #e5e7eb",
      borderTopColor: "#0f766e",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    },
  };

  const podiumSlots = [
    { rank: 2, dealer: topDealers[1] },
    { rank: 1, dealer: topDealers[0] },
    { rank: 3, dealer: topDealers[2] },
  ].filter((slot) => slot.dealer);

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .podium-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
        .rank-row:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.10); }

        @media (max-width: 900px) {
          .podium-grid { grid-template-columns: 1fr; }
          .rank-row { grid-template-columns: 40px 48px 1fr; }
          .rank-stats { text-align: left !important; min-width: 0 !important; }
          .rank-actions { justify-self: start !important; }
        }
      `}</style>

      <main style={styles.main}>
        <section style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>Дилърски лидерборд</h1>
            <p style={styles.heroSubtitle}>
              Топ автосалони по активни обяви и свежест на профила.
            </p>
          </div>
          <div style={styles.heroBadge}>
            {rankedDealers.length} {rankedDealers.length === 1 ? "дилър" : "дилъра"}
          </div>

          <div style={styles.filterBar}>
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
            <span style={styles.dealerCount}>
              {filteredDealers.length} {filteredDealers.length === 1 ? "дилър" : "дилъра"}
            </span>
          </div>
        </section>

        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
          </div>
        ) : filteredDealers.length > 0 ? (
          <>
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.h2}>ТОП 3</h2>
                  <p style={styles.sectionLead}>Най-добрите дилъри по брой обяви</p>
                </div>
              </div>

              <div style={styles.podiumGrid} className="podium-grid">
                {podiumSlots.map((slot) => {
                  const dealer = slot.dealer!;
                  const rankStyles = getRankStyles(slot.rank);
                  const minHeight = slot.rank === 1 ? 240 : slot.rank === 2 ? 215 : 200;
                  return (
                    <div
                      key={dealer.id}
                      className="podium-card"
                      style={{ ...styles.podiumCard, minHeight }}
                      onMouseEnter={() => setHoveredCard(dealer.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => navigate(`/dealers/${dealer.id}`)}
                    >
                      <div style={{ ...styles.podiumRank, ...rankStyles }}>#{slot.rank}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={styles.podiumAvatar}>
                          {dealer.profile_image_url ? (
                            <img
                              src={dealer.profile_image_url}
                              alt={dealer.dealer_name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={styles.podiumAvatarFallback}>
                              {getInitial(dealer.dealer_name)}
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.podiumName}>{dealer.dealer_name}</div>
                          <div style={styles.podiumMeta}>
                            <span>{dealer.city}</span>
                            <span style={{ color: "#d1d5db" }}>|</span>
                            <span>в Kar.bg {getRelativeTime(dealer.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={styles.podiumDescription}>
                        {getDescription(dealer.description, 180)}
                      </div>
                      <div style={styles.podiumScore}>{dealer.listing_count} обяви</div>
                      <div style={styles.podiumActions}>
                        <button
                          type="button"
                          style={{
                            ...styles.followButton,
                            ...(isDealerFollowed(dealer.id) ? styles.followButtonActive : {}),
                          }}
                          onClick={(event) => handleToggleDealerFollow(event, dealer)}
                          aria-label={
                            isDealerFollowed(dealer.id)
                              ? `Спри следването на ${dealer.dealer_name}`
                              : `Следвай ${dealer.dealer_name}`
                          }
                          title={isDealerFollowed(dealer.id) ? "Спри следването" : "Следвай дилъра"}
                        >
                          <FiBell size={14} />
                          {isDealerFollowed(dealer.id) ? "Следваш" : "Следвай"}
                        </button>
                        <button
                          style={styles.podiumButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dealers/${dealer.id}`);
                          }}
                        >
                          Виж профил
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.h2}>Класация</h2>
                  <p style={styles.sectionLead}>Пълният лидерборд с детайли</p>
                </div>
              </div>

              <div style={styles.rankList}>
                {restDealers.map((dealer, index) => {
                  const rank = topDealers.length + index + 1;
                  return (
                    <div
                      key={dealer.id}
                      className="rank-row"
                      style={{
                        ...styles.rankRow,
                        ...(hoveredCard === dealer.id ? { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" } : {}),
                      }}
                      onMouseEnter={() => setHoveredCard(dealer.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => navigate(`/dealers/${dealer.id}`)}
                    >
                      <div style={styles.rankIndex}>#{rank}</div>
                      <div style={styles.rankAvatar}>
                        {dealer.profile_image_url ? (
                          <img
                            src={dealer.profile_image_url}
                            alt={dealer.dealer_name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={styles.podiumAvatarFallback}>
                            {getInitial(dealer.dealer_name)}
                          </div>
                        )}
                      </div>
                      <div style={styles.rankInfo}>
                        <div style={styles.rankName}>{dealer.dealer_name}</div>
                        <div style={styles.rankMeta}>
                          <span>{dealer.city}</span>
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{dealer.phone}</span>
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{dealer.email}</span>
                        </div>
                        <div style={styles.rankDescription}>
                          {getDescription(dealer.description, 220)}
                        </div>
                      </div>
                      <div style={styles.rankStats} className="rank-stats">
                        <div style={styles.rankScore}>{dealer.listing_count} обяви</div>
                        <div>в Kar.bg {getRelativeTime(dealer.created_at)}</div>
                      </div>
                      <div style={styles.rankActions} className="rank-actions">
                        <button
                          type="button"
                          style={{
                            ...styles.followButton,
                            ...(isDealerFollowed(dealer.id) ? styles.followButtonActive : {}),
                          }}
                          onClick={(event) => handleToggleDealerFollow(event, dealer)}
                          aria-label={
                            isDealerFollowed(dealer.id)
                              ? `Спри следването на ${dealer.dealer_name}`
                              : `Следвай ${dealer.dealer_name}`
                          }
                          title={isDealerFollowed(dealer.id) ? "Спри следването" : "Следвай дилъра"}
                        >
                          <FiBell size={14} />
                          {isDealerFollowed(dealer.id) ? "Следваш" : "Следвай"}
                        </button>
                        <button
                          className="rank-action"
                          style={styles.rankButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dealers/${dealer.id}`);
                          }}
                        >
                          Профил
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
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
      </main>
    </div>
  );
};

export default DealersPage;
