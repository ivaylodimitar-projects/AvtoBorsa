import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CAR_FEATURES } from "../constants/carFeatures";
import { AdvancedSearch } from "./AdvancedSearch";
import { useRecentSearches } from "../hooks/useRecentSearches";
import { useSavedSearches } from "../hooks/useSavedSearches";

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
  created_at: string;
  listing_type?: "top" | "normal" | string | number;
  listing_type_display?: string;
  is_top?: boolean;
  is_top_listing?: boolean;
  is_top_ad?: boolean;
};

const isTopListing = (listing: CarListing) => {
  if (listing.is_top || listing.is_top_listing || listing.is_top_ad) return true;
  const numericType = Number(listing.listing_type);
  if (!Number.isNaN(numericType) && numericType === 1) return true;
  const rawType = (listing.listing_type || "").toString().toLowerCase().trim();
  if (["top", "top_ad", "top_listing", "topad", "toplisting"].includes(rawType)) return true;
  const display = (listing.listing_type_display || "").toString().toLowerCase();
  return display.includes("топ");
};

const NEW_LISTING_BADGE_MINUTES = 10;
const NEW_LISTING_BADGE_WINDOW_MS = NEW_LISTING_BADGE_MINUTES * 60 * 1000;
const NEW_LISTING_BADGE_REFRESH_MS = 30_000;

type Fuel = "Бензин" | "Дизел" | "Газ/Бензин" | "Хибрид" | "Електро";
type Gearbox = "Ръчна" | "Автоматик";
type Condition = "Всички" | "Нова" | "Употребявана";

type Listing = {
  id: string;
  slug: string;
  title: string;
  priceBgn: number;
  year: number;
  mileageKm: number;
  city: string;
  fuel: Fuel;
  gearbox: Gearbox;
  powerHp: number;
  imageUrl?: string; // optional – използва placeholder, ако липсва
  tags?: string[];
};

const BRANDS: string[] = [
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "Opel",
  "Ford",
  "Toyota",
  "Honda",
  "Peugeot",
  "Renault",
  "Skoda",
  "Hyundai",
  "Kia",
  "Nissan",
];

const CITIES = [
  "София",
  "Пловдив",
  "Варна",
  "Бургас",
  "Русе",
  "Стара Загора",
  "Плевен",
  "Благоевград",
  "Велико Търново",
  "Шумен",
] as const;

const FUEL: Fuel[] = ["Бензин", "Дизел", "Газ/Бензин", "Хибрид", "Електро"];
const GEARBOX: Gearbox[] = ["Ръчна", "Автоматик"];

