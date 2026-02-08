import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Trash2, X } from "lucide-react";
import { useSavedSearches } from "../hooks/useSavedSearches";

const SavedSearchesMenu: React.FC = () => {
  const navigate = useNavigate();
  const { savedSearches, removeSearch } = useSavedSearches();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const closeDropdown = () => setIsDropdownOpen(false);

  const handleSearchClick = (criteria: Record<string, any>) => {
    const queryString = new URLSearchParams(criteria).toString();
    navigate(`/search?${queryString}`);
    closeDropdown();
  };

  const handleDeleteSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSearch(id);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: "relative",
    },
    navLink: {
      textDecoration: "none",
      fontSize: 14,
      padding: "0 16px",
      height: 40,
      borderRadius: 999,
      fontWeight: 600,
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      position: "relative",
    },
    navLinkActive: {
      background: "#0f766e",
      color: "#fff",
      border: "1px solid #0f766e",
      boxShadow: "0 6px 16px rgba(15,118,110,0.28)",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -4,
      background: "#0f766e",
      color: "#fff",
      borderRadius: "50%",
      width: 18,
      height: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      fontWeight: 700,
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      background: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      minWidth: 320,
      maxWidth: 400,
      marginTop: 8,
      zIndex: 1000,
      overflow: "hidden",
    },
    header: {
      padding: "14px 16px",
      background: "#f9f9f9",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: "#333",
      margin: 0,
    },
    closeBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#666",
      borderRadius: 4,
      transition: "background-color 0.2s",
    },
    searchList: {
      maxHeight: 400,
      overflowY: "auto",
    },
    searchItem: {
      padding: "12px 16px",
      borderBottom: "1px solid #f0f0f0",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    searchItemContent: {
      flex: 1,
      minWidth: 0,
    },
    searchName: {
      fontSize: 14,
      fontWeight: 600,
      color: "#333",
      marginBottom: 4,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    searchDate: {
      fontSize: 11,
      color: "#999",
    },
    deleteBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#999",
      borderRadius: 4,
      transition: "all 0.3s ease",
      flexShrink: 0,
    },
    empty: {
      padding: "32px 16px",
      textAlign: "center",
      color: "#999",
      fontSize: 13,
    },
  };

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.navLink,
          ...(isDropdownOpen ? styles.navLinkActive : {}),
        }}
        className="nav-link"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        title="Запазени търсения"
      >
        <Bookmark size={18} />
        Запазени
        {savedSearches.length > 0 && (
          <div style={styles.badge}>{savedSearches.length}</div>
        )}
      </button>

      {isDropdownOpen && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={closeDropdown}
          />
          <div style={styles.dropdown}>
            <div style={styles.header}>
              <h3 style={styles.headerTitle}>Запазени търсения</h3>
              <button
                style={styles.closeBtn}
                onClick={closeDropdown}
              >
                <X size={16} />
              </button>
            </div>

            <div style={styles.searchList}>
              {savedSearches.length === 0 ? (
                <div style={styles.empty}>
                  Нямате запазени търсения
                </div>
              ) : (
                savedSearches.map((search) => (
                  <div
                    key={search.id}
                    style={styles.searchItem}
                    onClick={() => handleSearchClick(search.criteria)}
                  >
                    <div style={styles.searchItemContent}>
                      <div style={styles.searchName}>{search.name}</div>
                      <div style={styles.searchDate}>
                        {new Date(search.timestamp).toLocaleDateString("bg-BG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <button
                      style={styles.deleteBtn}
                      onClick={(e) => handleDeleteSearch(e, search.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SavedSearchesMenu;
