// ─────────────────────────────────────────────────────────────────────────────
// LEARN / CIVIC EDUCATION · v6 redesign
//
// The tension: gamification (XP, streaks, levels) vs a "serious, citable"
// product. Resolution — gamify PROGRESS, not CONTENT:
//   · XP, streak and level live in one quiet progress header, styled with the
//     same restrained system as the rest of the app (no confetti, no badges
//     shouting over lesson content)
//   · Lesson cards look like the rest of Poli — the serif title carries the
//     editorial tone; XP is a small chip, not the headline
//   · Level unlocks framed as capability ("unlocks Senator tracker"), which
//     makes XP feel like growing civic competence rather than points
// ─────────────────────────────────────────────────────────────────────────────
import { C, TYPE, RADIUS } from "../tokens.js";
import { Card, Button, Chip, SectionLabel } from "../primitives.jsx";
import { IconLearn, IconChevron } from "../icons.jsx";

/**
 * @typedef {Object} LevelInfo
 * @property {number} level @property {string} label
 * @property {number} minXp @property {number} maxXp
 * @property {string|null} unlock
 *
 * @typedef {Object} Lesson
 * @property {string} id @property {string} title @property {string} blurb
 * @property {number} xp @property {number} minutes
 * @property {boolean} [done] @property {number} [progress] 0–1
 */

/**
 * Quiet progress header.
 * @param {{ xp: number, streak: number, level: LevelInfo, nextLevel?: LevelInfo }} props
 */
export function LearnProgress({ xp, streak, level, nextLevel }) {
  const span = level.maxXp - level.minXp;
  const pct = Math.min(100, Math.round(((xp - level.minXp) / span) * 100));
  return (
    <Card pad="16px 20px">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ ...TYPE.h3, color: C.ink }}>
          Level {level.level} · {level.label}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Chip color={C.accentText} tone="tint">{xp} XP</Chip>
          {streak > 0 && <Chip color={C.amber} tone="tint">{streak}-day streak</Chip>}
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: C.surfaceB, overflow: "hidden" }}
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%`, height: "100%", background: C.accent, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
      {nextLevel && (
        <p style={{ fontSize: 11, color: C.mid, margin: "8px 0 0" }}>
          {level.maxXp - xp} XP to Level {nextLevel.level}
          {nextLevel.unlock && <> — unlocks <strong style={{ fontWeight: 650, color: C.ink }}>{nextLevel.unlock}</strong></>}
        </p>
      )}
    </Card>
  );
}

/**
 * @param {{ lesson: Lesson, onStart?: (id: string) => void }} props
 */
export function LessonCard({ lesson, onStart }) {
  const inProgress = !lesson.done && (lesson.progress || 0) > 0;
  return (
    <Card interactive pad="16px 18px" style={{ marginBottom: 10 }} onClick={() => onStart?.(lesson.id)}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{
          width: 38, height: 38, borderRadius: RADIUS.control, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: lesson.done ? C.greenSoft : C.surface,
          color: lesson.done ? C.green : C.mid,
        }}>
          {lesson.done ? "✓" : <IconLearn size={17} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.h3, fontSize: 13, color: C.ink, marginBottom: 3 }}>{lesson.title}</div>
          <p style={{ ...TYPE.sm, fontSize: 12, color: C.mid, margin: 0 }}>{lesson.blurb}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
            <span style={{ fontSize: 11, color: C.faint }}>{lesson.minutes} min</span>
            <Chip color={C.accentText}>+{lesson.xp} XP</Chip>
            {inProgress && (
              <div style={{ flex: 1, maxWidth: 120, height: 3, borderRadius: 99, background: C.surfaceB }}>
                <div style={{ width: `${(lesson.progress || 0) * 100}%`, height: "100%", background: C.accent, borderRadius: 99 }} />
              </div>
            )}
          </div>
        </div>
        <span style={{ color: C.faint, alignSelf: "center" }}><IconChevron size={16} dir="right" /></span>
      </div>
    </Card>
  );
}

/**
 * Glossary term — inline expandable, used inside lesson bodies and bill text.
 * @param {{ term: string, definition: string }} props
 */
export function GlossaryTerm({ term, definition }) {
  return (
    <span title={definition} tabIndex={0} style={{
      borderBottom: `1.5px dotted ${C.accentText}`, color: C.ink, cursor: "help", fontWeight: 550,
    }}>
      {term}
    </span>
  );
}

/**
 * Learn tab layout.
 * @param {{ xp: number, streak: number, levels: LevelInfo[], lessons: Lesson[],
 *           onStart?: (id: string) => void }} props
 */
export function LearnTab({ xp, streak, levels, lessons, onStart }) {
  const level = [...levels].reverse().find(l => xp >= l.minXp) || levels[0];
  const nextLevel = levels.find(l => l.level === level.level + 1);
  return (
    <div>
      <LearnProgress xp={xp} streak={streak} level={level} nextLevel={nextLevel} />
      <div style={{ marginTop: 20 }}>
        <SectionLabel>Lessons</SectionLabel>
        {lessons.map(l => <LessonCard key={l.id} lesson={l} onStart={onStart} />)}
      </div>
    </div>
  );
}
