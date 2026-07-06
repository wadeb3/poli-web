// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM PREVIEW · smoke-test harness + engineer handoff demo
//
// Renders every v6 screen with sample data inside the new shell (sidebar ≥900px,
// bottom bar below). To view: in src/main.jsx temporarily swap
//   import App from "./App.jsx"  →  import App from "./design/Preview.jsx"
// Not routed in production.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { C, LAYOUT, FONT } from "./tokens.js";
import { useTheme, ThemeToggle, useAccent, AccentSwitcher } from "./theme.jsx";
import { Logo, LogoMark } from "./Logo.jsx";
import { Sidebar, BottomBar, SubNav, PageHeader } from "./Nav.jsx";
import { HomeFront } from "./screens/HomeFront.jsx";
import { BillsDesk } from "./screens/BillsDesk.jsx";
import { MPDossier } from "./screens/MPDossier.jsx";
import { DeliberationClusters } from "./screens/Polling.jsx";
import { VoteBallot } from "./screens/VoteBallot.jsx";
import { ParliamentMap } from "./screens/ParliamentMap.jsx";
import { LearnSyllabus } from "./screens/LearnSyllabus.jsx";
import { CommandPalette, usePaletteShortcut } from "./CommandPalette.jsx";
// Real data — the full POLICIES + GLOSSARY from the live app, so the preview
// shows true information density (expanded detail, donations, timelines, etc).
import { POLICIES, GLOSSARY } from "../App.jsx";

// Sample member dossiers (replace with the Supabase `mps` table shape)
const MEMBERS = [
  { id: 1, name: "Alex Chen", party: "IND", role: "Member for Warringah", chamber: "House", state: "NSW", electorate: "Warringah", postcodes: "2087 2093 2099", since: "2022", alignment: { score: 72, n: 9 },
    records: [
      { billTitle: "Housing Affordability & Rental Reform", vote: "for", date: "18 Jun 2024", withParty: true, userAlignment: "agree" },
      { billTitle: "Nuclear Energy Feasibility Study", vote: "against", date: "22 Jul 2024", withParty: true, userAlignment: "disagree" },
      { billTitle: "Electoral Reform (Truth in Advertising)", vote: "for", date: "3 Sep 2024", withParty: false },
    ],
    saidVsDid: { said: "I will always put climate action first.", did: "Voted for the Offshore Gas Expansion Bill, 12 Nov 2024.", consistent: false, source: "Hansard" } },
  { id: 2, name: "Sarah Mitchell", party: "ALP", role: "Member for Grayndler", chamber: "House", state: "NSW", electorate: "Grayndler", postcodes: "2040 2041 2044", since: "2019", alignment: { score: 58, n: 9 },
    records: [
      { billTitle: "Housing Affordability & Rental Reform", vote: "for", date: "18 Jun 2024", withParty: true, userAlignment: "agree" },
      { billTitle: "Nuclear Energy Feasibility Study", vote: "against", date: "22 Jul 2024", withParty: true },
    ] },
  { id: 3, name: "James Whitford", party: "LNP", role: "Member for Flinders", chamber: "House", state: "VIC", electorate: "Flinders", postcodes: "3910 3915 3926", since: "2016", alignment: { score: 31, n: 9 },
    records: [
      { billTitle: "Housing Affordability & Rental Reform", vote: "against", date: "18 Jun 2024", withParty: true, userAlignment: "disagree" },
      { billTitle: "Nuclear Energy Feasibility Study", vote: "for", date: "22 Jul 2024", withParty: true },
    ] },
  { id: 4, name: "Priya Nair", party: "Greens", role: "Senator for VIC", chamber: "Senate", state: "VIC", postcodes: "", since: "2020", alignment: { score: 64, n: 8 },
    records: [
      { billTitle: "Housing Affordability & Rental Reform", vote: "for", date: "28 May 2024", withParty: true, userAlignment: "agree" },
      { billTitle: "Nuclear Energy Feasibility Study", vote: "against", date: "5 Aug 2024", withParty: true },
    ] },
  { id: 5, name: "Tom Beaumont", party: "NAT", role: "Member for Riverina", chamber: "House", state: "NSW", electorate: "Riverina", postcodes: "2650 2678 2700", since: "2013", alignment: { score: 40, n: 9 },
    records: [ { billTitle: "Nuclear Energy Feasibility Study", vote: "for", date: "22 Jul 2024", withParty: true } ] },
  { id: 6, name: "Grace Okafor", party: "ALP", role: "Senator for QLD", chamber: "Senate", state: "QLD", postcodes: "", since: "2022", alignment: { score: 55, n: 8 },
    records: [ { billTitle: "Housing Affordability & Rental Reform", vote: "for", date: "28 May 2024", withParty: true } ] },
];

