// ─────────────────────────────────────────────────────────────────────────────
// MP / SENATOR PROFILE · v6.5
//
// Voting record architecture:
//   PRIMARY layer  — policy_positions (TVFY policy summaries, one row per
//                    policy area, scanned at a glance)
//   EVIDENCE layer — member_votes (individual Hansard divisions, shown
//                    in an expandable panel beneath each policy row)
//
// This gives users:
//   1. A scannable "where do they stand" list across many policy areas
//   2. The ability to drill into the specific votes that support each position
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { C, TYPE, RADIUS, partyOf } from "../tokens.js";
import { Card, Button, Chip, PartyChip, SectionLabel, Divider } from "../primitives.jsx";
import { SourceBadge, RowSkeleton, StaleCallout, EmptyState } from "../states.jsx";
import { IconExternal, IconInfo, IconPerson, IconChevron } from "../icons.jsx";
import { createClient } from "@supabase/supabase-js";

const _sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Profile header ────────────────────────────────────────────────────────────

export function MPProfileHeader({ mp, alignment, dataState = "live", onContact }) {
  const p = partyOf(mp.party);
  return (
    <Card>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 99, flexShrink: 0, overflow: "hidden",
          background: C.surface, border: `2px solid ${p.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {mp.photoUrl
            ? <img src={mp.photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ ...TYPE.h2, color: C.mid }}>{mp.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <h2 style={{ ...TYPE.h2, color: C.ink, margin: 0 }}>{mp.name}</h2>
            <PartyChip party={mp.party} showName />
          </div>
          <div style={{ ...TYPE.sm, color: C.mid, marginTop: 4 }}>
            {mp.role}{mp.since ? ` · since ${mp.since}` : ""}
          </div>
          {mp.offices?.length > 0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
              {mp.offices.map((o,i) => (
                <span key={i} style={{ fontSize:10, fontWeight:600, color:C.blue, background:C.blueSoft, border:`1px solid ${C.blueMid}`, padding:"2px 8px", borderRadius:999 }}>{o}</span>
              ))}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8, flexWrap:"wrap" }}>

            {mp.attendance != null && (
              <span style={{ fontSize:11, color:C.faint }}>
                <span style={{ fontVariantNumeric:"tabular-nums", color:C.ink, fontWeight:600 }}>{mp.attendance}%</span> attendance
              </span>
            )}
            {mp.rebellions != null && mp.rebellions > 0 && (
              <span style={{ fontSize:11, color:C.amber, fontWeight:600 }}>
                {mp.rebellions} party rebellion{mp.rebellions !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {onContact && <Button variant="primary" size="sm" onClick={onContact}>Contact</Button>}
      </div>
      {alignment && (
        <>
          <Divider my={16} />
          <AlignmentMeter score={alignment.score} n={alignment.n} name={mp.name.split(" ")[0]} />
        </>
      )}
    </Card>
  );
}

export function AlignmentMeter({ score, n, name }) {
  const color = score >= 60 ? C.green : score >= 40 ? C.amber : C.red;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:8 }}>
        <span style={{ ...TYPE.stat, fontSize:34, color }}>{score}%</span>
        <span style={{ fontSize:12.5, color:C.ink, fontWeight:600 }}>alignment with your positions</span>
        <span title="Compares this member's chamber votes to your Poli poll positions."
          style={{ color:C.faint, cursor:"help", marginLeft:"auto" }}><IconInfo size={14} /></span>
      </div>
      <div style={{ height:6, borderRadius:99, background:C.surfaceB, overflow:"hidden" }}>
        <div style={{ width:`${score}%`, height:"100%", background:color, borderRadius:99 }} />
      </div>
      <p style={{ fontSize:11, color:C.faint, margin:"7px 0 0" }}>
        Based on {n} bill{n !== 1 ? "s" : ""} you've voted on in Poli.{" "}
        <span style={{ color:C.accentText, fontWeight:600, cursor:"pointer" }}>How this works</span>
      </p>
    </div>
  );
}

// ── Voting Record ─────────────────────────────────────────────────────────────
// Primary display: policy_positions (one row per policy area, scanned at a glance)
// Evidence layer:  member_votes divisions fetched on demand when a row is expanded

export function VotingRecord({ mpId, fallbackRecords = [] }) {
  const THIS_YEAR = new Date().getFullYear();
  const YEAR_BUCKETS = [
    { label: String(THIS_YEAR),       key: "y0", test: r => r.year === THIS_YEAR },
    { label: String(THIS_YEAR - 1),   key: "y1", test: r => r.year === THIS_YEAR - 1 },
    { label: String(THIS_YEAR - 2),   key: "y2", test: r => r.year === THIS_YEAR - 2 },
    { label: "Older",                 key: "old", test: r => !r.year || r.year < THIS_YEAR - 2 },
  ];

  const [activeYear, setActiveYear] = useState("y0");
  const [shown, setShown] = useState(10);

  // Reset when switching members
  useEffect(() => { setActiveYear("y0"); setShown(10); }, [mpId]);

  const bucket     = YEAR_BUCKETS.find(b => b.key === activeYear) || YEAR_BUCKETS[0];
  const filtered   = fallbackRecords.filter(bucket.test);
  const visible    = filtered.slice(0, shown);
  const hasMore    = filtered.length > shown;

  // Reset pagination when year changes
  const handleYear = (key) => { setActiveYear(key); setShown(10); };
  const counts = {};
  YEAR_BUCKETS.forEach(b => { counts[b.key] = fallbackRecords.filter(b.test).length; });

  if (!fallbackRecords.length) return (
    <Card style={{ marginTop: 14 }}>
      <SectionLabel right={<span style={{ fontSize: 10.5, color: C.faint }}>They Vote For You</span>}>
        Voting Record
      </SectionLabel>
      <EmptyState title="No Policy Positions Yet" icon={<IconPerson size={22} />}
        sub="Voting positions will appear once this member has been synced." />
    </Card>
  );

  return (
    <Card style={{ marginTop: 14 }}>
      <SectionLabel right={
        <span style={{ fontSize: 10.5, color: C.faint }}>
          {fallbackRecords.length} policy positions · They Vote For You
        </span>
      }>
        Voting Record
      </SectionLabel>

      {/* Year filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {YEAR_BUCKETS.map(b => {
          const active = activeYear === b.key;
          const count  = counts[b.key];
          return (
            <button key={b.key} onClick={() => handleYear(b.key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 99, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${active ? C.accent : C.border}`,
                background: active ? C.accentSoft : C.white,
                color: active ? C.accent : C.mid,
                transition: "all 0.15s",
                opacity: count === 0 ? 0.4 : 1,
              }}>
              {b.label}
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? C.accent : C.faint }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: C.faint, fontStyle: "italic" }}>
          No policy positions for {bucket.label} — try another year.
        </div>
      ) : (
        <>
          {visible.map((r, i) => (
            <PolicyRow key={`${mpId}-${r.policyId}-${i}`} record={r} mpId={mpId}
              last={i === visible.length - 1 && !hasMore} />
          ))}
          {hasMore && (
            <button onClick={() => setShown(s => s + 10)}
              style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.mid }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceB}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}>
              Show {Math.min(10, filtered.length - shown)} more ↓
            </button>
          )}
        </>
      )}
    </Card>
  );
}

