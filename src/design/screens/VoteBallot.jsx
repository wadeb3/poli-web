// ─────────────────────────────────────────────────────────────────────────────
// VOTE · THE BALLOT · v6.2
//
// Vote gets its own identity, distinct from Bills: a ballot-paper metaphor.
// Open questions are a numbered ledger (serif index numerals, hairlines,
// button-only voting — vote in place, the buttons become the result bar with
// no layout jump). Declared results sit below as an archive with n-counts.
// The metaphor quietly teaches what a ballot feels like, which is on-mission
// for a civic education product.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Kicker, IndexNum, Chip, Button, SentimentBar } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { IconVote } from "../icons.jsx";

/**
 * @typedef {import("./Polling.jsx").Poll} Poll
 * @typedef {Poll & {closed?: boolean, outcome?: string}} BallotPoll
 */

/**
 * @param {{ polls: BallotPoll[], votes?: Record<number, string>,
 *           onVote?: (id: number, pos: string|null) => void,
 *           dataState?: "live"|"cached"|"sample" }} props
 */
export function VoteBallot({ polls, votes = {}, onVote, dataState = "sample" }) {
  const open = polls.filter(p => !p.closed);
  const closed = polls.filter(p => p.closed);

  return (
    <div>
      <Kicker right={<SourceBadge state={dataState} />}>Open ballot · have your say</Kicker>
      {open.length === 0 ? (
        <EmptyState title="No open questions right now" icon={<IconVote size={22} />}
          sub="New questions open when bills reach second reading. Track a bill to be notified." />
      ) : open.map((p, i) => (
        <BallotEntry key={p.id} n={i + 1} poll={p} vote={votes[p.id] || null} onVote={onVote} />
      ))}

      {closed.length > 0 && (
        <>
          <div style={{ height: 34 }} />
          <Kicker right={<span style={{ ...TYPE.caption, color: C.faint }}>final community sentiment</span>}>
            Declared results
          </Kicker>
          {closed.map(p => (
            <div key={p.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                <span style={{ ...TYPE.h3, fontSize: 13, color: C.ink, flex: 1 }}>{p.title}</span>
                {p.outcome && <Chip color={p.outcome === "Supported" ? C.green : p.outcome === "Opposed" ? C.red : C.mid} tone="tint">{p.outcome}</Chip>}
              </div>
              <SentimentBar support={p.support} neutral={p.neutral} oppose={p.oppose} height={5} />
              <div style={{ fontSize: 10, color: C.faint, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {p.n.toLocaleString()} responses · <span style={{ color: C.accentText, fontWeight: 600, cursor: "pointer" }}>methodology</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** @param {{ n: number, poll: BallotPoll, vote: string|null, onVote?: Function }} props */
function BallotEntry({ n, poll, vote, onVote }) {
  const [localVote, setLocalVote] = useState(vote);
  const cast = pos => { setLocalVote(pos); onVote?.(poll.id, pos); };

  return (
    <div style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
      <IndexNum n={n} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ ...TYPE.h3, fontSize: 14, color: C.ink, margin: "0 0 3px" }}>{poll.title}</h3>
        <p style={{ ...TYPE.sm, color: C.mid, margin: "0 0 14px" }}>{poll.question}</p>

        {!localVote ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="support" size="sm" onClick={() => cast("support")}>Support</Button>
            <Button variant="secondary" size="sm" onClick={() => cast("neutral")}>Neutral</Button>
            <Button variant="oppose" size="sm" onClick={() => cast("oppose")}>Oppose</Button>
            <span style={{ fontSize: 10, color: C.faint, alignSelf: "center" }}>anonymous · one vote per question</span>
          </div>
        ) : (
          <div>
            <SentimentBar support={poll.support} neutral={poll.neutral} oppose={poll.oppose} height={7} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
              <Chip color={localVote === "support" ? C.green : localVote === "oppose" ? C.red : C.mid} tone="tint" dot>
                You voted {localVote}
              </Chip>
              <Button variant="ghost" size="sm" onClick={() => cast(null)}>Change</Button>
            </div>
          </div>
        )}

        <div style={{ fontSize: 10, color: C.faint, marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
          {poll.n.toLocaleString()} responses{poll.closes ? ` · ${poll.closes}` : ""}
        </div>
      </div>
    </div>
  );
}
