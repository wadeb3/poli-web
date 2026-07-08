// ─────────────────────────────────────────────────────────────────────────────
// PARTIES EXPLORER · v6
//
// Overview of Australian federal political parties — seats, membership,
// recent policy positions from the bills data, and a link through to
// the Party Donations explorer.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Chip } from "../primitives.jsx";
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

const fmtAmount = n => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}m`
  : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}k`
    : `$${n}`;

// ── Top donors subcomponent ───────────────────────────────────────────────────
function TopDonors({ partyCode, partyColor, supabase, onViewAll }) {
  const [donors, setDonors]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [year, setYear]       = useState(null);  // null = all years
  const [years, setYears]     = useState([]);

  useEffect(() => {
    if (!supabase || !partyCode) return;
    setLoading(true);

    let q = supabase
      .from("donations")
      .select("donor_name, amount, financial_year, donor_type")
      .eq("party", partyCode)
      .order("amount", { ascending: false });

    if (year) q = q.eq("financial_year", year);

    q.limit(200).then(({ data, error }) => {
      if (error || !data) { setLoading(false); return; }

      // Aggregate by donor name (same donor may have multiple rows)
      const agg = {};
      data.forEach(r => {
        const key = r.donor_name;
        if (!agg[key]) agg[key] = { donor_name: key, amount: 0, donor_type: r.donor_type, financial_year: r.financial_year };
        agg[key].amount += r.amount || 0;
      });

      const sorted = Object.values(agg).sort((a, b) => b.amount - a.amount);
      setDonors(sorted.slice(0, 10));
      setTotal(sorted.reduce((s, d) => s + d.amount, 0));

      // Build year list from data
      const ys = [...new Set(data.map(r => r.financial_year))].sort().reverse();
      setYears(ys);
      setLoading(false);
    });
  }, [partyCode, year, supabase]);

  const maxAmount = donors[0]?.amount || 1;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em" }}>
          Top donors
        </div>
        {/* Year filter pills */}
        <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
          {[null, ...years].map(y => (
            <button key={y ?? "all"} onClick={() => setYear(y)}
              style={{ padding: "2px 8px", borderRadius: 99, border: `1px solid ${year === y ? C.accent : C.border}`, background: year === y ? C.accentSoft : "transparent", color: year === y ? C.accentText : C.faint, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {y ?? "All years"}
            </button>
          ))}
        </div>
        {total > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.faint, fontVariantNumeric: "tabular-nums" }}>
            {fmtAmount(total)} total
          </span>
        )}
      </div>

      {/* Donor rows */}
      {loading ? (
        <div style={{ fontSize: 11, color: C.faint, padding: "12px 0" }}>Loading donors…</div>
      ) : donors.length === 0 ? (
        <div style={{ fontSize: 11, color: C.faint, padding: "12px 0" }}>No disclosed donations on record for this party.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {donors.map((d, i) => (
            <div key={d.donor_name} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Rank */}
                <span style={{ fontSize: 10, color: C.faint, fontVariantNumeric: "tabular-nums", width: 14, flexShrink: 0, textAlign: "right" }}>{i + 1}</span>
                {/* Name */}
                <span style={{ fontSize: 12, fontWeight: 500, color: C.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.donor_name}
                </span>
                {/* Type badge */}
                {d.donor_type && d.donor_type !== "Other" && (
                  <span style={{ fontSize: 9, color: C.faint, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                    {d.donor_type}
                  </span>
                )}
                {/* Amount */}
                <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {fmtAmount(d.amount)}
                </span>
              </div>
              {/* Bar */}
              <div style={{ marginLeft: 22, height: 3, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(d.amount / maxAmount) * 100}%`, background: partyColor, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View all link */}
      {donors.length > 0 && (
        <button onClick={onViewAll}
          style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
          View full donation history →
        </button>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 8, fontSize: 10, color: C.faint, lineHeight: 1.5 }}>
        AEC-disclosed donations only. Poli shows correlation, not causation.
      </div>
    </div>
  );
}

export function PartiesExplorer({ onViewDonations, supabase }) {
  const [selected, setSelected] = useState(null);
  const party = PARTIES.find(p => p.code === selected);

  return (
    <div style={{ display: "flex", gap: 12, height: "calc(100vh - 140px)", overflow: "hidden" }}>

      {/* Party list */}
      <div style={{ width: 220, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflowY: "auto" }}>
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
              <div style={{ width: 44, height: 44, borderRadius: RADIUS.control, background: party.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {party.abbr.slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{party.name}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{party.ideology}</div>
                {party.leader && <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>Leader: {party.leader}</div>}
              </div>
              <Chip color={party.color} tone="tint">{party.position}</Chip>
            </div>

            {/* Seats stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { label: "House seats",  value: party.seats },
                { label: "Senate seats", value: party.senators },
                { label: "Founded",      value: party.founded || "—" },
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

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 16 }} />

            {/* Top donors — live from Supabase */}
            <TopDonors
              key={party.code}
              partyCode={party.code}
              partyColor={party.color}
              supabase={supabase}
              onViewAll={() => onViewDonations?.(party.code)}
            />

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <button onClick={() => onViewDonations?.(party.code)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Full donation database</div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>Search, filter and sort all AEC-disclosed donations</div>
                </div>
                <IconChevron size={12} dir="right" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
