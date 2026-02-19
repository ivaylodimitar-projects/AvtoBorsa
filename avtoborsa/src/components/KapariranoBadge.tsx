import type { CSSProperties } from "react";
import kapariranoBadgeImage from "../assets/kaparirano.png";

type KapariranoBadgeSize = "default" | "sm" | "xs";

type KapariranoBadgeProps = {
  size?: KapariranoBadgeSize;
  zIndex?: number;
};

type SpriteRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SOURCE_WIDTH = 1920;
const SOURCE_HEIGHT = 1080;

const TOP_RIBBON_REGION: SpriteRegion = {
  x: 993,
  y: 387,
  width: 108,
  height: 114,
};

const BOTTOM_RIBBON_REGION: SpriteRegion = {
  x: 820,
  y: 575,
  width: 106,
  height: 111,
};

const SIZE_PRESETS: Record<
  KapariranoBadgeSize,
  {
    topWidth: number;
    bottomWidth: number;
    topOffset: { top: number; right: number };
    bottomOffset: { bottom: number; left: number };
  }
> = {
  default: {
    topWidth: 118,
    bottomWidth: 124,
    topOffset: { top: -11, right: -10 },
    bottomOffset: { bottom: -10, left: -10 },
  },
  sm: {
    topWidth: 98,
    bottomWidth: 104,
    topOffset: { top: -15, right: -8 },
    bottomOffset: { bottom: -15, left: -8 },
  },
  xs: {
    topWidth: 88,
    bottomWidth: 92,
    topOffset: { top: -8, right: -7 },
    bottomOffset: { bottom: -7, left: -7 },
  },
};

const BASE_SPRITE_STYLE: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundImage: `url(${kapariranoBadgeImage})`,
  backgroundRepeat: "no-repeat",
  filter: "drop-shadow(0 7px 12px rgba(15,23,42,0.26))",
};

const buildRibbonStyle = (
  region: SpriteRegion,
  targetWidth: number,
  position: Partial<Pick<CSSProperties, "top" | "right" | "bottom" | "left">>,
  zIndex: number
): CSSProperties => {
  const scale = targetWidth / region.width;
  const targetHeight = region.height * scale;
  return {
    ...BASE_SPRITE_STYLE,
    ...position,
    width: targetWidth,
    height: targetHeight,
    backgroundSize: `${SOURCE_WIDTH * scale}px ${SOURCE_HEIGHT * scale}px`,
    backgroundPosition: `-${region.x * scale}px -${region.y * scale}px`,
    zIndex,
  };
};

export default function KapariranoBadge({
  size = "default",
  zIndex = 28,
}: KapariranoBadgeProps) {
  const preset = SIZE_PRESETS[size];

  return (
    <>
      <span
        aria-hidden="true"
        style={buildRibbonStyle(
          TOP_RIBBON_REGION,
          preset.topWidth,
          { top: preset.topOffset.top, right: preset.topOffset.right },
          zIndex
        )}
      />
      <span
        aria-hidden="true"
        style={buildRibbonStyle(
          BOTTOM_RIBBON_REGION,
          preset.bottomWidth,
          { bottom: preset.bottomOffset.bottom, left: preset.bottomOffset.left },
          zIndex
        )}
      />
    </>
  );
}