// Strip markdown from Hansard summaries — links, headers, bold etc.
const stripMarkdown = text =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,4}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/>\s*/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();

function DivisionDetailRow({ d }) {
  const isAye = d.vote === "aye";
  const dDate = d.date
    ? new Date(d.date).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric" })
    : "";

  // Use pre-generated plain summary if available (stored in divisions.summary_plain
  // by sync_tvfy.py), otherwise strip markdown and truncate the raw Hansard text.
  const displaySummary = d.summary_plain
    ? d.summary_plain
    : d.summary
      ? stripMarkdown(d.summary).slice(0, 180).trimEnd() + (d.summary.length > 180 ? "…" : "")
      : null;

  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.borderDark}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.ink, marginBottom:3 }}>{d.name}</div>
        {displaySummary && (
          <div style={{ fontSize:11, color:C.mid, lineHeight:1.5, marginBottom:4 }}>{displaySummary}</div>
        )}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:10, color:C.faint, fontVariantNumeric:"tabular-nums" }}>{dDate}</span>
          <span style={{ fontSize:10, color:C.faint, background:C.white, border:`1px solid ${C.border}`, padding:"1px 5px", borderRadius:3 }}>
            {d.house === "senate" ? "Senate" : "House"}
          </span>
          {d.rebel && (
            <span style={{ fontSize:10, fontWeight:700, color:C.purple }}>crossed the floor</span>
          )}
        </div>
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:isAye ? C.green : C.red, background:isAye ? C.greenSoft : C.redSoft, padding:"2px 8px", borderRadius:99, flexShrink:0, marginTop:2 }}>
        {isAye ? "Aye" : "No"}
      </span>
    </div>
  );
}

