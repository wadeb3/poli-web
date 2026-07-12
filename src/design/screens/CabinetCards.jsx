// ─────────────────────────────────────────────────────────────────────────────
// CABINET · "The Ministry" · v6.2 re-skin of the v5 CabinetCards
//
// Structural point: this component carries ROLE data only (name, party,
// chamber, portfolio, tier) — not biographical data (electorate, since,
// alignment). Cabinet is a portfolio overlay on the member ledger, not a
// duplicate of it. Wire `onSelectMinister` to look the name up in the live
// `mps` table and hand off to MPDossier for the full profile — avoids a
// second source of truth for the same person, and means this screen never
// needs its own electorate/postcode data.
//
// Three-tier ministry, explained in place (map-as-teacher, same move as
// ParliamentMap's chamber notes): Cabinet (peak decision-making body) →
// Outer ministry (runs a portfolio, doesn't sit in Cabinet) → Assistant
// ministers (support a senior minister on a slice of their portfolio). Only
// Cabinet gets full-card treatment; the other two tiers are dense ledger
// rows behind a disclosure, so completeness doesn't cost density (the same
// trade BillsDesk makes between the ledger and the open briefing).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, partyOf } from "../tokens.js";
import { Card, PartyChip, SectionLabel, Kicker } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { IconPerson, IconChevron } from "../icons.jsx";

/**
 * @typedef {Object} Minister
 * @property {string|number} id
 * @property {string} name
 * @property {string} party        token key, e.g. "ALP"
 * @property {"House"|"Senate"} chamber
 * @property {"pm"|"deputy"|"cabinet"|"outer"|"assistant"} tier
 * @property {string[]} portfolios
 */

const TIER_LABEL = {
  pm: "Prime Minister",
  deputy: "Deputy Prime Minister",
  cabinet: "Cabinet",
  outer: "Outer ministry",
  assistant: "Assistant minister",
};

/**
 * @param {{ ministers: Minister[], dataState?: "live"|"cached"|"sample",
 *           updated?: string, onSelectMinister?: (m: Minister) => void }} props
 */
export function CabinetCards({ ministers, dataState = "sample", updated, onSelectMinister }) {
  const [expanded, setExpanded] = useState(false);

  if (!ministers || ministers.length === 0) {
    return (
      <EmptyState title="No ministry data" icon={<IconPerson size={22} />}
        sub="The current ministry list hasn't loaded yet." />
    );
  }

  const pm = ministers.find(m => m.tier === "pm");
  const deputy = ministers.find(m => m.tier === "deputy");
  const cabinet = ministers.filter(m => m.tier === "cabinet");
  const outer = ministers.filter(m => m.tier === "outer");
  const assistant = ministers.filter(m => m.tier === "assistant");

  return (
    <div>
      <Kicker right={<SourceBadge state={dataState} updated={updated} source="PM&amp;C" />}>
        The Ministry · {ministers.length} appointments
      </Kicker>

      <p style={{ ...TYPE.sm, color: C.mid, maxWidth: 620, margin: "0 0 20px" }}>
        Cabinet is the government's peak decision-making body — the Prime Minister's most senior
        ministers, who deliberate collectively and are bound by cabinet solidarity. Outer ministers
        run a portfolio without sitting in Cabinet; assistant ministers support a senior minister
        on part of theirs.
      </p>

      {/* PM + Deputy PM — masthead pair, same weight as HomeFront's lead story */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
        {pm && <LeaderCard minister={pm} onSelect={onSelectMinister} />}
        {deputy && <LeaderCard minister={deputy} onSelect={onSelectMinister} />}
      </div>

      {/* Cabinet grid */}
      <SectionLabel>Cabinet · {cabinet.length}</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
        {cabinet.map(m => <MinisterCard key={m.id} minister={m} onSelect={onSelectMinister} />)}
      </div>

      {/* Outer + assistant — dense, behind a disclosure so completeness doesn't cost density */}
      <button onClick={() => setExpanded(e => !e)} style={{
        display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 4px",
        background: "none", border: "none", borderTop: `1px solid ${C.border}`, cursor: "pointer",
        fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: C.mid,
      }}>
        <IconChevron size={13} dir={expanded ? "up" : "down"} />
        {expanded ? "Hide" : "Show"} outer ministry &amp; assistant ministers · {outer.length + assistant.length}
      </button>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {outer.length > 0 && (
            <>
              <SectionLabel>Outer ministry · {outer.length}</SectionLabel>
              <div style={{ marginBottom: 18 }}>
                {outer.map(m => <MinistryRow key={m.id} minister={m} onSelect={onSelectMinister} />)}
              </div>
            </>
          )}
          {assistant.length > 0 && (
            <>
              <SectionLabel>Assistant ministers · {assistant.length}</SectionLabel>
              <div>
                {assistant.map(m => <MinistryRow key={m.id} minister={m} onSelect={onSelectMinister} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Hero treatment for PM / Deputy PM — the only place besides HomeFront's lead story this scale appears. */
function LeaderCard({ minister, onSelect }) {
  return (
    <Card interactive={!!onSelect} onClick={onSelect ? () => onSelect(minister) : undefined} pad="20px 22px">
      <div style={{ ...TYPE.overline, color: C.accentText, marginBottom: 8 }}>{TIER_LABEL[minister.tier]}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={minister.name} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TYPE.h3, fontSize: 20, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {minister.name}
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, marginTop: 3 }}>{minister.portfolios.join(" · ")}</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}><PartyChip party={minister.party} showName /></div>
    </Card>
  );
}

/** Standard Cabinet card. */
function MinisterCard({ minister, onSelect }) {
  return (
    <Card interactive={!!onSelect} onClick={onSelect ? () => onSelect(minister) : undefined} pad="14px 16px">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Avatar name={minister.name} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...TYPE.h3, fontSize: 15, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {minister.name}
          </div>
          <div style={{ fontSize: 11.5, color: C.mid, marginTop: 3, lineHeight: 1.4 }}>{minister.portfolios.join(" · ")}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <PartyChip party={minister.party} />
        <span style={{ fontSize: 10.5, color: C.faint }}>{minister.chamber}</span>
      </div>
    </Card>
  );
}

/** Dense ledger row for outer/assistant tiers — same rhythm as MPDossier's member ledger rows. */
function MinistryRow({ minister, onSelect }) {
  const p = partyOf(minister.party);
  return (
    <button onClick={onSelect ? () => onSelect(minister) : undefined}
      disabled={!onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        padding: "9px 4px", background: "none", border: "none", borderBottom: `1px solid ${C.border}`,
        cursor: onSelect ? "pointer" : "default", fontFamily: "inherit",
      }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: p.color, flexShrink: 0 }} />
      <span style={{ ...TYPE.sm, color: C.ink, width: 170, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {minister.name}
      </span>
      <span style={{ fontSize: 11.5, color: C.mid, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {minister.portfolios.join(" · ")}
      </span>
      <span style={{ fontSize: 10.5, color: C.faint, flexShrink: 0 }}>{minister.chamber}</span>
    </button>
  );
}

/** Initials avatar — deliberately no headshot dependency (no photo licensing/hotlinking to manage). */
function Avatar({ name, size = 40 }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      width: size, height: size, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`,
      fontFamily: TYPE.h3.fontFamily, fontSize: size * 0.38, color: C.mid,
    }}>
      {initials}
    </span>
  );
}
