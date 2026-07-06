// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY POLLING & DELIBERATION · v6 redesign
//
// Trust framing for a would-be citable sentiment source:
//   · Every poll shows its n-count and a method link — a percentage without
//     an n is exactly what Poli criticises elsewhere
//   · Button-only voting kept (swipe was already removed — right call)
//   · Vote → result is a single-surface transition: the buttons become the
//     result bar so the layout doesn't jump
//   · AI-clustered deliberation themes are labelled as AI-generated with
//     response counts per cluster
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Card, Button, Chip, SectionLabel, SentimentBar } from "../primitives.jsx";
import { SourceBadge, EmptyState } from "../states.jsx";
import { IconSparkle, IconVote } from "../icons.jsx";

/**
 * @typedef {Object} Poll
 * @property {number} id
 * @property {string} title
 * @property {string} question
 * @property {number} support @property {number} neutral @property {number} oppose
 * @property {number} n            total responses
 * @property {string} [closes]     e.g. "closes in 3 days"
 *
 * @typedef {Object} Cluster
 * @property {string} theme
 * @property {string} summary
 * @property {number} count
 * @property {"support"|"oppose"|"mixed"} lean
 */

/**
 * @param {{ poll: Poll, userVote?: "support"|"neutral"|"oppose"|null,
 *           onVote?: (id: number, pos: string) => void,
 *           dataState?: "live"|"cached"|"sample" }} props
 */
export function PollCard({ poll, userVote = null, onVote, dataState = "sample" }) {
  const [voted, setVoted] = useState(userVote);
  const cast = pos => { setVoted(pos); onVote?.(poll.id, pos); };

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Chip color={C.teal} tone="tint" dot>Live poll</Chip>
        <SourceBadge state={dataState} />
      </div>
      <h3 style={{ ...TYPE.h3, color: C.ink, margin: "0 0 4px" }}>{poll.title}</h3>
      <p style={{ ...TYPE.sm, color: C.mid, margin: "0 0 16px" }}>{poll.question}</p>

      {!voted ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="support" full onClick={() => cast("support")}>Support</Button>
          <Button variant="secondary" full onClick={() => cast("neutral")}>Neutral</Button>
          <Button variant="oppose" full onClick={() => cast("oppose")}>Oppose</Button>
        </div>
      ) : (
        <div>
          <SentimentBar support={poll.support} neutral={poll.neutral} oppose={poll.oppose} height={8} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <Chip color={voted === "support" ? C.green : voted === "oppose" ? C.red : C.mid} tone="tint" dot>
              You voted {voted}
            </Chip>
            <Button variant="ghost" size="sm" onClick={() => cast(null)}>Change</Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11, color: C.faint }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {poll.n.toLocaleString()} responses{poll.closes ? ` · ${poll.closes}` : ""}
        </span>
        <span style={{ color: C.accentText, fontWeight: 600, cursor: "pointer" }}>Methodology</span>
      </div>
    </Card>
  );
}

/**
 * AI-clustered deliberation themes.
 * @param {{ clusters: Cluster[], totalResponses: number, onAddResponse?: () => void }} props
 */
export function DeliberationClusters({ clusters, totalResponses, onAddResponse }) {
  const leanColor = { support: C.green, oppose: C.red, mixed: C.amber };
  return (
    <Card style={{ marginTop: 14 }}>
      <SectionLabel right={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.faint }}>
          <IconSparkle size={12} /> AI-clustered from {totalResponses.toLocaleString()} responses
        </span>
      }>
        What people are saying
      </SectionLabel>

      {!clusters.length ? (
        <EmptyState title="No responses yet" icon={<IconVote size={22} />}
          sub="Be the first to explain your position. Responses are grouped into themes once at least 20 people have written in."
          actionLabel="Write a response" onAction={onAddResponse} />
      ) : (
        <>
          {clusters.map((cl, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: RADIUS.panel, border: `1px solid ${C.border}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: leanColor[cl.lean], flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 650, color: C.ink, flex: 1 }}>{cl.theme}</span>
                <span style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{cl.count} responses</span>
              </div>
              <p style={{ ...TYPE.sm, color: C.mid, margin: 0 }}>{cl.summary}</p>
            </div>
          ))}
          <p style={{ fontSize: 10.5, color: C.faint, margin: "10px 0 0", lineHeight: 1.5 }}>
            Themes are grouped by AI and reviewed before publishing. Individual responses stay anonymous.{" "}
            <span style={{ color: C.accentText, fontWeight: 600, cursor: "pointer" }}>How clustering works</span>
          </p>
          {onAddResponse && <Button variant="secondary" full style={{ marginTop: 12 }} onClick={onAddResponse}>Add your response</Button>}
        </>
      )}
    </Card>
  );
}
