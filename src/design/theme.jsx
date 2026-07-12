// ─────────────────────────────────────────────────────────────────────────────
// POLI THEME SYSTEM · light / dark
//
// Every colour in the design system is a CSS custom property; the palettes
// below are the only place raw values live. Components keep using `C.paper`
// etc. from tokens.js, those now resolve to var(--poli-*), so the entire app
// retints instantly when `data-poli-theme` flips on <html>. No re-render
// needed for the colour change itself.
//
// Dark mode is not an inversion, it's the same editorial material at night:
// warm char surfaces (never blue-black), ink becomes warm bone, terracotta
// brightens slightly to hold its presence, and all sentiment/party colours
// are re-tuned for AA contrast on dark grounds.
//
// Behaviour: follows OS preference on first visit, persists explicit choice
// in localStorage, applies before paint (module runs at import time), no
// flash of wrong theme.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

const LIGHT = {
  // base
  white: "#FFFFFF", paper: "#FBFAF8", surface: "#F5F3F0", surfaceB: "#EDEAE5",
  border: "#E9E5DF", borderDark: "#D5CFC7",
  ink: "#211D1A", mid: "#6F6862", faint: "#A39C94",
  // accent
  accent: "#E8573A", accentText: "#BE4224", accentDark: "#A93A20",
  accentSoft: "#FBEEE8", accentMid: "#F3D6CB",
  // sentiment
  green: "#1B7A43", greenSoft: "#EBF4EE", greenMid: "#C9E5D3",
  red: "#B3372B", redSoft: "#FAECE9", redMid: "#EFCBC4",
  amber: "#9A6700", amberSoft: "#FAF3E3", amberMid: "#EEDFB8",
  // informational
  blue: "#2456A6", blueSoft: "#EDF2FA", blueMid: "#C9D8EF",
  purple: "#6D28D9", purpleSoft: "#F4F1FC",
  teal: "#0D766E", tealSoft: "#EDF7F5",
  // provenance
  live: "#1B7A43", stale: "#9A6700", sample: "#6F6862",
  // party (chips & hemicycle only)
  partyALP: "#B0233A", partyLNP: "#1451A0", partyNAT: "#0E7B3B",
  partyGRN: "#3E9B2E", partyONP: "#E17000", partyIND: "#0D8B94", partyOTH: "#8A8378",
  // elevation
  shadowCard: "0 1px 3px rgba(33,29,26,0.05)",
  shadowCardHover: "0 4px 16px rgba(33,29,26,0.07)",
  shadowOverlay: "0 12px 40px rgba(33,29,26,0.16)",
};

const DARK = {
  white: "#1E1A16", paper: "#131110", surface: "#262119", surfaceB: "#2E2820",
  border: "#2C2721", borderDark: "#423A31",
  ink: "#EDE6DC", mid: "#A89E91", faint: "#6F675C",
  accent: "#EF6242", accentText: "#F58B70", accentDark: "#D14A2C",
  accentSoft: "#35201A", accentMid: "#4A2B21",
  green: "#62C08D", greenSoft: "#1A2A20", greenMid: "#2C4736",
  red: "#E4735F", redSoft: "#301B17", redMid: "#4C2A22",
  amber: "#D5A345", amberSoft: "#2C2413", amberMid: "#46391C",
  blue: "#82A9E3", blueSoft: "#1A2333", blueMid: "#2C3D5C",
  purple: "#B195EC", purpleSoft: "#251F33",
  teal: "#5FBDB2", tealSoft: "#122926",
  live: "#62C08D", stale: "#D5A345", sample: "#A89E91",
  partyALP: "#E0546C", partyLNP: "#6FA0E0", partyNAT: "#4FB878",
  partyGRN: "#7CC465", partyONP: "#F09040", partyIND: "#55C2CC", partyOTH: "#9A9184",
  shadowCard: "0 1px 3px rgba(0,0,0,0.35)",
  shadowCardHover: "0 4px 18px rgba(0,0,0,0.45)",
  shadowOverlay: "0 12px 40px rgba(0,0,0,0.6)",
};

export const PALETTES = { light: LIGHT, dark: DARK };

