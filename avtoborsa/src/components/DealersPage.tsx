import React, { useState } from "react";

type Dealer = {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  listings: number;
  rating: number;
  verified: boolean;
};

const SAMPLE_DEALERS: Dealer[] = [
  {
    id: "1",
    name: "АвтоПлюс ЕООД",
    city: "София",
    phone: "+359 88 123 4567",
    email: "info@autoplus.bg",
    listings: 45,
    rating: 4.8,
    verified: true,
  },
  {
    id: "2",
    name: "Авто Експрес",
    city: "Пловдив",
    phone: "+359 89 234 5678",
    email: "contact@autoexpress.bg",
    listings: 32,
    rating: 4.5,
    verified: true,
  },
  {
    id: "3",
    name: "Карс Център",
    city: "Варна",
    phone: "+359 87 345 6789",
    email: "sales@carscenter.bg",
    listings: 28,
    rating: 4.6,
    verified: true,
  },
  {
    id: "4",
    name: "Мотор Трейд",
    city: "София",
    phone: "+359 88 456 7890",
    email: "hello@motortrade.bg",
    listings: 56,
    rating: 4.9,
    verified: true,
  },
  {
    id: "5",
    name: "Авто Сервис БГ",
    city: "Русе",
    phone: "+359 86 567 8901",
    email: "service@autoservicebg.bg",
    listings: 18,
    rating: 4.3,
    verified: false,
  },
];

const DealersPage: React.FC = () => {
  const [searchCity, setSearchCity] = useState("Всички");

  const filteredDealers = searchCity === "Всички" ? SAMPLE_DEALERS : SAMPLE_DEALERS.filter((d) => d.city === searchCity);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible", boxSizing: "border-box" },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    header: { marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 700, color: "#333", marginBottom: 8, margin: 0 },
    subtitle: { fontSize: 14, color: "#666", marginBottom: 20, margin: 0 },
    filterContainer: { display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" },
    filterLabel: { fontSize: 14, fontWeight: 500, color: "#333", whiteSpace: "nowrap" },
    filterSelect: { padding: "8px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, minWidth: 150 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
    card: { background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", transition: "box-shadow 0.2s" },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12, gap: 8 },
    dealerName: { fontSize: 16, fontWeight: 700, color: "#333" },
    badge: { fontSize: 11, padding: "4px 8px", background: "#e6f2ff", color: "#0066cc", borderRadius: 3, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 },
    rating: { fontSize: 14, color: "#f59e0b", fontWeight: 600 },
    city: { fontSize: 13, color: "#666", marginBottom: 8 },
    listings: { fontSize: 13, color: "#666", marginBottom: 12 },
    contact: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e0e0e0" },
    contactItem: { fontSize: 12, color: "#666", wordBreak: "break-word" },
    button: { width: "100%", padding: "10px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", boxSizing: "border-box" },
    empty: { textAlign: "center", padding: 40, background: "#fff", borderRadius: 8 },
  };

  return (
    <div style={styles.page}>
      <style>{`
        .dealers-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }

        /* Tablet Large (1024px - 1200px) */
        @media (min-width: 1024px) and (max-width: 1200px) {
          .dealers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }

        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dealers-container { padding: 16px !important; }
          .dealers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dealers-filter { flex-wrap: wrap; }
          .dealers-title { font-size: 24px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .dealers-container { padding: 12px !important; }
          .dealers-grid { grid-template-columns: 1fr !important; }
          .dealers-filter { flex-direction: column; align-items: stretch !important; }
          .dealers-filter select { width: 100%; }
          .dealers-header { margin-bottom: 20px !important; }
          .dealers-title { font-size: 22px !important; }
          .dealers-subtitle { font-size: 13px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .dealers-container { padding: 8px !important; }
          .dealers-grid { grid-template-columns: 1fr !important; }
          .dealers-filter { flex-direction: column; align-items: stretch !important; }
          .dealers-filter select { width: 100%; }
          .dealers-header { margin-bottom: 16px !important; }
          .dealers-title { font-size: 20px !important; margin-bottom: 6px !important; }
          .dealers-subtitle { font-size: 12px !important; }
          .dealers-card { padding: 12px !important; }
          .dealers-card h3 { font-size: 14px !important; }
          .dealers-card p { font-size: 12px !important; }
        }
      `}</style>
      <div style={styles.container} className="dealers-container">
        <div style={styles.header} className="dealers-header">
          <h1 style={styles.title} className="dealers-title">Дилъри и автосалони</h1>
          <p style={styles.subtitle}>Намерете проверени дилъри и автосалони в България</p>
        </div>

        <div style={styles.filterContainer} className="dealers-filter">
          <label style={styles.filterLabel}>Град:</label>
          <select style={styles.filterSelect} value={searchCity} onChange={(e) => setSearchCity(e.target.value)}>
            <option value="Всички">Всички</option>
            <option value="София">София</option>
            <option value="Пловдив">Пловдив</option>
            <option value="Варна">Варна</option>
            <option value="Русе">Русе</option>
          </select>
        </div>

        {filteredDealers.length > 0 ? (
          <div style={styles.grid} className="dealers-grid">
            {filteredDealers.map((dealer) => (
              <div key={dealer.id} style={styles.card} className="dealers-card">
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.dealerName}>{dealer.name}</div>
                    {dealer.verified && <div style={styles.badge}>✓ Проверен</div>}
                  </div>
                  <div style={styles.rating}>⭐ {dealer.rating}</div>
                </div>

                <div style={styles.city}>📍 {dealer.city}</div>
                <div style={styles.listings}>📋 {dealer.listings} активни обяви</div>

                <div style={styles.contact}>
                  <div style={styles.contactItem}>📞 {dealer.phone}</div>
                  <div style={styles.contactItem}>📧 {dealer.email}</div>
                </div>

                <button style={styles.button}>Виж обяви</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.empty}>
            <h3>Няма намерени дилъри</h3>
            <p>Опитайте да промените филтрите</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealersPage;

