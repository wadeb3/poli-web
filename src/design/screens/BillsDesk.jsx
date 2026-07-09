// ─────────────────────────────────────────────────────────────────────────────
// BILLS DESK · desktop two-pane tracker · v6.1
//
// The structural fix for the bill tracker on desktop: master–detail instead
// of an infinite card stack. Left, a compact ledger of bills (scannable in
// one eye-sweep: title, status, support). Right, the full briefing for the
// selected bill — header, sentiment, AI summary, and the complete five-tab
// BillDetail, permanently open. No expand/collapse on desktop: the reader is
// at a desk, give them the desk.
//
// Below 900px this component defers to <BillList> (the card pattern is
// correct on a phone) — one component, both worlds, same data.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { C, TYPE, RADIUS, LAYOUT, FONT } from "../tokens.js";
import { Chip, PartyChip, StatusChip, BillTypeChip, SentimentBar, Button, Rule } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { BillList } from "./BillCard.jsx";
import { BillDetail } from "./BillDetail.jsx";
import { ShareCardModal } from "../ShareCard.jsx";
import { IconBell, IconEye, IconSparkle, IconShare, IconChevron } from "../icons.jsx";

/**
 * @param {{ bills: import("./BillCard.jsx").Bill[],
 *           votes?: Record<number, "support"|"oppose">, onVote?: Function,
 *           alerts?: number[], onToggleAlert?: Function,
 *           dataState?: "live"|"cached"|"sample", loading?: boolean }} props
 */
