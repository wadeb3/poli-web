// ─────────────────────────────────────────────────────────────────────────────
// POLI LOGO · in-app source of truth
//
// Both <Logo> and <LogoMark> reference the actual designer-exported SVG
// files directly, as static image assets — not reconstructed from paths,
// coordinates, or live text + CSS positioning. Four files total, each pair
// swapped automatically by theme:
//   /logo/Poli_Logo_Black.svg  · /logo/Poli_Logo_White.svg   — wordmark
//   /logo/Poli_Glyph_Black.svg · /logo/Poli_Glyph_White.svg  — compact mark
// All four live in /public/logo/, same convention as the previous PNG asset.
// Do not edit these SVGs or attempt to recreate them from coordinates — if
// the design changes, get a new export and swap the file, same as before.
//
// Usage rules:
//   · Clear space: half the cap height on all sides
//   · Never recolour the dot; all four files ship with it pre-set
//   · Minimum sizes: wordmark 56px wide · mark 16px
// ─────────────────────────────────────────────────────────────────────────────
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
 * Compact mark ("standing i"). Use at ≤24px: sidebar rail, favicons,
 * anywhere the wordmark would be too wide.
 * @param {{ height?: number, style?: React.CSSProperties }} props
 */
export function LogoMark({ height = 22, style }) {
  const [mode] = useTheme();
  const src = mode === "dark" ? "/logo/Poli_Glyph_White.svg" : "/logo/Poli_Glyph_Black.svg";
  return (
    <img
      src={src}
      alt="Poli"
      height={height}
      style={{ display: "block", height, width: "auto", userSelect: "none", ...style }}
    />
  );
}
