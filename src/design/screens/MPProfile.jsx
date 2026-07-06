// ─────────────────────────────────────────────────────────────────────────────
// MP / SENATOR PROFILE · v6.3
// VotingRecord self-fetches from member_votes + enriches with division detail
// and policy context from the divisions + tvfy_policies tables.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { C, TYPE, RADIUS, partyOf } from "../tokens.js";
import { Card, Button, Chip, PartyChip, SectionLabel, Divider } from "../primitives.jsx";
import { SourceBadge, RowSkeleton, StaleCallout, EmptyState } from "../states.jsx";
import { IconExternal, IconInfo, IconPerson } from "../icons.jsx";
import { createClient } from "@supabase/supabase-js";

const _sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 12;

// Division names that are purely procedural — no bill context.
// De-emphasised visually so substantive votes stand out.
const PROCEDURAL_PREFIXES = [
  "business —", "committees —", "quorum", "adjournment",
  "questions without notice", "bills — assent", "address in reply",
  "condolences", "procedural", "points of order",
];
const isProcedural = name =>
  !!name && PROCEDURAL_PREFIXES.some(p => name.toLowerCase().startsWith(p));

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
            ? <img src={mp.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ ...TYPE.h2, color: C.mid }}>{mp.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ ...TYPE.h2, color: C.ink, margin: 0 }}>{mp.name}</h2>
            <PartyChip party={mp.party} showName />
          </div>
          <div style={{ ...TYPE.sm, color: C.mid, marginTop: 4 }}>
            {mp.role}{mp.since ? ` · since ${mp.since}` : ""}
          </div>
          {mp.offices?.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
              {mp.offices.map((o, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: C.blue, background: C.blueSoft, border: `1px solid ${C.blueMid}`, padding: "2px 8px", borderRadius: 999 }}>{o}</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <SourceBadge state={dataState} source="APH / Supabase" />
            {mp.attendance != null && (
              <span style={{ fontSize: 11, color: C.faint }}>
                <span style={{ fontVariantNumeric: "tabular-nums", color: C.ink, fontWeight: 600 }}>{mp.attendance}%</span> attendance
              </span>
            )}
            {mp.rebellions != null && mp.rebellions > 0 && (
              <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ ...TYPE.stat, fontSize: 34, color }}>{score}%</span>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 600 }}>alignment with your positions</span>
        <span title="Compares this member's chamber votes to your Poli poll positions."
          style={{ color: C.faint, cursor: "help", marginLeft: "auto" }}><IconInfo size={14} /></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: C.surfaceB, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <p style={{ fontSize: 11, color: C.faint, margin: "7px 0 0" }}>
        Based on {n} bill{n !== 1 ? "s" : ""} you've voted on in Poli.{" "}
        <span style={{ color: C.accentText, fontWeight: 600, cursor: "pointer" }}>How this works</span>
      </p>
    </div>
  );
}

// ── Voting Record — self-fetching with division context ───────────────────────

