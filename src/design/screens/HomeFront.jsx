// ─────────────────────────────────────────────────────────────────────────────
// HOME · DASHBOARD · v6.4
//
// Single-viewport dashboard — everything visible at once on desktop.
// No full-screen sections. Three columns + a footer pulse bar.
//
// Layout (desktop):
//   ┌─────────────────────────────────────────────────────────┐
//   │  dateline header                                        │
//   ├──────────────────────┬─────────────────┬───────────────┤
//   │  Recent bills (list) │  Parliament     │  Your rep     │
//   │  8 compact rows      │  Seats + divs   │  Postcode     │
//   ├──────────────────────┴─────────────────┴───────────────┤
//   │  Community pulse — 3 sentiment bars                     │
//   └─────────────────────────────────────────────────────────┘
//
// Mobile: single column, natural scroll, no snap.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Chip, StatusChip, BillTypeChip, SentimentBar } from "../primitives.jsx";
import { IconChevron, IconEye, IconSearch } from "../icons.jsx";

const PARTY_SEATS = [
  { label: "Labor",       seats: 93,  color: "#E8373B" },
  { label: "Lib–Nat",     seats: 56,  color: "#1C4F9C" },
  { label: "Greens",      seats: 4,   color: "#00A651" },
  { label: "Independent", seats: 14,  color: "#888888" },
  { label: "Other",       seats: 9,   color: "#C0BAB2" },
];
const TOTAL_SEATS = PARTY_SEATS.reduce((s, p) => s + p.seats, 0);

