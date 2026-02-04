import React, { useMemo, useState } from "react";
import Navbar from "./Navbar";
import { CAR_FEATURES } from "../constants/carFeatures";

type Fuel = "Бензин" | "Дизел" | "Газ/Бензин" | "Хибрид" | "Електро";
type Gearbox = "Ръчна" | "Автоматик";
type Condition = "Всички" | "Нова" | "Употребявана";

type Listing = {
  id: string;
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

const BRANDS = [
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
] as const;

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

const FEATURED: Listing[] = [
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
    tags: ["Топ оферта", "Нов внос"],
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
    tags: ["Проверен продавач"],
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
    tags: ["До 5 500 лв"],
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
    tags: ["Икономична"],
  },
];

function formatBgn(value: number) {
  // BG формат със space групиране
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " лв";
}

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

  const results = useMemo(() => {
    // В реален проект тук ще е API call; засега филтрираме FEATURED като демо.
    const pFrom = priceFrom ? Number(priceFrom) : undefined;
    const pTo = priceTo ? Number(priceTo) : undefined;
    const yFrom = yearFrom ? Number(yearFrom) : undefined;
    const yTo = yearTo ? Number(yearTo) : undefined;

    return FEATURED.filter((x) => {
      if (brand && !x.title.toLowerCase().startsWith(brand.toLowerCase())) return false;
      if (model && !x.title.toLowerCase().includes(model.toLowerCase())) return false;
      if (city && x.city !== city) return false;
      if (fuel && x.fuel !== fuel) return false;
      if (gearbox && x.gearbox !== gearbox) return false;

      if (condition !== "Всички") {
        // демо: приемаме че няма нови коли във FEATURED
        if (condition === "Нова") return false;
      }

      if (pFrom != null && x.priceBgn < pFrom) return false;
      if (pTo != null && x.priceBgn > pTo) return false;

      if (yFrom != null && x.year < yFrom) return false;
      if (yTo != null && x.year > yTo) return false;

      if (hasPhotosOnly && !x.imageUrl) {
        // демо: ако няма imageUrl, го броим като "без снимка"
        return false;
      }

      return true;
    });
  }, [
    brand,
    model,
    city,
    fuel,
    gearbox,
    condition,
    priceFrom,
    priceTo,
    yearFrom,
    yearTo,
    hasPhotosOnly,
  ]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Тук би навигирал към /search?... или би викнал API.
    // Засега само държим резултатите в UI.
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
      <Navbar />

      <main style={styles.main}>
        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.heroGlow} />
          <div style={styles.heroInner}>
            <div style={styles.heroLeft}>
              <h1 style={styles.h1}>
                Търсене на автомобили и МПС
              </h1>
              <p style={styles.lead}>
                Намерете перфектния автомобил от над 200 000 обяви
              </p>
            </div>

            {/* SEARCH CARD */}
            <div id="search" style={styles.searchCard}>
              <div style={{ ...styles.searchHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={styles.searchTitle}>Търси обяви</div>
                  <div style={styles.searchSubtitle}>Филтрирай умно — намери по-бързо</div>
                </div>
                <div style={{ minWidth: 250 }}>
                  <label style={{ ...styles.label, display: "block", marginBottom: 6 }}>Търсене в категория</label>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <select style={selectBase} value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <span style={styles.selectChevron}>▾</span>
                  </div>
                </div>
              </div>

              <form onSubmit={onSubmitSearch} style={styles.form}>
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
                        e.currentTarget.style.borderColor = "#0066cc";
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
                                    <label style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 12, display: "block", textTransform: "capitalize", paddingBottom: 8, borderBottom: "2px solid #0066cc" }}>
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
                                background: "#0066cc",
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
              </form>
            </div>
          </div>
        </section>

        {/* FEATURED */}
        <section id="featured" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>Топ обяви</h2>
            <p style={styles.sectionLead}>
              Подбрани оферти — идеални за начална страница (можеш да ги смениш с реални от базата).
            </p>
          </div>

          <div style={styles.cardsGrid} className="cards-grid">
            {results.map((x) => (
              <ListingCard key={x.id} item={x} />
            ))}
            {results.length === 0 && (
              <div style={styles.empty}>
                <div style={styles.emptyTitle}>Няма резултати по тези филтри</div>
                <div style={styles.emptyText}>Пробвай да разшириш търсенето или изчисти филтрите.</div>
                <button style={styles.secondaryBtn} onClick={resetFilters} type="button">
                  Изчисти филтрите
                </button>
              </div>
            )}
          </div>
        </section>

        {/* CATEGORIES */}
        <section id="categories" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>Категории</h2>
            <p style={styles.sectionLead}>
              Бързи входове за масовия пазар (силни за SEO и UX).
            </p>
          </div>

          <div style={styles.categoriesGrid} className="categories-grid">
            <Category title="До 5 000 лв" subtitle="най-търсени бюджетни" />
            <Category title="До 10 000 лв" subtitle="най-доброто за цена/качество" />
            <Category title="Нов внос" subtitle="свежи предложения" />
            <Category title="От собственик" subtitle="без посредници" />
            <Category title="Автоматик" subtitle="комфорт в града" />
            <Category title="4x4 / SUV" subtitle="за зима и път" />
            <Category title="На части" subtitle="обяви за части" />
            <Category title="На изплащане" subtitle="гъвкави оферти" />
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

      <footer style={styles.footer}>
        <div style={styles.footerInner} className="footer-grid">
          <div style={styles.footerCol}>
            <div style={styles.footerBrand}>AvtoBorsa.bg</div>
            <div style={styles.footerText}>
              Модерен маркетплейс за авто обяви. Бързо търсене, лесно публикуване, удобен UX.
            </div>
          </div>

          <div style={styles.footerCol}>
            <div style={styles.footerTitle}>Бързи връзки</div>
            <a style={styles.footerLink} href="#search">Търсене</a>
            <a style={styles.footerLink} href="#featured">Топ обяви</a>
            <a style={styles.footerLink} href="#categories">Категории</a>
          </div>

          <div style={styles.footerCol}>
            <div style={styles.footerTitle}>Политики</div>
            <a style={styles.footerLink} href="#">Условия</a>
            <a style={styles.footerLink} href="#">Поверителност</a>
            <a style={styles.footerLink} href="#">Контакт</a>
          </div>
        </div>

        <div style={styles.footerBottom}>
          © {new Date().getFullYear()} AvtoBorsa.bg — demo UI
        </div>
      </footer>
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