function PolicyRow({ record, mpId, last }) {
  const [open, setOpen]         = useState(false);
  const [divisions, setDivs]    = useState(null);  // null = not yet fetched
  const [loading, setLoading]   = useState(false);

  // Map our vote value back to a policy_id for querying member_votes via policy
  // Note: record.policyId should be stored — if not we fall back to name match
  const fetchDivisions = () => {
    if (divisions !== null || !mpId) return; // already fetched
    setLoading(true);

    // Query member_votes for this MP, filtering by division names that contain
    // the policy name keywords — best available join without a policy_id on the row
    // We fetch all their votes, then filter client-side by policy_division_ids
    // matching this policy's id if available, otherwise show the most recent 10.
    const policyId = record.policyId != null ? String(record.policyId) : null;

    if (policyId) {
      // divisions.policy_division_ids stores IDs as strings e.g. ["202"].
      // We try the string form first. If the existing data has integer IDs in
      // the jsonb (from before the sync fix), the contains query won't match —
      // in that case re-sync with --mps to fix the stored types.
      _sb.from("divisions")
        .select("id, name, date, summary, summary_plain, aye_votes, no_votes, house")
        .filter("policy_division_ids", "cs", `["${policyId}"]`)
        .order("date", { ascending: false })
        .limit(20)
        .then(({ data: divData }) => {
          if (!divData?.length) { setDivs([]); setLoading(false); return; }
          const divIds = divData.map(d => d.id);
          _sb.from("member_votes")
            .select("division_id, vote, rebel, division_date, division_name, house")
            .eq("mp_id", String(mpId))
            .in("division_id", divIds)
            .order("division_date", { ascending: false })
            .then(({ data: voteData }) => {
              // Merge vote data with division detail
              const voteMap = {};
              (voteData || []).forEach(v => { voteMap[v.division_id] = v; });
              const merged = divData
                .filter(d => voteMap[d.id]) // only show divisions this MP voted in
                .map(d => ({ ...d, vote: voteMap[d.id]?.vote, rebel: voteMap[d.id]?.rebel }));
              setDivs(merged);
              setLoading(false);
            });
        });
    } else {
      // No policy_id — just show a note
      setDivs([]);
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) fetchDivisions();
    setOpen(o => !o);
  };

  const vote = {
    for:     { label: record.label || "Voted For",        color: C.green, bg: C.greenSoft },
    against: { label: record.label || "Voted Against",    color: C.red,   bg: C.redSoft   },
    abstain: { label: record.label || "Mixed Record",     color: C.amber, bg: C.amberSoft  },
    absent:  { label: record.label || "Not Enough Data",  color: C.faint, bg: C.surface    },
  }[record.vote] || { label: record.vote, color: C.faint, bg: C.surface };

  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      {/* Primary row */}
      <div onClick={handleToggle}
        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", cursor:"pointer" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {record.billTitle}
          </div>
          <span style={{ fontSize:11, color:C.faint, fontVariantNumeric:"tabular-nums" }}>{record.date}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:650, color:vote.color, background:vote.bg, whiteSpace:"nowrap" }}>
            {vote.label}
          </span>
          <span style={{ color:C.faint, display:"flex", alignItems:"center" }}>
            <IconChevron size={14} dir={open ? "up" : "down"} />
          </span>
        </div>
      </div>

      {/* Expandable Hansard evidence */}
      {open && (
        <div style={{ margin:"0 0 12px", padding:"12px 14px", background:C.surface, borderRadius:RADIUS.panel, borderLeft:`3px solid ${vote.color}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
            Hansard divisions backing this position
          </div>

          {loading && (
            <div style={{ fontSize:12, color:C.faint }}>Loading divisions…</div>
          )}

          {!loading && divisions !== null && divisions.length === 0 && (
            <div style={{ fontSize:12, color:C.faint, fontStyle:"italic" }}>
              No Hansard divisions linked to this policy area yet — TVFY connects divisions to policies over time as they curate their data.
            </div>
          )}

          {!loading && divisions?.length > 0 && divisions.map((d, i) => (
            <DivisionDetailRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Said vs Did ───────────────────────────────────────────────────────────────

export function SaidVsDid({ said, did, consistent, source }) {
  return (
    <div style={{ borderRadius:RADIUS.panel, border:`1px solid ${C.border}`, overflow:"hidden", marginTop:10 }}>
      <div style={{ display:"flex" }}>
        <div style={{ flex:1, padding:"12px 14px", borderRight:`1px solid ${C.border}` }}>
          <div style={{ ...TYPE.overline, fontSize:10, color:C.faint, marginBottom:5 }}>Said</div>
          <p style={{ ...TYPE.sm, color:C.ink, margin:0, fontStyle:"italic" }}>"{said}"</p>
        </div>
        <div style={{ flex:1, padding:"12px 14px" }}>
          <div style={{ ...TYPE.overline, fontSize:10, color:C.faint, marginBottom:5 }}>Did</div>
          <p style={{ ...TYPE.sm, color:C.ink, margin:0 }}>{did}</p>
        </div>
      </div>
      <div style={{ padding:"7px 14px", background:consistent ? C.greenSoft : C.amberSoft, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:650, color:consistent ? C.green : C.amber }}>
          {consistent ? "Consistent" : "Inconsistent"}
        </span>
        {source && (
          <span style={{ fontSize:10.5, color:C.faint, display:"inline-flex", alignItems:"center", gap:4 }}>
            {source} <IconExternal size={11} />
          </span>
        )}
      </div>
    </div>
  );
}
