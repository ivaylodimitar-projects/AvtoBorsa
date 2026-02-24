import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Trash2, X } from "lucide-react";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { getCriteriaMainCategoryLabel } from "../constants/mobileBgData";

type SavedSearchesMenuProps = {
  onDropdownOpenChange?: (isOpen: boolean) => void;
  closeRequestKey?: number;
};

const SavedSearchesMenu: React.FC<SavedSearchesMenuProps> = ({
  onDropdownOpenChange,
  closeRequestKey,
}) => {
  const navigate = useNavigate();
  const { savedSearches, removeSearch } = useSavedSearches();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const savedLabel = "Запазени";
  const savedSearchesLabel = "Запазени търсения";
  const closeLabel = "Затвори";
  const deleteSearchLabel = "Изтрий търсене";
  const emptySavedSearchesLabel = "Нямате запазени търсения";
  const dropdownId = "saved-searches-dropdown";

  const closeDropdown = () => setIsDropdownOpen(false);

  useEffect(() => {
    onDropdownOpenChange?.(isDropdownOpen);
  }, [isDropdownOpen, onDropdownOpenChange]);

  useEffect(() => {
    return () => {
      onDropdownOpenChange?.(false);
    };
  }, [onDropdownOpenChange]);

  useEffect(() => {
    if (closeRequestKey === undefined) return;

    const timeoutId = window.setTimeout(() => {
      setIsDropdownOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [closeRequestKey]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isDropdownOpen]);

  const serializeCriteria = (criteria: Record<string, unknown>) => {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
        return;
      }
      params.set(key, String(value));
    });
    return params.toString();
  };

  const handleSearchClick = (criteria: Record<string, unknown>) => {
    const queryString = serializeCriteria(criteria);
    navigate(`/search?${queryString}`);
    closeDropdown();
  };

  const handleDeleteSearch = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    removeSearch(id);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: "relative",
    },
    navLink: {
      color: "#334155",
      textDecoration: "none",
      fontSize: 14,
      padding: "0 8px",
      height: 40,
      borderRadius: 16,
      fontWeight: 650,
      transition: "color 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: 7,
      cursor: "pointer",
      position: "relative",
      background: "transparent",
      border: "none",
      whiteSpace: "nowrap",
    },
    badge: {
      position: "absolute",
      top: 2,
      right: -10,
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
      pointerEvents: "none",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #dbeafe",
      borderRadius: 16,
      boxShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
      width: "min(92vw, 390px)",
      minWidth: "min(300px, 92vw)",
      maxWidth: "calc(100vw - 20px)",
      marginTop: 8,
      zIndex: 380,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "12px 14px",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      borderBottom: "1px solid #e2e8f0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: 800,
      color: "#0f172a",
      margin: 0,
    },
    closeBtn: {
      width: 32,
      height: 32,
      background: "#ffffff",
      border: "1px solid #dbeafe",
      cursor: "pointer",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#0f766e",
      borderRadius: 10,
      transition: "background-color 0.2s, border-color 0.2s",
    },
    searchList: {
      maxHeight: 380,
      overflowY: "auto",
    },
    searchItem: {
      padding: "11px 12px",
      borderBottom: "1px solid #edf2f7",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      background: "transparent",
    },
    searchItemContent: {
      flex: 1,
      minWidth: 0,
    },
    searchName: {
      fontSize: 14,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 4,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "normal",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      lineHeight: 1.25,
    },
    searchDate: {
      fontSize: 11,
      color: "#64748b",
    },
    searchCategory: {
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 7px",
      borderRadius: 999,
      border: "1px solid #99f6e4",
      background: "#ecfdf5",
      fontSize: 10,
      color: "#0f766e",
      fontWeight: 800,
      marginBottom: 6,
      lineHeight: 1.1,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      cursor: "pointer",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#64748b",
      borderRadius: 10,
      transition: "all 0.2s ease",
      flexShrink: 0,
    },
    empty: {
      padding: "32px 16px",
      textAlign: "center",
      color: "#64748b",
      fontSize: 13,
    },
  };

  return (
    <div
      ref={rootRef}
      style={styles.container}
      className={`saved-searches-root ${isDropdownOpen ? "saved-searches-open" : ""}`}
    >
      <style>{`
        .saved-searches-trigger:hover,
        .saved-searches-trigger.active {
          color: #0f766e;
          text-decoration: none;
        }

        .saved-searches-close:hover {
          background: #ecfdf5;
          border-color: #99f6e4;
        }

        .saved-searches-item:last-child {
          border-bottom: none;
        }

        .saved-searches-item:hover {
          background: #f8fafc;
        }

        .saved-searches-delete:hover {
          border-color: #fecaca;
          background: #fff1f2;
          color: #b91c1c;
        }

        @media (max-width: 960px) {
          .saved-searches-root {
            width: 100%;
          }

          .saved-searches-trigger {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .saved-searches-badge {
            right: 10px !important;
            top: 50% !important;
            transform: translateY(-50%);
          }

          .saved-searches-dropdown {
            position: static !important;
            top: auto !important;
            right: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin-top: 8px !important;
            border-radius: 14px !important;
            box-shadow: none !important;
          }

          .saved-searches-list {
            max-height: min(46vh, 360px) !important;
          }
        }

        @media (max-width: 640px) {
          .saved-searches-dropdown {
            border-radius: 12px !important;
          }

          .saved-searches-list {
            max-height: min(44vh, 320px) !important;
          }
        }
      `}</style>

      <button
        type="button"
        style={styles.navLink}
        className={`nav-link saved-searches-trigger ${isDropdownOpen ? "active" : ""}`}
        onClick={() => setIsDropdownOpen((previous) => !previous)}
        title={savedSearchesLabel}
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-controls={dropdownId}
      >
        <Bookmark size={18} />
        {savedLabel}
        {savedSearches.length > 0 && (
          <div style={styles.badge} className="saved-searches-badge">
            {savedSearches.length}
          </div>
        )}
      </button>

      {isDropdownOpen && (
        <div
          id={dropdownId}
          style={styles.dropdown}
          className="saved-searches-dropdown"
          role="menu"
          aria-label={savedSearchesLabel}
        >
          <div style={styles.header} className="saved-searches-header">
            <h3 style={styles.headerTitle} className="saved-searches-title">
              {savedSearchesLabel}
            </h3>
            <button
              type="button"
              style={styles.closeBtn}
              className="saved-searches-close"
              onClick={closeDropdown}
              aria-label={closeLabel}
            >
              <X size={16} />
            </button>
          </div>

          <div style={styles.searchList} className="saved-searches-list">
            {savedSearches.length === 0 ? (
              <div style={styles.empty} className="saved-searches-empty">
                {emptySavedSearchesLabel}
              </div>
            ) : (
              savedSearches.map((search) => (
                <div
                  key={search.id}
                  style={styles.searchItem}
                  className="saved-searches-item"
                  onClick={() => handleSearchClick(search.criteria)}
                >
                  <div style={styles.searchItemContent}>
                    <div style={styles.searchName} className="saved-searches-name">
                      {search.name}
                    </div>
                    {(search.mainCategoryLabel ||
                      getCriteriaMainCategoryLabel(search.criteria)) && (
                      <div style={styles.searchCategory} className="saved-searches-category">
                        {(search.mainCategoryLabel ||
                          getCriteriaMainCategoryLabel(search.criteria)) as string}
                      </div>
                    )}
                    <div style={styles.searchDate} className="saved-searches-date">
                      {new Date(search.timestamp).toLocaleDateString("bg-BG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={styles.deleteBtn}
                    className="saved-searches-delete"
                    onClick={(event) => handleDeleteSearch(event, search.id)}
                    aria-label={deleteSearchLabel}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearchesMenu;