const BALLOT = [
  { id: 1, title: "Rental caps at CPI+2%", question: "Should annual rent increases be capped nationally?", support: 61, neutral: 11, oppose: 28, n: 12483, closes: "closes in 3 days" },
  { id: 2, title: "Lifting the nuclear ban", question: "Should Australia study lifting the prohibition on nuclear power?", support: 44, neutral: 9, oppose: 47, n: 9841, closes: "closes in 6 days" },
  { id: 3, title: "Truth in political advertising", question: "Should knowingly false political ads be unlawful during campaigns?", support: 78, neutral: 8, oppose: 14, n: 15102, closed: true, outcome: "Supported" },
  { id: 4, title: "Cash mandate for essentials", question: "Should essential retailers be required to accept cash?", support: 39, neutral: 18, oppose: 43, n: 7264, closed: true, outcome: "Opposed" },
];

const UNITS = [
  { id: "u1", title: "How parliament works", blurb: "The machinery: two chambers, the Crown, and why bills die where they do.",
    lessons: [
      { id: "l1", title: "How a bill becomes law", blurb: "", xp: 25, minutes: 4, done: true },
      { id: "l2", title: "What the Senate actually does", blurb: "", xp: 30, minutes: 5, progress: 0.4 },
      { id: "l3", title: "Reading a division", blurb: "", xp: 35, minutes: 6 },
    ] },
  { id: "u2", title: "Your vote, decoded", blurb: "Preferential voting, two-party preferred, and why 'safe seats' aren't.",
    lessons: [
      { id: "l4", title: "Preferences, explained with pizza", blurb: "", xp: 25, minutes: 4 },
      { id: "l5", title: "What two-party preferred means", blurb: "", xp: 25, minutes: 3 },
    ] },
  { id: "u3", title: "Following the money", blurb: "Donations, budgets, and how to read a fiscal impact statement.",
    lessons: [
      { id: "l6", title: "Reading donation disclosures", blurb: "", xp: 35, minutes: 6 },
      { id: "l7", title: "The budget in five numbers", blurb: "", xp: 30, minutes: 5 },
    ] },
];

const HOUSE = [
  { party: "ALP", seats: 78 }, { party: "Greens", seats: 4 }, { party: "IND", seats: 13 },
  { party: "OTH", seats: 2 }, { party: "NAT", seats: 15 }, { party: "LNP", seats: 38 },
];
const SENATE = [
  { party: "ALP", seats: 28 }, { party: "Greens", seats: 11 }, { party: "IND", seats: 4 },
  { party: "OTH", seats: 2 }, { party: "ONP", seats: 4 }, { party: "NAT", seats: 5 }, { party: "LNP", seats: 22 },
];

const LEVELS = [
  { level: 1, label: "Newcomer", minXp: 0, maxXp: 100, unlock: null },
  { level: 2, label: "Follower", minXp: 100, maxXp: 250, unlock: "Electorate comparison" },
  { level: 3, label: "Engaged", minXp: 250, maxXp: 500, unlock: "Senator tracker" },
];

