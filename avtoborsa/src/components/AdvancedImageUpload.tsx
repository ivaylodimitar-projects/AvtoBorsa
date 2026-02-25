import React, { useEffect, useRef, useState } from "react";
import { Star, Trash2, UploadCloud } from "lucide-react";
import ResponsiveImage, { type ApiPhoto } from "./ResponsiveImage";

interface ImageItem {
  file: File;
  preview: string;
  isCover: boolean;
}

export interface ExistingImageItem {
  id?: number;
  image: string;
  thumbnail?: string | null;
  original_url?: string | null;
  renditions?: ApiPhoto["renditions"] | null;
  srcset_webp?: string | null;
  original_width?: number | null;
  original_height?: number | null;
  low_res?: boolean;
  isCover: boolean;
}

interface AdvancedImageUploadProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  existingImages?: ExistingImageItem[];
  onExistingImagesChange?: (images: ExistingImageItem[]) => void;
  maxImages?: number;
}

type UploadFeedback = {
  message: string;
  tone: "info" | "error";
};

const isBlobPreview = (preview: string) => preview.startsWith("blob:");

const revokePreview = (preview: string) => {
  if (isBlobPreview(preview)) {
    URL.revokeObjectURL(preview);
  }
};

const buildFileFingerprint = (file: File) =>
  [file.name.trim().toLowerCase(), file.size, file.lastModified, file.type].join("::");

const hashFileSha256 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const normalizeCoverSelection = (items: ImageItem[]): ImageItem[] => {
  let hasCover = false;
  const normalized = items.map((item) => {
    if (item.isCover && !hasCover) {
      hasCover = true;
      return item;
    }
    if (!item.isCover) return item;
    return { ...item, isCover: false };
  });

  if (!hasCover && normalized.length > 0) {
    normalized[0] = { ...normalized[0], isCover: true };
  }

  return normalized;
};

const normalizeExistingCoverSelection = (
  items: ExistingImageItem[]
): ExistingImageItem[] => {
  let hasCover = false;
  const normalized = items.map((item) => {
    const isCover = Boolean(item.isCover);
    if (isCover && !hasCover) {
      hasCover = true;
      return { ...item, isCover: true };
    }
    if (!isCover) return { ...item, isCover: false };
    return { ...item, isCover: false };
  });

  if (!hasCover && normalized.length > 0) {
    normalized[0] = { ...normalized[0], isCover: true };
  }

  return normalized;
};

