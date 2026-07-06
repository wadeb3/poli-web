// ─────────────────────────────────────────────────────────────────────────────
// POLI STATE PATTERNS · loading / empty / stale / error
//
// Poli runs a hybrid data model (Supabase live for `mps`, hardcoded sample for
// everything else, migrating over time). That makes data provenance a
// PRODUCT FEATURE, not an edge case: a platform that wants to be cited must
// say, on every surface, where its data came from and how fresh it is.
//
// The system has four provenance states, shown via <SourceBadge>:
//   live    · fetched from Supabase, fresh          (green pulse dot)
//   cached  · live source, but fetch failed → fallback shown (amber)
//   sample  · hardcoded demonstration data          (neutral, honest label)
//   loading · skeleton in place, badge hidden
//
// Rule: any card whose data will eventually be live carries a SourceBadge from
// day one. Sample data is labelled as sample — pretending it's live is exactly
// the credibility failure Poli exists to call out in bills.
// ─────────────────────────────────────────────────────────────────────────────
import { C, TYPE, RADIUS } from "./tokens.js";
import { Button } from "./primitives.jsx";
import { IconRefresh, IconSearch, IconAlert } from "./icons.jsx";

// One-time keyframe injection (pattern already used by App.jsx splash).
if (typeof document !== "undefined" && !document.getElementById("poli-state-kf")) {
  const el = document.createElement("style");
  el.id = "poli-state-kf";
  el.textContent = `
    @keyframes poliShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
    @keyframes poliPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
    @media (prefers-reduced-motion: reduce) {
      .poli-shimmer, .poli-pulse { animation: none !important; }
    }`;
  document.head.appendChild(el);
}

/**
 * Data provenance badge.
 * @param {{ state: "live"|"cached"|"sample", updated?: string, source?: string }} props
 *   updated — human freshness, e.g. "2 min ago"
 *   source  — e.g. "APH", "AEC", "Supabase"
 */
export function SourceBadge({ state, updated, source }) {
  const cfg = {
    live:   { color: C.live,   label: "Live",        pulse: true },
    cached: { color: C.stale,  label: "Last known",  pulse: false },
    sample: { color: C.sample, label: "Sample data", pulse: false },
  }[state];
  if (!cfg) return null;
  return (
    <span title={state === "cached" ? "Live source unavailable — showing last verified data" : state === "sample" ? "Demonstration data, not yet connected to a live source" : "Connected to live source"}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: cfg.color, whiteSpace: "nowrap" }}>
      <span className={cfg.pulse ? "poli-pulse" : undefined}
        style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: cfg.pulse ? "poliPulse 2s ease infinite" : undefined }} />
      {cfg.label}{source ? ` · ${source}` : ""}{updated ? ` · ${updated}` : ""}
    </span>
  );
}

/**
 * Shimmer block. Compose into card-shaped skeletons.
 * @param {{ w?: number|string, h?: number, r?: number, style?: React.CSSProperties }} props
 */
export function Skeleton({ w = "100%", h = 14, r = 6, style }) {
  return (
    <div className="poli-shimmer" aria-hidden style={{
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg, ${C.surface} 25%, ${C.surfaceB} 50%, ${C.surface} 75%)`,
      backgroundSize: "800px 100%", animation: "poliShimmer 1.4s linear infinite",
      ...style,
    }} />
  );
}

/** Bill-card-shaped skeleton — mirrors BillCard geometry so load → loaded doesn't jump. */
export function BillCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading bill" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Skeleton w={64} h={22} r={99} /><Skeleton w={84} h={22} r={99} /><Skeleton w={72} h={22} r={99} />
      </div>
      <div style={{ display: "flex", gap: 18 }}>
        <Skeleton w={64} h={56} r={10} />
        <div style={{ flex: 1 }}>
          <Skeleton w="70%" h={18} style={{ marginBottom: 10 }} />
          <Skeleton w="100%" h={12} style={{ marginBottom: 6 }} />
          <Skeleton w="85%" h={12} />
        </div>
      </div>
      <Skeleton h={6} r={99} style={{ marginTop: 18 }} />
    </div>
  );
}

/** Row skeleton for MP/senator lists. */
export function RowSkeleton() {
  return (
    <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
      <Skeleton w={40} h={40} r={99} />
      <div style={{ flex: 1 }}>
        <Skeleton w="45%" h={13} style={{ marginBottom: 7 }} />
        <Skeleton w="30%" h={11} />
      </div>
      <Skeleton w={56} h={22} r={99} />
    </div>
  );
}

/**
 * Empty state — always says what the user can DO next, not just what's absent.
 * @param {{ title: string, sub?: string, icon?: React.ReactNode,
 *           actionLabel?: string, onAction?: () => void }} props
 */
export function EmptyState({ title, sub, icon, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: C.mid }}>
      <div style={{ display: "inline-flex", padding: 14, borderRadius: 99, background: C.surface, color: C.faint, marginBottom: 14 }}>
        {icon || <IconSearch size={22} />}
      </div>
      <div style={{ ...TYPE.h3, color: C.ink, marginBottom: 6 }}>{title}</div>
      {sub && <p style={{ ...TYPE.sm, color: C.mid, margin: "0 auto 18px", maxWidth: 340 }}>{sub}</p>}
      {actionLabel && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

/**
 * Stale/fallback callout — used when a live fetch fails and last-known data is
 * shown (the existing MyMPTab fallback pattern, promoted to a system component).
 * @param {{ children?: React.ReactNode, updated?: string, onRetry?: () => void }} props
 */
export function StaleCallout({ children, updated, onRetry }) {
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: RADIUS.panel, background: C.amberSoft, border: `1px solid ${C.amberMid}`, marginBottom: 14 }}>
      <span style={{ color: C.amber }}><IconAlert size={16} /></span>
      <div style={{ flex: 1, fontSize: 12.5, color: C.ink, lineHeight: 1.5 }}>
        {children || "We couldn't reach the live source. Showing the last verified data instead."}
        {updated && <span style={{ color: C.mid }}> Last verified {updated}.</span>}
      </div>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} aria-label="Retry">
          <IconRefresh size={14} /> Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Hard error state (fetch failed, nothing cached).
 * @param {{ title?: string, sub?: string, onRetry?: () => void }} props
 */
export function ErrorState({ title = "Couldn't load this", sub = "The connection to our data source failed. Your device may be offline.", onRetry }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ display: "inline-flex", padding: 14, borderRadius: 99, background: C.redSoft, color: C.red, marginBottom: 14 }}>
        <IconAlert size={22} />
      </div>
      <div style={{ ...TYPE.h3, color: C.ink, marginBottom: 6 }}>{title}</div>
      <p style={{ ...TYPE.sm, color: C.mid, margin: "0 auto 18px", maxWidth: 340 }}>{sub}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}><IconRefresh size={14} /> Try again</Button>}
    </div>
  );
}
