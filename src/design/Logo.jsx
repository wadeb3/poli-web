// ─────────────────────────────────────────────────────────────────────────────
// POLI LOGO · in-app source of truth
//
// Two assets:
//   <Logo>     — wordmark. Instrument Serif "Pol" + dotless "ı" + terracotta
//                dot. Uses live text so it always matches the loaded font;
//                the dot position is calibrated relative to font size, so it
//                scales without manual adjustment (this replaces the fragile
//                hand-calibrated absolute offset).
//   <LogoMark> — geometric "standing i" glyph (stem + dot), no font
//                dependency. Use at ≤24px, in the sidebar rail, favicons,
//                and anywhere the wordmark would be too wide.
//
// Usage rules:
//   · Wordmark on paper/white only; mark handles dark or terracotta grounds
//   · Clear space: half the cap height on all sides
//   · Never recolour the dot; in one-colour contexts use LogoMark mono
//   · Minimum sizes: wordmark 56px wide · mark 16px
// ─────────────────────────────────────────────────────────────────────────────
import { C, FONT } from "./tokens.js";

/**
 * Wordmark. `size` is the font size in px.
 * @param {{ size?: number, color?: string, dotColor?: string }} props
 */
export function Logo({ size = 28, color = C.ink, dotColor = C.accent }) {
  const dot = Math.round(size * 0.16);           // dot Ø ≈ 0.32em
  const raise = Math.round(size * 0.72);         // dot centre above baseline
  return (
    <span aria-label="Poli" role="img" style={{ fontFamily: FONT.display, fontSize: size, lineHeight: 1, color, display: "inline-flex", alignItems: "baseline", userSelect: "none" }}>
      Pol
      <span style={{ position: "relative", display: "inline-block" }}>
        {"ı" /* dotless i */}
        <span aria-hidden style={{
          position: "absolute", left: "50%", bottom: raise, transform: "translateX(-50%)",
          width: dot * 2, height: dot * 2, borderRadius: "50%", background: dotColor,
        }} />
      </span>
    </span>
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
