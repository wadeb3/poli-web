// ─────────────────────────────────────────────────────────────────────────────
// POLI NAVIGATION · v6
//
// One config, two renderers — the fix for "sidebar and bottom bar feel like
// two products" is a single NAV source of truth consumed by both, so labels,
// order, icons and active logic can never drift.
//
// IA decisions:
//   · 6 primary tabs KEPT (the 11→6 consolidation was right)
//   · Mobile bottom bar gains 10px LABELS — icon-only is the wrong trade for
//     an app whose core audience is civic novices; "Parliament" has no
//     universally understood glyph
//   · Desktop: sub-sections render as an indented tree under the active tab
//     (persistent orientation), replacing the floating sub-pill row which on
//     desktop read as filters, not navigation. Mobile keeps sub-pills under
//     the top bar — correct pattern for thumb reach.
//   · Active state = accentSoft fill + 3px terracotta rail. This is one of
//     the few places terracotta appears at rest, which keeps it meaningful.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, TYPE, RADIUS, LAYOUT } from "./tokens.js";
import { Logo, LogoMark } from "./Logo.jsx";
import { IconHome, IconBill, IconParliament, IconPerson, IconVote, IconLearn, IconChevron } from "./icons.jsx";

/**
 * @typedef {Object} NavItem
 * @property {string} id
 * @property {string} label
 * @property {(p: {size?: number}) => JSX.Element} Icon
 * @property {{id: string, label: string}[]} [subs]
 */

/** @type {NavItem[]} — single source of truth for both renderers */
export const NAV = [
  { id: "home",       label: "Home",       Icon: IconHome },
  { id: "bills",      label: "Bills",      Icon: IconBill,
    subs: [{ id: "tracker", label: "Bill tracker" }, { id: "budget", label: "Budget" }, { id: "alerts", label: "My alerts" }] },
  { id: "parliament", label: "Parliament", Icon: IconParliament,
    subs: [{ id: "map", label: "Chamber map" }, { id: "cabinet", label: "Cabinet" }] },
  { id: "mymp",       label: "Parties",    Icon: IconPerson,
    subs: [{ id: "mp", label: "Representatives" }, { id: "parties", label: "Parties" }, { id: "donations", label: "Party Donations" }, { id: "thirds", label: "Third Parties" }] },
  { id: "vote",       label: "Vote",       Icon: IconVote,
    subs: [{ id: "polls", label: "Live polls" }, { id: "deliberate", label: "Deliberation" }] },
  { id: "learn",      label: "Learn",      Icon: IconLearn },
];

/**
 * Desktop persistent sidebar. Expands to 240px with labels + sub-tree, or
 * collapses to a 68px icon rail — the same glyph language as the mobile
 * bottom bar, so the two chrome patterns read as one system. Collapse state
 * persists in localStorage.
 * @param {{ active: string, activeSub?: string,
 *           onNavigate: (tab: string, sub?: string) => void,
 *           footer?: React.ReactNode,
 *           footerCollapsed?: React.ReactNode }} props
 *   footer          — rendered at the base when expanded
 *   footerCollapsed — compact variant when collapsed (e.g. just a ThemeToggle)
 */
