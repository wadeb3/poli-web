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
import { C, TYPE, RADIUS, LAYOUT } from "../tokens.js";
import { Chip, PartyChip, StatusChip, SentimentBar, Button, Rule } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { BillList } from "./BillCard.jsx";
import { BillDetail } from "./BillDetail.jsx";
import { ShareCardModal } from "../ShareCard.jsx";
import { IconBell, IconEye, IconSparkle, IconShare } from "../icons.jsx";

/**
 * @param {{ bills: import("./BillCard.jsx").Bill[],
 *           votes?: Record<number, "support"|"oppose">, onVote?: Function,
 *           alerts?: number[], onToggleAlert?: Function,
 *           dataState?: "live"|"cached"|"sample", loading?: boolean }} props
 */
export function BillsDesk({ bills, votes = {}, onVote, alerts = [], onToggleAlert, dataState = "sample", loading = false }) {
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [chamber, setChamber] = useState(null);
  const [category, setCategory] = useState(null);
  const [selectedId, setSelectedId] = useState(bills[0]?.id ?? null);

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

  // Filter by chamber (using originating_chamber via category field fallback) and category
  const filtered = bills.filter(b => {
    const chamberMatch = !chamber ||
      (chamber === "Senate" && (b.category === "Senate" || b.meta?.originating_chamber === "senate" || !CATEGORIES.includes(b.category))) ||
      (chamber === "House"  && (b.category === "House"  || b.meta?.originating_chamber === "representatives"));
    const categoryMatch = !category || b.category === category;
    return chamberMatch && categoryMatch;
  });

  // Reset selection when filters change
  useEffect(() => {
    setSelectedId(filtered[0]?.id ?? null);
  }, [chamber, category]);

  if (!wide) {
    return <BillList bills={filtered} loading={loading} dataState={dataState} votes={votes}
      onVote={onVote} alerts={alerts} onToggleAlert={onToggleAlert} />;
  }

  const selected = filtered.find(b => b.id === selectedId) || filtered[0];

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "flex-start", border: `1px solid ${C.border}`, borderRadius: RADIUS.card, background: C.white, overflow: "hidden" }}>
      {/* LEDGER — master list */}
      <div role="listbox" aria-label="Bills" style={{ width: LAYOUT.deskListWidth, flexShrink: 0, borderRight: `1px solid ${C.border}`, maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}>
        <div style={{ padding: "14px 18px 10px", position: "sticky", top: 0, background: C.white, borderBottom: `1px solid ${C.border}`, zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ ...TYPE.overline, color: C.ink }}>Bills</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {(chamber || category) && (
                <button onClick={() => { setChamber(null); setCategory(null); }}
                  style={{ fontSize: 10, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear
                </button>
              )}
              <span style={{ ...TYPE.caption, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{filtered.length}</span>
            </div>
          </div>

          {/* Chamber toggle — switching chamber resets category */}
          <div style={{ display: "flex", gap: 2, background: C.surface, borderRadius: RADIUS.control, padding: 3, marginBottom: 10 }}>
            {[{ v: null, l: "All" }, { v: "Senate", l: "Senate" }, { v: "House", l: "House" }].map(({ v, l }) => (
              <button key={l} onClick={() => { setChamber(v); setCategory(null); }}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: 6, border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600,
                  background: chamber === v ? C.white : "transparent",
                  color: chamber === v ? C.ink : C.faint,
                  boxShadow: chamber === v ? "0 1px 3px rgba(33,29,26,0.08)" : "none",
                  transition: "background 0.15s",
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Category pills — compound on top of chamber, do not clear it */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {availableCategories.map(c => {
              const active = category === c;
              return (
                <button key={c} onClick={() => setCategory(active ? null : c)}
                  style={{
                    padding: "3px 9px", borderRadius: 99, border: `1px solid ${active ? C.accent : C.border}`,
                    background: active ? C.accentSoft : "transparent",
                    color: active ? C.accentText : C.mid,
                    fontSize: 10.5, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {filtered.map(b => {
          const active = b.id === selected?.id;
          return (
            <button key={b.id} role="option" aria-selected={active} onClick={() => setSelectedId(b.id)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "14px 18px",
              background: active ? C.accentSoft : "transparent",
              border: "none", borderBottom: `1px solid ${C.border}`,
              boxShadow: active ? `inset 3px 0 0 ${C.accent}` : "none",
              cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
            }}>
              <div style={{ ...TYPE.h3, fontSize: 15.5, color: C.ink, marginBottom: 5, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.faint }}>
                <StatusChip status={b.status} />
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, marginLeft: "auto", color: b.support > 50 ? C.green : b.oppose > 50 ? C.red : C.mid }}>
                  {b.support}%
                </span>
                {b.hiddenProvisions?.length > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.amber, fontWeight: 600 }}>
                    <IconEye size={12} />{b.hiddenProvisions.length}
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
          <PartyChip party={bill.party} showName />
          <Chip>{bill.category}</Chip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <SourceBadge state={dataState} updated={bill.meta?.lastUpdated} />
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

      <h2 style={{ ...TYPE.hero, fontSize: 28, color: C.ink, margin: "0 0 8px" }}>{bill.title}</h2>
      <p style={{ ...TYPE.body, fontSize: 14.5, color: C.mid, margin: "0 0 16px", maxWidth: 640 }}>{bill.plain}</p>

      <SentimentBar support={bill.support} neutral={bill.neutral} oppose={bill.oppose} height={7} />

      <div style={{ background: C.surface, borderRadius: RADIUS.panel, padding: "12px 14px", margin: "16px 0 0", borderLeft: `3px solid ${C.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ color: C.accentText }}><IconSparkle size={13} /></span>
          <span style={{ ...TYPE.overline, fontSize: 10, color: C.accentText }}>What this means for you</span>
          <span style={{ fontSize: 10, color: C.faint, marginLeft: "auto" }}>AI summary · how we write these →</span>
        </div>
        <p style={{ ...TYPE.sm, color: C.ink, margin: 0 }}>{bill.means}</p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "16px 0 4px" }}>
        {vote ? (
          <>
            <Chip color={vote === "support" ? C.green : C.red} tone="tint" dot>You {vote}</Chip>
            <Button variant="ghost" size="sm" onClick={() => onVote?.(bill.id, null)}>Change</Button>
          </>
        ) : (
          <>
            <Button variant="support" size="sm" onClick={() => onVote?.(bill.id, "support")}>Support</Button>
            <Button variant="oppose" size="sm" onClick={() => onVote?.(bill.id, "oppose")}>Oppose</Button>
            <span style={{ fontSize: 11, color: C.faint, marginLeft: 4 }}>Anonymous · shapes the public sentiment data</span>
          </>
        )}
      </div>

      {/* Full briefing, permanently open on desktop */}
      <BillDetail bill={bill} />
    </article>
  );
}
