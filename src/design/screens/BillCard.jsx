// ─────────────────────────────────────────────────────────────────────────────
// BILL TRACKER · v6 redesign
//
// Hierarchy fixes vs v5 PolicyCard:
//   · One serif numeral (support %) — was competing with serif title at 52px
//   · AI summary panel is explicitly LABELLED as AI-generated with a
//     methodology link — trust requires disclosure, not just plain English
//   · "Hidden in the bill" surfaces as a flag ON the card (count + top
//     severity), not only buried in the expanded detail — it's Poli's
//     signature feature and should be visible at scan level
//   · Fiscal impact gets a compact strip with source attribution
//   · Provenance badge on every card (hybrid data model, see states.jsx)
//
// Data shape matches the existing POLICIES constant in App.jsx — drop-in.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Card, Button, Chip, PartyChip, StatusChip, SentimentBar, Stat, Divider } from "../primitives.jsx";
import { SourceBadge, BillCardSkeleton, EmptyState } from "../states.jsx";
import { IconBell, IconEye, IconDollar, IconSparkle, IconChevron } from "../icons.jsx";
import { BillDetail } from "./BillDetail.jsx";

const STAGES = ["Introduced", "Second reading", "Committee", "Third reading", "Royal Assent"];

/**
 * @typedef {Object} Bill — matches POLICIES entries in App.jsx
 * @property {number} id
 * @property {string} title
 * @property {string} party
 * @property {string} status
 * @property {string} category
 * @property {number} support @property {number} oppose @property {number} neutral
 * @property {string} plain   AI plain-English summary
 * @property {string} means   AI "what this means for you"
 * @property {number} [currentStageIndex]
 * @property {Array<{severity: string, title: string, clause: string, summary: string, whyItMatters: string, scrutinyFlag?: string}>} [hiddenProvisions]
 * @property {{budgetImpact: string, perHousehold: string, costSource: string, direction: string}} [fiscal]
 * @property {{lastUpdated?: string}} [meta]
 */

/**
 * @param {{ bill: Bill, vote?: "support"|"oppose"|null,
 *           onVote?: (id: number, pos: "support"|"oppose"|null) => void,
 *           alertOn?: boolean, onToggleAlert?: (id: number) => void,
 *           dataState?: "live"|"cached"|"sample",
 *           renderDetail?: (bill: Bill) => React.ReactNode }} props
 */
