import React from "react";
import type { IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa6";
import { FiArrowUpRight, FiMail } from "react-icons/fi";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import karBgLogo from "../assets/karbglogo.png";

const PUBLIC_API_DOCS_URL = `${API_BASE_URL}/docs/api/`;

type SocialLink = {
  label: string;
  handle: string;
  href: string;
  icon: IconType;
  accent: string;
};

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "Instagram",
    handle: "@karbgonline",
    href: "https://www.instagram.com/karbgonline/",
    icon: FaInstagram,
    accent: "#e1306c",
  },
  {
    label: "TikTok",
    handle: "karbgonline",
    href: "https://www.tiktok.com/@karbgonline",
    icon: FaTiktok,
    accent: "#111827",
  },
  {
    label: "Facebook",
    handle: "Kar.bg",
    href: "https://www.facebook.com/karbgonline",
    icon: FaFacebookF,
    accent: "#1877f2",
  },
];

export default function Footer() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleApiAccessClick = () => {
    if (!user) {
      showToast("Моля, влезте в бизнес профил, за да заявите API достъп.", { type: "error" });
      return;
    }
    if (user.userType !== "business") {
      showToast("API достъпът е наличен само за бизнес профили.", { type: "error" });
      return;
    }
    window.location.assign(PUBLIC_API_DOCS_URL);
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.footerInner} className="footer-grid">
        <div style={styles.footerCol}>
          <img src={karBgLogo} alt="Kar.bg" style={styles.footerLogo} />
          <p style={styles.footerText}>
            Платформа за покупко-продажба на автомобили, части и услуги.
          </p>
          <div style={styles.footerContactRow}>
            <a
              href="mailto:support@kar.bg"
              style={styles.footerContactLink}
              className="footer-contact-link"
              aria-label="Изпрати имейл до support@kar.bg"
            >
              <span style={styles.footerContactIcon}>
                <FiMail size={14} />
              </span>
              support@kar.bg
            </a>
            <a
              href="mailto:sales@kar.bg"
              style={styles.footerContactLink}
              className="footer-contact-link"
              aria-label="Изпрати имейл до sales@kar.bg"
            >
              <span style={styles.footerContactIcon}>
                <FiMail size={14} />
              </span>
              sales@kar.bg
            </a>
          </div>
          <div style={styles.socialSection}>
            <div style={styles.socialList}>
              {SOCIAL_LINKS.map(({ label, handle, href, icon: Icon, accent }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.socialCard}
                  className="footer-social-card"
                  aria-label={`${label} ${handle}`}
                >
                  <span
                    style={{
                      ...styles.socialIconWrap,
                      color: accent,
                      backgroundColor: `${accent}14`,
                    }}
                  >
                    <Icon size={14} />
                  </span>
                  <span style={styles.socialMeta}>
                    <span style={styles.socialLabel}>{label}</span>
                    <span style={styles.socialHandle}>{handle}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Правна информация</div>
          <a href="/legal" style={styles.footerLink}>
            Общи условия
          </a>
          <a href="/legal#privacy" style={styles.footerLink}>
            GDPR
          </a>
          <button
            type="button"
            className="footer-api-btn"
            style={styles.footerApiButton}
            onClick={handleApiAccessClick}
          >
            Заяви API достъп
          </button>
        </div>

        <div style={styles.footerCol}>
          <div style={styles.footerTitle}>Контакти</div>
          <a
            href="/contacts"
            style={styles.footerFormLink}
            className="footer-form-link"
            aria-label="Отвори контактната форма"
          >
            <span style={styles.footerFormText}>Контактна форма</span>
            <span style={styles.footerFormArrow}>
              <FiArrowUpRight size={16} />
            </span>
          </a>
          <p style={styles.footerText}>Поддръжка по имейл: 24/7 (по всяко време).</p>
        </div>
      </div>

      <div style={styles.bottomRow} className="footer-bottom">
        <span>© {new Date().getFullYear()} Kar.bg. Всички права запазени.</span>
      </div>

      <style>{footerCss}</style>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    marginTop: 0,
    borderTop: "none",
    background: "#fff",
  },
  footerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "30px 20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 30,
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  footerLogo: {
    width: 152,
    height: "auto",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 400,
    margin: 0,
  },
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
  footerContactRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "nowrap",
    overflowX: "auto",
    paddingBottom: 2,
  },
  footerContactLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    color: "#475569",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "4px 0",
    transition: "color 0.2s ease, transform 0.2s ease",
  },
  footerContactIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#0f766e",
    background: "#ecfdf5",
    border: "1px solid #ccfbf1",
  },
  footerApiButton: {
    marginTop: 8,
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(90deg, #0f766e 0%, #0d9488 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    width: "fit-content",
    boxShadow: "0 6px 14px rgba(15, 118, 110, 0.2)",
    transition: "transform 0.2s ease, filter 0.2s ease",
  },
  footerFormLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    width: "fit-content",
    padding: "4px 0",
    textDecoration: "none",
    color: "#0f766e",
    transition: "color 0.2s ease, transform 0.2s ease",
  },
  footerFormText: {
    color: "inherit",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  footerFormArrow: {
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 10,
  },
  socialList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  socialCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    textDecoration: "none",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  socialIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  socialLabel: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  socialHandle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  bottomRow: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 20px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    borderTop: "1px solid #ecfdf5",
    color: "#94a3b8",
    fontSize: 12,
  },
};

const footerCss = `
  .footer-api-btn:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  .footer-contact-link:hover {
    color: #0f172a;
    transform: translateX(1px);
  }

  .footer-social-card:hover {
    transform: translateY(-1px);
    border-color: #cbd5e1;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }

  .footer-form-link:hover {
    transform: translateX(1px);
    color: #0b5f58;
  }

  @media (max-width: 1023px) {
    .footer-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 767px) {
    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }

    .footer-grid {
      padding-left: 14px !important;
      padding-right: 14px !important;
    }
  }
`;
