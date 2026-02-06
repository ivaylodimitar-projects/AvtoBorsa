import React, { useState, useMemo } from "react";

type Listing = {
  id: string;
  title: string;
  priceBgn: number;
  year: number;
  mileageKm: number;
  city: string;
  fuel: string;
  gearbox: string;
  powerHp: number;
  imageUrl?: string;
  tags?: string[];
};

const BRANDS = ["Всички", "Audi", "BMW", "Mercedes-Benz", "Volkswagen", "Opel", "Ford", "Toyota", "Honda"];
const CITIES = ["Всички", "София", "Пловдив", "Варна", "Бургас", "Русе"];
const FUEL = ["Всички", "Бензин", "Дизел", "Газ/Бензин", "Хибрид", "Електро"];
const GEARBOX = ["Всички", "Ръчна", "Автоматик"];

const SAMPLE_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "VW Golf 6 1.6 TDI",
    priceBgn: 9800,
    year: 2011,
    mileageKm: 212000,
    city: "Пловдив",
    fuel: "Дизел",
    gearbox: "Ръчна",
    powerHp: 105,
    tags: ["Топ оферта"],
  },
  {
    id: "2",
    title: "BMW 320d F30",
    priceBgn: 25500,
    year: 2014,
    mileageKm: 178000,
    city: "София",
    fuel: "Дизел",
    gearbox: "Автоматик",
    powerHp: 184,
  },
  {
    id: "3",
    title: "Opel Astra 1.4",
    priceBgn: 5200,
    year: 2008,
    mileageKm: 240000,
    city: "Русе",
    fuel: "Бензин",
    gearbox: "Ръчна",
    powerHp: 90,
  },
  {
    id: "4",
    title: "Toyota Auris Hybrid",
    priceBgn: 18900,
    year: 2015,
    mileageKm: 156000,
    city: "Варна",
    fuel: "Хибрид",
    gearbox: "Автоматик",
    powerHp: 136,
  },
  {
    id: "5",
    title: "Mercedes-Benz C-Class",
    priceBgn: 35000,
    year: 2016,
    mileageKm: 98000,
    city: "София",
    fuel: "Дизел",
    gearbox: "Автоматик",
    powerHp: 170,
  },
];

const SearchPage: React.FC = () => {
  const [brand, setBrand] = useState("Всички");
  const [city, setCity] = useState("Всички");
  const [fuel, setFuel] = useState("Всички");
  const [gearbox, setGearbox] = useState("Всички");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  const results = useMemo(() => {
    return SAMPLE_LISTINGS.filter((x) => {
      if (brand !== "Всички" && !x.title.toLowerCase().includes(brand.toLowerCase())) return false;
      if (city !== "Всички" && x.city !== city) return false;
      if (fuel !== "Всички" && x.fuel !== fuel) return false;
      if (gearbox !== "Всички" && x.gearbox !== gearbox) return false;
      if (priceFrom && x.priceBgn < Number(priceFrom)) return false;
      if (priceTo && x.priceBgn > Number(priceTo)) return false;
      return true;
    });
  }, [brand, city, fuel, gearbox, priceFrom, priceTo]);

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "hidden" },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "20px" },
    layout: { display: "grid", gridTemplateColumns: "250px 1fr", gap: 20 },
    sidebar: { background: "#fff", borderRadius: 8, padding: 16, height: "fit-content", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
    filterGroup: { marginBottom: 20 },
    filterLabel: { fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 8 },
    filterInput: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13 },
    results: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
    card: { background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer" },
    cardImage: { width: "100%", height: 200, background: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" },
    cardBody: { padding: 12 },
    cardTitle: { fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 8 },
    cardPrice: { fontSize: 16, fontWeight: 700, color: "#0066cc", marginBottom: 8 },
    cardMeta: { fontSize: 12, color: "#666", marginBottom: 4 },
    empty: { gridColumn: "1 / -1", textAlign: "center", padding: 40, background: "#fff", borderRadius: 8 },
  };

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 1024px) {
          .search-layout { grid-template-columns: 200px 1fr !important; }
        }
        @media (max-width: 768px) {
          .search-layout { grid-template-columns: 1fr !important; }
          .search-sidebar { display: none; }
          .search-results { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .search-results { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.layout} className="search-layout">
          {/* Sidebar Filters */}
          <aside style={styles.sidebar} className="search-sidebar">
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Марка</label>
              <select style={styles.filterInput} value={brand} onChange={(e) => setBrand(e.target.value)}>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Град</label>
              <select style={styles.filterInput} value={city} onChange={(e) => setCity(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Гориво</label>
              <select style={styles.filterInput} value={fuel} onChange={(e) => setFuel(e.target.value)}>
                {FUEL.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Скоростна кутия</label>
              <select style={styles.filterInput} value={gearbox} onChange={(e) => setGearbox(e.target.value)}>
                {GEARBOX.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Цена от</label>
              <input style={styles.filterInput} type="number" placeholder="0" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Цена до</label>
              <input style={styles.filterInput} type="number" placeholder="100000" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
            </div>
          </aside>

          {/* Results */}
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 16, color: "#333" }}>Резултати: {results.length} обяви</h2>
            {results.length > 0 ? (
              <div style={styles.results} className="search-results">
                {results.map((listing) => (
                  <div key={listing.id} style={styles.card}>
                    <div style={styles.cardImage}>📷 Снимка</div>
                    <div style={styles.cardBody}>
                      <div style={styles.cardTitle}>{listing.title}</div>
                      <div style={styles.cardPrice}>{listing.priceBgn.toLocaleString("bg-BG")} лв</div>
                      <div style={styles.cardMeta}>📅 {listing.year}</div>
                      <div style={styles.cardMeta}>🛣️ {listing.mileageKm.toLocaleString("bg-BG")} км</div>
                      <div style={styles.cardMeta}>📍 {listing.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.empty}>
                <h3>Няма намерени обяви</h3>
                <p>Опитайте да промените филтрите</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