export function BillCard({ bill, vote = null, onVote, alertOn = false, onToggleAlert, dataState = "sample", renderDetail }) {
  const [expanded, setExpanded] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const hidden = bill.hiddenProvisions || [];
  const topSeverity = hidden.some(h => h.severity === "high") ? "high" : hidden.some(h => h.severity === "medium") ? "medium" : "low";

  return (
    <Card interactive style={{ marginBottom: 14 }}>
      {/* Meta row: chips left, provenance + alert right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusChip status={bill.status} />
          <PartyChip party={bill.party} />
          <Chip>{bill.category}</Chip>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <SourceBadge state={dataState} updated={bill.meta?.lastUpdated} />
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

      {/* Title + single hero stat — no summary here, it lives in the accent panel below */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ ...TYPE.h3, color: C.ink, margin: 0 }}>{bill.title}</h3>
        </div>
        <Stat value={bill.support} suffix="%" caption="support"
          color={bill.support > 50 ? C.green : bill.oppose > 50 ? C.red : C.ink}
          trend={bill.trend} trendDir={bill.trendDir} />
      </div>

      <SentimentBar support={bill.support} neutral={bill.neutral} oppose={bill.oppose} />

      {/* Progress pipeline */}
      {typeof bill.currentStageIndex === "number" && (
        <StagePipeline current={bill.currentStageIndex} />
      )}

      {/* AI summary panel — now shows means with non-partisan label */}
      <div style={{ background: C.surface, borderRadius: RADIUS.panel, padding: "12px 14px", margin: "14px 0 0", borderLeft: `3px solid ${C.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ color: C.accentText }}><IconSparkle size={13} /></span>
          <span style={{ ...TYPE.overline, fontSize: 10, color: C.accentText }}>What This Means For You</span>
          <span style={{ fontSize: 10, color: C.faint, marginLeft: "auto" }}>Non-partisan · AI summary →</span>
        </div>
        <p style={{ ...TYPE.sm, color: C.ink, margin: 0 }}>{bill.means}</p>

        {/* Full parliamentary summary — collapsible */}
        {bill.plain && bill.plain !== "Plain-English summary pending — check back soon." && (
          <>
            <button onClick={e => { e.stopPropagation(); setSummaryOpen(o => !o); }}
              style={{ marginTop: 10, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: C.accentText, display: "flex", alignItems: "center", gap: 4 }}>
              <IconChevron size={11} dir={summaryOpen ? "up" : "down"} />
              {summaryOpen ? "Hide full summary" : "Full parliamentary summary"}
            </button>
            {summaryOpen && (
              <p style={{ ...TYPE.sm, color: C.mid, margin: "8px 0 0", paddingTop: 8, borderTop: `1px solid ${C.border}` }}>{bill.plain}</p>
            )}
          </>
        )}
      </div>

      {/* Hidden-in-the-bill flag — scan-level visibility */}
      {hidden.length > 0 && (
        <HiddenFlag count={hidden.length} severity={topSeverity} scrutiny={hidden.some(h => h.scrutinyFlag)}
          onClick={() => setExpanded(true)} />
      )}

      {/* Fiscal strip */}
      {bill.fiscal && <FiscalStrip fiscal={bill.fiscal} />}

      <Divider my={14} />

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(x => !x)} style={{ marginRight: "auto" }}>
          {expanded ? "Less detail" : "Full detail"} <IconChevron size={14} dir={expanded ? "up" : "down"} />
        </Button>
        {vote ? (
          <>
            <Chip color={vote === "support" ? C.green : C.red} tone="tint" dot>
              You {vote}
            </Chip>
            <Button variant="ghost" size="sm" onClick={() => onVote?.(bill.id, null)}>Change</Button>
          </>
        ) : (
          <>
            <Button variant="support" size="sm" onClick={() => onVote?.(bill.id, "support")}>Support</Button>
            <Button variant="oppose" size="sm" onClick={() => onVote?.(bill.id, "oppose")}>Oppose</Button>
          </>
        )}
      </div>

      {expanded && (renderDetail ? renderDetail(bill) : <BillDetail bill={bill} />)}
    </Card>
  );
}

/** @param {{ current: number }} props */
function StagePipeline({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 14 }} aria-label={`Stage ${current + 1} of ${STAGES.length}: ${STAGES[current]}`}>
      {STAGES.map((s, i) => {
        const done = i < current, now = i === current;
        return (
          <div key={s} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 3, borderRadius: 99, background: done || now ? C.ink : C.surfaceB, marginBottom: 5 }} />
            <div style={{ fontSize: 9.5, fontWeight: now ? 700 : 500, color: now ? C.ink : done ? C.mid : C.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** @param {{ count: number, severity: "high"|"medium"|"low", scrutiny: boolean, onClick: () => void }} props */
function HiddenFlag({ count, severity, scrutiny, onClick }) {
  const sev = { high: { c: C.red, bg: C.redSoft, bd: C.redMid, label: "High concern" },
                medium: { c: C.amber, bg: C.amberSoft, bd: C.amberMid, label: "Medium concern" },
                low: { c: C.mid, bg: C.surface, bd: C.border, label: "Low concern" } }[severity];
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
      marginTop: 10, padding: "10px 14px", borderRadius: RADIUS.panel, cursor: "pointer",
      background: sev.bg, border: `1px solid ${sev.bd}`, fontFamily: "inherit",
    }}>
      <span style={{ color: sev.c }}><IconEye size={15} /></span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
        {count} provision{count > 1 ? "s" : ""} hidden in this bill
      </span>
      <span style={{ fontSize: 11, color: sev.c, fontWeight: 600, marginLeft: "auto" }}>{sev.label}</span>
      {scrutiny && <Chip color={C.blue} tone="tint">Scrutiny Cttee</Chip>}
    </button>
  );
}

/** Expanded hidden-provision detail. @param {{ item: Object }} props */
export function HiddenProvision({ item }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: RADIUS.panel, border: `1px solid ${C.border}`, background: C.paper, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 650, color: C.ink }}>{item.title}</span>
        <span style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{item.clause}</span>
      </div>
      <p style={{ ...TYPE.sm, color: C.mid, margin: "0 0 8px" }}>{item.summary}</p>
      <p style={{ ...TYPE.sm, color: C.ink, margin: 0 }}>
        <strong style={{ fontWeight: 650 }}>Why it matters:</strong> {item.whyItMatters}
      </p>
      {item.scrutinyFlag && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.blue, fontWeight: 600 }}>◆ {item.scrutinyFlag}</div>
      )}
    </div>
  );
}

/** @param {{ fiscal: {budgetImpact: string, perHousehold: string, costSource: string} }} props */
function FiscalStrip({ fiscal }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 10, padding: "10px 14px", borderRadius: RADIUS.panel, border: `1px solid ${C.border}` }}>
      <span style={{ color: C.teal, marginTop: 1 }}><IconDollar size={15} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, color: C.ink }}>{fiscal.budgetImpact}</div>
        <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>{fiscal.perHousehold}</div>
        <div style={{ fontSize: 10.5, color: C.faint, marginTop: 4 }}>Source: {fiscal.costSource}</div>
      </div>
    </div>
  );
}

/**
 * List wrapper wiring loading / empty / error states.
 * @param {{ bills: Bill[], loading?: boolean, dataState?: "live"|"cached"|"sample",
 *           votes?: Record<number, "support"|"oppose">, onVote?: Function,
 *           alerts?: number[], onToggleAlert?: Function, onClearFilters?: () => void }} props
 */
export function BillList({ bills, loading = false, dataState = "sample", votes = {}, onVote, alerts = [], onToggleAlert, onClearFilters }) {
  if (loading) return <>{[0, 1, 2].map(i => <BillCardSkeleton key={i} />)}</>;
  if (!bills.length) return (
    <EmptyState title="No bills match" sub="Try clearing your category filters, or search by a bill's short title."
      actionLabel={onClearFilters ? "Clear filters" : undefined} onAction={onClearFilters} />
  );
  return (
    <>
      {bills.map(b => (
        <BillCard key={b.id} bill={b} dataState={dataState}
          vote={votes[b.id] || null} onVote={onVote}
          alertOn={alerts.includes(b.id)} onToggleAlert={onToggleAlert} />
      ))}
    </>
  );
}
