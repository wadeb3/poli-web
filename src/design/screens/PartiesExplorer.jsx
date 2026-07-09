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

// Australian federal election years
const ELECTION_YEARS = new Set(["2025-26","2024-25","2021-22","2018-19","2015-16","2012-13","2009-10","2006-07","2003-04","2001-02"]);

// ── Party Financials — grouped column chart ───────────────────────────────────
function PartyFinancials({ partyCode, supabase }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !partyCode) return;
    setLoading(true);
    // Fetch all rows — multiple per year (state branches), aggregate client-side
    supabase.from("party_returns")
      .select("financial_year,total_receipts,total_payments,surplus")
      .eq("party", partyCode)
      .limit(500)
      .then(({ data }) => {
        if (!data?.length) { setLoading(false); return; }

        // Normalise year format: "1998-1999" → "1998-99", "2024-25" stays
        const normYear = y => {
          if (!y) return y;
          const parts = y.split("-");
          if (parts.length === 2 && parts[1].length === 4) {
            return `${parts[0]}-${parts[1].slice(2)}`;
          }
          return y;
        };

        // Aggregate by normalised year
        const agg = {};
        data.forEach(r => {
          const yr = normYear(r.financial_year);
          if (!agg[yr]) agg[yr] = { financial_year: yr, total_receipts: 0, total_payments: 0 };
          agg[yr].total_receipts += r.total_receipts || 0;
          agg[yr].total_payments += r.total_payments || 0;
        });

        // Sort chronologically, take 6 most recent
        const sorted = Object.values(agg)
          .sort((a, b) => {
            // Extract start year for reliable numeric sort
            const ya = parseInt(a.financial_year.split("-")[0]);
            const yb = parseInt(b.financial_year.split("-")[0]);
            return ya - yb;
          });

        const recent = sorted.slice(-6).map(r => ({
          ...r,
          surplus: r.total_receipts - r.total_payments,
        }));

        setReturns(recent);
        setLoading(false);
      });
  }, [partyCode, supabase]);

  if (loading) return <div style={{ fontSize: 11, color: C.faint, padding: "8px 0" }}>Loading financials…</div>;
  if (!returns.length) return null;

  // returns is already aggregated, sorted, and sliced to 6 most recent
  const chartData = returns;
  const latest = chartData[chartData.length - 1];
  const maxVal = Math.max(...chartData.flatMap(r => [r.total_receipts || 0, r.total_payments || 0])) || 1;
  const chartH = 80;

  // Format year label: "2024-25" → "24-25", "1998-99" → "98-99"
  const fmtYear = y => {
    if (!y) return "";
    const parts = y.split("-");
    return parts.length === 2 ? `${parts[0].slice(-2)}-${parts[1]}` : y;
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>
        Party finances · {latest.financial_year}
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Total income",      value: latest.total_receipts, color: C.green },
          { label: "Total expenditure", value: latest.total_payments, color: C.red },
          { label: "Surplus / deficit", value: latest.surplus,        color: (latest.surplus || 0) >= 0 ? C.green : C.red },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, borderRadius: RADIUS.control, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>
              {(s.value || 0) < 0 ? "−" : ""}{fmtAmount(Math.abs(s.value || 0))}
            </div>
          </div>
        ))}
      </div>

      {/* Grouped column chart */}
      {chartData.length > 1 && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: chartH, borderBottom: `1px solid ${C.border}` }}>
            {chartData.map(r => {
              const incPct  = ((r.total_receipts || 0) / maxVal) * 100;
              const expPct  = ((r.total_payments || 0) / maxVal) * 100;
              const isElec  = ELECTION_YEARS.has(r.financial_year);
              const isLatest = r.financial_year === latest.financial_year;
              return (
                <div key={r.financial_year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {isElec && (
                    <div title="Election year" style={{ position: "absolute", top: -14, fontSize: 9, color: C.amber, fontWeight: 700 }}>✦</div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", height: chartH }}>
                    <div
                      title={`Income ${r.financial_year}: ${fmtAmount(r.total_receipts || 0)}`}
                      style={{ flex: 1, height: `${incPct}%`, background: C.green, borderRadius: "2px 2px 0 0", minHeight: 2, opacity: isLatest ? 1 : 0.6 }}
                    />
                    <div
                      title={`Expenditure ${r.financial_year}: ${fmtAmount(r.total_payments || 0)}`}
                      style={{ flex: 1, height: `${expPct}%`, background: C.red, borderRadius: "2px 2px 0 0", minHeight: 2, opacity: isLatest ? 1 : 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
            {chartData.map(r => (
              <div key={r.financial_year} style={{ flex: 1, fontSize: 9, color: r.financial_year === latest.financial_year ? C.mid : C.faint, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                {fmtYear(r.financial_year)}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center" }}>
            {[{ color: C.green, label: "Income" }, { color: C.red, label: "Expenditure" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 10, color: C.faint }}>{l.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>✦</span>
              <span style={{ fontSize: 10, color: C.faint }}>Election year</span>
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: C.faint }}>
            Source: AEC Transparency Register · Party Returns · Self-reported annual
          </div>
        </div>
      )}
    </div>
  );
}
function TopDonors({ partyCode, partyColor, supabase, onViewAll }) {
  const [allDonations, setAllDonations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [year, setYear]                 = useState(null); // null = all, "older" = pre-recent

  useEffect(() => {
    if (!supabase || !partyCode) return;
    setLoading(true);
    supabase
      .from("donations")
      .select("donor_name, amount, financial_year, donor_type")
      .eq("party", partyCode)
      .order("amount", { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        setAllDonations(data || []);
        setLoading(false);
      });
  }, [partyCode, supabase]);

  // Build year buckets — recent 6 years + "Older"
  const allYears = [...new Set(allDonations.map(r => r.financial_year))].sort().reverse();
  const recentYears = allYears.slice(0, 6);
  const olderYears  = allYears.slice(6);
  const hasOlder    = olderYears.length > 0;

  // Filter donations by selected year bucket
  const filtered = allDonations.filter(r => {
    if (!year)           return true;
    if (year === "older") return olderYears.includes(r.financial_year);
    return r.financial_year === year;
  });

  // Aggregate by donor name
  const agg = {};
  filtered.forEach(r => {
    const k = r.donor_name;
    if (!agg[k]) agg[k] = { donor_name: k, amount: 0, donor_type: r.donor_type };
    agg[k].amount += r.amount || 0;
  });
  const donors   = Object.values(agg).sort((a, b) => b.amount - a.amount).slice(0, 10);
  const total    = donors.reduce((s, d) => s + d.amount, 0);
  const maxAmount = donors[0]?.amount || 1;

  const pillStyle = (active) => ({
    padding: "2px 8px", borderRadius: 99,
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentSoft : "transparent",
    color: active ? C.accentText : C.faint,
    fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    flexShrink: 0,
  });

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em" }}>
          Top donors
        </div>
        {total > 0 && (
          <span style={{ fontSize: 10, color: C.faint, fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>
            {fmtAmount(total)} total
          </span>
        )}
      </div>

      {/* Year pills — always visible, never disappear */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setYear(null)} style={pillStyle(!year)}>All years</button>
        {recentYears.map(y => (
          <button key={y} onClick={() => setYear(y)} style={pillStyle(year === y)}>{y}</button>
        ))}
        {hasOlder && (
          <button onClick={() => setYear("older")} style={pillStyle(year === "older")}>
            Older ({olderYears.length})
          </button>
        )}
      </div>

      {/* Donor rows */}
      {loading ? (
        <div style={{ fontSize: 11, color: C.faint, padding: "8px 0" }}>Loading donors…</div>
      ) : donors.length === 0 ? (
        <div style={{ fontSize: 11, color: C.faint, padding: "8px 0" }}>No disclosed donations on record.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {donors.map((d, i) => (
            <div key={d.donor_name} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.faint, width: 14, flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.donor_name}
                </span>
                {d.donor_type && d.donor_type !== "Other" && (
                  <span style={{ fontSize: 9, color: C.faint, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                    {d.donor_type}
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {fmtAmount(d.amount)}
                </span>
              </div>
              <div style={{ marginLeft: 22, height: 3, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(d.amount / maxAmount) * 100}%`, background: partyColor, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onViewAll}
        style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
        View full donation history →
      </button>
      <div style={{ marginTop: 6, fontSize: 10, color: C.faint, lineHeight: 1.5 }}>
        AEC-disclosed donations only. Poli shows correlation, not causation.
      </div>
    </div>
  );
}

export function PartiesExplorer({ onViewDonations, supabase }) {
  const [selected, setSelected] = useState("ALP"); // default to governing party
  const party = PARTIES.find(p => p.code === selected);

  return (
    <div style={{ display: "flex", gap: 12, height: "calc(100vh - 140px)", overflow: "hidden" }}>

      {/* Party list */}
      <div style={{ width: "clamp(180px, 16vw, 260px)", flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflowY: "auto" }}>
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
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em" }}>About</div>
                <span style={{ fontSize: 10, color: C.faint }}>· Seats and leadership current as of 48th Parliament · 2025</span>
              </div>
              <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.65, margin: 0 }}>{party.blurb}</p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 16 }} />

            {/* Party financials — live from party_returns */}
            <PartyFinancials
              key={`fin-${party.code}`}
              partyCode={party.code}
              supabase={supabase}
            />

            {/* Top donors — live from donations */}
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
