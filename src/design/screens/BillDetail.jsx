// ─────────────────────────────────────────────────────────────────────────────
// BILL DETAIL BRIEFING · v6 — full feature parity with v5 PolicyDetail
//
// Five-section tabbed briefing rendered inside an expanded BillCard:
//   Overview      — bill meta, fiscal impact, key provisions, related bills,
//                   sources, prior attempts, donation transparency
//   Hidden in bill— methodology intro, typed/severity-rated provision cards,
//                   Scrutiny Committee citations, "about this analysis"
//   Who's affected— cohort impact grid
//   The debate    — party positions, arguments for/against, sourcing note
//   Parliament    — stage pipeline + full timeline
//
// Data shape identical to POLICIES entries in App.jsx.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, Component } from "react";
import { C, TYPE, RADIUS, FONT, alpha } from "../tokens.js";
import { Chip, PartyChip } from "../primitives.jsx";
import { IconEye, IconExternal } from "../icons.jsx";

const STAGES = ["Introduced", "Second reading", "Committee", "Third reading", "Royal Assent"];

const TYPE_META = {
  unrelated: { label: "Unrelated provision",  color: C.purple, bg: C.purpleSoft },
  expanded:  { label: "Scope expansion",       color: C.amber,  bg: C.amberSoft },
  delegated: { label: "Delegated to Minister", color: C.red,    bg: C.redSoft },
  sunset:    { label: "Removes protection",    color: C.teal,   bg: C.tealSoft },
};
const SEVERITY_META = {
  high:   { label: "High concern",   color: C.red,   border: C.redMid },
  medium: { label: "Medium concern", color: C.amber, border: C.amberMid },
  low:    { label: "Low concern",    color: C.mid,   border: C.border },
};

const Overline = ({ children, color = C.faint, mb = 10 }) => (
  <div style={{ ...TYPE.overline, fontSize: 10, color, marginBottom: mb }}>{children}</div>
);

class BillDetailErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ margin: "14px 0", padding: "16px 18px", background: "#FFF3F3", border: "1px solid #EFCBC4", borderRadius: 8, fontFamily: "monospace", fontSize: 12, color: "#B3372B" }}>
          <strong>BillDetail crashed — error logged below for debugging:</strong>
          <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{this.state.error.message}{"\n"}{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function BillDetail({ bill }) {
  return (
    <BillDetailErrorBoundary>
      <BillDetailInner bill={bill} />
    </BillDetailErrorBoundary>
  );
}

function BillDetailInner({ bill }) {
  const [section, setSection] = useState("overview");
  const hidden = bill.hiddenProvisions || [];
  const highCount = hidden.filter(h => h.severity === "high").length;

  const sections = [
    { id: "overview",   label: "Overview" },
    { id: "hidden",     label: "Hidden in bill", count: hidden.length, alert: highCount > 0 },
    { id: "impact",     label: "Who's affected" },
    { id: "debate",     label: "The debate" },
    { id: "parliament", label: "Parliament" },
  ];

  return (
    <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: RADIUS.card, overflow: "hidden" }}>
      {/* Section tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {sections.map(s => {
          const on = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)} role="tab" aria-selected={on} style={{
              flexShrink: 0, padding: "12px 16px", background: "none", border: "none",
              borderBottom: `2.5px solid ${on ? C.accent : "transparent"}`,
              fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 500,
              color: on ? C.accentText : C.faint, cursor: "pointer", whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 6, transition: "color 0.15s",
            }}>
              {s.label}
              {s.count > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, borderRadius: 99, padding: "0 4px", fontSize: 10, fontWeight: 800, background: s.alert ? C.red : C.amber, color: "#fff" }}>{s.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "18px 20px", background: C.white }}>
        {section === "overview"   && <Overview bill={bill} />}
        {section === "hidden"     && <Hidden hidden={hidden} />}
        {section === "impact"     && <Impact cohorts={bill.cohorts} />}
        {section === "debate"     && <Debate bill={bill} />}
        {section === "parliament" && <Parliament bill={bill} />}
      </div>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function Overview({ bill }) {
  // Build metadata tiles from what we actually have
  const meta = [
    { label: "Introduced by",  value: bill.meta?.sponsor },
    { label: "Chamber",        value: bill.meta?.originating_chamber === "senate" ? "Senate" : bill.meta?.originating_chamber === "representatives" ? "House of Representatives" : bill.meta?.chamber },
    { label: "Introduced",     value: bill.meta?.introducedDate ? new Date(bill.meta.introducedDate).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric" }) : null },
    { label: "Status",         value: bill.status },
    { label: "Act citation",   value: bill.meta?.billNumber?.includes("Act") ? bill.meta.billNumber : null },
    { label: "APH record",     value: bill.meta?.parlinfo_url ? "View on APH" : null, url: bill.meta?.parlinfo_url },
  ].filter(m => m.value);

  return (
    <div>
      {/* Bill metadata grid */}
      {meta.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 20 }}>
          {meta.map(m => (
            <div key={m.label} style={{ background: C.surface, borderRadius: RADIUS.control, padding: "10px 12px" }}>
              <Overline mb={3}>{m.label}</Overline>
              {m.url
                ? <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, fontWeight: 500, textDecoration: "none" }}>{m.value} ↗</a>
                : <div style={{ fontSize: 12, color: C.ink, fontWeight: 500, lineHeight: 1.4 }}>{m.value}</div>
              }
            </div>
          ))}
        </div>
      )}

      {/* Fiscal impact */}
      {bill.fiscal && (
        <div style={{ background: C.accentSoft, border: `1px solid ${C.accentMid}`, borderRadius: RADIUS.panel, padding: "14px 16px", marginBottom: 16 }}>
          <Overline color={C.accentText} mb={8}>Fiscal impact</Overline>
          <div style={{ fontFamily: FONT.display, fontSize: 13, color: C.ink, marginBottom: 4 }}>{bill.fiscal.budgetImpact}</div>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 6 }}>{bill.fiscal.perHousehold}</div>
          <div style={{ fontSize: 10, color: C.faint }}>Source: {bill.fiscal.costSource}</div>
        </div>
      )}

      {/* Key provisions */}
      {bill.provisions?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Overline>Key provisions</Overline>
          {bill.provisions?.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: FONT.display, fontSize: 13, color: C.accentText, flexShrink: 0, width: 20, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* Related legislation */}
      {bill.relatedBills?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Overline mb={8}>Related legislation</Overline>
          {bill.relatedBills?.map((b, i) => (
            <div key={i} style={{ fontSize: 12, color: C.blue, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>{b}</div>
          ))}
        </div>
      )}

      {/* Sources */}
      {bill.sources?.length > 0 && (
        <div>
          <Overline mb={8}>Sources</Overline>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {bill.sources?.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.blue, background: C.blueSoft, border: `1px solid ${C.blueMid}`, padding: "4px 10px", borderRadius: 99, fontWeight: 500, textDecoration: "none" }}>
                {s.label} <IconExternal size={11} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Prior attempts */}
      {bill.priorAttempts?.length > 0 && (
        <div style={{ background: C.purpleSoft, border: `1px solid ${alpha(C.purple, 15)}`, borderRadius: RADIUS.panel, padding: 14, marginTop: 16 }}>
          <Overline color={C.purple}>This has been tried before</Overline>
          {bill.priorAttempts?.map((p, i) => (
            <div key={i} style={{ marginBottom: i < (bill.priorAttempts?.length ?? 0) - 1 ? 12 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{p.year} — {p.title}</div>
              <div style={{ marginBottom: 6 }}>
                <Chip color={p.outcome === "Passed" ? C.green : C.red} tone="tint">{p.outcome}</Chip>
              </div>
              <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.55 }}>{p.notes}</div>
            </div>
          ))}
        </div>
      )}

      {/* Donation transparency — live data coming from AEC scraper */}
      {bill.donations?.length > 0 ? (
        <div style={{ background: C.amberSoft, border: `1px solid ${C.amberMid}`, borderRadius: RADIUS.panel, padding: 14, marginTop: 12 }}>
          <Overline color={C.amber} mb={6}>Donation context</Overline>
          <p style={{ fontSize: 11, color: C.mid, margin: "0 0 10px", lineHeight: 1.5 }}>
            Groups with financial interests in this policy area made the following donations in recent election cycles. Poli shows correlation, not causation.
          </p>
          {bill.donations?.map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < (bill.donations?.length ?? 0) - 1 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{d.donor}</div>
                <div style={{ fontSize: 10, color: C.faint }}>{d.cycle} · to {d.party}</div>
              </div>
              <div style={{ fontSize: 13, color: C.amber, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{d.amount}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: `1px dashed ${C.border}`, borderRadius: RADIUS.panel, padding: "16px 18px", marginTop: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.amberSoft, border: `1px solid ${C.amberMid}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>💰</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Donation transparency — coming soon</div>
            <p style={{ fontSize: 12, color: C.mid, margin: 0, lineHeight: 1.6 }}>
              Poli will surface AEC-disclosed donations from groups with financial interests in this policy area. This helps you understand who funds advocacy around this legislation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HIDDEN IN BILL ────────────────────────────────────────────────────────────
function Hidden({ hidden }) {
  return (
    <div>
      <div style={{ background: C.purpleSoft, border: `1px solid ${alpha(C.purple, 15)}`, borderRadius: RADIUS.panel, padding: "14px 16px", marginBottom: 20 }}>
        <Overline color={C.purple} mb={6}>What is this section?</Overline>
        <p style={{ fontSize: 13, color: C.mid, margin: "0 0 8px", lineHeight: 1.6 }}>
          Bills often contain provisions that go beyond — or are unrelated to — their stated purpose. Poli's AI layer cross-references each bill's operative clauses against its second reading speech to surface provisions that deserve closer attention.
        </p>
        <p style={{ fontSize: 12, color: C.faint, margin: 0 }}>These are flagged, not judged. Draw your own conclusions.</p>
      </div>

      {hidden.length === 0 && (
        <div style={{ background: C.greenSoft, border: `1px solid ${C.greenMid}`, borderRadius: RADIUS.panel, padding: 20, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 13, color: C.green, marginBottom: 6 }}>No significant concerns flagged</div>
          <p style={{ fontSize: 13, color: C.mid, margin: 0, lineHeight: 1.6 }}>This bill's provisions appear consistent with its stated purpose.</p>
        </div>
      )}

      {hidden.map((h, i) => {
        const t = TYPE_META[h.type] || TYPE_META.unrelated;
        const s = SEVERITY_META[h.severity] || SEVERITY_META.low;
        return (
          <div key={i} style={{ border: `1.5px solid ${s.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ background: h.severity === "high" ? C.redSoft : h.severity === "medium" ? C.amberSoft : C.surface, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                <Chip color={t.color} tone="tint">{t.label}</Chip>
                <Chip color={s.color} tone="tint">{s.label}</Chip>
                <span style={{ fontSize: 10, color: C.faint, fontFamily: "monospace" }}>{h.clause}</span>
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 13, color: C.ink, lineHeight: 1.3 }}>{h.title}</div>
            </div>
            <div style={{ padding: "14px 16px", background: C.white }}>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.65, marginBottom: 12 }}>{h.summary}</div>
              <div style={{ background: C.accentSoft, borderLeft: `3px solid ${C.accent}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: h.scrutinyFlag ? 12 : 0 }}>
                <Overline color={C.accentText} mb={4}>Why it matters</Overline>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>{h.whyItMatters}</div>
              </div>
              {h.scrutinyFlag && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: C.surface, borderRadius: RADIUS.chip }}>
                  <span style={{ color: C.blue, marginTop: 1 }}><IconEye size={13} /></span>
                  <div>
                    <Overline mb={2}>Formally flagged by</Overline>
                    <div style={{ fontSize: 12, color: C.blue, fontWeight: 500 }}>{h.scrutinyFlag}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ background: C.surface, borderRadius: RADIUS.control, padding: "12px 14px", marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, marginBottom: 4 }}>About this analysis</div>
        <p style={{ fontSize: 11, color: C.faint, margin: 0, lineHeight: 1.6 }}>
          Provisions are identified by cross-referencing operative bill clauses against the stated purpose in the second reading speech and explanatory memorandum. Senate Scrutiny of Bills Committee references are sourced from published Scrutiny Digests.
        </p>
      </div>
    </div>
  );
}

// ── WHO'S AFFECTED ────────────────────────────────────────────────────────────
function Impact({ cohorts = [] }) {
  const color = d => d === "positive" ? C.green : d === "direct" ? C.accentText : d === "mixed" ? C.amber : d === "none" ? C.faint : C.blue;
  return (
    <div>
      <p style={{ fontSize: 13, color: C.mid, margin: "0 0 16px", lineHeight: 1.6 }}>
        How this policy would affect different groups of Australians, based on the bill's explanatory memorandum and independent modelling.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {cohorts.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: 14, background: C.surface, borderRadius: RADIUS.panel, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <Chip color={color(c.impact)} tone="tint">{c.impact.charAt(0).toUpperCase() + c.impact.slice(1)}</Chip>
            </div>
            <div>
              <div style={{ fontFamily: FONT.display, fontSize: 13, color: C.ink, marginBottom: 4 }}>{c.group}</div>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.55 }}>{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── THE DEBATE ────────────────────────────────────────────────────────────────
function Debate({ bill }) {
  const posColor = p => p === "support" ? C.green : p === "oppose" ? C.red : p === "conditional" ? C.amber : C.blue;
  const posLabel = p => p === "support" ? "Supports" : p === "oppose" ? "Opposes" : p === "conditional" ? "Conditional" : "Mixed";
  return (
    <div>
      {bill.partyPositions?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Overline>Party positions</Overline>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
            {bill.partyPositions?.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", background: C.surface, borderRadius: RADIUS.panel }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                  <PartyChip party={p.party} />
                  <span style={{ fontSize: 10, color: posColor(p.position), fontWeight: 700, paddingLeft: 2 }}>{posLabel(p.position)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.55 }}>{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        <div>
          <Overline color={C.green} mb={8}>Arguments for</Overline>
          {bill.arguments?.for?.map((a, i) => (
            <div key={i} style={{ background: C.greenSoft, border: `1px solid ${C.greenMid}`, borderRadius: RADIUS.control, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.55 }}>{a}</div>
            </div>
          ))}
        </div>
        <div>
          <Overline color={C.red} mb={8}>Arguments against</Overline>
          {bill.arguments?.against?.map((a, i) => (
            <div key={i} style={{ background: C.redSoft, border: `1px solid ${C.redMid}`, borderRadius: RADIUS.control, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.55 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: "10px 14px", background: C.surface, borderRadius: RADIUS.control }}>
        <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5 }}>
          Arguments sourced from Hansard second reading speeches and opposition responses. Poli does not endorse either position.
        </div>
      </div>
    </div>
  );
}

// ── PARLIAMENT ────────────────────────────────────────────────────────────────
function Parliament({ bill }) {
  const cur = bill.currentStageIndex || 0;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Overline mb={12}>Parliamentary pipeline</Overline>
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
          {STAGES.map((stage, i) => {
            const passed = i < cur, current = i === cur;
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: passed ? C.green : current ? C.accent : C.surfaceB, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: passed || current ? "#fff" : C.faint, border: current ? `2px solid ${C.accentDark}` : "none" }}>
                    {passed ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: passed ? C.green : current ? C.accentText : C.faint, fontWeight: current ? 700 : 400, textAlign: "center", maxWidth: 56, lineHeight: 1.3 }}>{stage}</div>
                </div>
                {i < STAGES.length - 1 && <div style={{ width: 20, height: 2, background: i < cur ? C.green : C.border, margin: "0 2px 20px", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      <Overline mb={12}>History</Overline>
      {(bill.timeline || []).map((t, i) => {
        const pending = t.date === "Pending";
        const isLast = i === (bill.timeline?.length ?? 0) - 1;
        return (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, alignSelf: "stretch" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: pending ? C.border : C.accent, marginTop: 3 }} />
              {!isLast && <div style={{ width: 1, background: C.border, flex: 1, minHeight: 20, marginTop: 3 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: pending ? C.faint : C.mid, fontVariantNumeric: "tabular-nums" }}>{t.date}</span>
                <span style={{ fontSize: 10, color: C.faint }}>{t.chamber}</span>
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 13, color: pending ? C.faint : C.ink, marginBottom: 3 }}>{t.stage}</div>
              <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5 }}>{t.note}</div>
            </div>
          </div>
        );
      })}

      <div style={{ background: C.surface, borderRadius: RADIUS.control, padding: "10px 14px", marginTop: 4 }}>
        <div style={{ fontSize: 11, color: C.faint }}>
          Data sourced from Australian Parliament House bills database. Last updated {bill.meta?.lastUpdated}.
        </div>
      </div>
    </div>
  );
}
