import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { BrandSelector } from "./BrandSelector";
import { BULGARIAN_CITIES_BY_REGION } from "../constants/bulgarianCities";

interface SearchCriteria {
  category: string;
  brand: string;
  model: string;
  maxPrice: string;
  yearFrom: string;
  yearTo: string;
  fuel: string;
  gearbox: string;
  condition: string;
  sortBy: string;
  isNew: boolean;
  isUsed: boolean;
  isPartial: boolean;
  isParts: boolean;
  // Advanced filters (price, mileage, engine ranges)
  priceFrom: string;
  priceTo: string;
  mileageFrom: string;
  mileageTo: string;
  engineFrom: string;
  engineTo: string;
  region: string;
  color: string;
}

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria) => void;
  brands: string[];
  models: Record<string, string[]>;
  categories: Array<{ value: string; label: string }>;
}

const FUEL_OPTIONS = ["Бензин", "Дизел", "Газ/Бензин", "Хибрид", "Електро"];
const GEARBOX_OPTIONS = ["Ръчна", "Автоматик"];
const COLOR_OPTIONS = [
  "Черен", "Бял", "Сив", "Червен", "Син", "Зелен", "Жълт", "Оранжев", "Кафяв", "Розов"
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  brands,
  models,
  categories,
}) => {
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    category: "",
    brand: "",
    model: "",
    maxPrice: "",
    yearFrom: "",
    yearTo: "",
    fuel: "",
    gearbox: "",
    condition: "",
    sortBy: "Марка/Модел/Цена",
    isNew: false,
    isUsed: true,
    isPartial: false,
    isParts: false,
    // Advanced filters
    priceFrom: "",
    priceTo: "",
    mileageFrom: "",
    mileageTo: "",
    engineFrom: "",
    engineTo: "",
    region: "",
    color: "",
  });

  const regions = useMemo(() => Object.keys(BULGARIAN_CITIES_BY_REGION), []);
  const cities = useMemo(
    () => (searchCriteria.region ? BULGARIAN_CITIES_BY_REGION[searchCriteria.region] : []),
    [searchCriteria.region]
  );

  const availableModels = useMemo(
    () => (searchCriteria.brand && models[searchCriteria.brand] ? models[searchCriteria.brand] : []),
    [searchCriteria.brand, models]
  );

  const handleInputChange = (field: keyof SearchCriteria, value: string | boolean) => {
    setSearchCriteria((prev) => {
      // Handle boolean fields
      if (typeof value === "string" && (value === "true" || value === "false")) {
        return { ...prev, [field]: value === "true" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Build query object with only relevant search parameters
    const query: Record<string, any> = {};

    // Only include fields that have values
    if (searchCriteria.brand) query.brand = searchCriteria.brand;
    if (searchCriteria.model) query.model = searchCriteria.model;
    if (searchCriteria.maxPrice) query.maxPrice = searchCriteria.maxPrice;
    if (searchCriteria.yearFrom) query.yearFrom = searchCriteria.yearFrom;
    if (searchCriteria.yearTo) query.yearTo = searchCriteria.yearTo;
    if (searchCriteria.fuel) query.fuel = searchCriteria.fuel;
    if (searchCriteria.gearbox) query.gearbox = searchCriteria.gearbox;
    if (searchCriteria.condition) query.condition = searchCriteria.condition;
    if (searchCriteria.priceFrom) query.priceFrom = searchCriteria.priceFrom;
    if (searchCriteria.priceTo) query.priceTo = searchCriteria.priceTo;
    if (searchCriteria.mileageFrom) query.mileageFrom = searchCriteria.mileageFrom;
    if (searchCriteria.mileageTo) query.mileageTo = searchCriteria.mileageTo;
    if (searchCriteria.engineFrom) query.engineFrom = searchCriteria.engineFrom;
    if (searchCriteria.engineTo) query.engineTo = searchCriteria.engineTo;
    if (searchCriteria.color) query.color = searchCriteria.color;
    if (searchCriteria.region) query.region = searchCriteria.region;
    if (searchCriteria.category) query.category = searchCriteria.category;
    if (searchCriteria.sortBy) query.sortBy = searchCriteria.sortBy;

    console.log("Search Query:", query);

    // Navigate to search page with query parameters
    const queryString = new URLSearchParams(query).toString();
    navigate(`/search?${queryString}`);

    // Also call onSearch for any landing page updates
    onSearch(searchCriteria);
  };

  const handleClearFilters = () => {
    setSearchCriteria({
      category: "",
      brand: "",
      model: "",
      maxPrice: "",
      yearFrom: "",
      yearTo: "",
      fuel: "",
      gearbox: "",
      condition: "",
      sortBy: "Марка/Модел/Цена",
      isNew: false,
      isUsed: true,
      isPartial: false,
      isParts: false,
      priceFrom: "",
      priceTo: "",
      mileageFrom: "",
      mileageTo: "",
      engineFrom: "",
      engineTo: "",
      region: "",
      color: "",
    });
    setShowAdvanced(false);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSearch} style={styles.form}>
        {/* QUICK SEARCH SECTION - Mobile.bg Style */}
        <div style={styles.quickSearchSection}>
          {/* Row 1: Category, Brand, Model, Condition */}
          <div style={styles.quickSearchRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Тип на колата</label>
              <select
                value={searchCriteria.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                style={styles.select}
              >
                <option value="">Всички</option>
                <option value="Седан">Седан</option>
                <option value="Хечбек">Хечбек</option>
                <option value="Комби">Комби</option>
                <option value="Купе">Купе</option>
                <option value="Кабрио">Кабрио</option>
                <option value="Джип">Джип</option>
                <option value="Ван">Ван</option>
                <option value="Миниван">Миниван</option>
                <option value="Пикап">Пикап</option>
                <option value="Стреч лимузина">Стреч лимузина</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Марка</label>
              <BrandSelector
                value={searchCriteria.brand}
                onChange={(brand) => {
                  handleInputChange("brand", brand);
                  handleInputChange("model", "");
                }}
                brands={brands}
                placeholder="Всички"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Модел</label>
              <select
                value={searchCriteria.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                style={styles.select}
                disabled={!searchCriteria.brand}
              >
                <option value="">Всички</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Намира се в:</label>
              <select
                value={searchCriteria.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                style={styles.select}
              >
                <option value="">Всички</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Max Price, Year, Fuel, Gearbox */}
          <div style={styles.quickSearchRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Максимална цена</label>
              <input
                type="number"
                placeholder="€"
                value={searchCriteria.maxPrice}
                onChange={(e) => handleInputChange("maxPrice", e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Година след:</label>
              <select
                value={searchCriteria.yearFrom}
                onChange={(e) => handleInputChange("yearFrom", e.target.value)}
                style={styles.select}
              >
                <option value="">Всички</option>
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Двигател</label>
              <select
                value={searchCriteria.fuel}
                onChange={(e) => handleInputChange("fuel", e.target.value)}
                style={styles.select}
              >
                <option value="">Всички</option>
                {FUEL_OPTIONS.map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {fuel}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Скоростна кутия</label>
              <select
                value={searchCriteria.gearbox}
                onChange={(e) => handleInputChange("gearbox", e.target.value)}
                style={styles.select}
              >
                <option value="">Всички</option>
                {GEARBOX_OPTIONS.map((gb) => (
                  <option key={gb} value={gb}>
                    {gb}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Checkboxes & Sort & Search Button */}
          <div style={styles.quickSearchRow}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={searchCriteria.isNew}
                  onChange={(e) => handleInputChange("isNew", e.target.checked ? "true" : "false")}
                />
                <span>Нов</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={searchCriteria.isUsed}
                  onChange={(e) => handleInputChange("isUsed", e.target.checked ? "true" : "false")}
                />
                <span>Употребяван</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={searchCriteria.isPartial}
                  onChange={(e) => handleInputChange("isPartial", e.target.checked ? "true" : "false")}
                />
                <span>Поведен/ударен</span>
              </label>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={searchCriteria.isParts}
                  onChange={(e) => handleInputChange("isParts", e.target.checked ? "true" : "false")}
                />
                <span>За части</span>
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Подреди резултатите по</label>
              <select
                value={searchCriteria.sortBy}
                onChange={(e) => handleInputChange("sortBy", e.target.value)}
                style={styles.select}
              >
                <option value="Марка/Модел/Цена">Марка/Модел/Цена</option>
                <option value="price-asc">Цена (възходящо)</option>
                <option value="price-desc">Цена (низходящо)</option>
                <option value="year-desc">Година (нови първо)</option>
                <option value="year-asc">Година (стари първо)</option>
              </select>
            </div>

            <button type="submit" style={styles.searchButton}>
              🔍 Търси
            </button>
          </div>

          {/* Advanced Filters Toggle */}
          <div style={styles.advancedToggleRow}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={styles.advancedToggleButton}
            >
              <ChevronDown
                size={16}
                style={{
                  transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s",
                  marginRight: "6px",
                }}
              />
              Още критерии за търсене
            </button>
          </div>
        </div>

        {/* ADVANCED FILTERS SECTION */}
        {showAdvanced && (
          <div style={styles.advancedSection}>
            <h3 style={styles.advancedTitle}>Детайлни филтри</h3>

            {/* Price Range */}
            <div style={styles.rangeGroup}>
              <label style={styles.rangeLabel}>Цена (€)</label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="От"
                  value={searchCriteria.priceFrom}
                  onChange={(e) => handleInputChange("priceFrom", e.target.value)}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeSeparator}>—</span>
                <input
                  type="number"
                  placeholder="До"
                  value={searchCriteria.priceTo}
                  onChange={(e) => handleInputChange("priceTo", e.target.value)}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            {/* Year Range */}
            <div style={styles.rangeGroup}>
              <label style={styles.rangeLabel}>Година</label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="От"
                  value={searchCriteria.yearFrom}
                  onChange={(e) => handleInputChange("yearFrom", e.target.value)}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeSeparator}>—</span>
                <input
                  type="number"
                  placeholder="До"
                  value={searchCriteria.yearTo}
                  onChange={(e) => handleInputChange("yearTo", e.target.value)}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            {/* Mileage Range */}
            <div style={styles.rangeGroup}>
              <label style={styles.rangeLabel}>Пробег (км)</label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="От"
                  value={searchCriteria.mileageFrom}
                  onChange={(e) => handleInputChange("mileageFrom", e.target.value)}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeSeparator}>—</span>
                <input
                  type="number"
                  placeholder="До"
                  value={searchCriteria.mileageTo}
                  onChange={(e) => handleInputChange("mileageTo", e.target.value)}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            {/* Engine Size Range */}
            <div style={styles.rangeGroup}>
              <label style={styles.rangeLabel}>Кубатура (cc)</label>
              <div style={styles.rangeInputs}>
                <input
                  type="number"
                  placeholder="От"
                  value={searchCriteria.engineFrom}
                  onChange={(e) => handleInputChange("engineFrom", e.target.value)}
                  style={styles.rangeInput}
                />
                <span style={styles.rangeSeparator}>—</span>
                <input
                  type="number"
                  placeholder="До"
                  value={searchCriteria.engineTo}
                  onChange={(e) => handleInputChange("engineTo", e.target.value)}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            {/* Single Selects - Region, Color, Condition, Category */}
            <div style={styles.selectsGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Регион</label>
                <select
                  value={searchCriteria.region}
                  onChange={(e) => handleInputChange("region", e.target.value)}
                  style={styles.select}
                >
                  <option value="">Всички</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Цвят</label>
                <select
                  value={searchCriteria.color}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  style={styles.select}
                >
                  <option value="">Всички</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Състояние</label>
                <select
                  value={searchCriteria.condition}
                  onChange={(e) => handleInputChange("condition", e.target.value)}
                  style={styles.select}
                >
                  <option value="">Всички</option>
                  <option value="Нов">Нов</option>
                  <option value="Употребяван">Употребяван</option>
                  <option value="Повреден/ударен">Повреден/ударен</option>
                  <option value="За части">За части</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <button
              type="button"
              onClick={handleClearFilters}
              style={styles.clearButton}
            >
              Изчисти филтрите
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#fff",
    borderRadius: "8px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "32px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  quickSearchSection: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  quickSearchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  select: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
    cursor: "pointer",
    background: "#fff",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  searchButton: {
    flex: 1,
    padding: "12px 24px",
    background: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  toggleButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    background: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  advancedSection: {
    borderTop: "1px solid #eee",
    paddingTop: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  advancedTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#333",
    margin: "0 0 12px 0",
  },
  rangeGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  rangeLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  rangeInputs: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "12px",
    alignItems: "center",
  },
  rangeInput: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  rangeSeparator: {
    textAlign: "center",
    color: "#999",
    fontWeight: "600",
  },
  selectsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
  },
  clearButton: {
    padding: "12px 24px",
    background: "#f5f5f5",
    color: "#d32f2f",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
    alignSelf: "flex-start",
  },
  quickSearchRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    alignItems: "flex-end",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  checkboxGroup: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#333",
  },
  advancedToggleRow: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "12px",
    borderTop: "1px solid #eee",
  },
  advancedToggleButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "none",
    color: "#0066cc",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "color 0.2s",
  },
};

