// ─────────────────────────────────────────────────────────────────────────────
// PARLIAMENT MAP · v6 redesign
//
// Inline generated hemicycle (Wikimedia convention) — matches the approach
// already validated in App.jsx (hand-drawn + external images were rejected).
// This version generates seat geometry from a composition object instead of
// hardcoding coordinates, so the same component renders House (150) and
// Senate (76) and survives composition changes at a by-election.
//
// Colour rule: this is the ONE surface where party colour fills area — so no
// sentiment colours (support green / oppose red) appear anywhere on it.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { C, TYPE, RADIUS, partyOf } from "../tokens.js";
import { Card, SectionLabel, Chip } from "../primitives.jsx";
import { SourceBadge } from "../states.jsx";

/**
 * Generate hemicycle seat positions (unit half-disc, flat side down).
 * @param {number} total  seat count
 * @param {number} [rows] override row count
 * @returns {{x: number, y: number, angle: number}[]} sorted left→right by angle
 */
export function hemicycleSeats(total, rows) {
  const R0 = 0.42, R1 = 1;
  const nRows = rows || Math.ceil(Math.sqrt(total / 4.5)) + 2;
  const radii = Array.from({ length: nRows }, (_, i) => R0 + (R1 - R0) * (nRows === 1 ? 0 : i / (nRows - 1)));
  const totalCirc = radii.reduce((s, r) => s + r, 0);
  // allocate seats per row proportional to radius, fix rounding drift
  let counts = radii.map(r => Math.round((total * r) / totalCirc));
  let drift = total - counts.reduce((s, n) => s + n, 0);
  for (let i = 0; drift !== 0; i = (i + 1) % nRows) { counts[i] += Math.sign(drift); drift -= Math.sign(drift); }
  const seats = [];
  radii.forEach((r, row) => {
    const n = counts[row];
    for (let k = 0; k < n; k++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1); // π → 0 (left → right)
      seats.push({ x: r * Math.cos(angle), y: -r * Math.sin(angle), angle });
    }
  });
  // Wikimedia convention: fill by angle (left of chamber → right)
  return seats.sort((a, b) => b.angle - a.angle);
}

/**
 * @typedef {Object} CompositionEntry
 * @property {string} party   token key, e.g. "ALP"
 * @property {number} seats
 *
 * @param {{ title: string, composition: CompositionEntry[], majority: number,
 *           dataState?: "live"|"cached"|"sample", updated?: string,
 *           note?: string, onSelectParty?: (party: string) => void }} props
 *   onSelectParty — makes the map an INDEX, not an illustration: clicking a
 *   seat or legend entry drills through to the member ledger for that party.
 */
export function Hemicycle({ title, composition, majority, dataState = "sample", updated, note, onSelectParty }) {
  const total = composition.reduce((s, c) => s + c.seats, 0);
  const [hover, setHover] = useState(null);

  const seats = useMemo(() => {
    const pos = hemicycleSeats(total);
    const out = [];
    let i = 0;
    for (const c of composition) for (let k = 0; k < c.seats; k++) out.push({ ...pos[i++], party: c.party });
    return out;
  }, [composition, total]);

  // viewBox: unit geometry scaled ×100
  const r = total > 100 ? 3.4 : 4.4; // seat dot radius in viewBox units

  return (
    <Card>
      <SectionLabel right={<SourceBadge state={dataState} updated={updated} source="AEC" />}>{title}</SectionLabel>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ ...TYPE.stat, fontSize: 22, color: C.ink }}>{total}</span>
        <span style={{ fontSize: 12, color: C.mid }}>seats · {majority} needed for majority</span>
      </div>

      <svg viewBox="-108 -108 216 118" style={{ width: "100%", display: "block" }} role="img"
        aria-label={`${title}: ${composition.map(c => `${partyOf(c.party).label} ${c.seats}`).join(", ")}`}>
        {seats.map((s, i) => {
          const p = partyOf(s.party);
          const dim = hover && hover !== s.party;
          return (
            <circle key={i} cx={s.x * 100} cy={s.y * 100} r={r}
              fill={p.color} opacity={dim ? 0.18 : 1}
              onMouseEnter={() => setHover(s.party)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelectParty?.(s.party)}
              style={{ transition: "opacity 0.15s", cursor: onSelectParty ? "pointer" : "default" }}>
              <title>{p.label}</title>
            </circle>
          );
        })}
        {/* majority marker at the top of the arc */}
        <line x1="0" y1="-106" x2="0" y2="-96" stroke={C.borderDark} strokeWidth="1" strokeDasharray="2 2" />
      </svg>

      {/* Legend — the party-colour key lives here, not in prose */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {composition.map(c => {
          const p = partyOf(c.party);
          const on = hover === c.party;
          return (
            <button key={c.party} onMouseEnter={() => setHover(c.party)} onMouseLeave={() => setHover(null)}
              onClick={() => onSelectParty?.(c.party)}
              aria-label={`View ${p.label} members`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px",
                borderRadius: 999, fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: on ? C.surface : C.white, color: C.ink,
                border: `1px solid ${on ? C.borderDark : C.border}`,
              }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color }} />
              {p.label}
              <span style={{ color: C.mid, fontVariantNumeric: "tabular-nums" }}>{c.seats}</span>
            </button>
          );
        })}
      </div>

      {note && <p style={{ fontSize: 11, color: C.faint, margin: "12px 0 0", lineHeight: 1.5 }}>{note}</p>}
    </Card>
  );
}

/**
 * Two-chamber layout: side-by-side ≥900px, stacked below.
 * @param {{ house: CompositionEntry[], senate: CompositionEntry[],
 *           dataState?: "live"|"cached"|"sample", updated?: string,
 *           onSelectParty?: (party: string) => void }} props
 */
export function ParliamentMap({ house, senate, dataState = "sample", updated, onSelectParty }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
      <Hemicycle title="House of Representatives" composition={house} majority={76}
        dataState={dataState} updated={updated} onSelectParty={onSelectParty}
        note="Government is formed in the House. Seats shown left to right by bloc, following the standard chamber-diagram convention. Click a party to see its members." />
      <Hemicycle title="Senate" composition={senate} majority={39}
        dataState={dataState} updated={updated} onSelectParty={onSelectParty}
        note="Bills must also pass the Senate, where the government rarely holds a majority — this is where crossbench votes decide outcomes." />
    </div>
  );
}
