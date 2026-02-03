import React, { useState } from "react";
import Navbar from "./Navbar";

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
];

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

const PublishPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  const [formData, setFormData] = useState({
    category: "1",
    title: "",
    brand: "",
    model: "",
    yearFrom: "",
    yearTo: "",
    price: "",
    city: "",
    fuel: "",
    gearbox: "",
    mileage: "",
    description: "",
    phone: "",
    email: "",
    pictures: [] as File[],
  });

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addPictures(Array.from(files));
    }
  };

  const addPictures = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));
    const currentCount = formData.pictures.length;
    const availableSlots = 15 - currentCount;
    const filesToAdd = validFiles.slice(0, availableSlots);

    setFormData((prev) => ({
      ...prev,
      pictures: [...prev.pictures, ...filesToAdd],
    }));

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrls((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files) {
      addPictures(Array.from(files));
    }
  };

  const removePicture = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Обявата е изпратена! (Демо режим)");
    setFormData({
      category: "1",
      title: "",
      brand: "",
      model: "",
      yearFrom: "",
      yearTo: "",
      price: "",
      city: "",
      fuel: "",
      gearbox: "",
      mileage: "",
      description: "",
      phone: "",
      email: "",
      pictures: [],
    });
    setPreviewUrls([]);
  };

  const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#f5f5f5", width: "100%", overflow: "visible" },
    container: { width: "100%", maxWidth: 1200, margin: "0 auto", padding: "20px", boxSizing: "border-box" },
    form: { width: "100%", background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "visible", boxSizing: "border-box" },
    title: { fontSize: 24, fontWeight: 700, color: "#333", marginBottom: 24, margin: 0 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e0e0e0", margin: 0 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    formGroup: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 13, fontWeight: 500, color: "#555" },
    input: { padding: "10px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
    textarea: { padding: "10px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14, fontFamily: "inherit", minHeight: 120, resize: "vertical", width: "100%", boxSizing: "border-box" },
    fullWidth: { gridColumn: "1 / -1" },
    button: { padding: "12px 24px", background: "#0066cc", color: "#fff", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", boxSizing: "border-box" },
    note: { fontSize: 12, color: "#666", marginTop: 8, fontStyle: "italic" },
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <style>{`
        /* Tablet (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .publish-container { padding: 16px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 20px !important; }
          .publish-form h1 { font-size: 20px !important; }
        }

        /* Mobile Large (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .publish-container { padding: 12px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 16px !important; }
          .publish-form h1 { font-size: 18px !important; }
          .publish-form h2 { font-size: 14px !important; }
        }

        /* Mobile Small (< 640px) */
        @media (max-width: 639px) {
          .publish-container { padding: 8px !important; }
          .publish-grid { grid-template-columns: 1fr !important; }
          .publish-form { padding: 12px !important; }
          .publish-form h1 { font-size: 18px !important; margin-bottom: 16px !important; }
          .publish-form h2 { font-size: 13px !important; }
          .publish-form label { font-size: 12px !important; }
          .publish-form input, .publish-form select, .publish-form textarea { font-size: 13px !important; padding: 8px 10px !important; }
          .publish-form button { padding: 10px 16px !important; font-size: 13px !important; }
        }
      `}</style>
      <div style={styles.container} className="publish-container">
        <form style={styles.form} className="publish-form" onSubmit={handleSubmit}>
          <h1 style={styles.title}>Публикуване на обява</h1>

          {/* Picture Upload */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Снимки ({formData.pictures.length}/15)</h2>
            {formData.pictures.length < 15 && (
              <div
                style={{
                  border: dragActive ? "2px solid #0066cc" : "2px dashed #ccc",
                  borderRadius: 8,
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragActive ? "#f0f7ff" : "#fafafa",
                  transition: "all 0.3s ease",
                  marginBottom: 20,
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#333", margin: "0 0 8px 0" }}>
                  Качи снимки на автомобила
                </p>
                <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px 0" }}>
                  Влачи и пусни снимките тук или кликни за избор (до 15 снимки)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{
                    display: "none",
                  }}
                  id="picture-input"
                />
                <label
                  htmlFor="picture-input"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    background: "#0066cc",
                    color: "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Избери снимки
                </label>
              </div>
            )}

            {previewUrls.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 12,
                }}
              >
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid #e0e0e0",
                      background: "#fafafa",
                    }}
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePicture(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0, 0, 0, 0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        width: 28,
                        height: 28,
                        cursor: "pointer",
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Car Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Данни за автомобила</h2>
            <div style={styles.grid} className="publish-grid">
              <div style={styles.formGroup}>
                <label style={styles.label}>Категория *</label>
                <select style={styles.input} name="category" value={formData.category} onChange={handleChange} required>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Марка *</label>
                <select style={styles.input} name="brand" value={formData.brand} onChange={handleChange} required>
                  <option value="">Избери марка</option>
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Модел *</label>
                <select
                  style={styles.input}
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                  disabled={!formData.brand}
                >
                  <option value="">{formData.brand ? "Избери модел" : "Избери марка първо"}</option>
                  {formData.brand && MODELS[formData.brand]
                    ? MODELS[formData.brand].map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))
                    : null}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Година от *</label>
                <select style={styles.input} name="yearFrom" value={formData.yearFrom} onChange={handleChange} required>
                  <option value="">Избери година</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Година до *</label>
                <select style={styles.input} name="yearTo" value={formData.yearTo} onChange={handleChange} required>
                  <option value="">Избери година</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Цена (€) *</label>
                <input style={styles.input} type="number" name="price" placeholder="15000" value={formData.price} onChange={handleChange} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Гориво</label>
                <select style={styles.input} name="fuel" value={formData.fuel} onChange={handleChange}>
                  <option value="">Избери гориво</option>
                  <option value="Бензин">Бензин</option>
                  <option value="Дизел">Дизел</option>
                  <option value="Газ/Бензин">Газ/Бензин</option>
                  <option value="Хибрид">Хибрид</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Скоростна кутия</label>
                <select style={styles.input} name="gearbox" value={formData.gearbox} onChange={handleChange}>
                  <option value="">Избери кутия</option>
                  <option value="Ръчна">Ръчна</option>
                  <option value="Автоматик">Автоматик</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Пробег (км)</label>
                <input style={styles.input} type="number" name="mileage" placeholder="150000" value={formData.mileage} onChange={handleChange} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Град</label>
                <select style={styles.input} name="city" value={formData.city} onChange={handleChange}>
                  <option value="">Избери град</option>
                  <option value="София">София</option>
                  <option value="Пловдив">Пловдив</option>
                  <option value="Варна">Варна</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Описание</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Описание на обявата</label>
              <textarea style={styles.textarea} name="description" placeholder="Опишете състоянието, особеностите и причината за продажба..." value={formData.description} onChange={handleChange} />
            </div>
          </div>

          {/* Contact */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Контактни данни</h2>
            <div style={styles.grid} className="publish-grid">
              <div style={styles.formGroup}>
                <label style={styles.label}>Телефон *</label>
                <input style={styles.input} type="tel" name="phone" placeholder="+359 88 123 4567" value={formData.phone} onChange={handleChange} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" name="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </div>

          <button style={styles.button} type="submit">
            Публикуване на обява
          </button>
          <p style={styles.note}>* Задължителни полета</p>
        </form>
      </div>
    </div>
  );
};

export default PublishPage;