export function BillsDesk({ bills, votes = {}, onVote, alerts = [], onToggleAlert, dataState = "sample", loading = false, initialSelectedId = null }) {
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [chamber, setChamber] = useState(null);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedId || (bills[0]?.id ?? null));

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Build dynamic category list from actual bills data
  const CATEGORIES = [
    "Economy & Tax", "Health", "Environment", "Immigration",
    "Defence & Security", "Education", "Social Services",
    "Justice & Law", "Agriculture", "Government & Parliament"
  ];
  const availableCategories = CATEGORIES.filter(c =>
    bills.some(b => b.category === c)
  );

  // Chamber filter uses the originating_chamber stored in bill.meta
  // Category filter compounds on top — both can be active simultaneously
  // Switching chamber resets category (done in the toggle click handler)
  const filtered = bills.filter(b => {
    const chamberMatch = !chamber ||
      (chamber === "Senate" && b.meta?.originating_chamber === "senate") ||
      (chamber === "House"  && b.meta?.originating_chamber === "representatives");
    const categoryMatch = !category || b.category === category;
    const q = query.trim().toLowerCase();
    const queryMatch = !q || b.title.toLowerCase().includes(q);
    return chamberMatch && categoryMatch && queryMatch;
  });

  // Reset selection when filters change
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null);
  }, [chamber, category, query]);

  if (!wide) {
    return <BillList bills={filtered} loading={loading} dataState={dataState} votes={votes}
      onVote={onVote} alerts={alerts} onToggleAlert={onToggleAlert} />;
  }

  const selected = filtered.find(b => b.id === selectedId) || filtered[0];

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "flex-start", border: `1px solid ${C.border}`, borderRadius: RADIUS.card, background: C.white, overflow: "hidden" }}>
      {/* LEDGER — master list */}
      <div role="listbox" aria-label="Bills" style={{ width: "clamp(280px, 25vw, 420px)", flexShrink: 0, borderRight: `1px solid ${C.border}`, maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>
        <div style={{ padding: "14px 18px 10px", position: "sticky", top: 0, background: C.white, borderBottom: `1px solid ${C.border}`, zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ ...TYPE.overline, color: C.ink }}>Bills</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(chamber || category || query) && (
                <button onClick={() => { setChamber(null); setCategory(null); setQuery(""); }}
                  style={{ fontSize: 10, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear
                </button>
              )}
              <span style={{ ...TYPE.caption, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{filtered.length}</span>
            </div>
          </div>

          {/* Search */}
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 10px", borderRadius:RADIUS.control, border:`1px solid ${C.border}`, background:C.paper, marginBottom:8 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, color:C.faint }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search bills…"
              style={{ flex:1, border:"none", outline:"none", background:"transparent", fontFamily:"inherit", fontSize:12, color:C.ink }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background:"none", border:"none", cursor:"pointer", color:C.faint, padding:0, fontSize:14, lineHeight:1 }}>×</button>
            )}
          </div>

          {/* Chamber toggle — switching chamber resets category */}
          <div style={{ display: "flex", gap: 2, background: C.surface, borderRadius: RADIUS.control, padding: 3, marginBottom: 10 }}>
            {[{ v: null, l: "All" }, { v: "Senate", l: "Senate" }, { v: "House", l: "House" }].map(({ v, l }) => (
              <button key={l} onClick={() => { setChamber(v); setCategory(null); }}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: 6, border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                  background: chamber === v ? C.white : "transparent",
                  color: chamber === v ? C.ink : C.faint,
                  boxShadow: chamber === v ? "0 1px 3px rgba(33,29,26,0.08)" : "none",
                  transition: "background 0.15s",
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Category dropdown — same pattern as MP dossier */}
          <select
            value={category || ""}
            onChange={e => setCategory(e.target.value || null)}
            aria-label="Filter by category"
            style={{
              width: "100%", padding: "7px 10px", borderRadius: RADIUS.control,
              border: `1px solid ${C.border}`, background: C.white, color: category ? C.ink : C.faint,
              fontFamily: "inherit", fontSize: 12, cursor: "pointer",
              outline: "none", appearance: "none", WebkitAppearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A39C94' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
              paddingRight: 26,
            }}>
            <option value="">All categories</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Bill rows — compact */}
        {filtered.map(b => {
          const active = b.id === selected?.id;
          return (
            <button key={b.id} role="option" aria-selected={active} onClick={() => setSelectedId(b.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "9px 14px",
              background: active ? C.accentSoft : "transparent",
              border: "none", borderBottom: `1px solid ${C.border}`,
              boxShadow: active ? `inset 3px 0 0 ${C.accent}` : "none",
              cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 4, lineHeight: 1.35 }}>{b.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                <StatusChip status={b.status} />
                <BillTypeChip title={b.title} />
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, marginLeft: "auto", color: b.support > 50 ? C.green : b.oppose > 50 ? C.red : C.faint }}>
                  {b.support}%
                </span>
                {b.hiddenProvisions?.length > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: C.amber, fontWeight: 600 }}>
                    <IconEye size={11} />{b.hiddenProvisions.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* BRIEFING — detail pane */}
      <div style={{ flex: 1, minWidth: 0, maxHeight: "calc(100vh - 140px)", overflowY: "auto", padding: "22px 26px" }}>
        {!selected ? (
          <EmptyState title="Select a bill" sub="Choose a bill from the list to read its full briefing." />
        ) : (
          <BriefingPane key={selected.id} bill={selected} dataState={dataState}
            vote={votes[selected.id] || null} onVote={onVote}
            alertOn={alerts.includes(selected.id)} onToggleAlert={onToggleAlert} />
        )}
      </div>
    </div>
  );
}

function FullSummaryExpand({ plain }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ marginTop: 8, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: C.accentText, display: "flex", alignItems: "center", gap: 4 }}>
        <IconChevron size={11} dir={open ? "up" : "down"} />
        {open ? "Hide full summary" : "Full parliamentary summary"}
      </button>
      {open && (
        <p style={{ fontSize: 13, color: C.mid, margin: "8px 0 0", paddingTop: 8, borderTop: `1px solid ${C.border}`, lineHeight: 1.6 }}>{plain}</p>
      )}
    </>
  );
}

/** @param {{ bill: import("./BillCard.jsx").Bill, dataState: string, vote: string|null,
 *            onVote?: Function, alertOn: boolean, onToggleAlert?: Function }} props */