export function VotingRecord({ mpId, fallbackRecords = [] }) {
  const [rows, setRows]          = useState([]);
  const [divDetails, setDetails] = useState({});  // division_id → {summary, policy_division_ids}
  const [policies, setPolicies]  = useState({});  // policy_id → name
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState(null);
  const [total, setTotal]        = useState(null);

  const enrichDivisions = (newRows) => {
    const ids = newRows.map(r => r.division_id).filter(Boolean);
    if (!ids.length) return;
    // Batch-fetch division details for these rows
    _sb.from("divisions")
      .select("id, summary, policy_division_ids")
      .in("id", ids)
      .then(({ data: divData }) => {
        if (!divData?.length) return;
        const detailMap = {};
        divData.forEach(d => { detailMap[d.id] = d; });
        setDetails(prev => ({ ...prev, ...detailMap }));
        // Collect all policy IDs and fetch names in one query
        const allPolicyIds = [
          ...new Set(divData.flatMap(d => d.policy_division_ids || []).filter(Boolean))
        ];
        if (!allPolicyIds.length) return;
        _sb.from("tvfy_policies")
          .select("id, name")
          .in("id", allPolicyIds)
          .then(({ data: polData }) => {
            if (!polData?.length) return;
            const polMap = {};
            polData.forEach(p => { polMap[p.id] = p.name; });
            setPolicies(prev => ({ ...prev, ...polMap }));
          });
      });
  };

  const fetchPage = (from, to, append = false) => {
    _sb.from("member_votes")
      .select("division_id, division_name, vote, rebel, division_date, house", { count: "exact" })
      .eq("mp_id", String(mpId))
      .order("division_date", { ascending: false })
      .range(from, to)
      .then(({ data, count, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        const newRows = data || [];
        setRows(r => append ? [...r, ...newRows] : newRows);
        setTotal(count ?? 0);
        setLoading(false);
        enrichDivisions(newRows);
      });
  };

  useEffect(() => {
    if (!mpId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setRows([]); setDetails({}); setPolicies({});
    fetchPage(0, PAGE_SIZE - 1);
  }, [mpId]);

  const useFallback = !loading && !error && rows.length === 0 && fallbackRecords.length > 0;
  const hasMore     = total != null && rows.length < total;
  const source      = useFallback ? "Policy positions · They Vote For You" : "Hansard divisions · They Vote For You";

  return (
    <Card style={{ marginTop: 14 }}>
      <SectionLabel right={
        <span style={{ fontSize: 10.5, color: C.faint }}>
          {!loading && total != null && !useFallback && `${rows.length} of ${total} · `}
          {source}
        </span>
      }>
        Voting Record
      </SectionLabel>

      {loading && <>{[0,1,2,3].map(i => <RowSkeleton key={i} />)}</>}
      {error && <EmptyState title="Couldn't Load Voting Record" icon={<IconPerson size={22} />} sub={`Database error: ${error}`} />}
      {!loading && !error && rows.length === 0 && fallbackRecords.length === 0 && (
        <EmptyState title="No Recorded Divisions Yet" icon={<IconPerson size={22} />}
          sub="This member hasn't voted in any divisions Poli tracks. New votes appear after the next sync." />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {rows.map((r, i) => (
            <DivisionRow key={`${r.division_id}-${i}`} row={r}
              detail={divDetails[r.division_id]}
              policies={policies}
              last={i === rows.length - 1 && !hasMore} />
          ))}
          {hasMore && (
            <button onClick={() => fetchPage(rows.length, rows.length + PAGE_SIZE - 1, true)}
              style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.mid }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceB}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}>
              Load {Math.min(PAGE_SIZE, total - rows.length)} more · {total - rows.length} remaining ↓
            </button>
          )}
        </>
      )}

      {useFallback && (
        <>
          <div style={{ padding: "8px 0 10px", borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>
              Showing policy-level summaries — individual division votes loading after next sync
            </span>
          </div>
          <FallbackList records={fallbackRecords} />
        </>
      )}
    </Card>
  );
}

// ── Division row ──────────────────────────────────────────────────────────────

function DivisionRow({ row, detail, policies, last }) {
  const isAye      = row.vote === "aye";
  const procedural = isProcedural(row.division_name);
  const voteStyle  = isAye
    ? { label: "Voted Aye", color: C.green, bg: C.greenSoft }
    : { label: "Voted No",  color: C.red,   bg: C.redSoft   };

  const date    = row.division_date
    ? new Date(row.division_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const chamber = row.house === "senate" ? "Senate" : "House";

  // Policy context: names of policies this division relates to
  const policyIds   = detail?.policy_division_ids || [];
  const policyNames = policyIds.map(id => policies[id]).filter(Boolean);

  // Hansard summary — trim to ~120 chars for readability
  const summary = detail?.summary
    ? (detail.summary.length > 120 ? detail.summary.slice(0, 120).trimEnd() + "…" : detail.summary)
    : null;

  return (
    <div style={{
      padding: "12px 0",
      borderBottom: last ? "none" : `1px solid ${C.border}`,
      opacity: procedural ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.division_name}
          </div>

          {/* Policy context — what bill/policy area this division relates to */}
          {policyNames.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 5 }}>
              {policyNames.map((name, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: C.accentText, background: C.accentSoft, border: `1px solid ${C.accentMid}`, padding: "1px 7px", borderRadius: 4 }}>
                  {name}
                </span>
              ))}
            </div>
          )}

          {/* Hansard summary excerpt */}
          {summary && !procedural && (
            <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.5, marginBottom: 5 }}>
              {summary}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{date}</span>
            <span style={{ fontSize: 10, color: C.faint, background: C.surface, border: `1px solid ${C.border}`, padding: "1px 6px", borderRadius: 4 }}>{chamber}</span>
            {procedural && (
              <span style={{ fontSize: 10, color: C.faint, fontStyle: "italic" }}>procedural</span>
            )}
            {row.rebel && (
              <span style={{ fontSize: 10, fontWeight: 700, color: C.purple, background: `${C.purple}12`, border: `1px solid ${C.purple}28`, padding: "1px 6px", borderRadius: 4 }}>
                crossed the floor
              </span>
            )}
          </div>
        </div>

        <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 650, color: voteStyle.color, background: voteStyle.bg, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
          {voteStyle.label}
        </span>
      </div>
    </div>
  );
}

