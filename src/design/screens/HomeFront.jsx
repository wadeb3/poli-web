// ─────────────────────────────────────────────────────────────────────────────
// HOME · DASHBOARD · v6.3
//
// Tool-first dashboard. No scrolling required on desktop — 4 snap sections
// that each fill the viewport. Mobile snaps vertically between sections.
//
// Sections:
//   1. Bills this week  — live from Supabase, newest 6 bills, navigate to bill
//   2. Parliament       — composition + recent divisions
//   3. Your rep         — postcode capture → representative lookup
//   4. Community pulse  — sentiment across active bills
//
// Postcode is persisted via onPostcodeChange callback to App-level state
// so it pre-fills the MP dossier filter without re-entering.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS, FONT } from "../tokens.js";
import { Chip, StatusChip, BillTypeChip, SentimentBar, Button } from "../primitives.jsx";
import { IconChevron, IconEye, IconPerson, IconSearch } from "../icons.jsx";

const PARTY_SEATS = [
  { party: "ALP",    label: "Labor",       seats: 93, color: "#E8373B" },
  { party: "LNP",    label: "Lib–Nat",     seats: 56, color: "#1C4F9C" },
  { party: "Greens", label: "Greens",      seats: 4,  color: "#00A651" },
  { party: "IND",    label: "Independent", seats: 14, color: "#888" },
  { party: "OTH",    label: "Other",       seats: 9,  color: "#bbb" },
];
const TOTAL_SEATS = PARTY_SEATS.reduce((s, p) => s + p.seats, 0);

// ─────────────────────────────────────────────────────────────────────────────

