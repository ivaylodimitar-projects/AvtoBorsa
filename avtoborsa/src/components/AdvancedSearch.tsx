import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
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

  const advancedSearchCSS = `
    .adv-search-root {
      background: #f9fafb;
      border-radius: 16px;
      padding: 28px 24px 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1.5px 6px rgba(0,0,0,0.04);
      max-width: 900px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .adv-search-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .adv-search-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px 16px;
    }
    .adv-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .adv-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #6b7280;
      text-transform: uppercase;
      padding-left: 2px;
    }
    .adv-select,
    .adv-input {
      width: 100%;
      height: 42px;
      padding: 0 12px;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      font-size: 14px;
      color: #1f2937;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      appearance: none;
      -webkit-appearance: none;
      box-sizing: border-box;
    }
    .adv-select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6' stroke='%236b7280' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }
    .adv-select:focus,
    .adv-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.10);
    }
    .adv-select--disabled {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
      border-color: #e5e7eb;
    }
    .adv-lock-icon {
      position: absolute;
      right: 34px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
      pointer-events: none;
      opacity: 0.5;
    }
    .adv-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .adv-chip {
      display: inline-flex;
      align-items: center;
      padding: 6px 16px;
      border-radius: 20px;
      border: 1.5px solid #e5e7eb;
      background: #fff;
      font-size: 13px;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .adv-chip:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    .adv-chip--active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #2563eb;
      font-weight: 600;
    }
    .adv-action-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 2px;
    }
    .adv-search-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 32px;
      height: 48px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(37,99,235,0.3);
      letter-spacing: 0.02em;
    }
    .adv-search-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(37,99,235,0.35);
    }
    .adv-search-btn:active {
      transform: translateY(0);
    }
    .adv-detailed-link {
      display: inline-flex;
      align-items: center;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 13px;
      cursor: pointer;
      padding: 4px 0;
      transition: color 0.2s;
    }
    .adv-detailed-link:hover {
      color: #2563eb;
    }
    .adv-detailed-section {
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
      animation: advSlideDown 0.25s ease;
    }
    @keyframes advSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .adv-detailed-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px 16px;
      margin-bottom: 14px;
    }
    .adv-clear-btn {
      display: inline-flex;
      align-items: center;
      background: none;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      color: #6b7280;
      font-size: 13px;
      padding: 8px 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .adv-clear-btn:hover {
      border-color: #ef4444;
      color: #ef4444;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .adv-search-root {
        padding: 20px 16px 18px;
        border-radius: 12px;
      }
      .adv-search-grid,
      .adv-detailed-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .adv-action-row {
        flex-direction: column;
        gap: 10px;
      }
      .adv-search-btn {
        width: 100%;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .adv-search-grid,
      .adv-detailed-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  return (
    <div className="adv-search-root">
      <style>{advancedSearchCSS}</style>
      <form onSubmit={handleSearch} className="adv-search-form">
        {/* PRIMARY GRID — 3 columns on desktop, stacks on mobile */}
        <div className="adv-search-grid">
          {/* Make */}
          <div className="adv-field">
            <label className="adv-label">МАРКА</label>
            <BrandSelector
              value={searchCriteria.brand}
              onChange={(brand) => {
                handleInputChange("brand", brand);
                handleInputChange("model", "");
              }}
              brands={brands}
              placeholder="Всички марки"
            />
          </div>

          {/* Model — locked until Make is selected */}
          <div className="adv-field">
            <label className="adv-label">МОДЕЛ</label>
            <div style={{ position: "relative" }}>
              <select
                value={searchCriteria.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                className={`adv-select ${!searchCriteria.brand ? "adv-select--disabled" : ""}`}
                disabled={!searchCriteria.brand}
              >
                <option value="">{searchCriteria.brand ? "Всички модели" : "Избери марка първо"}</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              {!searchCriteria.brand && (
                <span className="adv-lock-icon" title="Избери марка първо">🔒</span>
              )}
            </div>
          </div>

          {/* Body Type */}
          <div className="adv-field">
            <label className="adv-label">ТИП</label>
            <select
              value={searchCriteria.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="adv-select"
            >
              <option value="">Всички типове</option>
              <option value="Седан">Седан</option>
              <option value="Хечбек">Хечбек</option>
              <option value="Комби">Комби</option>
              <option value="Купе">Купе</option>
              <option value="Кабрио">Кабрио</option>
              <option value="Джип">Джип / SUV</option>
              <option value="Ван">Ван</option>
              <option value="Миниван">Миниван</option>
              <option value="Пикап">Пикап</option>
            </select>
          </div>

          {/* Max Price */}
          <div className="adv-field">
            <label className="adv-label">МАКС. ЦЕНА</label>
            <input
              type="number"
              placeholder="€ Без ограничение"
              value={searchCriteria.maxPrice}
              onChange={(e) => handleInputChange("maxPrice", e.target.value)}
              className="adv-input"
            />
          </div>

          {/* Year From */}
          <div className="adv-field">
            <label className="adv-label">ГОДИНА ОТ</label>
            <select
              value={searchCriteria.yearFrom}
              onChange={(e) => handleInputChange("yearFrom", e.target.value)}
              className="adv-select"
            >
              <option value="">Всички години</option>
              {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div className="adv-field">
            <label className="adv-label">РЕГИОН</label>
            <select
              value={searchCriteria.region}
              onChange={(e) => handleInputChange("region", e.target.value)}
              className="adv-select"
            >
              <option value="">Цяла България</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Fuel */}
          <div className="adv-field">
            <label className="adv-label">ГОРИВО</label>
            <select
              value={searchCriteria.fuel}
              onChange={(e) => handleInputChange("fuel", e.target.value)}
              className="adv-select"
            >
              <option value="">Всички</option>
              {FUEL_OPTIONS.map((fuel) => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
          </div>

          {/* Gearbox */}
          <div className="adv-field">
            <label className="adv-label">СКОРОСТИ</label>
            <select
              value={searchCriteria.gearbox}
              onChange={(e) => handleInputChange("gearbox", e.target.value)}
              className="adv-select"
            >
              <option value="">Всички</option>
              {GEARBOX_OPTIONS.map((gb) => (
                <option key={gb} value={gb}>{gb}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="adv-field">
            <label className="adv-label">ПОДРЕДИ ПО</label>
            <select
              value={searchCriteria.sortBy}
              onChange={(e) => handleInputChange("sortBy", e.target.value)}
              className="adv-select"
            >
              <option value="Марка/Модел/Цена">Марка / Модел / Цена</option>
              <option value="price-asc">Цена ↑</option>
              <option value="price-desc">Цена ↓</option>
              <option value="year-desc">Най-нови</option>
              <option value="year-asc">Най-стари</option>
            </select>
          </div>
        </div>

        {/* CONDITION CHIPS */}
        <div className="adv-chips-row">
          {[
            { key: "isUsed" as const, label: "Употребяван" },
            { key: "isNew" as const, label: "Нов" },
            { key: "isPartial" as const, label: "Повреден / ударен" },
            { key: "isParts" as const, label: "За части" },
          ].map(({ key, label }) => (
            <label
              key={key}
              className={`adv-chip ${searchCriteria[key] ? "adv-chip--active" : ""}`}
            >
              <input
                type="checkbox"
                checked={searchCriteria[key] as boolean}
                onChange={(e) => handleInputChange(key, e.target.checked ? "true" : "false")}
                style={{ display: "none" }}
              />
              {label}
            </label>
          ))}
        </div>

        {/* ACTION ROW — Search button + Detailed Search link */}
        <div className="adv-action-row">
          <button type="submit" className="adv-search-btn">
            <Search size={18} style={{ marginRight: 8 }} />
            Търси обяви
          </button>
          <button
            type="button"
            className="adv-detailed-link"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <ChevronDown
              size={14}
              style={{
                transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
                marginRight: 4,
              }}
            />
            Детайлно търсене
          </button>
        </div>

        {/* ADVANCED / DETAILED FILTERS */}
        {showAdvanced && (
          <div className="adv-detailed-section">
            <div className="adv-detailed-grid">
              {/* Price Range */}
              <div className="adv-field">
                <label className="adv-label">ЦЕНА ОТ (€)</label>
                <input type="number" placeholder="Мин." value={searchCriteria.priceFrom} onChange={(e) => handleInputChange("priceFrom", e.target.value)} className="adv-input" />
              </div>
              <div className="adv-field">
                <label className="adv-label">ЦЕНА ДО (€)</label>
                <input type="number" placeholder="Макс." value={searchCriteria.priceTo} onChange={(e) => handleInputChange("priceTo", e.target.value)} className="adv-input" />
              </div>

              {/* Mileage Range */}
              <div className="adv-field">
                <label className="adv-label">ПРОБЕГ ОТ (КМ)</label>
                <input type="number" placeholder="Мин." value={searchCriteria.mileageFrom} onChange={(e) => handleInputChange("mileageFrom", e.target.value)} className="adv-input" />
              </div>
              <div className="adv-field">
                <label className="adv-label">ПРОБЕГ ДО (КМ)</label>
                <input type="number" placeholder="Макс." value={searchCriteria.mileageTo} onChange={(e) => handleInputChange("mileageTo", e.target.value)} className="adv-input" />
              </div>

              {/* Engine Range */}
              <div className="adv-field">
                <label className="adv-label">КУБАТУРА ОТ (CC)</label>
                <input type="number" placeholder="Мин." value={searchCriteria.engineFrom} onChange={(e) => handleInputChange("engineFrom", e.target.value)} className="adv-input" />
              </div>
              <div className="adv-field">
                <label className="adv-label">КУБАТУРА ДО (CC)</label>
                <input type="number" placeholder="Макс." value={searchCriteria.engineTo} onChange={(e) => handleInputChange("engineTo", e.target.value)} className="adv-input" />
              </div>

              {/* Year To */}
              <div className="adv-field">
                <label className="adv-label">ГОДИНА ДО</label>
                <select value={searchCriteria.yearTo} onChange={(e) => handleInputChange("yearTo", e.target.value)} className="adv-select">
                  <option value="">Без ограничение</option>
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div className="adv-field">
                <label className="adv-label">ЦВЯТ</label>
                <select value={searchCriteria.color} onChange={(e) => handleInputChange("color", e.target.value)} className="adv-select">
                  <option value="">Всички</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="adv-field">
                <label className="adv-label">СЪСТОЯНИЕ</label>
                <select value={searchCriteria.condition} onChange={(e) => handleInputChange("condition", e.target.value)} className="adv-select">
                  <option value="">Всички</option>
                  <option value="Нов">Нов</option>
                  <option value="Употребяван">Употребяван</option>
                  <option value="Повреден/ударен">Повреден / ударен</option>
                  <option value="За части">За части</option>
                </select>
              </div>
            </div>

            <button type="button" onClick={handleClearFilters} className="adv-clear-btn">
              Изчисти всички филтри
            </button>
          </div>
        )}
      </form>
    </div>
  );
};


