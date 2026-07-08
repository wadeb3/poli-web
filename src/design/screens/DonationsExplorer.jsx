// ─────────────────────────────────────────────────────────────────────────────
// DONATIONS EXPLORER · v6
//
// Filterable table of AEC-disclosed political donations.
// Data sourced from Supabase donations table (synced from AEC transparency register).
//
// Filters: party · financial year · donor type · search
// Sort: amount (default) · donor name · date
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Chip, PartyChip } from "../primitives.jsx";
import { IconSearch, IconChevron } from "../icons.jsx";

const PARTY_LABELS = {
  ALP: "Labor", LIB: "Liberal", LNP: "LNP", NAT: "Nationals",
  Greens: "Greens", ONP: "One Nation", IND: "Independent", OTH: "Other",
};

const PARTY_COLORS = {
  ALP: "#E8373B", LIB: "#1C4F9C", LNP: "#1C4F9C", NAT: "#006644",
  Greens: "#00A651", ONP: "#FF6600", IND: "#888", OTH: "#bbb",
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtAmount = n => n >= 1000000
  ? `$${(n / 1000000).toFixed(1)}m`
  : n >= 1000
    ? `$${(n / 1000).toFixed(0)}k`
    : `$${n}`;

const fmtFull = n => `$${Number(n).toLocaleString("en-AU")}`;

export function DonationsExplorer({ supabase, initialParty = null }) {
  const [donations, setDonations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Filters
  const [party, setParty]           = useState(initialParty);
  const [year, setYear]             = useState(null);
  const [donorType, setDonorType]   = useState(null);
  const [query, setQuery]           = useState("");
  const [sortBy, setSortBy]         = useState("year");
  const [expanded, setExpanded]     = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("donations")
      .select("*")
      .order("amount", { ascending: false })
      .limit(2000)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setDonations(data || []);
        setLoading(false);
      });
  }, [supabase]);

  // Derived filter options from actual data
  const years      = useMemo(() => [...new Set(donations.map(d => d.financial_year))].sort().reverse(), [donations]);
  const donorTypes = useMemo(() => [...new Set(donations.map(d => d.donor_type).filter(Boolean))].sort(), [donations]);

  const filtered = useMemo(() => {
    let rows = donations;
    if (party)     rows = rows.filter(d => d.party === party);
    if (year)      rows = rows.filter(d => d.financial_year === year);
    if (donorType) rows = rows.filter(d => d.donor_type === donorType);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(d => d.donor_name?.toLowerCase().includes(q) || d.party_raw?.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) =>
      sortBy === "year"   ? (b.financial_year || "").localeCompare(a.financial_year || "") || (b.amount - a.amount)
      : sortBy === "amount" ? b.amount - a.amount
      : sortBy === "name"   ? a.donor_name?.localeCompare(b.donor_name || "")
      : (b.donation_date || "").localeCompare(a.donation_date || "")
    );
  }, [donations, party, year, donorType, query, sortBy]);

  const totalValue = useMemo(() => filtered.reduce((s, d) => s + (d.amount || 0), 0), [filtered]);

  const selectStyle = {
    padding: "6px 28px 6px 10px", borderRadius: RADIUS.control,
    border: `1px solid ${C.border}`, background: C.white, color: C.ink,
    fontFamily: "inherit", fontSize: 11, cursor: "pointer",
    outline: "none", appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A39C94' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
  };

  const hasFilters = party || year || donorType || query;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", gap: 10 }}>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.white, flex: "1 1 180px" }}>
          <IconSearch size={12} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search donor name…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 11, color: C.ink, background: "transparent" }} />
          {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.faint, fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>}
        </div>

        {/* Party */}
        <select value={party || ""} onChange={e => setParty(e.target.value || null)} style={selectStyle}>
          <option value="">All parties</option>
          {Object.entries(PARTY_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>

        {/* Year */}
        <select value={year || ""} onChange={e => setYear(e.target.value || null)} style={selectStyle}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Donor type */}
        <select value={donorType || ""} onChange={e => setDonorType(e.target.value || null)} style={selectStyle}>
          <option value="">All donor types</option>
          {donorTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="year">Sort: Year (newest first)</option>
          <option value="amount">Sort: Amount (largest first)</option>
          <option value="name">Sort: Donor name</option>
          <option value="date">Sort: Date</option>
        </select>

        {hasFilters && (
          <button onClick={() => { setParty(null); setYear(null); setDonorType(null); setQuery(""); }}
            style={{ fontSize: 11, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Clear
          </button>
        )}

        {/* Summary */}
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.faint, whiteSpace: "nowrap" }}>
          {filtered.length.toLocaleString()} records · {fmtFull(totalValue)} total
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 90px 80px", gap: 0, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          {["Donor", "Recipient", "Type", "Year", "Amount"].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 4 ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.faint }}>Loading donation data…</div>
          ) : error ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.red }}>
              {error === "relation \"public.donations\" does not exist"
                ? "Donations table not yet populated — run sync_aec.py to import AEC data."
                : `Error: ${error}`}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.faint }}>No donations match your filters.</div>
          ) : filtered.map((d, i) => (
            <div key={d.id || i}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 90px 80px", gap: 0, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: expanded === i ? C.accentSoft : i % 2 === 0 ? C.white : C.paper, alignItems: "center" }}
              onMouseEnter={e => { if (expanded !== i) e.currentTarget.style.background = C.surface; }}
              onMouseLeave={e => { e.currentTarget.style.background = expanded === i ? C.accentSoft : i % 2 === 0 ? C.white : C.paper; }}>

              {/* Donor name */}
              <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                {d.donor_name}
              </div>

              {/* Party */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: PARTY_COLORS[d.party] || "#ccc", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: C.mid }}>{PARTY_LABELS[d.party] || d.party_raw?.slice(0, 20) || "Unknown"}</span>
              </div>

              {/* Donor type */}
              <div style={{ fontSize: 11, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.donor_type || "—"}
              </div>

              {/* Year */}
              <div style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>
                {d.financial_year || "—"}
              </div>

              {/* Amount */}
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtAmount(d.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ flexShrink: 0, fontSize: 10, color: C.faint, lineHeight: 1.5 }}>
        Data sourced from the AEC Transparency Register — Australian Electoral Commission. Published annually on the first working day of February.
        Poli presents this data as disclosed. Inclusion does not imply wrongdoing. Poli shows correlation, not causation.
        <a href="https://transparency.aec.gov.au/AnnualDonor" target="_blank" rel="noreferrer" style={{ color: C.accentText, marginLeft: 6 }}>View original AEC data ↗</a>
      </div>
    </div>
  );
}
