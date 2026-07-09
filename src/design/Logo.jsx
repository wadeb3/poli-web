// ─────────────────────────────────────────────────────────────────────────────
// POLI LOGO · v5 · Direct from designer SVG files
//
// All coordinates copied verbatim from the exported SVG files:
//   poli-wordmark-ink.svg / poli-wordmark-white.svg
//   poli-icon-ink.svg / poli-icon-white.svg / poli-icon-accent.svg
//
// Wordmark viewBox: 0 0 184 120
//   text  x=6 y=86.4 font-size=96 font-weight=800 letter-spacing=-1
//   dot   cx=165.18 cy=36.40 r=11.50
//
// Icon viewBox: 0 0 1024 1024
//   text  x=322.9 y=596.8 font-size=245.8 letter-spacing=-18.43
//   dot   cx=674.9 cy=468.8 r=29.4
// ─────────────────────────────────────────────────────────────────────────────

// Load Manrope 800 once
const FONT_URL = "https://fonts.googleapis.com/css2?family=Manrope:wght@800&display=swap";
if (typeof document !== "undefined" && !document.querySelector(`link[href="${FONT_URL}"]`)) {
  const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: FONT_URL });
  document.head.appendChild(link);
}

/**
 * Full "Poli" wordmark. Coordinates from poli-wordmark-ink/white.svg.
 * @param {{ height?: number, dark?: boolean }} props
 */
export function Logo({ height = 32, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#17171A";
  const dotColor  = dark ? "#A855F7" : "#7C3AED";
  // viewBox is 184×120, scale height to match
  const width = Math.round(height * (184 / 120));

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 184 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Poli"
      role="img"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <style>{`@import url('${FONT_URL}');`}</style>
      </defs>
      <text
        x="6"
        y="86.4"
        fontFamily="Manrope, Helvetica, Arial, sans-serif"
        fontSize="96"
        fontWeight="800"
        letterSpacing="-1"
        fill={textColor}
      >
        Polı
      </text>
      <circle cx="165.18" cy="36.40" r="11.50" fill={dotColor} />
    </svg>
  );
}

/**
 * Icon mark — square format with rounded corners.
 * Coordinates from poli-icon-ink/white/accent.svg.
 * @param {{ size?: number, variant?: "ink"|"white"|"accent" }} props
 */
export function LogoIcon({ size = 32, variant = "ink" }) {
  const configs = {
    ink:    { bg: "#17171A", text: "#FFFFFF", dot: "#A855F7" },
    white:  { bg: "#FFFFFF", text: "#17171A", dot: "#7C3AED" },
    accent: { bg: "#7C3AED", text: "#FFFFFF", dot: "#17171A" },
  };
  const { bg, text, dot } = configs[variant] || configs.ink;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Poli"
      role="img"
      style={{ display: "block" }}
    >
      <defs>
        <style>{`@import url('${FONT_URL}');`}</style>
      </defs>
      <rect width="1024" height="1024" rx="232" fill={bg} />
      <text
        x="322.9"
        y="596.8"
        fontFamily="Manrope, Helvetica, Arial, sans-serif"
        fontSize="245.8"
        fontWeight="800"
        letterSpacing="-18.43"
        fill={text}
      >
        Polı
      </text>
      <circle cx="674.9" cy="468.8" r="29.4" fill={dot} />
    </svg>
  );
}

/**
 * Collapsed sidebar mark — uses LogoIcon at small size.
 * @param {{ size?: number, dark?: boolean }} props
 */
export function LogoMark({ size = 24, dark = false }) {
  return <LogoIcon size={size} variant={dark ? "ink" : "white"} />;
}
