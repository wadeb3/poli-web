// ─────────────────────────────────────────────────────────────────────────────
// HOME · "FRONT PAGE" · v6.1
//
// The fix for "everything at the same volume": Home now behaves like a
// newspaper front page. One LEAD story (the highest-heat live bill) set at
// masthead scale, a numbered column of secondary stories, then the civic
// calendar and action centre as clearly subordinate matter. The hierarchy is
// typographic — scale, hairlines, numbering — not boxes competing with boxes.
//
// Curation logic is a pure function (leadAndSecondaries) so the "editor" can
// later become smarter (recency, stage changes, user interests) without
// touching the layout.
// ─────────────────────────────────────────────────────────────────────────────
import { C, TYPE, FONT, RADIUS } from "../tokens.js";
import { Kicker, Rule, IndexNum, Chip, StatusChip, PartyChip, SentimentBar, Button } from "../primitives.jsx";
import { SourceBadge } from "../states.jsx";
import { IconEye, IconChevron } from "../icons.jsx";

/** @param {import("./BillCard.jsx").Bill[]} bills */
export function leadAndSecondaries(bills, nSecondary = 4) {
  const ranked = [...bills].sort((a, b) => (b.heat || 0) - (a.heat || 0));
  return { lead: ranked[0], secondaries: ranked.slice(1, 1 + nSecondary) };
}

/**
 * @typedef {Object} CivicAction
 * @property {"petition"|"submission"|"hearing"} kind
 * @property {string} title
 * @property {string} deadline
 *
 * @param {{ bills: import("./BillCard.jsx").Bill[],
 *           onOpenBill: (id: number) => void,
 *           nextSitting?: {label: string, days: number},
 *           actions?: CivicAction[],
 *           dataState?: "live"|"cached"|"sample" }} props
 */
export function HomeFront({ bills, onOpenBill, nextSitting, actions = [], dataState = "sample" }) {
  const { lead, secondaries } = leadAndSecondaries(bills);
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* Dateline — masthead furniture */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ ...TYPE.caption, color: C.mid }}>{today}</span>
        {nextSitting && (
          <span style={{ ...TYPE.caption, color: C.accentText, fontWeight: 650 }}>
            {nextSitting.label} in {nextSitting.days} day{nextSitting.days !== 1 ? "s" : ""}
          </span>
        )}
        <span style={{ marginLeft: "auto" }}><SourceBadge state={dataState} source="APH" /></span>
      </div>
      <Rule strong my={10} />

      {/* LEAD STORY */}
      {lead && (
        <article style={{ cursor: "pointer" }} onClick={() => onOpenBill(lead.id)}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <span style={{ ...TYPE.overline, color: C.accentText }}>The bill to watch</span>
            <StatusChip status={lead.status} />
            <PartyChip party={lead.party} />
          </div>
          <h1 style={{ ...TYPE.masthead, color: C.ink, margin: "0 0 10px", maxWidth: 720 }}>{lead.title}</h1>
          <p style={{ ...TYPE.body, color: C.mid, margin: "0 0 16px", maxWidth: 640 }}>{lead.plain}</p>
          <div style={{ maxWidth: 640 }}>
            <SentimentBar support={lead.support} neutral={lead.neutral} oppose={lead.oppose} height={7} />
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            {lead.hiddenProvisions?.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.amber }}>
                <IconEye size={14} /> {lead.hiddenProvisions.length} provision{lead.hiddenProvisions.length > 1 ? "s" : ""} hidden in this bill
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 650, color: C.accentText }}>
              Read the briefing <IconChevron size={13} dir="right" />
            </span>
          </div>
        </article>
      )}

      <Rule my={26} />

      {/* SECONDARY STORIES — numbered editorial column */}
      <Kicker right={<span style={{ ...TYPE.caption, color: C.faint }}>ranked by public attention</span>}>
        Also moving through parliament
      </Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", columnGap: 36, rowGap: 0 }}>
        {secondaries.map((b, i) => (
          <article key={b.id} onClick={() => onOpenBill(b.id)} style={{
            display: "flex", gap: 14, padding: "16px 0", cursor: "pointer",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <IndexNum n={i + 1} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ ...TYPE.h3, fontSize: 17, color: C.ink, margin: "0 0 5px" }}>{b.title}</h3>
              <p style={{ ...TYPE.sm, fontSize: 12.5, color: C.mid, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.plain}</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: C.faint }}>
                <StatusChip status={b.status} />
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: b.support > 50 ? C.green : b.oppose > 50 ? C.red : C.mid }}>
                  {b.support}% support
                </span>
                {b.hiddenProvisions?.length > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.amber, fontWeight: 600 }}>
                    <IconEye size={12} /> {b.hiddenProvisions.length}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ACTION CENTRE — subordinate matter */}
      {actions.length > 0 && (
        <>
          <div style={{ height: 30 }} />
          <Kicker>Your voice, this week</Kicker>
          {actions.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <Chip color={a.kind === "hearing" ? C.blue : a.kind === "submission" ? C.purple : C.teal} tone="tint">
                {a.kind.charAt(0).toUpperCase() + a.kind.slice(1)}
              </Chip>
              <span style={{ ...TYPE.sm, color: C.ink, flex: 1, minWidth: 0 }}>{a.title}</span>
              <span style={{ fontSize: 11, color: C.faint, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{a.deadline}</span>
              <Button size="sm" variant="ghost">Act <IconChevron size={12} dir="right" /></Button>
            </div>
          ))}
        </>
      )}

      {/* Masthead footer — the trust line, set like a colophon */}
      <div style={{ marginTop: 36, paddingTop: 14, borderTop: `2.5px solid ${C.ink}` }}>
        <p style={{ fontFamily: FONT.display, fontSize: 15, color: C.mid, margin: 0, fontStyle: "italic" }}>
          Poli is independent and non-partisan. No advertising, no party funding, methodology public.
        </p>
      </div>
    </div>
  );
}
