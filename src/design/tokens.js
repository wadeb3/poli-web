// ─────────────────────────────────────────────────────────────────────────────
// POLI DESIGN TOKENS · v6.1 "Broadsheet"
//
// All colours now resolve through CSS custom properties defined in theme.js
// (light + dark palettes). Component code keeps writing `C.paper` — the value
// is `var(--poli-paper)`, so flipping the data-poli-theme attribute retints
// the entire app. Raw hex values live ONLY in theme.js.
//
// v6.1 also sharpens the geometry: the pillowy 16–20px radii of the card era
// give way to a tighter editorial scale, hairline rules become a first-class
// element, and resting shadows are removed — borders and typography do the
// separating, the way a well-set page does.
//
// Rules that survive from v6 unchanged:
//   · sentiment colour ≠ party colour, never mixed on one surface
//   · terracotta rationed to one resting appearance per surface
//   · accent for graphics/display; accentText for small type (AA both themes)
// ─────────────────────────────────────────────────────────────────────────────
import "./theme.jsx"; // side effect: injects palettes + sets theme pre-paint

const v = k => `var(--poli-${k})`;

export const C = {
  // base — `white` is semantically "raised card surface" (dark: warm char)
  white: v("white"), paper: v("paper"), surface: v("surface"), surfaceB: v("surfaceB"),
  border: v("border"), borderDark: v("borderDark"),
  ink: v("ink"), mid: v("mid"), faint: v("faint"),
  // accent
  accent: v("accent"), accentText: v("accentText"), accentDark: v("accentDark"),
  accentSoft: v("accentSoft"), accentMid: v("accentMid"),
  // sentiment — never used for parties
  green: v("green"), greenSoft: v("greenSoft"), greenMid: v("greenMid"),
  red: v("red"), redSoft: v("redSoft"), redMid: v("redMid"),
  amber: v("amber"), amberSoft: v("amberSoft"), amberMid: v("amberMid"),
  // informational
  blue: v("blue"), blueSoft: v("blueSoft"), blueMid: v("blueMid"),
  purple: v("purple"), purpleSoft: v("purpleSoft"),
  teal: v("teal"), tealSoft: v("tealSoft"),
  // provenance
  live: v("live"), stale: v("stale"), sample: v("sample"),
};

/** Mix a token colour with transparency — works with CSS variables. */
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

// Party colours — labelled-chip dots and hemicycle seats ONLY (theme-tuned).
export const PARTY = {
  ALP:    { color: v("partyALP"), label: "Labor" },
  LNP:    { color: v("partyLNP"), label: "Liberal–National" },
  LIB:    { color: v("partyLNP"), label: "Liberal" },
  NAT:    { color: v("partyNAT"), label: "Nationals" },
  Greens: { color: v("partyGRN"), label: "Greens" },
  GRN:    { color: v("partyGRN"), label: "Greens" },
  ONP:    { color: v("partyONP"), label: "One Nation" },
  IND:    { color: v("partyIND"), label: "Independent" },
  OTH:    { color: v("partyOTH"), label: "Other" },
};
/** @param {string} code */
export const partyOf = code => PARTY[code] || PARTY.OTH;

// Typography ──────────────────────────────────────────────────────────────────
export const FONT = {
  display: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
  ui:      "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
};

export const TYPE = {
  masthead: { fontFamily: FONT.display, fontSize: 32, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.015em" },
  hero:     { fontFamily: FONT.display, fontSize: 26, lineHeight: 1.2,  fontWeight: 600, letterSpacing: "-0.01em" },
  h2:       { fontFamily: FONT.display, fontSize: 20, lineHeight: 1.3,  fontWeight: 600 },
  h3:       { fontFamily: FONT.display, fontSize: 16, lineHeight: 1.4,  fontWeight: 600 },
  stat:     { fontFamily: FONT.display, fontSize: 36, lineHeight: 1,    fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  body:     { fontFamily: FONT.ui, fontSize: 15, lineHeight: 1.6,  fontWeight: 400 },
  sm:       { fontFamily: FONT.ui, fontSize: 13, lineHeight: 1.55, fontWeight: 400 },
  label:    { fontFamily: FONT.ui, fontSize: 12, lineHeight: 1.4,  fontWeight: 600 },
  caption:  { fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.4,  fontWeight: 500 },
  overline: { fontFamily: FONT.ui, fontSize: 11, lineHeight: 1.3,  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" },
  num:      { fontVariantNumeric: "tabular-nums" },
};

// Spacing — 4px base.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

// Radii — sharpened for the editorial register. Pills remain metadata-only.
export const RADIUS = { card: 12, panel: 10, control: 8, chip: 6, pill: 999 };

export const SHADOW = {
  card: v("shadowCard"),
  cardHover: v("shadowCardHover"),
  overlay: v("shadowOverlay"),
};

export const LAYOUT = {
  sidebarWidth: 240,
  sidebarCollapsed: 68, // icon rail — same glyph language as the mobile bottom bar
  bottomBarHeight: 60,
  contentMax: 1140,
  readableMax: 680,
  deskListWidth: 340, // two-pane bill desk: list column
};
