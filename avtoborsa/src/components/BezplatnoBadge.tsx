import type { CSSProperties } from "react";
import bezplatnoBadgeImage from "../assets/bezplatno.svg";

type BezplatnoBadgeSize = "default" | "sm" | "xs";

type BezplatnoBadgeProps = {
  size?: BezplatnoBadgeSize;
  zIndex?: number;
  className?: string;
};

type SpriteRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SOURCE_WIDTH = 1440;
const SOURCE_HEIGHT = 810;

const RIBBON_REGION: SpriteRegion = {
  x: 684,
  y: 373,
  width: 66,
  height: 72,
};

const SIZE_PRESETS: Record<
  BezplatnoBadgeSize,
  {
    width: number;
    offset: { top: number; right: number };
  }
> = {
  default: {
    width: 58,
    offset: { top: -20, right: -17 },
  },
  sm: {
    width: 52,
    offset: { top: -18, right: -15 },
  },
  xs: {
    width: 40,
    offset: { top: -4, right: -1 },
  },
};

const BASE_SPRITE_STYLE: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  backgroundImage: `url(${bezplatnoBadgeImage})`,
  backgroundRepeat: "no-repeat",
};

const buildRibbonStyle = (
  region: SpriteRegion,
  targetWidth: number,
  position: Partial<Pick<CSSProperties, "top" | "right">>,
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

export default function BezplatnoBadge({
  size = "default",
  zIndex = 3,
  className,
}: BezplatnoBadgeProps) {
  const preset = SIZE_PRESETS[size];
  return (
    <span
      aria-hidden="true"
      className={className}
      style={buildRibbonStyle(
        RIBBON_REGION,
        preset.width,
        { top: preset.offset.top, right: preset.offset.right },
        zIndex
      )}
    />
  );
}
