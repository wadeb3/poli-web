// ─────────────────────────────────────────────────────────────────────────────
// POLI LOGO · in-app source of truth
//
// <Logo> references the actual designer-exported SVG files directly, as
// static image assets — not reconstructed from paths, coordinates, or live
// text + CSS positioning. Two files, swapped automatically by theme:
//   /logo/Poli_Logo_Black.svg — light theme
//   /logo/Poli_Logo_White.svg — dark theme
// Both live in /public/logo/, same convention as the previous PNG asset.
// Do not edit these SVGs or attempt to recreate them from coordinates — if
// the design changes, get a new export and swap the file, same as before.
//
// <LogoMark> — unchanged. Compact geometric "standing i" glyph, no font or
// image-file dependency. Use at ≤24px: sidebar rail, favicons, anywhere the
// wordmark would be too wide. This is a separate asset from the wordmark
// above — not something the new SVG files replace.
//
// Usage rules:
//   · Clear space: half the cap height on all sides
//   · Never recolour the dot; both wordmark files ship with it pre-set
//   · Minimum sizes: wordmark 56px wide · mark 16px
// ─────────────────────────────────────────────────────────────────────────────
import { C } from "./tokens.js";
import { useTheme } from "./theme.jsx";

/**
 * Wordmark. `height` sets display height in px; width follows the file's
 * own aspect ratio automatically.
 * @param {{ height?: number, style?: React.CSSProperties }} props
 */
export function Logo({ height = 28, style }) {
  const [mode] = useTheme();
  const src = mode === "dark" ? "/logo/Poli_Logo_White.svg" : "/logo/Poli_Logo_Black.svg";
  return (
    <img
      src={src}
      alt="Poli"
      height={height}
      style={{ display: "block", height, width: "auto", userSelect: "none", ...style }}
    />
  );
}

/**
 * Geometric mark ("standing i"). Inherits stem colour from `color`.
 * @param {{ size?: number, color?: string, dotColor?: string }} props
 */
export function LogoMark({ size = 22, color = C.ink, dotColor = C.accent }) {
  return (
    <svg width={size * (200 / 350)} height={size} viewBox="0 0 200 350" aria-label="Poli" role="img" style={{ display: "block" }}>
      <path d="M68 156 a32 32 0 0 1 64 0 v148 c0 8 4 14 14 18 6 2.4 10 6 10 12 0 8-6 12-14 12 h-84 c-8 0-14-4-14-12 0-6 4-9.6 10-12 10-4 14-10 14-18 Z" fill={color} />
      <circle cx="100" cy="50" r="46" fill={dotColor} />
    </svg>
  );
}
