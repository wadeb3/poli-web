// ─────────────────────────────────────────────────────────────────────────────
// POLI PRIMITIVES · v6
// Card, buttons, chips, section labels, sentiment bar. Inline styles, no CSS
// framework — matches the existing App.jsx pattern. All props JSDoc-typed.
//
// Hierarchy rules encoded here:
//   · Pills (radius 999) = metadata only (status, party, category)
//   · Buttons = radius 10, never pill-shaped
//   · One terracotta element per card maximum (the accent must stay scarce
//     to keep meaning — in v5 it appeared 4–6 times per card)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS, SHADOW, partyOf, alpha } from "./tokens.js";

/**
 * Surface card. `interactive` adds hover elevation.
 * @param {{ children: React.ReactNode, interactive?: boolean, pad?: string|number,
 *           style?: React.CSSProperties, onClick?: () => void }} props
 */
export function Card({ children, interactive = false, pad = "20px 22px", style, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: C.white,
        border: `1px solid ${hover ? C.borderDark : C.border}`,
        borderRadius: RADIUS.card,
        padding: pad,
        boxShadow: hover ? SHADOW.cardHover : "none", // editorial: borders separate, elevation only on hover/overlay
        transition: "box-shadow 0.2s, border-color 0.2s",
        cursor: onClick ? "pointer" : undefined,
        breakInside: "avoid",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Primary / secondary / ghost / sentiment buttons.
 * @param {{ children: React.ReactNode, variant?: "primary"|"secondary"|"ghost"|"support"|"oppose",
 *           size?: "sm"|"md", full?: boolean, active?: boolean, disabled?: boolean,
 *           onClick?: (e: React.MouseEvent) => void, style?: React.CSSProperties,
 *           "aria-label"?: string }} props
 */
export function Button({ children, variant = "secondary", size = "md", full = false, active = false, disabled = false, onClick, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const pad = size === "sm" ? "7px 14px" : "10px 18px";
  const fontSize = size === "sm" ? 12 : 13;
  const variants = {
    primary:   { background: hover ? C.accentDark : C.accent, color: C.white, border: `1px solid transparent` },
    secondary: { background: active ? C.accentSoft : hover ? C.surface : C.white, color: active ? C.accentText : C.ink, border: `1px solid ${active ? C.accentMid : C.borderDark}` },
    ghost:     { background: hover ? C.surface : "transparent", color: C.mid, border: "1px solid transparent" },
    support:   { background: active ? C.green : C.greenSoft, color: active ? C.white : C.green, border: `1px solid ${active ? C.green : C.greenMid}` },
    oppose:    { background: active ? C.red : C.redSoft, color: active ? C.white : C.red, border: `1px solid ${active ? C.red : C.redMid}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: pad, borderRadius: RADIUS.control, fontFamily: "inherit",
        fontSize, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1, width: full ? "100%" : undefined,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        ...variants[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Metadata chip (pill). Neutral by default.
 * @param {{ children: React.ReactNode, color?: string, dot?: string|boolean,
 *           tone?: "tint"|"outline" }} props
 */
export function Chip({ children, color = C.mid, dot = false, tone = "outline" }) {
  const tint = tone === "tint";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600, color,
      background: tint ? alpha(color, 9) : C.white,
      border: `1px solid ${tint ? alpha(color, 22) : C.border}`,
      whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: typeof dot === "string" ? dot : color, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

/**
 * Party chip — colour appears ONLY as the dot, never as fill (see tokens.js).
 * @param {{ party: string, showName?: boolean }} props
 */
export function PartyChip({ party, showName = false }) {
  const p = partyOf(party);
  return <Chip color={C.ink} dot={p.color}>{showName ? p.label : party}</Chip>;
}

/** @param {{ status: string }} props */
export function StatusChip({ status }) {
  const cfg = {
    Active:      { color: C.green,  label: "Active law" },
    Assented:    { color: C.green,  label: "Assented" },
    Passed:      { color: C.blue,   label: "Passed" },
    Lapsed:      { color: C.faint,  label: "Lapsed" },
    Negatived:   { color: C.red,    label: "Negatived" },
    Withdrawn:   { color: C.faint,  label: "Withdrawn" },
    Proposed:    { color: C.amber,  label: "Proposed" },
    Legislation: { color: C.blue,   label: "In parliament" },
  }[status] || { color: C.faint, label: status || "Unknown" };
  return <Chip color={cfg.color} dot tone="tint">{cfg.label}</Chip>;
}

/** Infer whether a bill is an amendment, repeal, appropriation or new law from its title */
export function BillTypeChip({ title }) {
  if (!title) return null;
  const t = title.toLowerCase();
  let label, color;
  if (t.includes("appropriation") || t.includes("supply bill")) {
    label = "Appropriation"; color = C.purple;
  } else if (t.includes("repeal")) {
    label = "Repeal"; color = C.red;
  } else if (t.includes("amendment")) {
    label = "Amendment"; color = C.amber;
  } else {
    label = "New bill"; color = C.blue;
  }
  return <Chip color={color} tone="tint">{label}</Chip>;
}

/**
 * Section label — kept from v5 (the tick + overline is a good scanning anchor),
 * with the tick now neutral by default so terracotta stays scarce.
 * @param {{ children: React.ReactNode, color?: string, right?: React.ReactNode }} props
 */
export function SectionLabel({ children, color = C.borderDark, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 3, height: 14, borderRadius: 99, background: color, flexShrink: 0 }} />
      <div style={{ ...TYPE.overline, color: C.faint, flex: 1 }}>{children}</div>
      {right}
    </div>
  );
}

/**
 * Support / neutral / oppose sentiment bar with legend.
 * @param {{ support: number, neutral: number, oppose: number, height?: number }} props
 */
export function SentimentBar({ support, neutral, oppose, height = 6 }) {
  return (
    <div>
      <div role="img" aria-label={`${support}% support, ${neutral}% neutral, ${oppose}% oppose`}
        style={{ display: "flex", height, borderRadius: 99, overflow: "hidden", background: C.surfaceB, gap: 1 }}>
        <div style={{ width: `${support}%`, background: C.green }} />
        <div style={{ width: `${neutral}%`, background: C.borderDark }} />
        <div style={{ width: `${oppose}%`, background: C.red }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: C.green, fontWeight: 600 }}>{support}% support</span>
        <span style={{ color: C.faint }}>{neutral}% neutral</span>
        <span style={{ color: C.red, fontWeight: 600 }}>{oppose}% oppose</span>
      </div>
    </div>
  );
}

/**
 * Hero stat — Instrument Serif numeral with caption. The serif numeral is a
 * signature Poli move; keep it to ONE per card.
 * @param {{ value: React.ReactNode, suffix?: string, caption: string,
 *           color?: string, trend?: string, trendDir?: "up"|"down" }} props
 */
export function Stat({ value, suffix, caption, color = C.ink, trend, trendDir }) {
  return (
    <div style={{ textAlign: "center", minWidth: 64 }}>
      <div style={{ ...TYPE.stat, color }}>
        {value}{suffix && <span style={{ fontSize: 22, color: C.faint }}>{suffix}</span>}
      </div>
      <div style={{ ...TYPE.overline, fontSize: 10, color: C.faint, marginTop: 3 }}>{caption}</div>
      {trend && (
        <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: trendDir === "up" ? C.green : C.red }}>
          {trendDir === "up" ? "▲" : "▼"} {trend}
        </div>
      )}
    </div>
  );
}

/** @param {{ my?: number }} props */
export const Divider = ({ my = 16 }) => (
  <div style={{ borderTop: `1px solid ${C.border}`, margin: `${my}px 0` }} />
);

// ── Editorial primitives (v6.1 "Broadsheet") ─────────────────────────────────

/**
 * Kicker — broadsheet section opener: overline label sitting on a hairline,
 * with a short terracotta tick at the left. Replaces SectionLabel at page
 * level (SectionLabel remains for in-card sections).
 * @param {{ children: React.ReactNode, right?: React.ReactNode }} props
 */
export function Kicker({ children, right }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 8 }}>
        <span style={{ ...TYPE.overline, color: C.ink }}>{children}</span>
        {right && <span style={{ marginLeft: "auto" }}>{right}</span>}
      </div>
      <div style={{ position: "relative", borderTop: `1px solid ${C.border}` }}>
        <span style={{ position: "absolute", top: -1, left: 0, width: 44, borderTop: `2px solid ${C.accent}` }} />
      </div>
    </div>
  );
}

/**
 * Full-width hairline rule; `strong` doubles it, masthead-style.
 * @param {{ my?: number, strong?: boolean }} props
 */
export function Rule({ my = 20, strong = false }) {
  return strong ? (
    <div style={{ margin: `${my}px 0`, borderTop: `2.5px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}`, height: 3 }} />
  ) : (
    <div style={{ margin: `${my}px 0`, borderTop: `1px solid ${C.border}` }} />
  );
}

/**
 * Index numeral — serif figure used to number editorial list entries.
 * @param {{ n: number, size?: number }} props
 */
export function IndexNum({ n, size = 22 }) {
  return (
    <span aria-hidden style={{
      fontFamily: TYPE.h2.fontFamily, fontSize: size, lineHeight: 1,
      color: C.faint, fontVariantNumeric: "tabular-nums", flexShrink: 0,
    }}>
      {String(n).padStart(2, "0")}
    </span>
  );
}