export function HomeFront({
  bills = [],
  members = [],
  divisions = [],
  onOpenBill,
  onOpenMember,
  onPostcodeChange,
  savedPostcode = "",
  nextSitting,
  dataState = "live",
}) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  // Recent bills — newest 6 with real data
  const recentBills = [...bills]
    .filter(b => b.meta?.introducedDate || b.title)
    .sort((a, b) => new Date(b.meta?.introducedDate || 0) - new Date(a.meta?.introducedDate || 0))
    .slice(0, 6);

  // Active bills with sentiment for pulse section
  const activeBills = bills
    .filter(b => b.status === "Active" || b.status === "Legislation")
    .slice(0, 4);

  return (
    <div style={{
      height: "calc(100vh - 56px)",
      overflowY: "scroll",
      scrollSnapType: "y mandatory",
      scrollBehavior: "smooth",
    }}>

      {/* ── SECTION 1: Bills This Week ────────────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 56px)",
        scrollSnapAlign: "start",
        display: "flex", flexDirection: "column",
        padding: "20px 0 0",
      }}>
        <SectionHeader
          label="Bills this week"
          sub={`${recentBills.length} recently introduced · ${today}`}
          action={{ label: "All bills →", onClick: () => onOpenBill(null) }}
        />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: C.border, overflow: "hidden", borderRadius: RADIUS.card, border: `1px solid ${C.border}` }}>
          {recentBills.length === 0
            ? <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", background: C.white, color: C.faint, fontSize: 13 }}>Loading bills…</div>
            : recentBills.map(b => (
              <BillTile key={b.id} bill={b} onClick={() => onOpenBill(b.id)} />
            ))
          }
        </div>
        <ScrollHint />
      </section>

      {/* ── SECTION 2: Parliament ─────────────────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 56px)",
        scrollSnapAlign: "start",
        display: "flex", flexDirection: "column",
        padding: "20px 0 0",
      }}>
        <SectionHeader
          label="Parliament"
          sub="48th Parliament · House of Representatives composition"
          action={{ label: "Full map →", onClick: () => onOpenBill(null, "parliament") }}
        />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
          {/* Seat composition */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Seat composition</div>
            {/* Visual bar */}
            <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
              {PARTY_SEATS.map(p => (
                <div key={p.party} style={{ width: `${(p.seats / TOTAL_SEATS) * 100}%`, background: p.color }} />
              ))}
            </div>
            {PARTY_SEATS.map(p => (
              <div key={p.party} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.mid, flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{p.seats}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.faint }}>
              {TOTAL_SEATS} seats total · Majority: {Math.floor(TOTAL_SEATS / 2) + 1}
            </div>
          </div>

          {/* Recent divisions */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Recent votes in parliament</div>
            {divisions.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.faint }}>
                Loading recent divisions…
              </div>
            ) : divisions.slice(0, 5).map((d, i) => (
              <div key={d.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: d.aye_votes > d.no_votes ? C.green : C.red, marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>
                    {d.date ? new Date(d.date).toLocaleDateString("en-AU", { day:"numeric", month:"short" }) : ""}
                    {" · "}{d.aye_votes} aye · {d.no_votes} no
                  </div>
                </div>
              </div>
            ))}
            {nextSitting && (
              <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.accentText, fontWeight: 600 }}>
                📅 {nextSitting.label} in {nextSitting.days} day{nextSitting.days !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <ScrollHint />
      </section>

      {/* ── SECTION 3: Your Representative ───────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 56px)",
        scrollSnapAlign: "start",
        display: "flex", flexDirection: "column",
        padding: "20px 0 0",
      }}>
        <SectionHeader
          label="Your representatives"
          sub="Find who represents you in federal parliament"
          action={{ label: "All representatives →", onClick: () => onOpenMember(null) }}
        />
        <PostcodeLookup
          members={members}
          savedPostcode={savedPostcode}
          onPostcodeChange={onPostcodeChange}
          onOpenMember={onOpenMember}
        />
        <ScrollHint />
      </section>

      {/* ── SECTION 4: Community Pulse ───────────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 56px)",
        scrollSnapAlign: "start",
        display: "flex", flexDirection: "column",
        padding: "20px 0 0",
      }}>
        <SectionHeader
          label="Community pulse"
          sub="How Australians are voting on active legislation"
          action={{ label: "Go vote →", onClick: () => onOpenBill(null, "vote") }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, background: C.border, borderRadius: RADIUS.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {activeBills.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.white, fontSize: 13, color: C.faint }}>
              Sentiment data coming soon — be among the first to vote on active bills.
            </div>
          ) : activeBills.map((b, i) => (
            <div key={b.id} onClick={() => onOpenBill(b.id)}
              style={{ flex: 1, background: C.white, padding: "16px 20px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                <Chip>{b.category}</Chip>
              </div>
              <SentimentBar support={b.support} neutral={b.neutral} oppose={b.oppose} height={6} />
            </div>
          ))}
          {activeBills.length > 0 && (
            <div style={{ background: C.surface, padding: "12px 20px", fontSize: 11, color: C.faint }}>
              Community sentiment is anonymous and non-binding. Poli discloses methodology.
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: 11, color: C.faint }}>{sub}</span>
      {action && (
        <button onClick={action.onClick} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function BillTile({ bill, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.white, padding: "14px 16px", cursor: "pointer",
      display: "flex", flexDirection: "column", gap: 8,
      transition: "background 0.1s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = C.white}>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <StatusChip status={bill.status} />
        <BillTypeChip title={bill.title} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.4, flex: 1 }}>
        {bill.title}
      </div>
      {bill.means && bill.means !== "Plain-English analysis pending." && (
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {bill.means}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
        {bill.category && <span style={{ fontSize: 10, color: C.faint }}>{bill.category}</span>}
        {bill.hiddenProvisions?.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: C.amber, fontWeight: 600 }}>
            <IconEye size={11} /> {bill.hiddenProvisions.length}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.accentText, fontWeight: 600 }}>
          Read briefing →
        </span>
      </div>
    </div>
  );
}

function PostcodeLookup({ members, savedPostcode, onPostcodeChange, onOpenMember }) {
  const [input, setInput] = useState(savedPostcode || "");
  const [results, setResults] = useState(null);

  const lookup = () => {
    const q = input.trim();
    if (!q) return;
    onPostcodeChange?.(q);
    // Simple name/electorate/postcode match against members
    const matches = members.filter(m =>
      m.electorate?.toLowerCase().includes(q.toLowerCase()) ||
      m.name?.toLowerCase().includes(q.toLowerCase()) ||
      m.postcodes?.includes(q)
    ).slice(0, 4);
    setResults(matches);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search input */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: RADIUS.control, border: `1.5px solid ${C.border}`, background: C.white }}>
          <IconSearch size={14} style={{ color: C.faint, flexShrink: 0 }} />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="Enter postcode, electorate or name…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 13, color: C.ink, background: "transparent" }}
          />
        </div>
        <button onClick={lookup} style={{
          padding: "10px 18px", borderRadius: RADIUS.control, border: "none",
          background: C.accent, color: "#fff", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Find
        </button>
      </div>

      {/* Results */}
      {results === null && members.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, flex: 1, alignContent: "start" }}>
          <div style={{ gridColumn: "1/-1", fontSize: 11, color: C.faint }}>
            Enter your postcode to find your federal representatives, or browse below.
          </div>
          {members.slice(0, 4).map(m => (
            <MemberCard key={m.id} member={m} onClick={() => onOpenMember(m.id)} />
          ))}
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ fontSize: 13, color: C.mid }}>No representatives found for "{input}"</div>
          <button onClick={() => { setResults(null); setInput(""); }} style={{ fontSize: 12, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Clear search
          </button>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, flex: 1, alignContent: "start" }}>
          <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.faint }}>{results.length} result{results.length !== 1 ? "s" : ""} for "{input}"</span>
            <button onClick={() => { setResults(null); setInput(""); }} style={{ fontSize: 11, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Clear
            </button>
          </div>
          {results.map(m => (
            <MemberCard key={m.id} member={m} onClick={() => onOpenMember(m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, onClick }) {
  const initials = member.name?.split(" ").map(w => w[0]).slice(0, 2).join("") || "?";
  return (
    <div onClick={onClick} style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card,
      padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = C.white}>
      <div style={{
        width: 36, height: 36, borderRadius: 99, background: C.accentSoft,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: C.accentText, flexShrink: 0,
      }}>{initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
        <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{member.role}</div>
      </div>
      <IconChevron size={12} dir="right" style={{ color: C.faint, flexShrink: 0, marginLeft: "auto" }} />
    </div>
  );
}

function ScrollHint() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px", color: C.faint }}>
      <IconChevron size={16} dir="down" />
    </div>
  );
}
