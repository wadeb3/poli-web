// ─────────────────────────────────────────────────────────────────────────────
// MP DOSSIER · two-pane member desk · v6.2
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { C, TYPE, RADIUS, LAYOUT, partyOf } from "../tokens.js";
import { Chip, Button, Rule } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { MPProfileHeader, VotingRecord, SaidVsDid, MPFinancialDisclosure } from "./MPProfile.jsx";
import { IconSearch, IconChevron, IconPerson } from "../icons.jsx";

/**
 * @typedef {Object} Member
 * @property {string|number} id
 * @property {string} name
 * @property {string} party
 * @property {string} role
 * @property {"House"|"Senate"} chamber
 * @property {string} state
 * @property {string} [electorate]
 * @property {string} [postcodes]
 * @property {string} [since]
 * @property {{score: number, n: number}|null} [alignment]
 * @property {import("./MPProfile.jsx").VoteRecord[]} [records]
 * @property {{said: string, did: string, consistent: boolean, source?: string}} [saidVsDid]
 */

export function MPDossier({ members, initialParty = null, initialQuery = "", initialSelectedId = null, dataState = "sample", onContact, supabase }) {
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [query, setQuery] = useState(initialQuery);
  const [chamber, setChamber] = useState(null); // null = all, "House", "Senate"
  const [party, setParty] = useState(initialParty);
  const [electorate, setElectorate] = useState(null);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  useEffect(() => { setParty(initialParty); }, [initialParty]);

  // Build dropdown options from live data
  const parties = useMemo(() => {
    const base = chamber
      ? members.filter(m => m.chamber === chamber)
      : members;
    return [...new Set(base.map(m => m.party))].sort();
  }, [members, chamber]);

  const electorates = useMemo(() => {
    const base = members.filter(m =>
      (!chamber || m.chamber === chamber) &&
      (!party || m.party === party)
    );

    // Senate entries — unique states, grouped at top
    const senatStates = chamber !== "House"
      ? [...new Set(base.filter(m => m.chamber === "Senate").map(m => m.state).filter(Boolean))]
          .sort()
          .map(s => ({ label: s, value: s, group: "senate" }))
      : [];

    // House entries — "Electorate · State" but only when state differs from electorate name
    const houseElectorates = chamber !== "Senate"
      ? (() => {
          const seen = new Set();
          return base
            .filter(m => m.chamber === "House" && m.electorate)
            .map(m => {
              const label = m.state && m.state !== m.electorate
                ? `${m.electorate} · ${m.state}`
                : m.electorate;
              return { label, value: m.electorate, group: "house" };
            })
            .filter(e => { if (seen.has(e.value)) return false; seen.add(e.value); return true; })
            .sort((a, b) => a.label.localeCompare(b.label));
        })()
      : [];

    // States first, then electorates
    return [...senatStates, ...houseElectorates];
  }, [members, chamber, party]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m =>
      (!chamber || m.chamber === chamber) &&
      (!party || m.party === party) &&
      (!electorate || m.electorate === electorate || m.state === electorate) &&
      (!q || [m.name, m.role, m.electorate, m.state, m.postcodes].filter(Boolean).join(" ").toLowerCase().includes(q))
    );
  }, [members, query, chamber, party, electorate]);

  const selected = filtered.find(m => m.id === selectedId) || (wide ? filtered[0] : undefined);

  // Clear downstream filters when chamber changes
  const handleChamber = val => {
    setChamber(val);
    setParty(null);
    setElectorate(null);
  };

  const clearAll = () => { setQuery(""); setParty(null); setElectorate(null); setChamber(null); };

  const selectStyle = {
    padding: "7px 10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`,
    background: C.white, color: C.ink, fontFamily: "inherit", fontSize: 12,
    cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A39C94' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
    paddingRight: 26,
  };

  const ledger = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Search */}
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, background: C.white, position: "sticky", top: 0, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.paper, marginBottom: 10 }}>
          <span style={{ color: C.faint }}><IconSearch size={15} /></span>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Name, electorate or postcode…" aria-label="Search members"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: C.ink }} />
        </div>

        {/* House / Senate toggle */}
        <div style={{ display: "flex", gap: 2, background: C.surface, borderRadius: RADIUS.control, padding: 3, marginBottom: 8 }}>
          {[{ v: null, l: "All" }, { v: "House", l: "House" }, { v: "Senate", l: "Senate" }].map(({ v, l }) => (
            <button key={l} onClick={() => handleChamber(v)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                background: chamber === v ? C.white : "transparent",
                color: chamber === v ? C.ink : C.faint,
                boxShadow: chamber === v ? "0 1px 3px rgba(33,29,26,0.08)" : "none",
                transition: "background 0.15s",
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Dropdowns — stacked so neither clips in the narrow ledger */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={party || ""} onChange={e => { setParty(e.target.value || null); setElectorate(null); }}
            aria-label="Filter by party" style={{ ...selectStyle, width: "100%" }}>
            <option value="">All parties</option>
            {parties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={electorate || ""} onChange={e => setElectorate(e.target.value || null)}
            aria-label="Filter by electorate" style={{ ...selectStyle, width: "100%" }}>
            <option value="">{chamber === "Senate" ? "All states" : "All electorates"}</option>
            {(() => {
              const states = electorates.filter(e => e.group === "senate");
              const houses = electorates.filter(e => e.group === "house");
              if (states.length && houses.length) {
                return (
                  <>
                    <optgroup label="States">
                      {states.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </optgroup>
                    <optgroup label="Electorates">
                      {houses.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </optgroup>
                  </>
                );
              }
              return electorates.map(e => <option key={e.value} value={e.value}>{e.label}</option>);
            })()}
          </select>
        </div>

        {/* Active filter summary + clear */}
        {(party || electorate || chamber) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.faint }}>{filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
            <button onClick={clearAll} style={{ fontSize: 11, color: C.accentText, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Member rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <EmptyState title="No members match" icon={<IconPerson size={22} />}
            sub="Try adjusting the filters or search." actionLabel="Clear filters" onAction={clearAll} />
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
                <span style={{ display: "block", ...TYPE.h3, fontSize: 13, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <span style={{ display: "block", fontSize: 11, color: C.faint, marginTop: 2 }}>{m.role} · {m.party}</span>
              </span>
              {m.alignment && (
                <span style={{ fontSize: 11, fontWeight: 650, fontVariantNumeric: "tabular-nums", color: m.alignment.score >= 60 ? C.green : m.alignment.score >= 40 ? C.amber : C.red }}>
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
      <VotingRecord mpId={selected.id} fallbackRecords={selected.records || []} />
      <MPFinancialDisclosure mpName={selected.name} supabase={supabase} />
      {selected.saidVsDid && (
        <SaidVsDid said={selected.saidVsDid.said} did={selected.saidVsDid.did}
          consistent={selected.saidVsDid.consistent} source={selected.saidVsDid.source} />
      )}
    </div>
  );

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

  return (
    <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: RADIUS.card, background: C.white, overflow: "hidden", alignItems: "stretch" }}>
      <div style={{ width: LAYOUT.deskListWidth, flexShrink: 0, borderRight: `1px solid ${C.border}`, maxHeight: "calc(100vh - 140px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {ledger}
      </div>
      <div style={{ flex: 1, minWidth: 0, maxHeight: "calc(100vh - 140px)", overflowY: "auto", padding: "20px 24px", background: C.paper }}>
        {dossier || <EmptyState title="Select a Member" sub="Choose someone from the ledger to open their dossier." icon={<IconPerson size={22} />} />}
      </div>
    </div>
  );
}

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