export function Sidebar({ active, activeSub, onNavigate, footer, footerCollapsed }) {
  const [collapsed, setCollapsed] = useState(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("poli-sidebar") === "collapsed"
  );
  const toggle = () => setCollapsed(c => {
    localStorage.setItem("poli-sidebar", c ? "open" : "collapsed");
    return !c;
  });

  return (
    <nav aria-label="Primary" style={{
      width: collapsed ? LAYOUT.sidebarCollapsed : "clamp(200px, 18vw, 280px)",
      flexShrink: 0, position: "sticky", top: 0,
      height: "100vh", display: "flex", flexDirection: "column",
      background: C.paper, borderRight: `1px solid ${C.border}`,
      padding: collapsed ? "18px 10px 16px" : "22px 12px 16px", boxSizing: "border-box",
      transition: "width 0.22s ease, padding 0.22s ease", overflow: "hidden",
    }}>
      {/* Header: wordmark expanded, mark collapsed; collapse toggle */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexDirection: collapsed ? "column" : "row", gap: collapsed ? 10 : 0,
        padding: collapsed ? "0 0 18px" : "0 4px 22px 12px",
      }}>
        <button onClick={() => onNavigate("home")} aria-label="Poli home"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          {collapsed ? <LogoMark size={26} /> : <Logo size={30} />}
        </button>
        <button onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: RADIUS.chip, cursor: "pointer",
            background: "transparent", border: `1px solid ${C.border}`, color: C.faint,
          }}>
          <IconChevron size={14} dir={collapsed ? "right" : "left"} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map(item => {
          const isActive = active === item.id;
          return (
            <div key={item.id}>
              <SidebarRow
                label={item.label} Icon={item.Icon} active={isActive} collapsed={collapsed}
                onClick={() => onNavigate(item.id, item.subs?.[0]?.id)}
              />
              {isActive && item.subs && !collapsed && (
                <div style={{ margin: "2px 0 6px 34px", borderLeft: `1px solid ${C.border}` }}>
                  {item.subs.map(s => {
                    const subActive = activeSub === s.id;
                    return (
                      <button key={s.id} onClick={() => onNavigate(item.id, s.id)}
                        aria-current={subActive ? "true" : undefined}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "7px 12px", background: "none", cursor: "pointer",
                          border: "none",
                          borderLeft: `2px solid ${subActive ? C.accent : "transparent"}`,
                          marginLeft: -1.5, fontFamily: "inherit",
                          fontSize: 12.5, fontWeight: subActive ? 600 : 500,
                          color: subActive ? C.ink : C.mid,
                        }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: collapsed ? "12px 0 0" : "12px 12px 0", borderTop: `1px solid ${C.border}`, display: collapsed ? "flex" : "block", justifyContent: "center" }}>
        {collapsed ? (footerCollapsed || null) : (footer || (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={16} color={C.faint} dotColor={C.faint} />
            <span style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.4 }}>
              Independent & non-partisan.<br />No ads. Method disclosed.
            </span>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** @param {{ label: string, Icon: Function, active: boolean, collapsed?: boolean, onClick: () => void }} props */
function SidebarRow({ label, Icon, active, collapsed = false, onClick }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined}
      aria-label={label} title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "12px 0" : "10px 12px", marginBottom: 2, borderRadius: RADIUS.control,
        border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        background: active ? C.accentSoft : "transparent",
        color: active ? C.accentText : C.mid,
        fontSize: 13.5, fontWeight: active ? 650 : 500,
        boxShadow: active ? `inset 3px 0 0 ${C.accent}` : "none",
        transition: "background 0.15s, color 0.15s",
      }}>
      <Icon size={collapsed ? 20 : 18} strokeWidth={active ? 2 : 1.75} />
      {!collapsed && label}
    </button>
  );
}

/**
 * Mobile bottom bar — icons WITH labels, safe-area aware.
 * @param {{ active: string, onNavigate: (tab: string) => void }} props
 */
export function BottomBar({ active, onNavigate }) {
  return (
    <nav aria-label="Primary" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", background: "color-mix(in srgb, var(--poli-paper) 94%, transparent)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderTop: `1px solid ${C.border}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {NAV.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onNavigate(id)} aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "9px 0 8px", background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              color: isActive ? C.accentText : C.faint,
            }}>
            <Icon size={21} strokeWidth={isActive ? 2.1 : 1.75} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 650 : 500, letterSpacing: "0.01em" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Mobile sub-navigation pills — rendered under the top bar for the active tab.
 * @param {{ tab: string, activeSub?: string, onSelect: (sub: string) => void }} props
 */
export function SubNav({ tab, activeSub, onSelect }) {
  const subs = NAV.find(n => n.id === tab)?.subs;
  if (!subs) return null;
  return (
    <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 16px", scrollbarWidth: "none" }}>
      {subs.map(s => {
        const on = activeSub === s.id;
        return (
          <button key={s.id} role="tab" aria-selected={on} onClick={() => onSelect(s.id)} style={{
            padding: "6px 14px", borderRadius: RADIUS.pill, whiteSpace: "nowrap",
            fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: on ? C.ink : C.white,
            color: on ? C.white : C.mid,
            border: `1px solid ${on ? C.ink : C.border}`,
            transition: "background 0.15s",
          }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Page header — hero title in Instrument Serif with optional provenance slot.
 * @param {{ title: string, sub?: string, right?: React.ReactNode }} props
 */
export function PageHeader({ title, sub, right }) {
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, margin: "8px 0 20px" }}>
      <div>
        <h1 style={{ ...TYPE.masthead, color: C.ink, margin: 0 }}>{title}</h1>
        {sub && <p style={{ ...TYPE.sm, color: C.mid, margin: "6px 0 0", maxWidth: 560 }}>{sub}</p>}
      </div>
      {right}
    </header>
  );
}