const MODELS: Record<string, string[]> = {
  "Audi": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7"],
  "BMW": ["116", "118", "120", "316", "318", "320", "330", "520", "530", "X1", "X3", "X5"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS"],
  "Volkswagen": ["Golf", "Passat", "Tiguan", "Touareg", "Polo", "Jetta", "Arteon"],
  "Opel": ["Astra", "Insignia", "Corsa", "Grandland", "Crossland"],
  "Ford": ["Focus", "Mondeo", "Fiesta", "Kuga", "Edge"],
  "Toyota": ["Corolla", "Camry", "RAV4", "Yaris", "Auris"],
  "Honda": ["Civic", "Accord", "CR-V", "Jazz", "Pilot"],
  "Peugeot": ["208", "308", "3008", "5008", "2008"],
  "Renault": ["Clio", "Megane", "Scenic", "Duster", "Captur"],
  "Skoda": ["Octavia", "Superb", "Fabia", "Kodiaq", "Karoq"],
  "Hyundai": ["i30", "i40", "Tucson", "Santa Fe", "Elantra"],
  "Kia": ["Ceed", "Sportage", "Sorento", "Picanto", "Niro"],
  "Nissan": ["Qashqai", "X-Trail", "Altima", "Micra", "Juke"],
};

const CATEGORIES = [
  { value: "1", label: "Автомобили и Джипове" },
  { value: "w", label: "Гуми и джанти" },
  { value: "u", label: "Части" },
  { value: "3", label: "Бусове" },
  { value: "4", label: "Камиони" },
  { value: "5", label: "Мотоциклети" },
  { value: "6", label: "Селскостопански" },
  { value: "7", label: "Индустриални" },
  { value: "8", label: "Кари" },
  { value: "9", label: "Каравани" },
  { value: "a", label: "Яхти и Лодки" },
  { value: "b", label: "Ремаркета" },
  { value: "c", label: "Велосипеди" },
  { value: "v", label: "Аксесоари" },
  { value: "y", label: "Купува" },
  { value: "z", label: "Услуги" },
];

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const inputBase: React.CSSProperties = {
  width: "100%",
  height: 36,
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fff",
  color: "#333",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
};

const selectBase: React.CSSProperties = {
  ...inputBase,
  appearance: "none",
  paddingRight: 32,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { searches } = useRecentSearches();
  const { savedSearches } = useSavedSearches();

  // Latest listings
  const [latestListings, setLatestListings] = useState<CarListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/listings/?limit=16");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        const all: CarListing[] = Array.isArray(data) ? data : (data.results || []);
        // Sort: TOP first, then by created_at descending
        const sorted = [...all].sort((a, b) => {
          const aTop = isTopListing(a) ? 1 : 0;
          const bTop = isTopListing(b) ? 1 : 0;
          if (bTop !== aTop) return bTop - aTop;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setLatestListings(sorted.slice(0, 16));
      } catch (err) {
        console.error("Error fetching latest listings:", err);
      } finally {
        setListingsLoading(false);
      }
    };
    fetchLatest();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, NEW_LISTING_BADGE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // filters
  const [category, setCategory] = useState<string>("1");
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [fuel, setFuel] = useState<string>("");
  const [gearbox, setGearbox] = useState<string>("");
  const [condition, setCondition] = useState<Condition>("Всички");

  const [priceFrom, setPriceFrom] = useState<string>("");
  const [priceTo, setPriceTo] = useState<string>("");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");

  const [hasPhotosOnly, setHasPhotosOnly] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);

  const yearNow = new Date().getFullYear();

  // Results are now fetched from the search page via navigation
  // This variable is no longer used on the landing page
  const results: Listing[] = [];

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Тук би навигирал към /search?... или би викнал API.
    // Засега само държим резултатите в UI.
  };

  const handleAdvancedSearch = (criteria: any) => {
    // Update filters based on search criteria
    setCategory(criteria.category || "1");
    setBrand(criteria.brand || "");
    setModel(criteria.model || "");
    setCity(criteria.region || "");
    setFuel(criteria.fuel || "");
    setGearbox(criteria.gearbox || "");
    setPriceFrom(criteria.priceFrom || "");
    setPriceTo(criteria.priceTo || "");
    setYearFrom(criteria.yearFrom || "");
    setYearTo(criteria.yearTo || "");

    // Log the search query to console
    console.log("Advanced Search Criteria:", criteria);
  };

  const resetFilters = () => {
    setCategory("1");
    setBrand("");
    setModel("");
    setCity("");
    setFuel("");
    setGearbox("");
    setCondition("Всички");
    setPriceFrom("");
    setPriceTo("");
    setYearFrom("");
    setYearTo("");
    setHasPhotosOnly(false);
    setSelectedFeatures([]);
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const isListingNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const listingAgeMs = currentTimeMs - createdAtMs;
    return listingAgeMs >= 0 && listingAgeMs <= NEW_LISTING_BADGE_WINDOW_MS;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 30) return date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
    if (diffDays > 0) return `преди ${diffDays} ${diffDays === 1 ? "ден" : "дни"}`;
    if (diffHours > 0) return `преди ${diffHours} ${diffHours === 1 ? "час" : "часа"}`;
    if (diffMins > 0) return `преди ${diffMins} мин`;
    return "току-що";
  };

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <style>{`
        /* Features dropdown table responsive styles */
        .features-dropdown-table {
          width: 100%;
          border-collapse: collapse;
        }

        .features-dropdown-table td {
          vertical-align: top;
          padding: 12px;
          border-right: 1px solid #e0e0e0;
        }

        /* Desktop (1201px+) - 4 columns */
        @media (min-width: 1201px) {
          .features-dropdown-table td {
            width: 25%;
          }
        }

        /* Tablet Large (1024px - 1200px) - 2 columns */
        @media (min-width: 1024px) and (max-width: 1200px) {
          .features-dropdown-table td {
            width: 50%;
          }
          .features-dropdown-table td:nth-child(odd) {
            border-right: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:nth-child(even) {
            border-right: none;
          }
        }

        /* Tablet (768px - 1023px) - 2 columns */
        @media (min-width: 768px) and (max-width: 1023px) {
          .features-dropdown-table td {
            width: 50%;
          }
          .features-dropdown-table td:nth-child(odd) {
            border-right: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:nth-child(even) {
            border-right: none;
          }
        }

        /* Mobile Large (640px - 767px) - 1 column */
        @media (min-width: 640px) and (max-width: 767px) {
          .features-dropdown-table {
            display: block;
          }
          .features-dropdown-table tbody {
            display: block;
          }
          .features-dropdown-table tr {
            display: block;
          }
          .features-dropdown-table td {
            display: block;
            width: 100% !important;
            padding: 12px 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:last-child {
            border-bottom: none;
          }
        }

        /* Mobile Small (< 640px) - 1 column */
        @media (max-width: 639px) {
          .features-dropdown-table {
            display: block;
          }
          .features-dropdown-table tbody {
            display: block;
          }
          .features-dropdown-table tr {
            display: block;
          }
          .features-dropdown-table td {
            display: block;
            width: 100% !important;
            padding: 12px 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
          }
          .features-dropdown-table td:last-child {
            border-bottom: none;
          }
        }
      `}</style>

      <main style={styles.main}>
        <div id="search" style={styles.searchBlock}>
          <AdvancedSearch
            onSearch={handleAdvancedSearch}
            brands={BRANDS}
            models={MODELS}
            categories={CATEGORIES}
            recentSearches={searches}
            savedSearches={savedSearches}
          />

          {/* OLD FORM - REPLACED WITH ADVANCEDSEARCH */}
          {false && <form onSubmit={onSubmitSearch} style={styles.form}>
              <div style={styles.grid} className="search-grid">

                  <Field label="Марка">
                    <Select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      options={["", ...BRANDS]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Модел">
                    <Select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      options={["", ...(brand && MODELS[brand] ? MODELS[brand] : [])]}
                      placeholder={brand ? "Избери модел" : "Избери марка първо"}
                    />
                  </Field>

                  <Field label="Град">
                    <Select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      options={["", ...CITIES]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Гориво">
                    <Select
                      value={fuel}
                      onChange={(e) => setFuel(e.target.value)}
                      options={["", ...FUEL]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Скоростна кутия">
                    <Select
                      value={gearbox}
                      onChange={(e) => setGearbox(e.target.value)}
                      options={["", ...GEARBOX]}
                      placeholder="Всички"
                    />
                  </Field>

                  <Field label="Състояние">
                    <Select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      options={["Всички", "Употребявана", "Нова"]}
                    />
                  </Field>

                  <Field label="Цена (от)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={priceFrom}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setPriceFrom(v);
                      }}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="Цена (до)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={priceTo}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setPriceTo(v);
                      }}
                      placeholder="напр. 15000"
                    />
                  </Field>

                  <Field label="Година (от)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={yearFrom}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setYearFrom(v ? String(clampNumber(Number(v), 1950, yearNow)) : "");
                      }}
                      placeholder="напр. 2010"
                    />
                  </Field>

                  <Field label="Година (до)">
                    <input
                      style={inputBase}
                      inputMode="numeric"
                      value={yearTo}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        setYearTo(v ? String(clampNumber(Number(v), 1950, yearNow)) : "");
                      }}
                      placeholder={String(yearNow)}
                    />
                  </Field>

                  {/* Features Dropdown */}
                  <div style={{ gridColumn: "1 / -1", position: "relative" }}>
                    <label style={styles.label}>Характеристики</label>
                    <button
                      type="button"
                      onClick={() => setShowFeaturesDropdown(!showFeaturesDropdown)}
                      style={{
                        width: "100%",
                        height: 36,
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        background: "#fff",
                        color: "#333",
                        padding: "0 12px",
                        outline: "none",
                        fontSize: 14,
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0f766e";
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0, 102, 204, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#ccc";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span>{selectedFeatures.length > 0 ? `${selectedFeatures.length} избрани` : "Избери характеристики"}</span>
                      <span style={{ transform: showFeaturesDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 16 }}>▾</span>
                    </button>

                    {/* Modal Overlay */}
                    {showFeaturesDropdown && (
                      <div
                        style={{
                          position: "fixed",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "rgba(0, 0, 0, 0.5)",
                          zIndex: 10000,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => setShowFeaturesDropdown(false)}
                      >
                        {/* Modal Content */}
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 8,
                            padding: 24,
                            maxWidth: 1000,
                            width: "90%",
                            maxHeight: "80vh",
                            overflowY: "auto",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#333", margin: 0 }}>Характеристики</h2>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                background: "none",
                                border: "none",
                                fontSize: 24,
                                cursor: "pointer",
                                color: "#666",
                                padding: 0,
                                width: 32,
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ✕
                            </button>
                          </div>

                          <table className="features-table">
                            <tbody>
                              <tr>
                                {Object.entries(CAR_FEATURES).map(([category, features]) => (
                                  <td key={category}>
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 12, display: "block", textTransform: "capitalize", paddingBottom: 8, borderBottom: "2px solid #0f766e" }}>
                                      {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </label>
                                    {features.map((feature) => (
                                      <div key={feature}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11, cursor: "pointer", padding: "3px 0" }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedFeatures.includes(feature)}
                                            onChange={() => handleFeatureToggle(feature)}
                                            style={{ cursor: "pointer", width: 16, height: 16 }}
                                          />
                                          <span style={{ color: "black", fontWeight: "bold", fontSize: 14 }}>{feature}</span>
                                        </label>
                                      </div>
                                    ))}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>

                          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                padding: "10px 20px",
                                background: "#f0f0f0",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#333",
                              }}
                            >
                              Затвори
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowFeaturesDropdown(false)}
                              style={{
                                padding: "10px 20px",
                                background: "#0f766e",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#fff",
                              }}
                            >
                              Готово
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.formBottom} className="form-bottom">
                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={hasPhotosOnly}
                      onChange={(e) => setHasPhotosOnly(e.target.checked)}
                    />
                    <span>Само със снимки</span>
                  </label>

                  <div style={styles.actions} className="form-actions">
                    <button type="button" style={styles.secondaryBtn} onClick={resetFilters}>
                      Изчисти
                    </button>
                    <button type="submit" style={styles.primaryBtnWide}>
                      Търси
                      <span style={{ opacity: 0.85, marginLeft: 10 }}>
                        ({results.length})
                      </span>
                    </button>
                  </div>
                </div>

                <div style={styles.note}>
                  * Демо: резултатите филтрират примерни “топ обяви”. В реален проект тук се връзва API.
                </div>
            </form>}
          </div>

        {/* LATEST LISTINGS */}
        <section id="latest" style={{ ...styles.section, ...styles.latestSection }}>
          <style>{`
            .listing-card-hover {
              transition: transform 0.25s ease, box-shadow 0.25s ease;
            }
            .listing-card-hover:hover {
              transform: translateY(-4px);
              box-shadow: 0 12px 32px rgba(15,23,42,0.12) !important;
            }
            .listing-top-badge {
              position: absolute;
              top: 10px;
              left: 10px;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: #fff;
              padding: 4px 10px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              box-shadow: 0 4px 10px rgba(220,38,38,0.3);
              z-index: 2;
            }
            .listing-new-badge {
              position: absolute;
              top: 10px;
              left: 10px;
              background: linear-gradient(135deg, #10b981, #059669);
              color: #fff;
              padding: 4px 10px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              box-shadow: 0 4px 10px rgba(5,150,105,0.35);
              z-index: 2;
            }
            .latest-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 18px;
            }
            .view-more-btn {
              transition: background 0.2s ease, box-shadow 0.2s ease;
            }
            .view-more-btn:hover {
              box-shadow: 0 4px 14px rgba(15,118,110,0.35);
            }

            @media (min-width: 1024px) and (max-width: 1200px) {
              .latest-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            }
            @media (min-width: 768px) and (max-width: 1023px) {
              .latest-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            }
            @media (max-width: 767px) {
              .latest-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
            }
          `}</style>

          <div style={styles.latestContainer}>
            <div style={{ ...styles.sectionHeader, ...styles.containerHeader }}>
              <h2 style={styles.h2}>Последни обяви</h2>
              <p style={styles.sectionLead}>
                Най-новите публикувани обяви на пазара
              </p>
            </div>

            {listingsLoading ? (
              <div style={{ textAlign: "center", padding: 40, background: "#f8fafc", borderRadius: 10, border: "1px solid #eef2f7" }}>
                <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>Зареждане на обяви...</p>
              </div>
            ) : latestListings.length > 0 ? (
              <>
                <div className="latest-grid">
                {latestListings.map((listing) => {
                  const isTop = isTopListing(listing);
                  const isNew = isListingNew(listing.created_at);
                  return (
                    <div
                      key={listing.id}
                      className="listing-card-hover"
                      style={{
                        borderRadius: 10,
                        overflow: "hidden",
                        border: isTop ? "2px solid #dc2626" : "1px solid #eef2f7",
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate(`/details/${listing.slug}`)}
                    >
                      {/* Image */}
                      <div style={{ position: "relative", height: 170, background: "#f0f0f0", overflow: "hidden" }}>
                        {isTop && <div className="listing-top-badge">TOP</div>}
                        {isNew && (
                          <div
                            className="listing-new-badge"
                            style={{ top: isTop ? 38 : 10 }}
                          >
                            Нова
                          </div>
                        )}
                        {listing.image_url ? (
                          <img
                            src={listing.image_url}
                            alt={`${listing.brand} ${listing.model}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                        {/* Price overlay */}
                        <div style={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          background: "rgba(255,255,255,0.95)",
                          padding: "5px 10px",
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#0f766e",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        }}>
                          {listing.price.toLocaleString("bg-BG")} &euro;
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", lineHeight: 1.3 }}>
                          {listing.brand} {listing.model}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, color: "#6b7280" }}>
                          <span>{listing.year_from} г.</span>
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{listing.mileage.toLocaleString("bg-BG")} км</span>
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{listing.fuel_display}</span>
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{listing.power} к.с.</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#9ca3af", marginTop: "auto" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {listing.city}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#d97706" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {getRelativeTime(listing.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* View more button */}
                <div style={{ textAlign: "center", marginTop: 28 }}>
                <button
                  className="view-more-btn"
                  type="button"
                  onClick={() => navigate("/search")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "13px 32px",
                    background: "#0f766e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Разгледайте още обяви
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, background: "#f8fafc", borderRadius: 10, border: "1px solid #eef2f7" }}>
                <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>Няма налични обяви в момента</p>
              </div>
            )}
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" style={styles.section}>
          <div style={styles.infoContainer}>
            <div style={{ ...styles.sectionHeader, ...styles.containerHeader }}>
              <h2 style={styles.h2}>За Kar.bg</h2>
              <p style={styles.sectionLead}>
                Ясна платформа за купувачи и продавачи — бързо търсене, честни обяви и лесен контакт.
              </p>
            </div>

            <div style={styles.infoGrid} className="info-grid">
              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>Какво представлява</div>
                <p style={styles.infoText}>
                  AvtoBorsa е{" "}
                  <span style={styles.infoHighlight}>специализирана платформа</span> за покупко‑продажба на
                  автомобили с{" "}
                  <span style={styles.infoHighlight}>умно търсене</span>, ясни параметри и
                  <span style={styles.infoHighlight}> реални снимки</span>.
                </p>
                <p style={styles.infoText}>
                  Събираме оферти от частни лица и автокъщи на едно място, за да спестим време и да дадем
                  <span style={styles.infoHighlight}> прозрачност</span> във всеки избор.
                </p>
              </div>

              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>С какво сме по‑добри</div>
                <ul style={styles.infoList}>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Бързо търсене</span> по марка, модел, цена и регион.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Чист дизайн</span> — без излишен шум, само важното.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>По‑лесна комуникация</span> между купувач и продавач.
                  </li>
                  <li style={styles.infoListItem}>
                    <span style={styles.infoHighlight}>Свежи обяви</span> с приоритет на актуалните оферти.
                  </li>
                </ul>
              </div>

              <div style={styles.infoCard} className="info-card">
                <div style={styles.infoTitle}>Свържете се с нас</div>
                <p style={styles.infoText}>
                  Имате въпрос или нужда от съдействие? Пишете ни през{" "}
                  <span style={styles.infoHighlight}>контактната форма</span> или използвайте{" "}
                  <span style={styles.infoHighlight}>чат в сайта</span>.
                </p>
                <p style={{ ...styles.infoText, marginBottom: 0 }}>
                  Работим бързо и отговаряме в рамките на{" "}
                  <span style={styles.infoHighlight}>работния ден</span>.
                </p>
                <div style={styles.infoContactRow}>
                  <div style={styles.infoContactPill}>Поддръжка</div>
                  <div style={styles.infoContactText}>Пон‑Пет · 09:00–18:00</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={styles.cta}>
          <div style={styles.ctaInner} className="cta-inner">
            <div>
              <h3 style={styles.h3}>Пусни обява за 2 минути</h3>
              <p style={styles.ctaText}>
                Снимки, описание, цена — готово. Удобно за телефон, бързо за публикуване.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }} className="cta-buttons">
              <button style={styles.primaryBtnWide} type="button">
                + Пусни обява
              </button>
              <button style={styles.secondaryBtn} type="button">
                Виж как работи
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <select style={selectBase} value={value} onChange={onChange}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options
          .filter((x) => x !== "")
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </select>
      <span style={styles.selectChevron}>▾</span>
    </div>
  );
}



/* ---------- Styles (inline, без Tailwind) ---------- */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    color: "#333",
    width: "100%",
    overflow: "hidden",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    width: "100%",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    letterSpacing: 0.5,
    background: "#0f766e",
    color: "#fff",
    fontSize: 14,
  },
  brandName: {
    fontSize: 19,
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  brandTag: { fontSize: 12, color: "#666", marginTop: 2 },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  navLink: {
    color: "#333",
    textDecoration: "none",
    fontSize: 15,
    padding: "6px 12px",
    borderRadius: 4,
    fontWeight: 500,
  },

  main: { maxWidth: 1200, margin: "0 auto", padding: "20px 20px 60px", width: "100%" },

  hero: { position: "relative", padding: "0" },
  heroGlow: {
    display: "none",
  },
  heroInner: {
    position: "relative",
    display: "block",
  },
  heroLeft: {
    padding: "0",
    marginBottom: 24,
  },
  h1: {
    fontSize: 32,
    lineHeight: 1.2,
    margin: "0 0 12px",
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  lead: { margin: 0, color: "#666", fontSize: 15, lineHeight: 1.6, maxWidth: "100%" },

  searchCard: {
    borderRadius: 8,
    border: "1px solid #d0d0d0",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
    marginTop: 0,
  },
  searchHeader: {
    padding: "16px",
    borderBottom: "1px solid #e0e0e0",
    background: "#fafafa",
  },
  searchBlock: { marginBottom: 32 },
  searchTitle: {
    fontWeight: 700,
    fontSize: 17,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  searchSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  form: { padding: "16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 12,
  },
  label: { fontSize: 14, color: "#555", fontWeight: 600, marginBottom: 4 },
  selectChevron: {
    position: "absolute",
    right: 12,
    top: 12,
    color: "#666",
    pointerEvents: "none",
  },
  formBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
  } as React.CSSProperties,
  checkboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#333",
  },
  actions: { display: "flex", gap: 10, alignItems: "center" },

  primaryBtn: {
    height: 36,
    padding: "0 20px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  primaryBtnWide: {
    height: 42,
    padding: "0 24px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
  },
  secondaryBtn: {
    height: 42,
    padding: "0 20px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  secondaryBtnSmall: {
    height: 34,
    padding: "0 16px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#333",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  },
  primaryBtnSmall: {
    height: 34,
    padding: "0 16px",
    borderRadius: 4,
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },

  note: { marginTop: 12, fontSize: 13, color: "#999", fontStyle: "italic" },

  section: { padding: "0.1rem 0 0" },
  sectionHeader: { marginBottom: 16, marginTop: "3rem" },
  latestSection: { marginBottom: 32 },
  latestContainer: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 22,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  containerHeader: { marginTop: 0 },
  h2: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  sectionLead: { margin: "6px 0 0", color: "#666", fontSize: 15, lineHeight: 1.6 },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 16,
  },
  card: {
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #e0e0e0",
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    minHeight: 320,
    transition: "box-shadow 0.2s",
  },
  cardMedia: { position: "relative", height: 160, background: "#f0f0f0" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  pricePill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    padding: "6px 12px",
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 16,
    background: "#fff",
    color: "#0f766e",
    border: "1px solid #e0e0e0",
  },
  cardBody: { padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  cardTitleRow: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 },
  cardTitle: {
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1.3,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  cityPill: {
    fontSize: 13,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #e0e0e0",
    background: "#f5f5f5",
    color: "#666",
    whiteSpace: "nowrap",
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8, color: "#666", fontSize: 14, lineHeight: 1.5 },
  meta: { whiteSpace: "nowrap" },
  tagsRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  tag: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #99f6e4",
    background: "#ecfdf5",
    color: "#0f766e",
  },
  cardActions: { display: "flex", justifyContent: "space-between", gap: 10, marginTop: "auto" },

  empty: {
    gridColumn: "1 / -1",
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    padding: 30,
    textAlign: "center",
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: 19,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  emptyText: { color: "#666", margin: "8px 0 16px", fontSize: 15 },

  infoContainer: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 16,
  },
  infoCard: {
    borderRadius: 8,
    border: "1px solid #e3e7ee",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    padding: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 200,
    transition: "box-shadow 0.2s, transform 0.2s",
  },
  infoTitle: {
    fontWeight: 700,
    fontSize: 18,
    color: "#1f2937",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  infoText: { margin: 0, color: "#4b5563", fontSize: 15, lineHeight: 1.7 },
  infoHighlight: { color: "#0f766e", fontWeight: 700 },
  infoList: { margin: 0, paddingLeft: 18, color: "#4b5563", fontSize: 15, lineHeight: 1.7 },
  infoListItem: { marginBottom: 6 },
  infoContactRow: { marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  infoContactPill: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#0f766e",
    border: "1px solid #99f6e4",
    fontWeight: 600,
  },
  infoContactText: { fontSize: 14, color: "#4b5563" },

  cta: {
    marginTop: 30,
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  ctaInner: {
    padding: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  h3: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  ctaText: { margin: "6px 0 0", color: "#666", fontSize: 15, lineHeight: 1.6, maxWidth: 600 },

  footer: {
    marginTop: 50,
    borderTop: "1px solid #e0e0e0",
    background: "#fff",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 30,
  } as React.CSSProperties & { className?: string },
  footerCol: { display: "flex", flexDirection: "column", gap: 10 },
  footerBrand: {
    fontWeight: 700,
    fontSize: 17,
    color: "#0f766e",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerText: { color: "#666", fontSize: 14, lineHeight: 1.7, maxWidth: 400 },
  footerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: "#333",
    fontFamily: "\"Space Grotesk\", \"Manrope\", \"Segoe UI\", sans-serif",
  },
  footerLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: 14,
    padding: "4px 0",
  },
  footerBottom: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 20px",
    color: "#999",
    fontSize: 12,
    borderTop: "1px solid #f0f0f0",
  },
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
  * { box-sizing: border-box; }
  html, body {  width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; font-size: 15px; }
  #root { width: 100%; }
  a:hover { text-decoration: underline; }
  input::placeholder { color: #999; }
  input, select, button { font-family: inherit; }
  input:focus, select:focus { border-color: #0f766e; outline: none; }
  button:hover { opacity: 0.9; }
  button:active { opacity: 0.8; }
  select option { color: #333; background: #fff; }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }
  .info-card:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.12) !important;
    transform: translateY(-2px);
  }
  [role="button"]:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }

  /* Desktop (1200px+) */
  @media (min-width: 1201px) {
    body { font-size: 16px; }
    .search-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  }

  /* Tablet Large (1024px - 1200px) */
  @media (min-width: 1024px) and (max-width: 1200px) {
    body { font-size: 15px; }
    .search-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  }

  /* Tablet (768px - 1023px) */
  @media (min-width: 768px) and (max-width: 1023px) {
    body { font-size: 15px; }
    .search-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .info-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Large (640px - 767px) */
  @media (min-width: 640px) and (max-width: 767px) {
    body { font-size: 14px; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .info-grid { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Small (< 640px) */
  @media (max-width: 639px) {
    body { font-size: 14px; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .info-grid { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
    .form-bottom {
      flex-direction: column;
      align-items: stretch !important;
    }
    .form-actions {
      width: 100%;
      flex-direction: column;
    }
    .form-actions button {
      width: 100%;
    }
    .cta-inner {
      flex-direction: column;
      align-items: stretch !important;
    }
    .cta-buttons {
      flex-direction: column;
      width: 100%;
    }
    .cta-buttons button {
      width: 100%;
    }
  }
`;


