// ─────────────────────────────────────────────────────────────────────────────
// PARTIES EXPLORER · v6
//
// Overview of Australian federal political parties — seats, membership,
// recent policy positions from the bills data, and a link through to
// the Party Donations explorer.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Chip, PartyChip } from "../primitives.jsx";
import { IconChevron } from "../icons.jsx";

const PARTIES = [
  {
    code:     "ALP",
    name:     "Australian Labor Party",
    abbr:     "Labor",
    founded:  1891,
    ideology: "Centre-left · Social democracy",
    leader:   "Anthony Albanese",
    position: "Government",
    color:    "#E8373B",
    seats:    93,
    senators: 26,
    blurb:    "Australia's oldest political party. Currently in government. Traditionally represents workers, unions, and social equity. Supports universal healthcare, climate action, and public investment.",
  },
  {
    code:     "LIB",
    name:     "Liberal Party of Australia",
    abbr:     "Liberal",
    founded:  1944,
    ideology: "Centre-right · Liberal conservatism",
    leader:   "Angus Taylor",
    position: "Opposition",
    color:    "#1C4F9C",
    seats:    39,
    senators: 22,
    blurb:    "The major centre-right party. Currently in opposition. Advocates for lower taxes, smaller government, free markets, and individual freedoms. Typically forms coalition with the Nationals.",
  },
  {
    code:     "LNP",
    name:     "Liberal National Party",
    abbr:     "LNP",
    founded:  2008,
    ideology: "Centre-right · Queensland coalition",
    leader:   "David Littleproud",
    position: "Opposition",
    color:    "#1C4F9C",
    seats:    17,
    senators: 0,
    blurb:    "Queensland's merged Liberal-National party. Operates at state level as a single party, federally as part of the Coalition opposition.",
  },
  {
    code:     "NAT",
    name:     "The Nationals",
    abbr:     "Nationals",
    founded:  1920,
    ideology: "Centre-right · Agrarianism",
    leader:   "David Littleproud",
    position: "Opposition (Coalition)",
    color:    "#006644",
    seats:    8,
    senators: 6,
    blurb:    "Represents rural and regional Australia. Typically governs in coalition with the Liberal Party. Advocates for agricultural interests, decentralisation, and regional infrastructure.",
  },
  {
    code:     "Greens",
    name:     "Australian Greens",
    abbr:     "Greens",
    founded:  1992,
    ideology: "Left · Green politics",
    leader:   "Adam Bandt",
    position: "Crossbench",
    color:    "#00A651",
    seats:    4,
    senators: 11,
    blurb:    "Advocates for environmental protection, social justice, and economic reform. Holds balance of power in the Senate. Supports stronger climate action and free university education.",
  },
  {
    code:     "IND",
    name:     "Independents",
    abbr:     "Independent",
    founded:  null,
    ideology: "Varied · Non-partisan",
    leader:   null,
    position: "Crossbench",
    color:    "#888888",
    seats:    14,
    senators: 3,
    blurb:    "Includes community independents, often called 'Teal' independents, who won seats in 2022 and 2025 on climate, integrity, and gender equity platforms. Vote issue-by-issue.",
  },
  {
    code:     "ONP",
    name:     "Pauline Hanson's One Nation",
    abbr:     "One Nation",
    founded:  1997,
    ideology: "Right-wing · Populism",
    leader:   "Pauline Hanson",
    position: "Crossbench",
    color:    "#FF6600",
    seats:    0,
    senators: 2,
    blurb:    "Populist right party. Advocates for stricter immigration controls, protectionism, and rolling back multiculturalism. Currently holds 2 Senate seats.",
  },
];

export function PartiesExplorer({ onViewDonations }) {
  const [selected, setSelected] = useState(null);
  const party = PARTIES.find(p => p.code === selected);

  return (
    <div style={{ display: "flex", gap: 12, height: "calc(100vh - 140px)", overflow: "hidden" }}>

      {/* Party list */}
      <div style={{ width: 260, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflowY: "auto" }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em" }}>
          Federal parties
        </div>
        {PARTIES.map(p => (
          <button key={p.code} onClick={() => setSelected(p.code)}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", textAlign: "left", border: "none", borderBottom: `1px solid ${C.border}`, background: selected === p.code ? C.accentSoft : "transparent", cursor: "pointer", fontFamily: "inherit", boxShadow: selected === p.code ? `inset 3px 0 0 ${C.accent}` : "none" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{p.abbr}</div>
              <div style={{ fontSize: 10, color: C.faint }}>{p.position}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.mid, fontVariantNumeric: "tabular-nums" }}>
              {p.seats + (p.senators || 0)}
            </div>
          </button>
        ))}
      </div>

      {/* Party detail */}
      <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "20px 24px", overflowY: "auto" }}>
        {!party ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
            <div style={{ fontSize: 13, color: C.mid }}>Select a party to view their profile</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: RADIUS.control, background: party.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                {party.abbr.slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{party.name}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{party.ideology}</div>
                {party.leader && <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>Leader: {party.leader}</div>}
              </div>
              <Chip color={party.color} tone="tint">{party.position}</Chip>
            </div>

            {/* Seats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "House seats",    value: party.seats },
                { label: "Senate seats",   value: party.senators },
                { label: "Founded",        value: party.founded || "—" },
              ].map(s => (
                <div key={s.label} style={{ background: C.surface, borderRadius: RADIUS.control, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* About */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8 }}>About</div>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.65, margin: 0 }}>{party.blurb}</p>
            </div>

            {/* Donations CTA */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8 }}>Financial transparency</div>
              <div style={{ background: C.amberSoft, border: `1px solid ${C.amberMid}`, borderRadius: RADIUS.panel, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 3 }}>View donations to {party.abbr}</div>
                  <div style={{ fontSize: 11, color: C.mid }}>AEC-disclosed donations from registered donors</div>
                </div>
                <button onClick={() => onViewDonations?.(party.code)}
                  style={{ padding: "8px 14px", borderRadius: RADIUS.control, border: "none", background: C.accent, color: "#fff", fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                  View donations →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
