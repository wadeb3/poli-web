// ─────────────────────────────────────────────────────────────────────────────
// HOME · "The Brief" · v7
//
// Full redesign from the newspaper-front-page v6.1 concept. The brief: one
// dominant opening moment (vision statement + a search that reads like the
// first prompt screen of an AI product — generous whitespace, one big soft
// input, suggested starting points), then three small, equal, condensed
// containers below. Nothing here competes with the hero for attention —
// restraint is the point after the hero spends its one bold move.
//
// The search hero does NOT run its own parallel search logic — typing and
// submitting hands the query straight to the existing CommandPalette (via
// onSearch), so there is exactly one search implementation in the app, not
// two that can drift out of sync.
//
// Community pulse is a real curation, not an arbitrary pick: most-supported,
// most-opposed, and most-contested (closest support/oppose split) bills,
// deduped so one bill can't fill two slots — three genuinely different
// stories about where public opinion actually sits right now.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS, SHADOW } from "../tokens.js";
import { Card, Chip, StatusChip } from "../primitives.jsx";
import { SourceBadge } from "../states.jsx";
import { IconSearch, IconSparkle, IconChevron, IconBill, IconVote, IconParliament } from "../icons.jsx";

/** @param {import("./BillCard.jsx").Bill[]} bills */
function pulseHighlights(bills, n = 3) {
  const withVotes = (bills || []).filter(b => (b.support || 0) + (b.oppose || 0) + (b.neutral || 0) > 0);
  if (!withVotes.length) return [];
  const used = new Set();
  const pick = (label, sortFn) => {
    const found = [...withVotes].sort(sortFn).find(b => !used.has(b.id));
    if (found) used.add(found.id);
    return found ? { bill: found, label } : null;
  };
  return [
    pick("Most supported", (a, b) => (b.support || 0) - (a.support || 0)),
    pick("Most opposed", (a, b) => (b.oppose || 0) - (a.oppose || 0)),
    pick("Most contested", (a, b) =>
      Math.abs((a.support || 0) - (a.oppose || 0)) - Math.abs((b.support || 0) - (b.oppose || 0))),
  ].filter(Boolean).slice(0, n);
}

const SUGGESTIONS = [
  { label: "What's moving through parliament?", tab: "parliament" },
  { label: "See the federal budget", tab: "bills", sub: "budget" },
  { label: "Find my electorate", tab: "mymp", sub: "mp" },
  { label: "Cast your vote on live issues", tab: "vote" },
];

/**
 * @param {{ bills: import("./BillCard.jsx").Bill[],
 *           divisions?: {id:string|number, name:string, date:string, aye_votes:number, no_votes:number, house:string}[],
 *           onOpenBill: (id: number) => void,
 *           onNavigate: (tab: string, sub?: string) => void,
 *           onSearch: (query: string) => void,
 *           nextSitting?: {label: string, days: number},
 *           dataState?: "live"|"cached"|"sample" }} props
 */