// ── Accent candidates ─────────────────────────────────────────────────────────
// Australian party colours have claimed nearly the whole wheel: red (ALP),
// blues (LIB), greens (GRN/NAT), orange (ON), yellow (UAP), teal (independents).
// The unclaimed hues are violet and near-monochrome. Violet carries a uniquely
// useful anchor here: purple is the AEC's colour, the colour of neutral
// election administration itself.
//   terracotta, current brand. Earthy, warm, distinctive; sits between ALP
//                red and ON orange, which is the risk being evaluated.
//   violet, "electoral violet". Unclaimable by parties; AEC association.
//   charcoal, no hue at all: ink as accent. The hardest possible
//                non-partisan position; broadsheet austerity.
export const ACCENTS = {
  terracotta: null, // baseline, values live in LIGHT/DARK above
  violet: {
    light: { accent: "#6E49C9", accentText: "#5A38AE", accentDark: "#4B2D96", accentSoft: "#F1EDFB", accentMid: "#DCD2F2" },
    dark:  { accent: "#9B7CF0", accentText: "#B49CF5", accentDark: "#7E5CE0", accentSoft: "#291F42", accentMid: "#392C5C" },
  },
  charcoal: {
    light: { accent: "#211D1A", accentText: "#211D1A", accentDark: "#000000", accentSoft: "#EFECE7", accentMid: "#D5CFC7" },
    dark:  { accent: "#EDE6DC", accentText: "#EDE6DC", accentDark: "#FFFFFF", accentSoft: "#2E2820", accentMid: "#423A31" },
  },
};

const toVars = p => Object.entries(p).map(([k, v]) => `--poli-${k}:${v};`).join("");

// Inject palettes + set initial theme/accent BEFORE first paint (module scope).
// The style element's CONTENT is always rewritten (not just created once) so
// Vite hot-reload picks up palette changes without a hard refresh.
if (typeof document !== "undefined") {
  const accentCss = Object.entries(ACCENTS)
    .filter(([, v]) => v)
    .map(([name, v]) => `
      :root[data-poli-accent="${name}"]{${toVars(v.light)}}
      :root[data-poli-theme="dark"][data-poli-accent="${name}"]{${toVars(v.dark)}}`)
    .join("");
  let el = document.getElementById("poli-theme-vars");
  if (!el) {
    el = document.createElement("style");
    el.id = "poli-theme-vars";
    document.head.appendChild(el);
  }
  el.textContent = `
    :root{${toVars(LIGHT)}color-scheme:light;}
    :root[data-poli-theme="dark"]{${toVars(DARK)}color-scheme:dark;}
    ${accentCss}
    html,body{background:var(--poli-paper);}
    body{transition:background 0.25s ease;}
  `;
  const stored = localStorage.getItem("poli-theme");
  // Was: follow OS prefers-color-scheme on first visit. Defaulting to light
  // instead, regardless of system setting, dark only applies once someone
  // explicitly picks it via ThemeToggle (which is what populates "stored").
  document.documentElement.setAttribute("data-poli-theme", stored || "light");
  document.documentElement.setAttribute("data-poli-accent", localStorage.getItem("poli-accent") || "violet");
}

/**
 * Accent state hook.
 * @returns {[string, (name: string) => void]} [accent, setAccent]
 */
export function useAccent() {
  const [accent, setAccent] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-poli-accent") || "violet"
      : "violet"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-poli-accent", accent);
    localStorage.setItem("poli-accent", accent);
  }, [accent]);
  return [accent, setAccent];
}

/**
 * Swatch row for comparing accent candidates live.
 * @param {{ accent: string, onSelect: (name: string) => void }} props
 */
export function AccentSwitcher({ accent, onSelect }) {
  const swatch = { terracotta: "#E8573A", violet: "#6E49C9", charcoal: "#211D1A" };
  return (
    <div role="radiogroup" aria-label="Accent colour" style={{ display: "flex", gap: 6 }}>
      {Object.keys(ACCENTS).map(name => {
        const on = accent === name;
        return (
          <button key={name} role="radio" aria-checked={on} title={name} onClick={() => onSelect(name)}
            style={{
              width: 22, height: 22, borderRadius: 99, cursor: "pointer", padding: 0,
              background: swatch[name],
              border: on ? `2px solid var(--poli-ink)` : `2px solid var(--poli-border)`,
              outline: on ? `2px solid var(--poli-paper)` : "none", outlineOffset: -4,
            }} />
        );
      })}
    </div>
  );
}

/**
 * Theme state hook, reads initial mode from the attribute set at import time.
 * @returns {["light"|"dark", () => void]} [mode, toggle]
 */
export function useTheme() {
  const [mode, setMode] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-poli-theme") || "light"
      : "light"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-poli-theme", mode);
    localStorage.setItem("poli-theme", mode);
  }, [mode]);
  return [mode, () => setMode(m => (m === "light" ? "dark" : "light"))];
}

/**
 * Sun/moon toggle button.
 * @param {{ mode: "light"|"dark", onToggle: () => void, size?: number }} props
 */
export function ThemeToggle({ mode, onToggle, size = 17 }) {
  return (
    <button onClick={onToggle}
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={mode === "light" ? "Dark mode" : "Light mode"}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 99, cursor: "pointer",
        background: "var(--poli-surface)", border: `1px solid var(--poli-border)`,
        color: "var(--poli-mid)", transition: "background 0.15s",
      }}>
      {mode === "light" ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      )}
    </button>
  );
}
