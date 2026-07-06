// ─────────────────────────────────────────────────────────────────────────────
// MP / SENATOR PROFILE · v6 redesign
//
// Design intent: this is the screen most likely to be screenshot and shared,
// so it must read as a fair, sourced record — not a scorecard attack.
//   · Alignment score is framed as "based on YOUR votes" with an explicit
//     n-count and a link to method — never presented as an absolute rating
//   · Voting record rows use sentiment colour for the MP's vote only; party
//     identity stays a labelled dot (non-partisan colour rule)
//   · Supabase-backed: loading skeletons + StaleCallout wired in, matching
//     the existing MyMPTab fallback pattern
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS, partyOf } from "../tokens.js";
import { Card, Button, Chip, PartyChip, SectionLabel, Divider } from "../primitives.jsx";
import { SourceBadge, RowSkeleton, StaleCallout, EmptyState } from "../states.jsx";
import { IconExternal, IconInfo, IconPerson } from "../icons.jsx";

/**
 * @typedef {Object} MP
 * @property {string} name
 * @property {string} party
 * @property {string} role          e.g. "Member for Grayndler" | "Senator for NSW"
 * @property {string} [chamber]     "House" | "Senate"
 * @property {string} [since]       e.g. "2013"
 * @property {number} [attendance]  0–100
 * @property {string} [photoUrl]
 *
 * @typedef {Object} VoteRecord
 * @property {string} billTitle
 * @property {"for"|"against"|"abstain"|"absent"} vote
 * @property {string} date
 * @property {boolean} [withParty]   voted with party line
 * @property {"agree"|"disagree"|null} [userAlignment]  vs the user's poll vote
 */

/**
 * Profile header with alignment score.
 * @param {{ mp: MP, alignment?: {score: number, n: number} | null,
 *           dataState?: "live"|"cached"|"sample", onContact?: () => void }} props
 */
export function MPProfileHeader({ mp, alignment, dataState = "live", onContact }) {
  const p = partyOf(mp.party);
  return (
    <Card>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Portrait — initials fallback keeps layout stable without photos */}
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
          {/* Office badges — Minister / Shadow Minister roles */}
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

/**
 * Alignment score vs the user's own poll votes — always caveated.
 * @param {{ score: number, n: number, name: string }} props
 */
export function AlignmentMeter({ score, n, name }) {
  const color = score >= 60 ? C.green : score >= 40 ? C.amber : C.red;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ ...TYPE.stat, fontSize: 34, color }}>{score}%</span>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 600 }}>alignment with your positions</span>
        <span title="Compares this member's chamber votes to positions you've taken in Poli polls. It is not a rating of the member."
          style={{ color: C.faint, cursor: "help", marginLeft: "auto" }}><IconInfo size={14} /></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: C.surfaceB, overflow: "hidden" }}
        role="img" aria-label={`${score} percent alignment across ${n} bills`}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <p style={{ fontSize: 11, color: C.faint, margin: "7px 0 0" }}>
        Based on the {n} bill{n !== 1 ? "s" : ""} you've voted on in Poli, compared against {name}'s recorded chamber votes (Hansard). Not a rating — just where you and they landed on the same questions. <span style={{ color: C.accentText, fontWeight: 600, cursor: "pointer" }}>How this works</span>
      </p>
    </div>
  );
}

/**
 * Voting record list.
 * @param {{ records: VoteRecord[], loading?: boolean, stale?: boolean,
 *           onRetry?: () => void, title?: string }} props
 */
export function VotingRecord({ records, loading = false, stale = false, onRetry, title = "Voting Record" }) {
  const [shown, setShown] = useState(8);
  const visible = records.slice(0, shown);
  const hasMore = records.length > shown;

  return (
    <Card style={{ marginTop: 14 }}>
      <SectionLabel right={<span style={{ fontSize: 10.5, color: C.faint }}>Source: Hansard divisions</span>}>
        {title}
      </SectionLabel>
      {stale && <StaleCallout onRetry={onRetry} />}
      {loading ? (
        <>{[0, 1, 2, 3].map(i => <RowSkeleton key={i} />)}</>
      ) : !records.length ? (
        <EmptyState title="No Recorded Divisions Yet" icon={<IconPerson size={22} />}
          sub="This member hasn't voted in any divisions Poli tracks. New votes appear within a sitting day." />
      ) : (
        <>
          {visible.map((r, i) => <VoteRow key={i} record={r} last={i === visible.length - 1 && !hasMore} />)}
          {hasMore && (
            <button onClick={() => setShown(s => s + 12)}
              style={{
                width: "100%", marginTop: 12, padding: "10px", borderRadius: RADIUS.control,
                border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: C.mid,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceB}
              onMouseLeave={e => e.currentTarget.style.background = C.surface}>
              See {Math.min(12, records.length - shown)} more policy positions ↓
            </button>
          )}
          {shown > 8 && (
            <button onClick={() => setShown(8)}
              style={{ width: "100%", marginTop: 6, padding: "8px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, color: C.faint }}>
              Show less ↑
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function VoteRow({ record, last }) {
  const vote = {
    for:     { label: record.label || "Voted For",     color: C.green, bg: C.greenSoft },
    against: { label: record.label || "Voted Against", color: C.red,   bg: C.redSoft },
    abstain: { label: record.label || "Mixed Record",  color: C.amber, bg: C.amberSoft },
    absent:  { label: record.label || "Not Enough Data", color: C.faint, bg: C.surface },
  }[record.vote] || { label: record.label || record.vote, color: C.faint, bg: C.surface };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {record.billTitle}
        </div>
        <div style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>
          {record.date}
          {record.withParty === false && (
            <span style={{ color: C.purple, fontWeight: 600 }}> · crossed the floor</span>
          )}
        </div>
      </div>
      {record.userAlignment && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: record.userAlignment === "agree" ? C.green : C.red }}>
          {record.userAlignment === "agree" ? "matches you" : "differs from you"}
        </span>
      )}
      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 650, color: vote.color, background: vote.bg, whiteSpace: "nowrap", flexShrink: 0 }}>
        {vote.label}
      </span>
    </div>
  );
}

/**
 * "Said vs did" consistency strip — kept from v5, restyled.
 * @param {{ said: string, did: string, consistent: boolean, source?: string }} props
 */
export function SaidVsDid({ said, did, consistent, source }) {
  return (
    <div style={{ borderRadius: RADIUS.panel, border: `1px solid ${C.border}`, overflow: "hidden", marginTop: 10 }}>
      <div style={{ display: "flex", gap: 0 }}>
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
        {source && <span style={{ fontSize: 10.5, color: C.faint, display: "inline-flex", alignItems: "center", gap: 4 }}>{source} <IconExternal size={11} /></span>}
      </div>
    </div>
  );
}