function BriefingPane({ bill, dataState, vote, onVote, alertOn, onToggleAlert }) {
  const [sharing, setSharing] = useState(false);
  return (
    <article>
      {sharing && <ShareCardModal bill={bill} dataState={dataState} onClose={() => setSharing(false)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusChip status={bill.status} />
          <BillTypeChip title={bill.title} />
          {bill.party && bill.party !== "OTH" && <PartyChip party={bill.party} showName />}
          <Chip>{bill.category}</Chip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSharing(true)} aria-label="Share this briefing"
            style={{
              display: "flex", padding: 7, borderRadius: RADIUS.chip, cursor: "pointer",
              background: "transparent", border: `1px solid ${C.border}`, color: C.faint,
            }}>
            <IconShare size={15} />
          </button>
          <button onClick={() => onToggleAlert?.(bill.id)}
            aria-label={alertOn ? "Stop tracking this bill" : "Track this bill"} aria-pressed={alertOn}
            style={{
              display: "flex", padding: 7, borderRadius: RADIUS.chip, cursor: "pointer",
              background: alertOn ? C.accentSoft : "transparent",
              border: `1px solid ${alertOn ? C.accentMid : C.border}`,
              color: alertOn ? C.accentText : C.faint,
            }}>
            <IconBell size={15} filled={alertOn} />
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 16, lineHeight: 1.4, fontWeight: 600, color: C.ink, margin: "0 0 8px", fontFamily: FONT.ui }}>{bill.title}</h2>

      {/* What This Means For You — primary summary, positioned where plain was */}
      <div style={{ background: C.surface, borderRadius: RADIUS.panel, padding: "12px 14px", margin: "0 0 16px", borderLeft: `3px solid ${C.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ color: C.accentText }}><IconSparkle size={13} /></span>
          <span style={{ ...TYPE.overline, fontSize: 10, color: C.accentText }}>What This Means For You</span>
          <span style={{ fontSize: 10, color: C.faint, marginLeft: "auto" }}>Non-partisan · AI summary →</span>
        </div>
        <p style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 1.6, fontWeight: 400, color: C.ink, margin: 0, maxWidth: "min(640px, 100%)" }}>{bill.means || bill.plain || "Summary pending."}</p>
        {bill.plain && bill.plain !== "Plain-English summary pending — check back soon." && bill.plain !== bill.means && (
          <FullSummaryExpand plain={bill.plain} />
        )}
      </div>

      <SentimentBar support={bill.support} neutral={bill.neutral} oppose={bill.oppose} height={7} />

      {/* Live sentiment counts */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint, margin: "4px 0 12px", fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: bill.support > 0 ? C.green : C.faint, fontWeight: bill.support > 0 ? 600 : 400 }}>{bill.support || 0}% support</span>
        <span>{bill.totalVotes > 0 ? `${bill.totalVotes.toLocaleString()} votes` : "Be the first to vote"}</span>
        <span style={{ color: bill.oppose > 0 ? C.red : C.faint, fontWeight: bill.oppose > 0 ? 600 : 400 }}>{bill.oppose || 0}% oppose</span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        {vote ? (
          <>
            <Chip color={vote === "support" ? C.green : C.red} tone="tint" dot>You {vote}</Chip>
            <Button variant="ghost" size="sm" onClick={() => onVote?.(bill.id, vote === "support" ? "oppose" : "support")}>
              Switch to {vote === "support" ? "Oppose" : "Support"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="support" size="sm" onClick={() => onVote?.(bill.id, "support")}>Support</Button>
            <Button variant="oppose" size="sm" onClick={() => onVote?.(bill.id, "oppose")}>Oppose</Button>
            <span style={{ fontSize: 11, color: C.faint, marginLeft: 4 }}>Anonymous · shapes community sentiment</span>
          </>
        )}
      </div>

      {/* Full briefing, permanently open on desktop */}
      <BillDetail bill={bill} />
    </article>
  );
}