function ListingCard({ item }: { item: Listing }) {
  const placeholder = useMemo(() => {
    // SVG placeholder (без външни зависимости)
    const svg = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#1b2a4a"/>
            <stop offset="1" stop-color="#0f1a2f"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#g)"/>
        <g fill="rgba(255,255,255,0.12)">
          <circle cx="950" cy="160" r="90"/>
          <circle cx="1020" cy="280" r="60"/>
          <circle cx="840" cy="300" r="50"/>
        </g>
        <text x="60" y="120" font-family="Arial" font-size="54" fill="rgba(255,255,255,0.85)">AvtoBorsa.bg</text>
        <text x="60" y="190" font-family="Arial" font-size="28" fill="rgba(255,255,255,0.65)">Снимката ще бъде тук</text>
        <rect x="60" y="260" width="520" height="320" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
        <text x="90" y="330" font-family="Arial" font-size="26" fill="rgba(255,255,255,0.72)">• Бързо качване</text>
        <text x="90" y="380" font-family="Arial" font-size="26" fill="rgba(255,255,255,0.72)">• Ясна цена</text>
        <text x="90" y="430" font-family="Arial" font-size="26" fill="rgba(255,255,255,0.72)">• Удобни филтри</text>
      </svg>
    `);
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }, []);

  return (
    <article style={styles.card} className="card">
      <div style={styles.cardMedia}>
        <img
          src={item.imageUrl || placeholder}
          alt={item.title}
          style={styles.cardImg}
          loading="lazy"
        />
        <div style={styles.pricePill}>{formatBgn(item.priceBgn)}</div>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.cardTitleRow}>
          <div style={styles.cardTitle}>{item.title}</div>
          <div style={styles.cityPill}>{item.city}</div>
        </div>

        <div style={styles.metaRow}>
          <Meta>{item.year} г.</Meta>
          <Dot />
          <Meta>{formatKm(item.mileageKm)}</Meta>
          <Dot />
          <Meta>{item.fuel}</Meta>
          <Dot />
          <Meta>{item.gearbox}</Meta>
          <Dot />
          <Meta>{item.powerHp} к.с.</Meta>
        </div>

        <div style={styles.tagsRow}>
          {(item.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} style={styles.tag}>
              {t}
            </span>
          ))}
        </div>

        <div style={styles.cardActions}>
          <button style={styles.secondaryBtnSmall} type="button">
            Запази
          </button>
          <button style={styles.primaryBtnSmall} type="button">
            Виж обявата
          </button>
        </div>
      </div>
    </article>
  );
}

function Category({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={styles.categoryCard} className="categoryCard" role="button" tabIndex={0}>
      <div style={styles.categoryTitle}>{title}</div>
      <div style={styles.categorySub}>{subtitle}</div>
      <div style={styles.categoryCta}>Разгледай →</div>
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span style={styles.meta}>{children}</span>;
}

function Dot() {
  return <span style={{ opacity: 0.25 }}>•</span>;
}

function formatKm(km: number) {
  return km.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " км";
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
    background: "#0066cc",
    color: "#fff",
    fontSize: 14,
  },
  brandName: { fontSize: 18, fontWeight: 700, lineHeight: 1.1, color: "#0066cc" },
  brandTag: { fontSize: 11, color: "#666", marginTop: 2 },
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
    fontSize: 14,
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
    fontSize: 28,
    lineHeight: 1.3,
    margin: "0 0 12px",
    fontWeight: 700,
    color: "#333",
  },
  lead: { margin: 0, color: "#666", fontSize: 14, lineHeight: 1.5, maxWidth: "100%" },

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
  searchTitle: { fontWeight: 700, fontSize: 16, color: "#333" },
  searchSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  form: { padding: "16px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 12,
  },
  label: { fontSize: 13, color: "#555", fontWeight: 500, marginBottom: 4 },
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
    background: "#0066cc",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  primaryBtnWide: {
    height: 42,
    padding: "0 24px",
    borderRadius: 4,
    border: "none",
    background: "#0066cc",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
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
    fontSize: 14,
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
    fontSize: 13,
    cursor: "pointer",
  },
  primaryBtnSmall: {
    height: 34,
    padding: "0 16px",
    borderRadius: 4,
    border: "none",
    background: "#0066cc",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },

  note: { marginTop: 12, fontSize: 12, color: "#999", fontStyle: "italic" },

  section: { padding: "30px 0 0" },
  sectionHeader: { marginBottom: 16 },
  h2: { margin: 0, fontSize: 22, fontWeight: 700, color: "#333" },
  sectionLead: { margin: "6px 0 0", color: "#666", fontSize: 14, lineHeight: 1.5 },

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
    fontSize: 15,
    background: "#fff",
    color: "#0066cc",
    border: "1px solid #e0e0e0",
  },
  cardBody: { padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  cardTitleRow: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontWeight: 700, fontSize: 15, lineHeight: 1.3, color: "#333" },
  cityPill: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #e0e0e0",
    background: "#f5f5f5",
    color: "#666",
    whiteSpace: "nowrap",
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8, color: "#666", fontSize: 13, lineHeight: 1.4 },
  meta: { whiteSpace: "nowrap" },
  tagsRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  tag: {
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid #d0e8ff",
    background: "#e6f2ff",
    color: "#0066cc",
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
  emptyTitle: { fontWeight: 700, fontSize: 18, color: "#333" },
  emptyText: { color: "#666", margin: "8px 0 16px", fontSize: 14 },

  categoriesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 16,
  },
  categoryCard: {
    borderRadius: 6,
    border: "1px solid #e0e0e0",
    background: "#fff",
    padding: 16,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s",
  },
  categoryTitle: { fontWeight: 700, fontSize: 15, color: "#333" },
  categorySub: { marginTop: 6, color: "#666", fontSize: 13, lineHeight: 1.4 },
  categoryCta: { marginTop: 10, fontSize: 13, fontWeight: 600, color: "#0066cc" },

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
  h3: { margin: 0, fontSize: 20, fontWeight: 700, color: "#333" },
  ctaText: { margin: "6px 0 0", color: "#666", fontSize: 14, lineHeight: 1.5, maxWidth: 600 },

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
  footerBrand: { fontWeight: 700, fontSize: 16, color: "#0066cc" },
  footerText: { color: "#666", fontSize: 13, lineHeight: 1.6, maxWidth: 400 },
  footerTitle: { fontWeight: 700, fontSize: 14, color: "#333" },
  footerLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: 13,
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
  * { box-sizing: border-box; }
  html, body {  width: 100%; margin: 0; padding: 0; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  #root { width: 100%; }
  a:hover { text-decoration: underline; }
  input::placeholder { color: #999; }
  input, select, button { font-family: inherit; }
  input:focus, select:focus { border-color: #0066cc; outline: none; }
  button:hover { opacity: 0.9; }
  button:active { opacity: 0.8; }
  select option { color: #333; background: #fff; }
  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }
  .categoryCard:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }

  /* Desktop (1200px+) */
  @media (min-width: 1201px) {
    body { font-size: 15px; }
    .search-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
    .categories-grid { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
  }

  /* Tablet Large (1024px - 1200px) */
  @media (min-width: 1024px) and (max-width: 1200px) {
    body { font-size: 14px; }
    .search-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
    .categories-grid { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  }

  /* Tablet (768px - 1023px) */
  @media (min-width: 768px) and (max-width: 1023px) {
    body { font-size: 14px; }
    .search-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .cards-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .categories-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Large (640px - 767px) */
  @media (min-width: 640px) and (max-width: 767px) {
    body { font-size: 13px; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .categories-grid { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }

  /* Mobile Small (< 640px) */
  @media (max-width: 639px) {
    body { font-size: 13px; }
    .search-grid { grid-template-columns: 1fr !important; }
    .cards-grid { grid-template-columns: 1fr !important; }
    .categories-grid { grid-template-columns: 1fr !important; }
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