export function HomeFront({ bills, divisions = [], onOpenBill, onNavigate, onSearch, nextSitting, dataState = "sample" }) {
  const [query, setQuery] = useState("");
  const topBills = [...(bills || [])].sort((a, b) => (b.heat || 0) - (a.heat || 0)).slice(0, 3);
  const pulse = pulseHighlights(bills);
  const recentDivisions = (divisions || []).slice(0, 3);

  const submit = () => { if (query.trim()) onSearch(query.trim()); };

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{
        minHeight: "clamp(420px, 36vh, 560px)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "32px 16px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          {nextSitting && (
            <span style={{ ...TYPE.overline, color: C.accentText }}>
              {nextSitting.label} in {nextSitting.days} day{nextSitting.days !== 1 ? "s" : ""}
            </span>
          )}
          <SourceBadge state={dataState} source="APH" />
        </div>

        <h1 style={{ ...TYPE.masthead, fontSize: "clamp(28px, 4.2vw, 44px)", color: C.ink, margin: "0 0 14px", maxWidth: 760, lineHeight: 1.14 }}>
          Australia's civic intelligence platform.
        </h1>
        <p style={{ ...TYPE.body, fontSize: "clamp(14px, 1.6vw, 17px)", color: C.mid, maxWidth: 560, margin: "0 0 40px", lineHeight: 1.55 }}>
          Making politics understandable, trackable, and actionable for every Australian — in real time.
        </p>

        <div style={{ width: "100%", maxWidth: 620 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: C.white, border: `1.5px solid ${C.border}`, borderRadius: RADIUS.pill,
            padding: "6px 8px 6px 20px", boxShadow: SHADOW.cardHover,
          }}>
            <span style={{ color: C.faint, flexShrink: 0, display: "flex" }}><IconSparkle size={17} /></span>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="Ask about a bill, search your MP, explore parliament…"
              aria-label="Search Poli"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: C.ink, padding: "11px 0" }}
            />
            <button onClick={submit} aria-label="Search" disabled={!query.trim()} style={{
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              width: 38, height: 38, borderRadius: "50%", border: "none",
              cursor: query.trim() ? "pointer" : "default",
              background: query.trim() ? C.accent : C.surface, color: query.trim() ? C.white : C.faint,
              transition: "background 0.15s",
            }}>
              <IconSearch size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16 }}>
            {SUGGESTIONS.map(s => (
              <button key={s.label} onClick={() => onNavigate(s.tab, s.sub)} style={{
                padding: "7px 14px", borderRadius: RADIUS.pill, border: `1px solid ${C.border}`,
                background: C.white, fontSize: 12.5, color: C.mid, cursor: "pointer", fontFamily: "inherit",
                transition: "border-color 0.15s, color 0.15s",
              }}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTAINERS ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        <HomeContainer icon={<IconBill size={15} />} title="Top bills" onSeeAll={() => onNavigate("bills", "tracker")}>
          {topBills.length === 0 && <EmptyRow text="No bills loaded yet." />}
          {topBills.map((b, i) => (
            <ContainerRow key={b.id} onClick={() => onOpenBill(b.id)} last={i === topBills.length - 1}
              title={b.title}
              meta={<StatusChip status={b.status} />}
              stat={`${b.support}% support`}
              statColor={b.support > 50 ? C.green : b.oppose > 50 ? C.red : C.mid}
            />
          ))}
        </HomeContainer>

        <HomeContainer icon={<IconParliament size={15} />} title="Recent votes" onSeeAll={() => onNavigate("parliament")}>
          {recentDivisions.length === 0 && <EmptyRow text="No recent divisions yet." />}
          {recentDivisions.map((d, i) => (
            <ContainerRow key={d.id} onClick={() => onNavigate("parliament")} last={i === recentDivisions.length - 1}
              title={d.name}
              meta={<Chip color={C.mid}>{d.house}</Chip>}
              stat={`${d.aye_votes}–${d.no_votes}`}
              statColor={d.aye_votes > d.no_votes ? C.green : C.red}
            />
          ))}
        </HomeContainer>

        <HomeContainer icon={<IconVote size={15} />} title="Community pulse" onSeeAll={() => onNavigate("vote")}>
          {pulse.length === 0 && <EmptyRow text="No community votes yet." />}
          {pulse.map(({ bill, label }, i) => (
            <ContainerRow key={bill.id} onClick={() => onOpenBill(bill.id)} last={i === pulse.length - 1}
              title={bill.title}
              meta={<Chip color={C.accentText} tone="tint">{label}</Chip>}
              stat={`${bill.support}% / ${bill.oppose}%`}
              statColor={C.mid}
            />
          ))}
        </HomeContainer>
      </div>
    </div>
  );
}

function HomeContainer({ icon, title, onSeeAll, children }) {
  return (
    <Card pad="18px 20px" style={{ display: "flex", flexDirection: "column", minHeight: 244 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: C.accentText, display: "flex" }}>{icon}</span>
        <span style={{ ...TYPE.overline, color: C.ink, flex: 1 }}>{title}</span>
        <button onClick={onSeeAll} style={{
          background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2,
          fontSize: 11.5, fontWeight: 600, color: C.accentText, fontFamily: "inherit", padding: 0,
        }}>
          See all <IconChevron size={11} dir="right" />
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </Card>
  );
}

function ContainerRow({ title, meta, stat, statColor, onClick, last = false }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      padding: "10px 0", borderBottom: last ? "none" : `1px solid ${C.border}`,
      background: "none", border: "none",
      cursor: "pointer", fontFamily: "inherit",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.ink, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {meta}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: statColor, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{stat}</span>
    </button>
  );
}

function EmptyRow({ text }) {
  return <div style={{ fontSize: 12, color: C.faint, padding: "24px 0", textAlign: "center" }}>{text}</div>;
}
