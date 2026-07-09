// ─────────────────────────────────────────────────────────────────────────────
// POLI LOGO · v2 · updated to match brand identity system
//
// Wordmark spec (from Poli Logo.dc.html):
//   · Typeface: Manrope, weight 800
//   · Text: "Pol" + dotless i (ı) + purple dot
//   · Letter spacing: -0.01em
//   · Dot: width/height 0.24em, positioned at top 0.228em from top of glyph
//   · Dot colour light: #7C3AED  |  dark: #A855F7
//
// Two exports:
//   <Logo>     — full wordmark "Poli"
//   <LogoMark> — standalone dot-i mark for collapsed sidebar / small contexts
// ─────────────────────────────────────────────────────────────────────────────
import { C } from "./tokens.js";

// Manrope 800 — loaded once via a style tag injected into <head>
const FONT_URL = "https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap";
if (typeof document !== "undefined" && !document.querySelector(`link[href="${FONT_URL}"]`)) {
  const link = document.createElement("link");
  link.rel  = "stylesheet";
  link.href = FONT_URL;
  document.head.appendChild(link);
}

const LOGO_FONT = "'Manrope', -apple-system, Helvetica, Arial, sans-serif";

/**
 * Full wordmark — "Poli" with signature purple dot on the i.
 * @param {{ size?: number, dark?: boolean }} props
 * @param size  font-size in px (default 28)
 * @param dark  use dark-mode colours (white text, lighter dot)
 */
export function Logo({ size = 28, dark = false }) {
  const color    = dark ? "#ffffff" : C.ink;
  const dotColor = dark ? "#A855F7" : "#7C3AED";

  // Dot sizing follows the brand spec: 0.24em × 0.24em, top at 0.228em
  const dotEm   = 0.24;
  const topEm   = 0.228;

  return (
    <span
      aria-label="Poli"
      role="img"
      style={{
        fontFamily: LOGO_FONT,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.01em",
        lineHeight: 1,
        color,
        display: "inline-flex",
        alignItems: "baseline",
        userSelect: "none",
      }}
    >
      Pol
      <span style={{ position: "relative", display: "inline-block" }}>
        {/* Dotless i — no native dot */}
        ı
        {/* Brand dot */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: `${topEm}em`,
            left: "50%",
            transform: "translateX(-50%)",
            width:  `${dotEm}em`,
            height: `${dotEm}em`,
            borderRadius: "50%",
            background: dotColor,
            display: "block",
          }}
        />
      </span>
    </span>
  );
}

/**
 * Standalone mark — dot above a minimal stem, no text.
 * Used in collapsed sidebar rail, favicon contexts, app icons.
 * @param {{ size?: number, dark?: boolean }} props
 */
export function LogoMark({ size = 22, dark = false }) {
  const stemColor = dark ? "#ffffff" : C.ink;
  const dotColor  = dark ? "#A855F7" : "#7C3AED";

  return (
    <svg
      width={size * 0.57}
      height={size}
      viewBox="0 0 200 350"
      aria-label="Poli"
      role="img"
      style={{ display: "block" }}
    >
      {/* Stem of the i */}
      <path
        d="M68 156 a32 32 0 0 1 64 0 v148 c0 8 4 14 14 18 6 2.4 10 6 10 12 0 8-6 12-14 12 h-84 c-8 0-14-4-14-12 0-6 4-9.6 10-12 10-4 14-10 14-18 Z"
        fill={stemColor}
      />
      {/* Brand dot */}
      <circle cx="100" cy="50" r="46" fill={dotColor} />
    </svg>
  );
}
