// ─────────────────────────────────────────────────────────────────────────────
// LEARN · THE SYLLABUS · v6.2
//
// The lesson card feed becomes a curriculum front page: units as a numbered
// ledger with progress, expanding in place to their lessons; the glossary
// promoted to a first-class index (it's the future teacher/university
// surface and was buried behind lesson bodies). Progress header stays quiet —
// gamify progress, not content.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS } from "../tokens.js";
import { Kicker, IndexNum, Chip, Button } from "../primitives.jsx";
import { LearnProgress } from "./Learn.jsx";
import { IconChevron, IconLearn } from "../icons.jsx";

/**
 * @typedef {import("./Learn.jsx").Lesson} Lesson
 * @typedef {Object} Unit
 * @property {string} id @property {string} title @property {string} blurb
 * @property {Lesson[]} lessons
 */

/**
 * @param {{ xp: number, streak: number, levels: import("./Learn.jsx").LevelInfo[],
 *           units: Unit[], glossary?: Record<string, string>,
 *           onStartLesson?: (id: string) => void }} props
 */
export function LearnSyllabus({ xp, streak, levels, units, glossary = {}, onStartLesson }) {
  const level = [...levels].reverse().find(l => xp >= l.minXp) || levels[0];
  const nextLevel = levels.find(l => l.level === level.level + 1);
  const [openUnit, setOpenUnit] = useState(units[0]?.id ?? null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const terms = Object.entries(glossary).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <LearnProgress xp={xp} streak={streak} level={level} nextLevel={nextLevel} />
      <div style={{ height: 26 }} />

      <Kicker right={<span style={{ ...TYPE.caption, color: C.faint }}>{units.reduce((s, u) => s + u.lessons.length, 0)} lessons</span>}>
        The syllabus
      </Kicker>

      {units.map((u, i) => {
        const done = u.lessons.filter(l => l.done).length;
        const open = openUnit === u.id;
        const pct = u.lessons.length ? done / u.lessons.length : 0;
        return (
          <div key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => setOpenUnit(open ? null : u.id)} aria-expanded={open} style={{
              display: "flex", gap: 16, alignItems: "flex-start", width: "100%", textAlign: "left",
              padding: "18px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              <IndexNum n={i + 1} size={26} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", ...TYPE.h3, fontSize: 18, color: C.ink, marginBottom: 3 }}>{u.title}</span>
                <span style={{ display: "block", ...TYPE.sm, fontSize: 12.5, color: C.mid, marginBottom: 10 }}>{u.blurb}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, maxWidth: 180, height: 3, borderRadius: 99, background: C.surfaceB, display: "inline-block" }}>
                    <span style={{ display: "block", width: `${pct * 100}%`, height: "100%", background: pct === 1 ? C.green : C.accent, borderRadius: 99 }} />
                  </span>
                  <span style={{ fontSize: 11, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{done}/{u.lessons.length} complete</span>
                </span>
              </span>
              <span style={{ color: C.faint, marginTop: 4 }}><IconChevron size={16} dir={open ? "up" : "down"} /></span>
            </button>

            {open && (
              <div style={{ padding: "0 0 16px 42px" }}>
                {u.lessons.map(l => (
                  <button key={l.id} onClick={() => onStartLesson?.(l.id)} style={{
                    display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
                    padding: "10px 12px", marginBottom: 4, borderRadius: RADIUS.control,
                    background: "transparent", border: `1px solid ${C.border}`,
                    cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s",
                  }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: RADIUS.chip, flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: l.done ? C.greenSoft : C.surface, color: l.done ? C.green : C.mid, fontSize: 12,
                    }}>
                      {l.done ? "✓" : <IconLearn size={13} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.ink }}>{l.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: C.faint, marginTop: 1 }}>{l.minutes} min</span>
                    </span>
                    {typeof l.progress === "number" && !l.done && l.progress > 0 && (
                      <span style={{ fontSize: 10.5, color: C.accentText, fontWeight: 600 }}>{Math.round(l.progress * 100)}%</span>
                    )}
                    <Chip color={C.accentText}>+{l.xp} XP</Chip>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Glossary — first-class index */}
      {terms.length > 0 && (
        <>
          <div style={{ height: 34 }} />
          <Kicker right={<span style={{ ...TYPE.caption, color: C.faint }}>{terms.length} terms</span>}>
            Glossary of parliament
          </Kicker>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", columnGap: 32 }}>
            {(glossaryOpen ? terms : terms.slice(0, 6)).map(([term, def]) => (
              <div key={term} style={{ padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: TYPE.h3.fontFamily, fontSize: 15.5, color: C.ink, marginBottom: 3 }}>{term}</div>
                <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.55 }}>{def}</div>
              </div>
            ))}
          </div>
          {terms.length > 6 && (
            <Button variant="ghost" size="sm" onClick={() => setGlossaryOpen(o => !o)} style={{ marginTop: 12 }}>
              {glossaryOpen ? "Show fewer" : `All ${terms.length} terms`} <IconChevron size={13} dir={glossaryOpen ? "up" : "down"} />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