const AdvancedImageUpload: React.FC<AdvancedImageUploadProps> = ({
  images,
  onImagesChange,
  existingImages = [],
  onExistingImagesChange,
  maxImages = 15,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [existingDragOverIndex, setExistingDragOverIndex] = useState<number | null>(null);
  const [isAddingImages, setIsAddingImages] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<UploadFeedback | null>(null);
  const previousPreviewsRef = useRef<string[]>([]);
  const fileHashCacheRef = useRef<WeakMap<File, string>>(new WeakMap());

  useEffect(() => {
    const currentPreviews = images.map((img) => img.preview);
    const currentPreviewSet = new Set(currentPreviews);

    previousPreviewsRef.current.forEach((preview) => {
      if (!currentPreviewSet.has(preview)) {
        revokePreview(preview);
      }
    });

    previousPreviewsRef.current = currentPreviews;
  }, [images]);

  useEffect(() => {
    return () => {
      previousPreviewsRef.current.forEach((preview) => revokePreview(preview));
      previousPreviewsRef.current = [];
    };
  }, []);

  const supportsContentHashing = Boolean(globalThis.crypto?.subtle);
  const totalImageCount = images.length + existingImages.length;
  const canEditExistingImages = typeof onExistingImagesChange === "function";

  const updateExistingImages = (nextImages: ExistingImageItem[]) => {
    if (!onExistingImagesChange) return;
    onExistingImagesChange(normalizeExistingCoverSelection(nextImages));
  };

  const getFileHash = async (file: File): Promise<string> => {
    const cached = fileHashCacheRef.current.get(file);
    if (cached) return cached;
    const hash = await hashFileSha256(file);
    fileHashCacheRef.current.set(file, hash);
    return hash;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAddingImages) return;
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
    if (isAddingImages) return;

    const files = Array.from(e.dataTransfer.files);
    void addImages(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void addImages(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const addImages = async (files: File[]) => {
    if (files.length === 0 || isAddingImages) return;

    const slotsLeft = Math.max(maxImages - totalImageCount, 0);
    if (slotsLeft === 0) {
      setUploadFeedback({
        message: `Достигнат е лимитът от ${maxImages} снимки.`,
        tone: "error",
      });
      return;
    }

    setUploadFeedback(null);
    setIsAddingImages(true);

    try {
      const existingFingerprints = new Set(images.map((img) => buildFileFingerprint(img.file)));
      const acceptedFingerprints = new Set<string>();
      const existingHashes = new Set<string>();
      const acceptedHashes = new Set<string>();

      if (supportsContentHashing) {
        for (const image of images) {
          try {
            existingHashes.add(await getFileHash(image.file));
          } catch {
            // Hashing fallback keeps fingerprint-based protection.
          }
        }
      }

      const acceptedImages: ImageItem[] = [];
      let skippedDuplicates = 0;
      let skippedOverflow = 0;
      let skippedInvalidFiles = 0;

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          skippedInvalidFiles += 1;
          continue;
        }

        if (acceptedImages.length >= slotsLeft) {
          skippedOverflow += 1;
          continue;
        }

        const fingerprint = buildFileFingerprint(file);
        if (existingFingerprints.has(fingerprint) || acceptedFingerprints.has(fingerprint)) {
          skippedDuplicates += 1;
          continue;
        }

        if (supportsContentHashing) {
          try {
            const hash = await getFileHash(file);
            if (existingHashes.has(hash) || acceptedHashes.has(hash)) {
              skippedDuplicates += 1;
              continue;
            }
            acceptedHashes.add(hash);
          } catch {
            // If hashing fails for one file, fingerprint check still applies.
          }
        }

        acceptedFingerprints.add(fingerprint);
        acceptedImages.push({
          file,
          preview: URL.createObjectURL(file),
          isCover: false,
        });
      }

      if (acceptedImages.length > 0) {
        const shouldAssignCover =
          images.length === 0 &&
          existingImages.length === 0 &&
          !images.some((img) => img.isCover);
        if (shouldAssignCover) {
          acceptedImages[0].isCover = true;
        }
        onImagesChange(normalizeCoverSelection([...images, ...acceptedImages]));
      }

      if (skippedDuplicates > 0) {
        const extraDetails: string[] = [];
        if (skippedInvalidFiles > 0) extraDetails.push(`невалидни: ${skippedInvalidFiles}`);
        if (skippedOverflow > 0) extraDetails.push(`над лимита: ${skippedOverflow}`);

        setUploadFeedback({
          message:
            extraDetails.length > 0
              ? `Не може да качваш дублирани снимки (${skippedDuplicates}). Пропуснати: ${extraDetails.join(", ")}.`
              : `Не може да качваш дублирани снимки (${skippedDuplicates}).`,
          tone: "error",
        });
      } else {
        const feedbackParts: string[] = [];
        if (skippedInvalidFiles > 0) feedbackParts.push(`невалидни файлове: ${skippedInvalidFiles}`);
        if (skippedOverflow > 0) feedbackParts.push(`над лимита: ${skippedOverflow}`);

        if (feedbackParts.length > 0) {
          setUploadFeedback({
            message: `Пропуснати файлове (${feedbackParts.join(", ")}).`,
            tone: "info",
          });
        }
      }
    } catch (error) {
      console.error("Image upload processing error:", error);
      setUploadFeedback({
        message: "Възникна проблем при обработката на снимките. Опитай отново.",
        tone: "error",
      });
    } finally {
      setIsAddingImages(false);
    }
  };

  const removeImage = (index: number) => {
    if (isAddingImages) return;
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(normalizeCoverSelection(newImages));
  };

  const setCoverImage = (index: number) => {
    if (isAddingImages) return;
    const newImages = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onImagesChange(normalizeCoverSelection(newImages));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (isAddingImages) return;
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(normalizeCoverSelection(newImages));
  };

  const setExistingCoverImage = (index: number) => {
    if (isAddingImages || !canEditExistingImages) return;
    const nextImages = existingImages.map((item, itemIndex) => ({
      ...item,
      isCover: itemIndex === index,
    }));
    updateExistingImages(nextImages);
  };

  const removeExistingImage = (index: number) => {
    if (isAddingImages || !canEditExistingImages) return;
    const nextImages = existingImages.filter((_, itemIndex) => itemIndex !== index);
    updateExistingImages(nextImages);
  };

  const moveExistingImage = (fromIndex: number, toIndex: number) => {
    if (isAddingImages || !canEditExistingImages) return;
    const nextImages = [...existingImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);
    updateExistingImages(nextImages);
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
      color: "#0f766e",
      background: "#ecfdf5",
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 600,
    },
    uploadZone: {
      border: dragActive ? "2px solid #0f766e" : "2px dashed #d1d5db",
      borderRadius: 16,
      padding: "28px 20px",
      textAlign: "center" as const,
      cursor: isAddingImages ? "wait" : "pointer",
      background: dragActive ? "#ecfdf5" : "#f8fafc",
      transition: "all 0.2s ease",
      marginBottom: 20,
      opacity: isAddingImages ? 0.72 : 1,
    },
    uploadIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      height: 56,
      borderRadius: 16,
      background: "#ecfdf5",
      color: "#0f766e",
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
      background: "#0f766e",
      color: "#fff",
      borderRadius: 999,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 8px 16px rgba(15, 118, 110, 0.25)",
    },
    helperMessage: {
      marginTop: 8,
      marginBottom: 0,
      fontSize: 12,
      fontWeight: 600,
    },
    helperMessageInfo: {
      color: "#0f766e",
    },
    helperMessageError: {
      color: "#b91c1c",
    },
    gallery: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 12,
    },
    imageCard: {
      position: "relative" as const,
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      background: "#fff",
      cursor: "grab",
    },
    imageCardCover: {
      border: "2px solid #0f766e",
      boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.25)",
    },
    image: {
      width: "100%",
      height: 150,
      objectFit: "cover" as const,
      display: "block",
    },
    imageMuted: {
      opacity: 0.9,
    },
    coverBadge: {
      position: "absolute" as const,
      top: 8,
      left: 8,
      background: "#0f766e",
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
      opacity: isAddingImages ? 0.75 : 1,
    },
    existingBadge: {
      position: "absolute" as const,
      top: 8,
      right: 8,
      background: "rgba(15, 23, 42, 0.8)",
      color: "#e2e8f0",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    emptyState: {
      textAlign: "center" as const,
      padding: "32px 20px",
      color: "#64748b",
      borderRadius: 16,
      border: "1px dashed #d1d5db",
      background: "#f8fafc",
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 6,
      color: "#0f172a",
    },
    groupTitle: {
      margin: "12px 0 10px",
      fontSize: 12,
      fontWeight: 700,
      color: "#334155",
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.counter}>
          {totalImageCount}/{maxImages}
        </div>
      </div>

      {totalImageCount < maxImages && (
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
            {isAddingImages
              ? "Обработваме файловете..."
              : `или кликни за избор (до ${maxImages} снимки)`}
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isAddingImages}
            style={{ display: "none" }}
            id="image-input"
          />
          <label
            htmlFor="image-input"
            style={{
              ...styles.uploadButton,
              opacity: isAddingImages ? 0.75 : 1,
              pointerEvents: isAddingImages ? "none" : "auto",
            }}
          >
            <UploadCloud size={16} />
            {isAddingImages ? "Обработване..." : "Избери снимки"}
          </label>
          {uploadFeedback && (
            <p
              style={{
                ...styles.helperMessage,
                ...(uploadFeedback.tone === "error"
                  ? styles.helperMessageError
                  : styles.helperMessageInfo),
              }}
            >
              {uploadFeedback.message}
            </p>
          )}
        </div>
      )}

      {existingImages.length > 0 && (
        <>
          <div style={styles.groupTitle}>Текущи снимки</div>
          <div style={styles.gallery}>
            {existingImages.map((item, index) => {
              const fallbackPath =
                (item.original_url || item.image || item.thumbnail || "").trim();
              const hasPreviewImage = Boolean(
                fallbackPath ||
                  (Array.isArray(item.renditions) && item.renditions.length > 0)
              );
              if (!hasPreviewImage) return null;
              const previewPhoto: ApiPhoto = {
                id: item.id,
                image: item.image,
                original_url: item.original_url || item.image,
                thumbnail: item.thumbnail || null,
                renditions: item.renditions || null,
                srcset_webp: item.srcset_webp || null,
                original_width: item.original_width ?? null,
                original_height: item.original_height ?? null,
                low_res: Boolean(item.low_res),
                is_cover: item.isCover,
              };
              return (
                <div
                  key={`${item.id ?? item.image}-${index}`}
                  style={{
                    ...styles.imageCard,
                    ...(item.isCover ? styles.imageCardCover : {}),
                    ...(existingDragOverIndex === index
                      ? { boxShadow: "0 0 0 2px #93c5fd" }
                      : {}),
                    cursor: canEditExistingImages ? "grab" : "default",
                  }}
                  draggable={canEditExistingImages && !isAddingImages}
                  onDragStart={(e) => {
                    if (!canEditExistingImages || isAddingImages) return;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", `existing:${index}`);
                  }}
                  onDragOver={(e) => {
                    if (!canEditExistingImages || isAddingImages) return;
                    e.preventDefault();
                    setExistingDragOverIndex(index);
                  }}
                  onDragLeave={() => setExistingDragOverIndex(null)}
                  onDrop={(e) => {
                    if (!canEditExistingImages || isAddingImages) return;
                    e.preventDefault();
                    const raw = e.dataTransfer.getData("text/plain");
                    const [kind, value] = String(raw || "").split(":");
                    const fromIndex = Number(value);
                    if (kind !== "existing" || Number.isNaN(fromIndex)) {
                      setExistingDragOverIndex(null);
                      return;
                    }
                    if (fromIndex !== index) {
                      moveExistingImage(fromIndex, index);
                    }
                    setExistingDragOverIndex(null);
                  }}
                >
                  {item.isCover && (
                    <div style={styles.coverBadge}>
                      <Star size={12} />
                      Корица
                    </div>
                  )}
                  <div style={styles.existingBadge}>Налична</div>
                  <ResponsiveImage
                    photo={previewPhoto}
                    fallbackPath={fallbackPath}
                    alt={`Existing ${index + 1}`}
                    kind="grid"
                    sizes="(max-width: 640px) 45vw, 180px"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    containerStyle={{ width: "100%", height: "100%" }}
                    imgStyle={{ ...styles.image, ...styles.imageMuted }}
                  />
                  {canEditExistingImages && (
                    <div style={styles.imageActions}>
                      {!item.isCover && (
                        <button
                          type="button"
                          style={styles.actionButton}
                          onClick={() => setExistingCoverImage(index)}
                          title="Задай като корица"
                          disabled={isAddingImages}
                        >
                          <Star size={12} />
                          Корица
                        </button>
                      )}
                      <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => removeExistingImage(index)}
                        title="Премахни снимка"
                        disabled={isAddingImages}
                      >
                        <Trash2 size={12} />
                        Премахни
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {images.length > 0 ? (
        <>
          <div style={styles.groupTitle}>Ново добавени</div>
        <div style={styles.gallery}>
          {images.map((item, index) => (
            <div
              key={`${item.preview}-${index}`}
              style={{
                ...styles.imageCard,
                ...(item.isCover ? styles.imageCardCover : {}),
                ...(dragOverIndex === index
                  ? { boxShadow: "0 0 0 2px #93c5fd" }
                  : {}),
              }}
              draggable={!isAddingImages}
              onDragStart={(e) => {
                if (isAddingImages) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", index.toString());
              }}
              onDragOver={(e) => {
                if (isAddingImages) return;
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                if (isAddingImages) return;
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
                    disabled={isAddingImages}
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
                  disabled={isAddingImages}
                >
                  <Trash2 size={12} />
                  Премахни
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : existingImages.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Няма качени снимки</div>
          <p style={{ fontSize: 12 }}>
            Качи поне една снимка за по-добра видимост
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default AdvancedImageUpload;
