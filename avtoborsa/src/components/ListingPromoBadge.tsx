import type { CSSProperties } from "react";
import topBadgeImage from "../assets/top_badge.png";
import vipBadgeImage from "../assets/vip_badge.jpg";

type ListingPromoBadgeType = "top" | "vip";
type ListingPromoBadgeSize = "default" | "sm" | "xs";
type ListingPromoBadgeShadowVariant = "default" | "similar";

type ListingPromoBadgeProps = {
  type: ListingPromoBadgeType;
  size?: ListingPromoBadgeSize;
  shadowVariant?: ListingPromoBadgeShadowVariant;
  zIndex?: number;
};

const BASE_CONTAINER_STYLE: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
};

const BASE_IMAGE_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  position: "relative",
  zIndex: 2,
};

const BASE_HIGHLIGHT_STYLE: CSSProperties = {
  position: "absolute",
  top: 11,
  left: 11,
  width: 48,
  height: 20,
  background: "radial-gradient(ellipse at center, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0) 74%)",
  transform: "rotate(-18deg)",
  zIndex: 3,
};

const BASE_SHADOW_STYLE: CSSProperties = {
  position: "absolute",
  bottom: 3,
  left: 16,
  width: 46,
  height: 12,
  background: "rgba(15,23,42,0.25)",
  borderRadius: 999,
  filter: "blur(6px)",
  zIndex: 1,
};

export default function ListingPromoBadge({
  type,
  size = "default",
  shadowVariant = "default",
  zIndex = 30,
}: ListingPromoBadgeProps) {
  const isVip = type === "vip";
  const isSmall = size === "sm";
  const isExtraSmall = size === "xs";

  const containerStyle: CSSProperties = isVip
    ? {
        ...BASE_CONTAINER_STYLE,
        top: isExtraSmall ? -9 : isSmall ? -14 : -15,
        left: isExtraSmall ? -29 : isSmall ? -34 : -36,
        width: isExtraSmall ? 58 : isSmall ? 76 : 80,
        height: isExtraSmall ? 58 : isSmall ? 76 : 80,
        zIndex,
      }
    : {
        ...BASE_CONTAINER_STYLE,
        top: isExtraSmall ? -8 : isSmall ? -13 : -14,
        left: isExtraSmall ? -27 : isSmall ? -32 : -34,
        width: isExtraSmall ? 54 : isSmall ? 72 : 76,
        height: isExtraSmall ? 54 : isSmall ? 72 : 76,
        zIndex,
      };

  const imageStyle: CSSProperties = isVip
    ? {
        ...BASE_IMAGE_STYLE,
        transform: "rotate(-6deg)",
        transformOrigin: "22% 20%",
        filter: "drop-shadow(0 10px 15px rgba(15,23,42,0.38))",
      }
    : {
        ...BASE_IMAGE_STYLE,
        transform: "rotate(-7deg)",
        transformOrigin: "22% 20%",
        filter: "drop-shadow(0 9px 14px rgba(15,23,42,0.36))",
      };

  const highlightStyle: CSSProperties = isVip
    ? {
        ...BASE_HIGHLIGHT_STYLE,
        width: isExtraSmall ? 31 : isSmall ? 44 : BASE_HIGHLIGHT_STYLE.width,
        height: isExtraSmall ? 13 : BASE_HIGHLIGHT_STYLE.height,
      }
    : {
        ...BASE_HIGHLIGHT_STYLE,
        width: isExtraSmall ? 27 : isSmall ? 42 : 46,
        height: isExtraSmall ? 12 : BASE_HIGHLIGHT_STYLE.height,
      };

  const shadowStyle: CSSProperties = isVip
    ? {
        ...BASE_SHADOW_STYLE,
        width: isExtraSmall ? 29 : isSmall ? 43 : BASE_SHADOW_STYLE.width,
        height: isExtraSmall ? 7 : isSmall ? 11 : BASE_SHADOW_STYLE.height,
      }
    : {
        ...BASE_SHADOW_STYLE,
        width: isExtraSmall
          ? shadowVariant === "similar"
            ? 29
            : 25
          : isSmall
            ? 40
            : 44,
        height: isExtraSmall
          ? shadowVariant === "similar"
            ? 7
            : 6
          : isSmall
            ? 10
            : 11,
      };

  return (
    <span style={containerStyle}>
      <span style={shadowStyle} />
      <img
        src={isVip ? vipBadgeImage : topBadgeImage}
        alt={isVip ? "VIP обява" : "Топ обява"}
        style={imageStyle}
        loading="lazy"
        decoding="async"
      />
      <span style={highlightStyle} />
    </span>
  );
}
