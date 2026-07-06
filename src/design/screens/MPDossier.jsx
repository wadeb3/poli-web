// ─────────────────────────────────────────────────────────────────────────────
// MP DOSSIER · two-pane member desk · v6.2
//
// Unifies MP lookup, senator tracker and profile into one surface built
// around the question "who represents me and what have they done":
//   left  — searchable member ledger (name/electorate/postcode text search,
//           party + chamber filters)
//   right — the full dossier: profile header, alignment, voting record,
//           said-vs-did, donations
// Below 900px: ledger only; tapping a member opens the dossier full-screen
// with a back control (the phone version of the same desk).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { C, TYPE, RADIUS, LAYOUT, partyOf } from "../tokens.js";
import { Chip, Button, Rule } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { MPProfileHeader, VotingRecord, SaidVsDid } from "./MPProfile.jsx";
import { IconSearch, IconChevron, IconPerson } from "../icons.jsx";

/**
 * @typedef {Object} Member
 * @property {string|number} id
 * @property {string} name
 * @property {string} party
 * @property {string} role        e.g. "Member for Grayndler"
 * @property {"House"|"Senate"} chamber
 * @property {string} state
 * @property {string} [electorate]
 * @property {string} [postcodes] searchable postcode string, e.g. "2040 2041"
 * @property {string} [since]
 * @property {{score: number, n: number}|null} [alignment]
 * @property {import("./MPProfile.jsx").VoteRecord[]} [records]
 * @property {{said: string, did: string, consistent: boolean, source?: string}} [saidVsDid]
 */

/**
 * @param {{ members: Member[], initialParty?: string|null, initialQuery?: string,
 *           dataState?: "live"|"cached"|"sample", onContact?: (m: Member) => void }} props
 */
export function MPDossier({ members, initialParty = null, initialQuery = "", dataState = "sample", onContact }) {
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [query, setQuery] = useState(initialQuery);
  const [party, setParty] = useState(initialParty);
  const [chamber, setChamber] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  useEffect(() => { setParty(initialParty); }, [initialParty]);

  const parties = useMemo(() => [...new Set(members.map(m => m.party))], [members]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m =>
      (!party || m.party === party) &&
      (!chamber || m.chamber === chamber) &&
      (!q || [m.name, m.role, m.electorate, m.state, m.postcodes].filter(Boolean).join(" ").toLowerCase().includes(q))
    );
  }, [members, query, party, chamber]);

  const selected = filtered.find(m => m.id === selectedId) || (wide ? filtered[0] : filtered.find(m => m.id === selectedId));

  const ledger = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search + filters */}
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.white, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.paper, marginBottom: 10 }}>
          <span style={{ color: C.faint }}><IconSearch size={15} /></span>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Name, electorate or postcode…"
            aria-label="Search members"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: C.ink }} />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["House", "Senate"].map(ch => (
            <FilterPill key={ch} on={chamber === ch} onClick={() => setChamber(chamber === ch ? null : ch)}>{ch}</FilterPill>
          ))}
          {parties.map(p => (
            <FilterPill key={p} on={party === p} dot={partyOf(p).color} onClick={() => setParty(party === p ? null : p)}>{p}</FilterPill>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <EmptyState title="No members match" icon={<IconPerson size={22} />}
            sub="Try a different spelling, or clear the party and chamber filters."
            actionLabel="Clear filters" onAction={() => { setQuery(""); setParty(null); setChamber(null); }} />
        ) : filtered.map(m => {
          const active = wide && m.id === selected?.id;
          const p = partyOf(m.party);
          return (
            <button key={m.id} onClick={() => { setSelectedId(m.id); if (!wide) setMobileOpen(true); }}
              aria-current={active ? "true" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
                padding: "13px 16px", background: active ? C.accentSoft : "transparent",
                border: "none", borderBottom: `1px solid ${C.border}`,
                boxShadow: active ? `inset 3px 0 0 ${C.accent}` : "none",
                cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
              }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", ...TYPE.h3, fontSize: 15, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <span style={{ display: "block", fontSize: 11, color: C.faint, marginTop: 2 }}>{m.role} · {m.party}</span>
              </span>
              {m.alignment && (
                <span style={{ fontSize: 11.5, fontWeight: 650, fontVariantNumeric: "tabular-nums", color: m.alignment.score >= 60 ? C.green : m.alignment.score >= 40 ? C.amber : C.red }}>
                  {m.alignment.score}%
                </span>
              )}
              {!wide && <span style={{ color: C.faint }}><IconChevron size={14} dir="right" /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const dossier = selected && (
    <div>
      <MPProfileHeader mp={selected} alignment={selected.alignment || null} dataState={dataState}
        onContact={onContact ? () => onContact(selected) : undefined} />
      <VotingRecord records={selected.records || []} />
      {selected.saidVsDid && (
        <SaidVsDid said={selected.saidVsDid.said} did={selected.saidVsDid.did}
          consistent={selected.saidVsDid.consistent} source={selected.saidVsDid.source} />
      )}
    </div>
  );

  // Mobile: ledger, or full-screen dossier with back control
  if (!wide) {
    if (mobileOpen && selected) {
      return (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)} style={{ marginBottom: 12 }}>
            <IconChevron size={14} dir="left" /> All members
          </Button>
          {dossier}
        </div>
      );
    }
    return (
      <div style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.card, background: C.white, overflow: "hidden" }}>
        {ledger}
      </div>
    );
  }

  // Desktop: two-pane desk
  return (
    <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: RADIUS.card, background: C.white, overflow: "hidden", alignItems: "stretch" }}>
      <div style={{ width: LAYOUT.deskListWidth, flexShrink: 0, borderRight: `1px solid ${C.border}`, maxHeight: "calc(100vh - 140px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {ledger}
      </div>
      <div style={{ flex: 1, minWidth: 0, maxHeight: "calc(100vh - 140px)", overflowY: "auto", padding: "20px 24px", background: C.paper }}>
        {dossier || <EmptyState title="Select a member" sub="Choose someone from the ledger to open their dossier." icon={<IconPerson size={22} />} />}
      </div>
    </div>
  );
}

/** @param {{ on: boolean, dot?: string, onClick: () => void, children: React.ReactNode }} props */
function FilterPill({ on, dot, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px",
      borderRadius: 999, fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer",
      background: on ? C.ink : C.white, color: on ? C.paper : C.mid,
      border: `1px solid ${on ? C.ink : C.border}`, transition: "background 0.15s",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: dot }} />}
      {children}
    </button>
  );
}
