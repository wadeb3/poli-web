// ─────────────────────────────────────────────────────────────────────────────
// COMMAND PALETTE · Cmd/Ctrl+K global search · v6.2
//
// One box that reaches everything: bills, members, electorates, glossary
// terms, pages. For a reference product this changes the relationship, a
// novice types their suburb, a journalist types a bill number, both land in
// two keystrokes. Zero dependencies; simple token matching (every query word
// must appear in title+sub) which is predictable and fast at this data size.
//
// Usage:
//   const [open, setOpen] = usePaletteShortcut();
//   <CommandPalette open={open} onClose={() => setOpen(false)} items={items} />
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { C, TYPE, RADIUS, SHADOW } from "./tokens.js";
import { IconSearch } from "./icons.jsx";

/**
 * @typedef {Object} PaletteItem
 * @property {string} id
 * @property {"bill"|"member"|"electorate"|"glossary"|"page"} type
 * @property {string} title
 * @property {string} [sub]      secondary line, also searched
 * @property {() => void} onSelect
 */

export const PALETTE_TYPE_STYLE = {
  bill:       { label: "Bill",       color: C.accentText },
  member:     { label: "Member",     color: C.teal },
  electorate: { label: "Electorate", color: C.blue },
  glossary:   { label: "Glossary",   color: C.purple },
  page:       { label: "Go to",      color: C.mid },
};

/**
 * The one matching implementation for "search everything", used by both the
 * ⌘K modal and any inline dropdown (e.g. HomeFront's search hero), so there's
 * exactly one place that defines what counts as a match.
 * @param {PaletteItem[]} items
 * @param {string} query
 * @param {number} maxResults
 * @returns {PaletteItem[]}
 */
export function filterPaletteItems(items, query, maxResults = 9) {
  const q = query.trim().toLowerCase();
  if (!q) return items.filter(i => i.type === "page").slice(0, maxResults);
  const words = q.split(/\s+/);
  return items
    .filter(i => { const hay = `${i.title} ${i.sub || ""}`.toLowerCase(); return words.every(w => hay.includes(w)); })
    .slice(0, maxResults);
}

/** Global ⌘K / Ctrl+K listener. @returns {[boolean, Function]} */
export function usePaletteShortcut() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return [open, setOpen];
}

/**
 * @param {{ open: boolean, onClose: () => void, items: PaletteItem[], maxResults?: number, initialQuery?: string }} props
 */
export function CommandPalette({ open, onClose, items, maxResults = 9, initialQuery = "" }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => filterPaletteItems(items, query, maxResults), [items, query, maxResults]);

  useEffect(() => { setCursor(0); }, [query, open]);
  useEffect(() => { if (open) { setQuery(initialQuery); setTimeout(() => inputRef.current?.focus(), 10); } }, [open, initialQuery]);

  if (!open) return null;

  const pick = item => { onClose(); item.onSelect(); };
  const onKey = e => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && results[cursor]) pick(results[cursor]);
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Search Poli" style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "color-mix(in srgb, var(--poli-ink) 32%, transparent)",
      display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "14vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(580px, calc(100vw - 32px))", background: C.white,
        border: `1px solid ${C.borderDark}`, borderRadius: RADIUS.card,
        boxShadow: SHADOW.overlay, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.faint }}><IconSearch size={17} /></span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey}
            placeholder="Search bills, members, electorates, terms…"
            aria-label="Search" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: C.ink }} />
          <kbd style={{ fontSize: 10, color: C.faint, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 6px", fontFamily: "inherit" }}>esc</kbd>
        </div>

        <div role="listbox" style={{ maxHeight: 380, overflowY: "auto", padding: "6px 0" }}>
          {results.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center" }}>
              <div style={{ ...TYPE.h3, fontSize: 16, color: C.ink, marginBottom: 4 }}>Nothing found</div>
              <div style={{ fontSize: 12, color: C.faint }}>Try a bill topic, a member's name, or a postcode.</div>
            </div>
          ) : results.map((r, i) => {
            const t = PALETTE_TYPE_STYLE[r.type] || PALETTE_TYPE_STYLE.page;
            const on = i === cursor;
            return (
              <button key={r.id} role="option" aria-selected={on}
                onClick={() => pick(r)} onMouseEnter={() => setCursor(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                  padding: "10px 18px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: on ? C.accentSoft : "transparent",
                  boxShadow: on ? `inset 3px 0 0 ${C.accent}` : "none",
                }}>
                <span style={{ ...TYPE.overline, fontSize: 9, color: t.color, width: 68, flexShrink: 0 }}>{t.label}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 550, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                  {r.sub && <span style={{ display: "block", fontSize: 11, color: C.faint, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</span>}
                </span>
                {on && <span style={{ fontSize: 10, color: C.faint }}>↵</span>}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "8px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 14, fontSize: 10.5, color: C.faint }}>
          <span>↑↓ navigate</span><span>↵ open</span><span style={{ marginLeft: "auto" }}>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