export function HomeFront({
  bills = [], members = [], divisions = [],
  onOpenBill, onOpenMember, onPostcodeChange,
  savedPostcode = "", nextSitting,
}) {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const recentBills = [...bills]
    .sort((a, b) => new Date(b.meta?.introducedDate || 0) - new Date(a.meta?.introducedDate || 0))
    .slice(0, 8);

  const activeBills = bills
    .filter(b => b.status === "Active" || b.status === "Legislation")
    .slice(0, 3);

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", overflow: "hidden", gap: 0 }}>

      {/* Dateline bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0 8px", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.faint }}>{today}</span>
        {nextSitting && (
          <span style={{ fontSize: 11, fontWeight: 600, color: C.accentText }}>
            🗓 Parliament sitting in {nextSitting.days} day{nextSitting.days !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Main 3-column grid — fixed proportions that fit the viewport */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) minmax(0,0.9fr)", gap: 10, minHeight: 0, overflow: "hidden" }}>

        {/* ── COL 1: Recent Bills ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <PanelHeader label="Recent Bills" count={bills.length} action="All bills →" onAction={() => onOpenBill(null)} />
          <div style={{ flex: 1, overflowY: "auto", background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card }}>
            {recentBills.length === 0 ? (
              <div style={{ padding: 16, fontSize: 11, color: C.faint, textAlign: "center" }}>Loading…</div>
            ) : recentBills.map((b, i) => (
              <BillRow key={b.id} bill={b} last={i === recentBills.length - 1} onClick={() => onOpenBill(b.id)} />
            ))}
          </div>
        </div>

        {/* ── COL 2: Parliament ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflow: "hidden" }}>

          {/* Seat composition */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "12px 14px", flexShrink: 0 }}>
            <PanelHeader label="Parliament" action="Map →" onAction={() => onOpenBill(null, "parliament")} compact />
            <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", margin: "8px 0 10px" }}>
              {PARTY_SEATS.map(p => (
                <div key={p.label} title={`${p.label}: ${p.seats}`} style={{ width: `${(p.seats / TOTAL_SEATS) * 100}%`, background: p.color }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PARTY_SEATS.map(p => (
                <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.mid, flex: 1 }}>{p.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{p.seats}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.faint }}>
              {TOTAL_SEATS} seats · majority {Math.floor(TOTAL_SEATS / 2) + 1}
            </div>
          </div>

          {/* Recent divisions */}
          <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "12px 14px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <PanelHeader label="Recent Votes" compact />
            <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
              {divisions.length === 0 ? (
                <div style={{ fontSize: 11, color: C.faint }}>Loading…</div>
              ) : divisions.slice(0, 6).map((d, i) => (
                <div key={d.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 8, marginBottom: 8, borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 6, height: 6, borderRadius: 99, background: d.aye_votes > d.no_votes ? C.green : C.red, marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: C.faint, marginTop: 1 }}>
                      {d.date ? new Date(d.date).toLocaleDateString("en-AU", { day:"numeric", month:"short" }) : ""}
                      {" · "}{d.aye_votes} aye · {d.no_votes} no
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COL 3: Your Representatives ───────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <PanelHeader label="Your Representatives" action="All →" onAction={() => onOpenMember(null)} />
          <div style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            <PostcodeLookup
              members={members}
              savedPostcode={savedPostcode}
              onPostcodeChange={onPostcodeChange}
              onOpenMember={onOpenMember}
            />
          </div>
        </div>
      </div>

      {/* ── Community Pulse footer bar ─────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginTop: 10 }}>
        <PanelHeader label="Community Pulse" sub="How Australians are voting on active bills" action="Vote →" onAction={() => onOpenBill(null, "vote")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {activeBills.length === 0 ? (
            <div style={{ gridColumn: "1/-1", background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "12px 16px", fontSize: 11, color: C.faint }}>
              Community sentiment data coming soon — be among the first to vote on active bills.
            </div>
          ) : activeBills.map(b => (
            <div key={b.id} onClick={() => onOpenBill(b.id)}
              style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, padding: "8px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = C.white}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
              <SentimentBar support={b.support} neutral={b.neutral} oppose={b.oppose} height={4} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint }}>
                <span style={{ color: C.green, fontWeight: 600 }}>{b.support}% support</span>
                <span style={{ color: C.faint }}>{b.neutral}% neutral</span>
                <span style={{ color: C.red, fontWeight: 600 }}>{b.oppose}% oppose</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelHeader({ label, sub, count, action, onAction, compact = false }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: compact ? 0 : 6, flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
      {count != null && <span style={{ fontSize: 10, color: C.faint }}>({count})</span>}
      {sub && <span style={{ fontSize: 10, color: C.faint }}>{sub}</span>}
      {action && (
        <button onClick={onAction} style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          {action}
        </button>
      )}
    </div>
  );
}

function BillRow({ bill, last, onClick }) {
  return (
    <div onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderBottom: last ? "none" : `1px solid ${C.border}`, cursor: "pointer", background: C.white }}
      onMouseEnter={e => e.currentTarget.style.background = C.surface}
      onMouseLeave={e => e.currentTarget.style.background = C.white}>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Chips row */}
        <div style={{ display: "flex", gap: 3, marginBottom: 2, alignItems: "center" }}>
          <StatusChip status={bill.status} />
          <BillTypeChip title={bill.title} />
          {bill.category && (
            <span style={{ fontSize: 9, color: C.faint, marginLeft: 1 }}>{bill.category}</span>
          )}
        </div>
        {/* Title — single line, ellipsis */}
        <div style={{ fontSize: 11, fontWeight: 500, color: C.ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {bill.title}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {bill.hiddenProvisions?.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9, color: C.amber, fontWeight: 600 }}>
            <IconEye size={9} />{bill.hiddenProvisions.length}
          </span>
        )}
        <IconChevron size={10} dir="right" />
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
    const matches = members.filter(m =>
      m.electorate?.toLowerCase().includes(q.toLowerCase()) ||
      m.name?.toLowerCase().includes(q.toLowerCase()) ||
      m.postcodes?.includes(q)
    ).slice(0, 4);
    setResults(matches);
  };

  return (
    <>
      {/* Search */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.paper }}>
          <IconSearch size={12} />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="Postcode or electorate…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: 12, color: C.ink, background: "transparent" }}
          />
        </div>
        <button onClick={lookup} style={{ padding: "7px 12px", borderRadius: RADIUS.control, border: "none", background: C.accent, color: "#fff", fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Find
        </button>
      </div>

      {/* Default: show first few members */}
      {results === null && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: C.faint, marginBottom: 8 }}>
            {savedPostcode ? `Showing results for "${savedPostcode}"` : "Enter postcode to find your MP and Senators"}
          </div>
          {members.slice(0, 5).map(m => <RepRow key={m.id} member={m} onClick={() => onOpenMember(m.id)} />)}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ fontSize: 12, color: C.mid, padding: "8px 0" }}>
              No results for "{input}"
              <button onClick={() => { setResults(null); setInput(""); }} style={{ display: "block", marginTop: 6, fontSize: 11, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Clear</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: C.faint }}>{results.length} found</span>
                <button onClick={() => { setResults(null); setInput(""); }} style={{ fontSize: 10, color: C.accentText, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
              </div>
              {results.map(m => <RepRow key={m.id} member={m} onClick={() => onOpenMember(m.id)} />)}
            </>
          )}
        </div>
      )}
    </>
  );
}

function RepRow({ member, onClick }) {
  const initials = member.name?.split(" ").map(w => w[0]).slice(0, 2).join("") || "?";
  return (
    <div onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      <div style={{ width: 28, height: 28, borderRadius: 99, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accentText, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
        <div style={{ fontSize: 10, color: C.faint }}>{member.role}</div>
      </div>
      <IconChevron size={11} dir="right" />
    </div>
  );
}