// ── Fallback list (policy_positions summary) ──────────────────────────────────

function FallbackList({ records }) {
  const [shown, setShown] = useState(8);
  const visible = records.slice(0, shown);
  const hasMore = records.length > shown;
  return (
    <>
      {visible.map((r, i) => (
        <PolicyRow key={i} record={r} last={i === visible.length - 1 && !hasMore} />
      ))}
      {hasMore && (
        <button onClick={() => setShown(s => s + 12)} style={{ width: "100%", marginTop: 12, padding: "10px", borderRadius: RADIUS.control, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.mid }}>
          See {Math.min(12, records.length - shown)} more ↓
        </button>
      )}
    </>
  );
}

function PolicyRow({ record, last }) {
  const vote = {
    for:     { label: record.label || "Voted For",       color: C.green, bg: C.greenSoft },
    against: { label: record.label || "Voted Against",   color: C.red,   bg: C.redSoft   },
    abstain: { label: record.label || "Mixed Record",    color: C.amber, bg: C.amberSoft  },
    absent:  { label: record.label || "Not Enough Data", color: C.faint, bg: C.surface    },
  }[record.vote] || { label: record.vote, color: C.faint, bg: C.surface };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.billTitle}</div>
        <span style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{record.date}</span>
      </div>
      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 650, color: vote.color, background: vote.bg, whiteSpace: "nowrap", flexShrink: 0 }}>
        {vote.label}
      </span>
    </div>
  );
}

// ── Said vs Did ───────────────────────────────────────────────────────────────

export function SaidVsDid({ said, did, consistent, source }) {
  return (
    <div style={{ borderRadius: RADIUS.panel, border: `1px solid ${C.border}`, overflow: "hidden", marginTop: 10 }}>
      <div style={{ display: "flex" }}>
        <div style={{ flex: 1, padding: "12px 14px", borderRight: `1px solid ${C.border}` }}>
          <div style={{ ...TYPE.overline, fontSize: 10, color: C.faint, marginBottom: 5 }}>Said</div>
          <p style={{ ...TYPE.sm, color: C.ink, margin: 0, fontStyle: "italic" }}>"{said}"</p>
        </div>
        <div style={{ flex: 1, padding: "12px 14px" }}>
          <div style={{ ...TYPE.overline, fontSize: 10, color: C.faint, marginBottom: 5 }}>Did</div>
          <p style={{ ...TYPE.sm, color: C.ink, margin: 0 }}>{did}</p>
        </div>
      </div>
      <div style={{ padding: "7px 14px", background: consistent ? C.greenSoft : C.amberSoft, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 650, color: consistent ? C.green : C.amber }}>
          {consistent ? "Consistent" : "Inconsistent"}
        </span>
        {source && (
          <span style={{ fontSize: 10.5, color: C.faint, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {source} <IconExternal size={11} />
          </span>
        )}
      </div>
    </div>
  );
}
