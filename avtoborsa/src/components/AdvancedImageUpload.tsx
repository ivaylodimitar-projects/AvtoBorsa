import React, { useState } from "react";
import { Image, Star, Trash2, UploadCloud } from "lucide-react";

interface ImageItem {
  file: File;
  preview: string;
  isCover: boolean;
}

interface AdvancedImageUploadProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
}

const AdvancedImageUpload: React.FC<AdvancedImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 15,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    addImages(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addImages(Array.from(e.target.files));
    }
  };

  const addImages = (files: File[]) => {
    const newImages = files.slice(0, maxImages - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isCover: images.length === 0 && files.indexOf(file) === 0,
    }));

    onImagesChange([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (images[index].isCover && newImages.length > 0) {
      newImages[0].isCover = true;
    }
    onImagesChange(newImages);
  };

  const setCoverImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onImagesChange(newImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      marginBottom: 24,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: 700,
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    counter: {
      fontSize: 12,
      color: "#475569",
      background: "#eef2ff",
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 600,
    },
    uploadZone: {
      border: dragActive ? "2px solid #2563eb" : "2px dashed #cbd5f5",
      borderRadius: 14,
      padding: "28px 20px",
      textAlign: "center" as const,
      cursor: "pointer",
      background: dragActive ? "#eef2ff" : "#f8fafc",
      transition: "all 0.2s ease",
      marginBottom: 20,
    },
    uploadIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      height: 56,
      borderRadius: 16,
      background: "#e0e7ff",
      color: "#1d4ed8",
      marginBottom: 12,
    },
    uploadText: {
      fontSize: 15,
      fontWeight: 700,
      color: "#0f172a",
      marginBottom: 6,
    },
    uploadSubtext: {
      fontSize: 12,
      color: "#64748b",
      marginBottom: 16,
    },
    uploadButton: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 18px",
      background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
      color: "#fff",
      borderRadius: 999,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 8px 16px rgba(37, 99, 235, 0.25)",
    },
    gallery: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 12,
    },
    imageCard: {
      position: "relative" as const,
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      background: "#fff",
      cursor: "grab",
    },
    imageCardCover: {
      border: "2px solid #2563eb",
      boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.25)",
    },
    image: {
      width: "100%",
      height: 150,
      objectFit: "cover" as const,
      display: "block",
    },
    coverBadge: {
      position: "absolute" as const,
      top: 8,
      left: 8,
      background: "#2563eb",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    },
    imageActions: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(15, 23, 42, 0.75)",
      display: "flex",
      gap: 6,
      padding: 6,
    },
    actionButton: {
      flex: 1,
      padding: "6px 8px",
      background: "rgba(255, 255, 255, 0.18)",
      color: "#fff",
      border: "none",
      borderRadius: 999,
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      transition: "background 0.2s ease",
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "32px 20px",
      color: "#64748b",
      borderRadius: 12,
      border: "1px dashed #cbd5f5",
      background: "#f8fafc",
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 6,
      color: "#0f172a",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.counter}>
          {images.length}/{maxImages}
        </div>
      </div>

      {images.length < maxImages && (
        <div
          style={styles.uploadZone}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div style={styles.uploadIcon}>
            <UploadCloud size={26} />
          </div>
          <p style={styles.uploadText}>Плъзни снимки тук</p>
          <p style={styles.uploadSubtext}>
            или кликни за избор (до {maxImages} снимки)
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="image-input"
          />
          <label htmlFor="image-input" style={styles.uploadButton}>
            <UploadCloud size={16} />
            Избери снимки
          </label>
        </div>
      )}

      {images.length > 0 ? (
        <div style={styles.gallery}>
          {images.map((item, index) => (
            <div
              key={index}
              style={{
                ...styles.imageCard,
                ...(item.isCover ? styles.imageCardCover : {}),
                ...(dragOverIndex === index
                  ? { boxShadow: "0 0 0 2px #93c5fd" }
                  : {}),
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", index.toString());
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                if (fromIndex !== index) {
                  moveImage(fromIndex, index);
                }
                setDragOverIndex(null);
              }}
            >
              {item.isCover && (
                <div style={styles.coverBadge}>
                  <Star size={12} />
                  Корица
                </div>
              )}
              <img src={item.preview} alt={`Preview ${index + 1}`} style={styles.image} />
              <div style={styles.imageActions}>
                {!item.isCover && (
                  <button
                    type="button"
                    style={styles.actionButton}
                    onClick={() => setCoverImage(index)}
                    title="Задай като корица"
                  >
                    <Star size={12} />
                    Корица
                  </button>
                )}
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => removeImage(index)}
                  title="Премахни снимка"
                >
                  <Trash2 size={12} />
                  Премахни
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Няма качени снимки</div>
          <p style={{ fontSize: 12 }}>
            Качи поне една снимка за по-добра видимост
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedImageUpload;
