// ─────────────────────────────────────────────────────────────────────────────
// POLI ICON SET · inline SVG, 24px grid, 1.75 stroke, round caps
//
// Replaces emoji UI icons (🔔 🔕 🔍 ⚠ ⚙ …). Emoji render differently on every
// OS, can't be tinted, and undercut the "citable data source" register the
// product is aiming for. These inherit `currentColor` so any component can
// tint them with text colour.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} IconProps
 * @property {number} [size]  Rendered square size in px. Default 18.
 * @property {number} [strokeWidth] Default 1.75.
 * @property {string} [style] passthrough not supported — wrap in a span if needed.
 */

const base = (size, strokeWidth) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true, style: { flexShrink: 0, display: "block" },
});

/** @param {{size?:number, strokeWidth?:number}} p */
export const IconHome = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>
);
export const IconBill = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M15 3v4h4M9.5 12h5M9.5 16h5"/></svg>
);
export const IconParliament = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M3 21h18M5 21v-8M9 21v-8M15 21v-8M19 21v-8M3 13h18M12 3 4 8.5h16L12 3Z"/></svg>
);
export const IconPerson = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.7-5.5 7-5.5s6.2 2 7 5.5"/></svg>
);
export const IconVote = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M4 12h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8ZM4 12l2.5-5h11L20 12M12 12v-2"/><path d="m9.5 5.5 2 2 4-4.5"/></svg>
);
export const IconLearn = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M12 5.5C10.5 4.5 8.5 4 6 4c-1 0-2 .1-3 .4V19c1-.3 2-.4 3-.4 2.5 0 4.5.5 6 1.4 1.5-.9 3.5-1.4 6-1.4 1 0 2 .1 3 .4V4.4c-1-.3-2-.4-3-.4-2.5 0-4.5.5-6 1.5Z"/><path d="M12 5.5V20"/></svg>
);
export const IconBell = ({ size = 18, strokeWidth = 1.75, filled = false }) => (
  <svg {...base(size, strokeWidth)} fill={filled ? "currentColor" : "none"}><path d="M18 16H6c1.2-1.2 1.5-3 1.5-5a4.5 4.5 0 0 1 9 0c0 2 .3 3.8 1.5 5Z"/><path d="M10.2 19a2 2 0 0 0 3.6 0" fill="none"/></svg>
);
export const IconSearch = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/></svg>
);
export const IconAlert = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10.5V14M12 17.2v.1"/></svg>
);
export const IconEye = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>
);
export const IconInfo = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.1"/></svg>
);
export const IconExternal = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"/></svg>
);
export const IconChevron = ({ size = 18, strokeWidth = 1.75, dir = "down" }) => {
  const rot = { down: 0, up: 180, right: -90, left: 90 }[dir] || 0;
  return <svg {...base(size, strokeWidth)} style={{ flexShrink: 0, display: "block", transform: `rotate(${rot}deg)`, transition: "transform 0.15s" }}><path d="m6 9.5 6 6 6-6"/></svg>;
};
export const IconRefresh = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>
);
export const IconDollar = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M12 3v18M16.5 7.5c-.8-1.2-2.4-2-4.5-2-2.5 0-4.5 1.3-4.5 3.2 0 4.3 9 2.3 9 6.6 0 1.9-2 3.2-4.5 3.2-2.1 0-3.7-.8-4.5-2"/></svg>
);
export const IconShare = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="m8.4 10.8 6.7-4M8.4 13.2l6.7 4"/></svg>
);
export const IconSparkle = ({ size = 18, strokeWidth = 1.75 }) => (
  <svg {...base(size, strokeWidth)}><path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9 12 3.5Z"/><path d="M19 17.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/></svg>
);
