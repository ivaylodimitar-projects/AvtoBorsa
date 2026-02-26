import React, { useCallback, useMemo } from "react";
import { useImageUrl } from "../hooks/useGalleryLazyLoad";

export type PhotoRendition = {
  width?: number | null;
  height?: number | null;
  url?: string | null;
  kind?: string | null;
  format?: string | null;
};

export type ApiPhoto = {
  id?: number;
  image?: string | null;
  original_url?: string | null;
  renditions?: PhotoRendition[] | null;
  srcset_webp?: string | null;
  original_width?: number | null;
  original_height?: number | null;
  low_res?: boolean;
  order?: number;
  is_cover?: boolean;
  thumbnail?: string | null;
};

type ResponsiveImageProps = {
  photo?: ApiPhoto | null;
  fallbackPath?: string | null;
  alt: string;
  kind: "grid" | "detail";
  sizes: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  containerStyle?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  objectFit?: "cover";
  strictKind?: boolean;
  preventUpscale?: boolean;
  width?: number;
  height?: number;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  onDecoded?: (img: HTMLImageElement) => void;
};

const CARD_TARGET_WIDTH = 600;
const DETAIL_TARGET_WIDTH = 1200;

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return null;
};

const normalizeRenditions = (photo?: ApiPhoto | null) => {
  if (!photo || !Array.isArray(photo.renditions)) return [];
  return photo.renditions
    .map((item) => {
      const width = toPositiveNumber(item?.width);
      const url = typeof item?.url === "string" ? item.url.trim() : "";
      if (!width || !url) return null;
      return {
        width,
        url,
        kind: typeof item?.kind === "string" && item.kind.trim() ? item.kind.trim() : "detail",
        format:
          typeof item?.format === "string" && item.format.trim()
            ? item.format.trim().toLowerCase()
            : "webp",
      };
    })
    .filter((item): item is { width: number; url: string; kind: string; format: string } => Boolean(item))
    .sort((a, b) => a.width - b.width);
};

const pickBestByWidth = (
  items: Array<{ width: number; url: string; kind: string; format: string }>,
  targetWidth: number
) => {
  if (!items.length) return null;
  const atLeastTarget = items.find((item) => item.width >= targetWidth);
  return atLeastTarget || items[items.length - 1];
};

const toAbsoluteSrcSet = (
  rawSrcSet: string | null | undefined,
  resolvePath: (path: string) => string
) => {
  if (!rawSrcSet) return "";
  return rawSrcSet
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawUrl, descriptor] = entry.split(/\s+/, 2);
      if (!rawUrl) return "";
      const absoluteUrl = resolvePath(rawUrl);
      if (!absoluteUrl) return "";
      return descriptor ? `${absoluteUrl} ${descriptor}` : absoluteUrl;
    })
    .filter(Boolean)
    .join(", ");
};

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  photo,
  fallbackPath,
  alt,
  kind,
  sizes,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  containerStyle,
  imgStyle,
  objectFit = "cover",
  strictKind = false,
  width,
  height,
  onLoad,
  onError,
  onDecoded,
}) => {
  const getImageUrl = useImageUrl();

  const renditions = useMemo(() => normalizeRenditions(photo), [photo]);
  const webpRenditions = useMemo(
    () => renditions.filter((item) => item.format === "webp"),
    [renditions]
  );
  const kindRenditions = useMemo(
    () => webpRenditions.filter((item) => item.kind === kind),
    [kind, webpRenditions]
  );
  const activeRenditions = useMemo(() => {
    if (strictKind) return kindRenditions;
    return kindRenditions.length > 0 ? kindRenditions : webpRenditions;
  }, [kindRenditions, strictKind, webpRenditions]);

  const srcSet = useMemo(() => {
    if (activeRenditions.length > 0) {
      return activeRenditions
        .map((item) => `${getImageUrl(item.url)} ${item.width}w`)
        .join(", ");
    }
    if (strictKind) {
      return "";
    }
    return toAbsoluteSrcSet(photo?.srcset_webp, getImageUrl);
  }, [activeRenditions, getImageUrl, photo?.srcset_webp, strictKind]);

  const targetWidth = kind === "detail" ? DETAIL_TARGET_WIDTH : CARD_TARGET_WIDTH;
  const bestRendition = pickBestByWidth(activeRenditions, targetWidth);
  const fallbackSource =
    (typeof fallbackPath === "string" && fallbackPath.trim()) ||
    (typeof photo?.original_url === "string" && photo.original_url.trim()) ||
    (typeof photo?.image === "string" && photo.image.trim()) ||
    (typeof photo?.thumbnail === "string" && photo.thumbnail.trim()) ||
    "";

  const bestSrc = bestRendition ? getImageUrl(bestRendition.url) : "";
  const fallbackSrc = fallbackSource ? getImageUrl(fallbackSource) : "";
  const finalSrc = bestSrc || fallbackSrc;

  const resolvedObjectFit: React.CSSProperties["objectFit"] = objectFit;
  const resolvedObjectPosition: React.CSSProperties["objectPosition"] =
    (imgStyle?.objectPosition as React.CSSProperties["objectPosition"]) || "center";

  if (!finalSrc && !srcSet) return null;

  const handleImgLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      onLoad?.(event);
      if (!onDecoded) return;

      const img = event.currentTarget;
      if (typeof img.decode === "function") {
        img
          .decode()
          .catch(() => undefined)
          .finally(() => {
            onDecoded(img);
          });
        return;
      }
      onDecoded(img);
    },
    [onDecoded, onLoad]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        ...containerStyle,
      }}
    >
      <picture style={{ display: "block", width: "100%", height: "100%" }}>
        {srcSet ? <source type="image/webp" srcSet={srcSet} sizes={sizes} /> : null}
        <img
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          sizes={sizes}
          onLoad={handleImgLoad}
          onError={onError}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            ...imgStyle,
            objectFit: resolvedObjectFit,
            objectPosition: resolvedObjectPosition,
          }}
        />
      </picture>
    </div>
  );
};

export default ResponsiveImage;