export default function Preview() {
  const [mode, toggleMode] = useTheme();
  const [accent, setAccent] = useAccent();
  const [tab, setTab] = useState("home");
  const [sub, setSub] = useState("tracker");
  const [votes, setVotes] = useState({});
  const [alerts, setAlerts] = useState([1]);
  const [mpParty, setMpParty] = useState(null); // set by the parliament map drill-through
  const [paletteOpen, setPaletteOpen] = usePaletteShortcut();
  const [wide, setWide] = useState(typeof window !== "undefined" && window.innerWidth >= 900);

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= 900);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const navigate = (t, s) => { setTab(t); if (s) setSub(s); };

  // ⌘K index: pages, bills, members, glossary — everything, two keystrokes away
  const paletteItems = [
    ...["home", "bills", "parliament", "mymp", "vote", "learn"].map(id => ({
      id: `page-${id}`, type: "page",
      title: { home: "Home", bills: "Bill tracker", parliament: "Parliament map", mymp: "My MP", vote: "Vote", learn: "Learn" }[id],
      onSelect: () => navigate(id),
    })),
    ...POLICIES.map(p => ({
      id: `bill-${p.id}`, type: "bill", title: p.title,
      sub: `${p.meta?.billNumber || p.category} · ${p.status}`,
      onSelect: () => navigate("bills", "tracker"),
    })),
    ...MEMBERS.map(m => ({
      id: `mp-${m.id}`, type: "member", title: m.name,
      sub: `${m.role} · ${m.party}${m.postcodes ? ` · ${m.postcodes}` : ""}`,
      onSelect: () => { setMpParty(null); navigate("mymp", "mp"); },
    })),
    ...Object.entries(GLOSSARY).map(([term, def]) => ({
      id: `gl-${term}`, type: "glossary", title: term, sub: def,
      onSelect: () => navigate("learn"),
    })),
  ];

  const body = {
    home: (
      <HomeFront bills={POLICIES} dataState="sample"
        onOpenBill={() => navigate("bills", "tracker")}
        nextSitting={{ label: "Parliament sits", days: 8 }}
        actions={[
          { kind: "submission", title: "Senate inquiry: AI in essential services — public submissions", deadline: "closes 18 Jul" },
          { kind: "hearing", title: "Housing Australia Future Fund — committee hearing, Canberra", deadline: "22 Jul" },
          { kind: "petition", title: "E-petition EN7231: Truth in political advertising", deadline: "closes 30 Jul" },
        ]} />
    ),
    bills: (
      <>
        <PageHeader title="Bill tracker" sub="Every federal bill, in plain English — including what's buried in the schedules." />
        <BillsDesk bills={POLICIES} dataState="sample" votes={votes}
          onVote={(id, pos) => setVotes(v => ({ ...v, [id]: pos }))}
          alerts={alerts} onToggleAlert={id => setAlerts(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])} />
      </>
    ),
    parliament: (
      <>
        <PageHeader title="Parliament" sub="Who holds the floor — 48th Parliament composition. Click a party to meet its members." />
        <ParliamentMap house={HOUSE} senate={SENATE} dataState="sample" updated="May 2025"
          onSelectParty={p => { setMpParty(p); navigate("mymp", "mp"); }} />
      </>
    ),
    mymp: (
      <>
        <PageHeader title="Your representatives"
          sub="Search by name, electorate or postcode — then open the full dossier: votes, consistency, alignment." />
        <MPDossier members={MEMBERS} initialParty={mpParty} dataState="sample" onContact={() => {}} />
      </>
    ),
    vote: (
      <>
        <PageHeader title="The ballot" sub="Anonymous, methodology-disclosed community sentiment on live legislation." />
        <VoteBallot polls={BALLOT} dataState="sample" onVote={() => {}} />
        <DeliberationClusters totalResponses={2411} onAddResponse={() => {}} clusters={[
          { theme: "Relief for renters now", summary: "Supporters point to 2.6M households in rental stress and argue caps buy time while supply catches up.", count: 1088, lean: "support" },
          { theme: "Supply is the real problem", summary: "Opponents argue caps discourage investment and the 30,000 homes won't offset landlords exiting the market.", count: 842, lean: "oppose" },
          { theme: "Depends on enforcement", summary: "A large group supports the idea but doubts states will enforce the charter within 24 months.", count: 481, lean: "mixed" },
        ]} />
      </>
    ),
    learn: (
      <>
        <PageHeader title="Learn" sub="A short curriculum that makes the rest of Poli make sense." />
        <LearnSyllabus xp={135} streak={4} levels={LEVELS} units={UNITS} glossary={GLOSSARY} onStartLesson={() => {}} />
      </>
    ),
  }[tab];

  const sidebarFooter = (
    <div>
      <button onClick={() => setPaletteOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 10,
        padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
        background: C.surface, border: `1px solid ${C.border}`, color: C.faint, fontSize: 11.5,
      }}>
        Search everything…
        <kbd style={{ marginLeft: "auto", fontSize: 9.5, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", fontFamily: "inherit" }}>⌘K</kbd>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <ThemeToggle mode={mode} onToggle={toggleMode} />
        <AccentSwitcher accent={accent} onSelect={setAccent} />
      </div>
      <span style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.4 }}>
        Independent & non-partisan.<br />No ads. Method disclosed.
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.paper, fontFamily: FONT.ui, color: C.ink }}>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
      {wide && <Sidebar active={tab} activeSub={sub} onNavigate={navigate} footer={sidebarFooter}
        footerCollapsed={<ThemeToggle mode={mode} onToggle={toggleMode} />} />}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: wide ? 40 : LAYOUT.bottomBarHeight + 24 }}>
        {!wide && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 4px" }}>
            <Logo size={26} />
            <ThemeToggle mode={mode} onToggle={toggleMode} />
          </div>
        )}
        {!wide && <SubNav tab={tab} activeSub={sub} onSelect={setSub} />}
        <div style={{ maxWidth: LAYOUT.contentMax, margin: "0 auto", padding: wide ? "28px 32px" : "12px 16px" }}>
          {body}
        </div>
      </main>
      {!wide && <BottomBar active={tab} onNavigate={navigate} />}
    </div>
  );
}
