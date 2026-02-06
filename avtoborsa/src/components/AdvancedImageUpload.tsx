import React, { useState } from "react";

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
    // If removed image was cover, make first image cover
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
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: "#333",
    },
    counter: {
      fontSize: 13,
      color: "#666",
      background: "#f0f0f0",
      padding: "4px 12px",
      borderRadius: 4,
    },
    uploadZone: {
      border: dragActive ? "2px solid #0066cc" : "2px dashed #ccc",
      borderRadius: 8,
      padding: "32px 20px",
      textAlign: "center" as const,
      cursor: "pointer",
      background: dragActive ? "#f0f7ff" : "#fafafa",
      transition: "all 0.3s ease",
      marginBottom: 20,
    },
    uploadIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    uploadText: {
      fontSize: 15,
      fontWeight: 600,
      color: "#333",
      marginBottom: 8,
    },
    uploadSubtext: {
      fontSize: 13,
      color: "#666",
      marginBottom: 16,
    },
    uploadButton: {
      display: "inline-block",
      padding: "10px 20px",
      background: "#0066cc",
      color: "#fff",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
    },
    gallery: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
      gap: 12,
    },
    imageCard: {
      position: "relative" as const,
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid #e0e0e0",
      background: "#fafafa",
      cursor: "grab",
    },
    imageCardCover: {
      border: "3px solid #0066cc",
      boxShadow: "0 0 0 2px #fff, 0 0 0 4px #0066cc",
    },
    image: {
      width: "100%",
      height: 140,
      objectFit: "cover" as const,
      display: "block",
    },
    coverBadge: {
      position: "absolute" as const,
      top: 8,
      left: 8,
      background: "#0066cc",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
    },
    imageActions: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      gap: 4,
      padding: 4,
    },
    actionButton: {
      flex: 1,
      padding: "6px 4px",
      background: "rgba(255, 255, 255, 0.2)",
      color: "#fff",
      border: "none",
      borderRadius: 3,
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 600,
      transition: "background 0.2s",
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "40px 20px",
      color: "#999",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📸 Снимки на автомобила</h3>
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
          <div style={styles.uploadIcon}>📤</div>
          <p style={styles.uploadText}>Влачи снимки тук</p>
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
              {item.isCover && <div style={styles.coverBadge}>🎯 Корица</div>}
              <img src={item.preview} alt={`Preview ${index + 1}`} style={styles.image} />
              <div style={styles.imageActions}>
                {!item.isCover && (
                  <button
                    type="button"
                    style={styles.actionButton}
                    onClick={() => setCoverImage(index)}
                    title="Задай като корица"
                  >
                    ⭐ Корица
                  </button>
                )}
                <button
                  type="button"
                  style={styles.actionButton}
                  onClick={() => removeImage(index)}
                  title="Премахни снимка"
                >
                  ✕ Премахни
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p>Няма качени снимки</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Качи поне една снимка за по-добра видимост
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedImageUpload;

