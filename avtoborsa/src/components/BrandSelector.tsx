import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface BrandSelectorProps {
  value: string;
  onChange: (brand: string) => void;
  brands: string[];
  placeholder?: string;
}

const POPULAR_BRANDS = ["Mercedes-Benz", "BMW", "Audi", "Volkswagen", "Opel"];

export const BrandSelector: React.FC<BrandSelectorProps> = ({
  value,
  onChange,
  brands,
  placeholder = "Избери марка",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredBrands, setFilteredBrands] = useState<string[]>(brands);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const filtered = brands.filter((brand) =>
      brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBrands(filtered);
  }, [searchTerm, brands]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onChange("");
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid #e5e7eb",
          borderRadius: "10px",
          padding: "0 12px",
          height: 42,
          cursor: "pointer",
          background: "#fff",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxSizing: "border-box",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={value || placeholder}
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "14px",
            fontFamily: "inherit",
            color: "#1f2937",
            background: "transparent",
          }}
        />
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 4px",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        )}
        <ChevronDown size={16} style={{ marginLeft: "8px", color: "#666" }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: "10px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          className="akSearchMarki"
        >
          {/* Popular Brands Section */}
          {!searchTerm && (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#999",
                  background: "#f5f5f5",
                  borderBottom: "1px solid #eee",
                }}
              >
                Популярни марки
              </div>
              {POPULAR_BRANDS.map((brand) => (
                <div
                  key={brand}
                  onClick={() => handleSelect(brand)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: value === brand ? "#e3f2fd" : "#fff",
                    color: value === brand ? "#0066cc" : "#333",
                    fontWeight: value === brand ? "600" : "400",
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = value === brand ? "#e3f2fd" : "#fff";
                  }}
                >
                  {brand}
                </div>
              ))}
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#999",
                  background: "#f5f5f5",
                  borderTop: "1px solid #eee",
                  borderBottom: "1px solid #eee",
                }}
              >
                Всички марки
              </div>
            </>
          )}

          {/* All Brands */}
          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <div
                key={brand}
                onClick={() => handleSelect(brand)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: value === brand ? "#e3f2fd" : "#fff",
                  color: value === brand ? "#0066cc" : "#333",
                  fontWeight: value === brand ? "600" : "400",
                  borderBottom: "1px solid #f0f0f0",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = value === brand ? "#e3f2fd" : "#fff";
                }}
              >
                {brand}
              </div>
            ))
          ) : (
            <div style={{ padding: "12px", textAlign: "center", color: "#999" }}>
              Няма намерени марки
            </div>
          )}
        </div>
      )}
    </div>
  );
};

