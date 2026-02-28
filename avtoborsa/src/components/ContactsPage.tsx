import React, { useState } from "react";
import { API_BASE_URL } from "../config/api";

type ContactFormData = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

const CONTACT_EMAIL = "support@kar.bg";
const SALES_EMAIL = "sales@kar.bg";
const CONTACT_PHONE = "+359 XX XXX XXXX";

const contactsCss = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');

  .contacts-page,
  .contacts-page * {
    box-sizing: border-box;
  }

  .contacts-page {
    min-height: 100vh;
    background: #f8fafc;
    color: #0f172a;
    font-family: "Manrope", "Segoe UI", sans-serif;
  }

  .contacts-shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 26px 20px 64px;
  }

  .contacts-hero {
    border: 1px solid #dbeafe;
    background: radial-gradient(circle at top right, #ecfeff 0%, #ffffff 42%, #f8fafc 100%);
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(15, 118, 110, 0.08);
    padding: 24px;
    margin-bottom: 18px;
  }

  .contacts-badge {
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #ecfdf5 0%, #ccfbf1 100%);
    color: #0f766e;
    border: 1px solid #99f6e4;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
  }

  .contacts-title {
    margin: 12px 0 0;
    font-size: 32px;
    line-height: 1.2;
    font-weight: 700;
    color: #111827;
    font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
  }

  .contacts-subtitle {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.7;
    color: #475569;
    max-width: 760px;
  }

  .contacts-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
  }

  .contacts-card {
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    padding: 24px;
  }

  .contacts-section-title {
    margin: 0;
    font-size: 24px;
    line-height: 1.2;
    color: #0f172a;
    font-weight: 700;
    font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
  }

  .contacts-section-subtitle {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.65;
    color: #64748b;
  }

  .contacts-form {
    margin-top: 18px;
  }

  .contacts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .contacts-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .contacts-label {
    font-size: 13px;
    color: #334155;
    font-weight: 600;
  }

  .contacts-input,
  .contacts-select,
  .contacts-textarea {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #ffffff;
    color: #111827;
    padding: 12px 14px;
    font-size: 14px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .contacts-input:focus,
  .contacts-select:focus,
  .contacts-textarea:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
  }

  .contacts-select {
    appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%);
    background-position: calc(100% - 18px) calc(50% + 1px), calc(100% - 12px) calc(50% + 1px);
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
    padding-right: 30px;
  }

  .contacts-textarea {
    min-height: 140px;
    resize: none;
  }

  .contacts-error,
  .contacts-success {
    border-radius: 16px;
    padding: 10px 12px;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .contacts-error {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #991b1b;
  }

  .contacts-success {
    border: 1px solid #99f6e4;
    background: #ecfdf5;
    color: #115e59;
  }

  .contacts-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .contacts-submit-btn,
  .contacts-link-btn {
    height: 42px;
    border-radius: 16px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
  }

  .contacts-submit-btn {
    border: none;
    background: #0f766e;
    color: #ffffff;
    box-shadow: 0 6px 14px rgba(15, 118, 110, 0.2);
  }

  .contacts-submit-btn:hover {
    background: #0b5f58;
  }

  .contacts-submit-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .contacts-link-btn {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .contacts-link-btn:hover {
    border-color: #94a3b8;
    background: #f8fafc;
  }

  .contacts-side-card {
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    border: 1px solid #e3e7ee;
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .contacts-side-card:last-child {
    margin-bottom: 0;
  }

  .contacts-side-title {
    margin: 0;
    font-size: 18px;
    color: #1f2937;
    font-weight: 700;
    font-family: "Space Grotesk", "Manrope", "Segoe UI", sans-serif;
  }

  .contacts-side-text {
    margin: 7px 0 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.65;
  }

  .contacts-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 5px 11px;
    border: 1px solid #99f6e4;
    background: #f0fdfa;
    color: #0f766e;
    font-size: 12px;
    font-weight: 700;
    margin-top: 10px;
  }

  .contacts-link {
    color: #0f766e;
    font-weight: 700;
    text-decoration: none;
  }

  .contacts-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 1023px) {
    .contacts-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 767px) {
    .contacts-shell {
      padding: 20px 12px 56px;
    }

    .contacts-card {
      padding: 18px;
    }

    .contacts-title {
      font-size: 26px;
    }

    .contacts-row {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .contacts-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .contacts-submit-btn,
    .contacts-link-btn {
      width: 100%;
    }
  }
`;

const ContactsPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    topic: "Общ въпрос",
    message: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  const handleFieldChange =
    (field: keyof ContactFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (error) setError("");
      if (success) setSuccess("");
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Моля, попълни име, имейл и съобщение.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact-inquiries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          topic: formData.topic.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : typeof data.detail === "string"
              ? data.detail
              : "Грешка при изпращане на запитването.";
        setError(errorMessage);
        return;
      }

      setSuccess(
        typeof data.message === "string" && data.message
          ? data.message
          : "Запитването е изпратено успешно, очаквайте отговор."
      );
      setFormData({
        name: "",
        email: "",
        topic: "Общ въпрос",
        message: "",
      });
    } catch {
      setError("Грешка при свързване със сървъра.");
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="contacts-page">
      <style>{contactsCss}</style>

      <main className="contacts-shell">
        <section className="contacts-hero">
          <div className="contacts-badge">Контакти</div>
          <h1 className="contacts-title">Свържи се с екипа на Kar.bg</h1>
          <p className="contacts-subtitle">
            Ако имаш въпрос за обява, дилърски профил, API достъп или нужда от съдействие, пиши ни.
            Ще ти отговорим възможно най-бързо.
          </p>
        </section>

        <section className="contacts-grid">
          <article className="contacts-card">
            <h2 className="contacts-section-title">Контактна форма</h2>
            <p className="contacts-section-subtitle">
              Изпрати запитване директно към екипа за поддръжка.
            </p>

            <form className="contacts-form" onSubmit={handleSubmit}>
              {error ? <div className="contacts-error">{error}</div> : null}
              {success ? <div className="contacts-success">{success}</div> : null}

              <div className="contacts-row">
                <div className="contacts-field">
                  <label className="contacts-label" htmlFor="contact-name">
                    Име
                  </label>
                  <input
                    id="contact-name"
                    className="contacts-input"
                    type="text"
                    placeholder="Име и фамилия"
                    value={formData.name}
                    onChange={handleFieldChange("name")}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="contacts-field">
                  <label className="contacts-label" htmlFor="contact-email">
                    Имейл
                  </label>
                  <input
                    id="contact-email"
                    className="contacts-input"
                    type="email"
                    placeholder="Твоят E-mail"
                    value={formData.email}
                    onChange={handleFieldChange("email")}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="contacts-field">
                <label className="contacts-label" htmlFor="contact-topic">
                  Тема
                </label>
                <select
                  id="contact-topic"
                  className="contacts-select"
                  value={formData.topic}
                  onChange={handleFieldChange("topic")}
                >
                  <option>Общ въпрос</option>
                  <option>Проблем с обява</option>
                  <option>Бизнес профил</option>
                  <option>API достъп</option>
                  <option>Плащания и пакети</option>
                </select>
              </div>

              <div className="contacts-field">
                <label className="contacts-label" htmlFor="contact-message">
                  Съобщение
                </label>
                <textarea
                  id="contact-message"
                  className="contacts-textarea"
                  placeholder="Опиши ни казуса си..."
                  value={formData.message}
                  onChange={handleFieldChange("message")}
                  required
                />
              </div>

              <div className="contacts-actions">
                <button className="contacts-submit-btn" type="submit" disabled={sending}>
                  {sending ? "Подготвяме..." : "Изпрати запитване"}
                </button>
                <a className="contacts-link-btn" href={`mailto:${CONTACT_EMAIL}`}>
                  Директен имейл
                </a>
              </div>
            </form>
          </article>

          <aside className="contacts-card">
            <div className="contacts-side-card">
              <h3 className="contacts-side-title">Поддръжка</h3>
              <p className="contacts-side-text">
                Имейл:{" "}
                <a className="contacts-link" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="contacts-side-text">
                Телефон: <strong>{CONTACT_PHONE}</strong>
              </p>
              <div className="contacts-pill">Пон - Пет | 09:00 - 18:00</div>
            </div>

            <div className="contacts-side-card">
              <h3 className="contacts-side-title">Продажби и партньорства</h3>
              <p className="contacts-side-text">
                За дилърски пакети и реклама:
                {" "}
                <a className="contacts-link" href={`mailto:${SALES_EMAIL}`}>
                  {SALES_EMAIL}
                </a>
              </p>
            </div>

            <div className="contacts-side-card">
              <h3 className="contacts-side-title">Бързи отговори</h3>
              <p className="contacts-side-text">
                За по-бърза обработка добави линк към обява, ако казусът е свързан с конкретна публикация.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default ContactsPage;
