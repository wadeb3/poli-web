// ─────────────────────────────────────────────────────────────────────────────
// THIRD PARTY EXPLORER · v6
// Significant third parties — organisations that spend on political
// campaigning without being a registered party.
// Data: third_party_returns table (AEC Significant Third Party Returns.csv)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from "react";
import { C, RADIUS } from "../tokens.js";
import { IconSearch } from "../icons.jsx";

const fmtAmount = n => n >= 1_000_000
  ? `$${(n / 1_000_000).toFixed(2)}m`
  : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}k`
    : `$${n}`;

export function ThirdPartyExplorer({ supabase }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [year, setYear]       = useState(null);
  const [sortBy, setSortBy]   = useState("electoral");

  useEffect(() => {
    if (!supabase) return;
    supabase.from("third_party_returns")
      .select("*")
      .order("electoral_expenditure", { ascending: false })
      .limit(500)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [supabase]);

  const years = useMemo(() =>
    [...new Set(rows.map(r => r.financial_year))].sort().reverse(), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (year) r = r.filter(x => x.financial_year === year);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(x => x.entity_name?.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) =>
      sortBy === "electoral" ? (b.electoral_expenditure || 0) - (a.electoral_expenditure || 0)
      : sortBy === "receipts" ? (b.total_receipts || 0) - (a.total_receipts || 0)
      : a.entity_name?.localeCompare(b.entity_name || "")
    );
  }, [rows, year, query, sortBy]);

  const totalElectoral = filtered.reduce((s, r) => s + (r.electoral_expenditure || 0), 0);
  const maxElectoral = filtered[0]?.electoral_expenditure || 1;

  const selectStyle = {
    padding: "6px 28px 6px 10px", borderRadius: RADIUS.control,
    border: `1px solid ${C.border}`, background: C.white, color: C.ink,
    fontFamily: "inherit", fontSize: 11, cursor: "pointer",
    outline: "none", appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A39C94' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 10 }}>

      {/* Explainer */}
      <div style={{ background: C.blueSoft, border: `1px solid ${C.blueMid}`, borderRadius: RADIUS.control, padding: "10px 14px", fontSize: 11, color: C.mid, lineHeight: 1.6 }}>
        <strong style={{ color: C.ink }}>Significant third parties</strong> are organisations that spend over the disclosure threshold on political campaigning without being a registered political party — including unions, industry bodies, advocacy groups and think tanks.
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.white }}>
          <IconSearch size={12} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search organisations…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 11, background: "transparent", color: C.ink }} />
          {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.faint, fontSize: 13, padding: 0 }}>×</button>}
        </div>
        <select value={year || ""} onChange={e => setYear(e.target.value || null)} style={selectStyle}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="electoral">Sort: Electoral spend</option>
          <option value="receipts">Sort: Total receipts</option>
          <option value="name">Sort: Name</option>
        </select>
        <div style={{ fontSize: 11, color: C.faint, whiteSpace: "nowrap", marginLeft: "auto" }}>
          {filtered.length} orgs · {fmtAmount(totalElectoral)} electoral spend
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          {["Organisation", "Electoral spend", "Total receipts", "Total payments"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i > 0 ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.faint }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.faint }}>
              {rows.length === 0 ? "Run sync_aec.py --thirds to import third party data." : "No organisations match your filters."}
            </div>
          ) : filtered.map((r, i) => (
            <div key={`${r.entity_name}-${r.financial_year}`}
              style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.paper, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.entity_name}</div>
                {/* Electoral spend bar */}
                {r.electoral_expenditure > 0 && (
                  <div style={{ marginTop: 3, height: 3, borderRadius: 99, background: C.border, overflow: "hidden", maxWidth: 200 }}>
                    <div style={{ height: "100%", width: `${((r.electoral_expenditure || 0) / maxElectoral) * 100}%`, background: C.accent, borderRadius: 99 }} />
                  </div>
                )}
                <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>{r.financial_year}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.electoral_expenditure > 0 ? C.ink : C.faint, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.electoral_expenditure > 0 ? fmtAmount(r.electoral_expenditure) : "—"}
              </div>
              <div style={{ fontSize: 11, color: C.mid, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.total_receipts > 0 ? fmtAmount(r.total_receipts) : "—"}
              </div>
              <div style={{ fontSize: 11, color: C.mid, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.total_payments > 0 ? fmtAmount(r.total_payments) : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, fontSize: 10, color: C.faint, lineHeight: 1.5 }}>
        Data sourced from the AEC Transparency Register — Significant Third Party Returns.
        <a href="https://transparency.aec.gov.au/AnnualSignificantThirdParty" target="_blank" rel="noreferrer" style={{ color: C.accentText, marginLeft: 6 }}>View on AEC ↗</a>
      </div>
    </div>
  );
}
