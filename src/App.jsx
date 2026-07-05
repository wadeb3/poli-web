import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabaseClient.js";

/*
  POLI v5  ·  Full civic intelligence platform
  ─────────────────────────────────────────────────────────────────────────────
  Design: white base · terracotta accent · Instrument Serif display · Inter UI
  
  NEW IN v5:
    1.  MP Contact Tool          — pre-drafted templates from voted positions
    2.  Bill Alerts              — per-policy notification preferences + status feed
    3.  Electorate Comparison    — AEC historical data, swing, marginal seats
    4.  Senator Tracker          — all 12 senators per state, voting records
    5.  Policy History           — "tried before" layer with outcomes
    6.  Party Consistency        — said vs. did, Hansard vs. actual vote
    7.  Cost of Living Index     — household-impact filtered policy view
    8.  Budget Tracker           — federal budget measures as policy cards
    9.  Donation Transparency    — AEC donation data on relevant bills
    10. Community Deliberation   — structured free-text + AI theme clustering
    11. Interactive Parliament   — House vs Senate visual explainer
    12. Cabinet structure        — who holds what role
    13. Bill lifecycle animator  — how a bill becomes law
    14. Electoral system map     — preferential voting visualised
*/

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  white:"#FFFFFF", surface:"#F7F7F7", surfaceB:"#F0F0F0",
  border:"#EBEBEB", borderDark:"#D8D8D8",
  ink:"#1A1A1A", mid:"#6B6B6B", faint:"#AFAFAF",
  accent:"#E8573A", accentDark:"#C94526", accentSoft:"#FDF1EE", accentMid:"#FADDD7",
  green:"#1D8348", greenSoft:"#EAF4EE", greenMid:"#C6E8D2",
  red:"#C0392B",   redSoft:"#FDECEA",   redMid:"#F5C6C2",
  amber:"#B7770D", amberSoft:"#FEF8EC",
  blue:"#1A56A0",  blueSoft:"#EBF2FB",
  purple:"#6D28D9",purpleSoft:"#F5F3FF",
  teal:"#0D766E",  tealSoft:"#F0FDFA",
};

const PARTY_COLOR = { ALP:C.red, LNP:C.blue, Greens:C.green, GRN:C.green, IND:C.teal };

// ── XP System ─────────────────────────────────────────────────────────────────
const XP_LEVELS = [
  { level:1, label:"Newcomer",     minXp:0,   maxXp:100, unlock:null },
  { level:2, label:"Follower",     minXp:100, maxXp:250, unlock:"Electorate comparison" },
  { level:3, label:"Engaged",      minXp:250, maxXp:500, unlock:"Senator tracker" },
  { level:4, label:"Informed",     minXp:500, maxXp:900, unlock:"Donation transparency" },
  { level:5, label:"Civic leader", minXp:900, maxXp:9999,unlock:"Full policy archive" },
];
const getLevel = xp => XP_LEVELS.slice().reverse().find(l => xp >= l.minXp) || XP_LEVELS[0];

// ── Core data ─────────────────────────────────────────────────────────────────
const POLICIES = [
  {
    id:1, title:"Housing Affordability & Rental Reform", party:"ALP", status:"Active", category:"Housing", colLiving:true,
    support:61, oppose:28, neutral:11, trend:"+4", trendDir:"up", heat:94,
    plain:"Caps rent increases at CPI+2% and funds 30,000 new social homes.",
    means:"If you rent, your landlord can only raise rent by inflation + 2% per year. 30,000 new public housing homes will be built.",
    donations:[{ donor:"Property Council of Australia", amount:"$412,000", party:"LNP", cycle:"2022–23" },{ donor:"Real Estate Institute", amount:"$180,000", party:"LNP", cycle:"2022–23" }],
    priorAttempts:[{ year:2019, title:"National Rental Affordability Scheme Extension", outcome:"Defeated", notes:"Voted down 35–33 in Senate. LNP and Pauline Hanson's One Nation opposed." }],
    meta:{ billNumber:"Housing Australia Future Fund Amendment Bill 2024", chamber:"House of Representatives", portfolioMinister:"Julie Collins, Minister for Housing", introduced:"14 Mar 2024", lastUpdated:"2 hrs ago", stage:"Active law" },
    fiscal:{ budgetImpact:"$10 billion commitment over 5 years", perHousehold:"Est. rental saving of $1,200–$3,600 per year for eligible renters", costSource:"2024–25 Federal Budget · Parliamentary Budget Office", direction:"expenditure" },
    cohorts:[
      { group:"Renters", impact:"direct", detail:"Rent increases capped at CPI+2% annually. No-fault eviction protections introduced." },
      { group:"Social housing waitlists", impact:"direct", detail:"30,000 new dwellings reduce average wait time in major cities." },
      { group:"Property investors", impact:"indirect", detail:"Rental yield growth limited. Some compliance costs for landlords." },
      { group:"First home buyers", impact:"indirect", detail:"Reduced competition from investors in the lower-price bracket." },
      { group:"Regional communities", impact:"indirect", detail:"12,000 of 30,000 new homes targeted at regional and remote areas." },
    ],
    provisions:["Annual rent increases capped at CPI + 2% for all residential tenancies","Housing Australia Future Fund expanded to $10 billion","National Renters' Rights Charter sets minimum habitability standards","No-fault eviction ban during fixed-term leases","State governments required to adopt charter within 24 months"],
    arguments:{ for:["Provides immediate relief for 2.6 million households in rental stress","30,000 new homes addresses structural undersupply","National standards end the patchwork of inconsistent state tenancy laws"], against:["Rent caps historically reduce rental supply as landlords exit the market","CPI+2% cap may not reflect local cost pressures in high-demand markets","States may resist federal encroachment on tenancy regulation"] },
    partyPositions:[
      { party:"ALP", position:"support", note:"Government bill. Central to housing affordability platform." },
      { party:"LNP", position:"oppose", note:"Argues rent caps reduce supply and punish landlords who maintain properties." },
      { party:"Greens", position:"conditional", note:"Supports rent caps but argues $10B fund is insufficient without rent freeze." },
      { party:"IND", position:"support", note:"Most Teal independents support with amendments on enforcement." },
    ],
    timeline:[
      { date:"14 Mar 2024", stage:"Introduced", chamber:"House", note:"Second reading speech by Minister Collins" },
      { date:"2 Apr 2024",  stage:"Second reading", chamber:"House", note:"Debate commenced. LNP moved reasoned amendment." },
      { date:"28 May 2024", stage:"Committee report", chamber:"Senate", note:"Senate Economics Committee recommended with amendments" },
      { date:"18 Jun 2024", stage:"Third reading", chamber:"House", note:"Passed 79–69. Greens supported with ALP" },
      { date:"4 Jul 2024",  stage:"Royal Assent", chamber:"GG", note:"Assented by Governor-General. Effective 1 Aug 2024" },
    ],
    currentStageIndex:4,
    relatedBills:["National Rental Assistance Supplement Act 2023","Help to Buy (Shared Equity) Bill 2024"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"Explanatory memorandum", url:"https://www.aph.gov.au" },{ label:"Senate committee report", url:"https://www.aph.gov.au" }],
    hiddenProvisions:[
      { type:"delegated", severity:"medium", clause:"Schedule 2, Clause 18", title:"Minister sets rent cap rate by instrument", summary:"The CPI+2% cap is not locked into the Act. The specific formula is set by the Minister via legislative instrument — meaning it can be changed without a vote in Parliament.", whyItMatters:"The headline policy could be quietly altered by any future government without debate.", scrutinyFlag:"Senate Scrutiny of Bills Committee — Scrutiny Digest 8 of 2024" },
      { type:"expanded", severity:"low", clause:"Schedule 4, Clause 31–35", title:"NHFIC board composition changes", summary:"The bill quietly restructures the board of the National Housing Finance and Investment Corporation, expanding ministerial appointment power.", whyItMatters:"Board governance changes are unrelated to rent caps — bundled without separate debate.", scrutinyFlag:null },
    ],
  },
  {
    id:2, title:"Nuclear Energy Feasibility Study", party:"LNP", status:"Proposed", category:"Energy", colLiving:true,
    support:44, oppose:47, neutral:9, trend:"-2", trendDir:"down", heat:88,
    plain:"Proposes lifting the nuclear ban and studying 7 potential reactor sites.",
    means:"No power plants yet — just a study phase. Could change your electricity prices within 20 years.",
    donations:[{ donor:"Minerals Council of Australia", amount:"$890,000", party:"LNP", cycle:"2022–23" },{ donor:"Origin Energy", amount:"$210,000", party:"LNP", cycle:"2023–24" }],
    priorAttempts:[{ year:2015, title:"Nuclear Power (Facilitating the Development) Bill", outcome:"Lapsed", notes:"Introduced by David Leyonhjelm (LDP). Lapsed at dissolution of parliament." }],
    meta:{ billNumber:"Australian Nuclear Energy Agency Bill 2024", chamber:"House of Representatives", portfolioMinister:"Ted O'Brien, Shadow Minister for Nuclear Energy", introduced:"22 Jul 2024", lastUpdated:"5 hrs ago", stage:"Proposed" },
    fiscal:{ budgetImpact:"$1.2 billion for feasibility studies and agency setup", perHousehold:"Projected electricity price impact unclear pending study outcomes", costSource:"LNP costed policy · PBO (independent review pending)", direction:"expenditure" },
    cohorts:[
      { group:"Electricity consumers", impact:"long-term", detail:"Nuclear could provide stable baseload power, potentially lowering wholesale prices after 2040." },
      { group:"Regional communities", impact:"direct", detail:"7 proposed sites are in regional NSW, QLD, VIC, SA, WA — significant local employment." },
      { group:"Coal workers", impact:"indirect", detail:"Nuclear positioned as transition pathway for coal communities facing closures." },
      { group:"Renewable energy sector", impact:"indirect", detail:"Nuclear competes for investment capital and policy priority with solar and wind." },
      { group:"Environment", impact:"direct", detail:"Waste storage, site contamination risk, and water usage are key unresolved concerns." },
    ],
    provisions:["Repeal of EPBC Act 1999 prohibition on nuclear facilities","Establishment of Australian Nuclear Energy Agency (ANEA)","CSIRO-led feasibility studies across 7 sites — 2-year reporting timeline","State and territory governments retain veto rights over site selection","Technology-neutral energy market framework"],
    arguments:{ for:["Nuclear provides 24/7 baseload power that wind and solar cannot without large-scale storage","Modern SMR technology reduces construction cost vs. traditional plants","15 of 20 largest economies already use nuclear — Australia is an outlier"], against:["CSIRO GenCost shows nuclear is the most expensive electricity source available","Earliest possible operation date of 2037–2040 creates a dangerous energy gap","No state government has agreed to host a reactor — SA, VIC, QLD have legislated bans"] },
    partyPositions:[
      { party:"LNP", position:"support", note:"Centrepiece energy policy. Argues renewables alone cannot achieve reliable net zero." },
      { party:"ALP", position:"oppose", note:"Too expensive and too slow. Government committed to 82% renewables by 2030." },
      { party:"Greens", position:"oppose", note:"Strongly opposed on cost, waste, and opportunity cost vs. renewables." },
      { party:"IND", position:"mixed", note:"Split. Some support feasibility study. Most oppose full repeal of moratorium." },
    ],
    timeline:[
      { date:"22 Jul 2024", stage:"Introduced", chamber:"House", note:"Introduced by opposition. Second reading deferred." },
      { date:"Sep 2024", stage:"Second reading", chamber:"House", note:"Debate ongoing. Government moved to defer." },
      { date:"Pending", stage:"Committee", chamber:"Senate", note:"Senate Environment Committee review expected Q1 2025" },
    ],
    currentStageIndex:1,
    relatedBills:["Climate Change Act 2022","Offshore Electricity Infrastructure Act 2021"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"CSIRO GenCost 2024", url:"https://www.csiro.au" }],
    hiddenProvisions:[
      { type:"unrelated", severity:"high", clause:"Schedule 3, Clause 44", title:"Uranium export licensing relaxed", summary:"A provision removes the requirement for case-by-case ministerial approval for uranium exports to IAEA member states — a significant trade policy change.", whyItMatters:"This is a substantive change to Australia's uranium export framework with no connection to the domestic nuclear feasibility study.", scrutinyFlag:"Senate Environment & Communications Committee — Additional Comments (Greens)" },
      { type:"delegated", severity:"medium", clause:"Clause 12(4)", title:"Agency CEO appointment — no merit process required", summary:"The new ANEA CEO can be appointed directly by the Minister without an advertised merit-based selection process.", whyItMatters:"Creates a significant patronage appointment outside public service norms for a major new statutory body.", scrutinyFlag:"Senate Scrutiny of Bills Committee — Scrutiny Digest 11 of 2024" },
    ],
  },
  {
    id:3, title:"Negative Gearing Reform", party:"Greens", status:"Proposed", category:"Housing", colLiving:true,
    support:53, oppose:38, neutral:9, trend:"+6", trendDir:"up", heat:91,
    plain:"Limits property investor tax breaks to one investment property per person.",
    means:"First home buyers face less investor competition. Property investors with multiple homes lose some tax deductions.",
    donations:[{ donor:"Housing Industry Association", amount:"$320,000", party:"LNP", cycle:"2022–23" },{ donor:"Master Builders Australia", amount:"$195,000", party:"LNP", cycle:"2022–23" }],
    priorAttempts:[{ year:2019, title:"ALP Negative Gearing Reform (2019 election policy)", outcome:"Not introduced", notes:"ALP took negative gearing reform to the 2019 election and lost. Shelved after the result." }],
    meta:{ billNumber:"Tax Laws Amendment (Housing Affordability) Bill 2025", chamber:"Senate", portfolioMinister:"Adam Bandt, Greens Leader (Private Member's Bill)", introduced:"15 Jan 2025", lastUpdated:"1 hr ago", stage:"Proposed" },
    fiscal:{ budgetImpact:"Est. $13.4 billion in additional revenue over 4 years", perHousehold:"First home buyers: potential 5–10% property price reduction in high-demand markets", costSource:"Australia Institute modelling · Grattan Institute analysis", direction:"revenue" },
    cohorts:[
      { group:"First home buyers", impact:"positive", detail:"Reduced investor competition could lower prices in the bottom 40% of the market." },
      { group:"Investors (1 property)", impact:"none", detail:"Single investment property holders are fully exempt from the changes." },
      { group:"Investors (2+ properties)", impact:"direct", detail:"Negative gearing deductions limited to one property. CGT discount halved for new purchases." },
      { group:"Renters", impact:"mixed", detail:"Short-term: possible rent increases if investors sell. Long-term: more homes entering owner-occupier market." },
      { group:"Property sector", impact:"indirect", detail:"Construction activity may shift toward owner-occupier demand rather than investor-driven development." },
    ],
    provisions:["Negative gearing deductions restricted to a single investment property per taxpayer from 1 Jul 2025","CGT discount reduced from 50% to 25% for investment properties purchased after commencement","Grandfathering provisions apply — existing investors exempt on current holdings","Revenue reinvested into Housing Australia Future Fund","Productivity Commission to assess housing market impacts after 3 years"],
    arguments:{ for:["Australia has some of the world's most generous property investor tax concessions","Grandfathering protects existing investors while changing incentives for new investment","Treasury modelling suggests modest price reductions in the bottom market segment"], against:["Investors provide significant proportion of rental housing stock — exit could tighten rental supply","CGT changes reduce incentive to hold property long-term, potentially increasing volatility","Grandfathering creates two-tier system that may distort market for decades"] },
    partyPositions:[
      { party:"Greens", position:"support", note:"Flagship housing policy. Argues investor tax breaks are the primary driver of unaffordability." },
      { party:"ALP", position:"conditional", note:"Previously committed to reform in 2019. Currently deferred — unwilling to risk political capital." },
      { party:"LNP", position:"oppose", note:"Argues it will reduce rental supply and punish 'mum and dad' investors." },
      { party:"IND", position:"support", note:"Majority of Teal independents support reform with grandfathering protections." },
    ],
    timeline:[
      { date:"15 Jan 2025", stage:"Introduced", chamber:"Senate", note:"Greens private member's bill. Co-sponsored by two independents." },
      { date:"Feb 2025", stage:"Second reading", chamber:"Senate", note:"Debate commenced. ALP abstained on second reading vote." },
      { date:"Pending", stage:"Committee", chamber:"Senate", note:"Senate Economics Committee review expected Mar 2025" },
    ],
    currentStageIndex:1,
    relatedBills:["Housing Australia Future Fund Amendment Bill 2024","Help to Buy Bill 2024"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"Australia Institute modelling", url:"https://australiainstitute.org.au" },{ label:"Grattan Institute", url:"https://grattan.edu.au" }],
    hiddenProvisions:[
      { type:"expanded", severity:"medium", clause:"Schedule 1, Clause 9(b)", title:"ATO data-matching powers expanded", summary:"To enforce the single-property limit, the bill grants the ATO new real-time data-matching powers across state land title registries — broader than the policy alone requires.", whyItMatters:"Significant expansion of ATO surveillance powers over all property owners, not just those with multiple investment properties.", scrutinyFlag:"Senate Economics Legislation Committee — Dissenting Report" },
      { type:"sunset", severity:"low", clause:"Schedule 2, Clause 17", title:"Removes existing CGT small business concession interaction", summary:"A consequential clause removes an existing tax concession for small business owners selling commercial premises.", whyItMatters:"Small business owners lose a pre-existing tax benefit with no separate announcement or debate.", scrutinyFlag:null },
    ],
  },
  {
    id:4, title:"NDIS Long-Term Reform Package", party:"ALP", status:"Legislation", category:"Social", colLiving:false,
    support:49, oppose:34, neutral:17, trend:"+1", trendDir:"up", heat:72,
    plain:"Revises NDIS eligibility and introduces earlier support for children under 9.",
    means:"Some current participants may be re-assessed. Children under 9 can access support sooner.",
    donations:[],
    priorAttempts:[{ year:2023, title:"NDIS Amendment (Strengthening Governance) Bill 2023", outcome:"Passed", notes:"Earlier reform package passed. This bill is the second tranche of NDIS changes." }],
    meta:{ billNumber:"National Disability Insurance Scheme Amendment (Getting the NDIS Back on Track No. 1) Bill 2024", chamber:"House of Representatives", portfolioMinister:"Bill Shorten, Minister for the NDIS", introduced:"27 Mar 2024", lastUpdated:"3 hrs ago", stage:"In parliament" },
    fiscal:{ budgetImpact:"Projected to reduce NDIS expenditure growth from 14% to 8% per year by 2026", perHousehold:"Participants: average plan value unchanged for majority. High-cost plans subject to independent review.", costSource:"NDIS Review Final Report (Dec 2023) · DSS modelling", direction:"saving" },
    cohorts:[
      { group:"NDIS participants (existing)", impact:"mixed", detail:"Majority unaffected. Some high-cost plans subject to independent assessment." },
      { group:"Children under 9", impact:"positive", detail:"New early-intervention stream provides support without requiring full diagnosis." },
      { group:"Disability support workers", impact:"indirect", detail:"New qualification frameworks and registration requirements from 2025." },
      { group:"Families and carers", impact:"mixed", detail:"Early intervention pathway positive. Re-assessment processes create uncertainty." },
      { group:"Taxpayers", impact:"positive", detail:"Scheme projected to be $14.4 billion below forecast over 4 years." },
    ],
    provisions:["New definition of 'NDIS support' to clarify eligible vs. ineligible funding items","Early Childhood Approach stream for children under 9 — without formal NDIS plan","Independent assessment for participants with plans over $50,000 per year","Registered provider framework strengthened — unregistered providers limited from 2025","NDIS Quality and Safeguards Commission given expanded compliance powers"],
    arguments:{ for:["NDIS expenditure growing at 14% per year — unsustainable without reform","Early intervention for children under 9 has strongest evidence base for long-term outcomes","Clearer eligibility criteria reduce inconsistency in what gets funded"], against:["Disability advocacy groups warn re-assessment will reduce supports for vulnerable people","New support definitions may exclude items participants currently rely on","Implementation timeline too fast — systemic changes before workforce is trained"] },
    partyPositions:[
      { party:"ALP", position:"support", note:"Government bill. Presents as financial sustainability measure while protecting core supports." },
      { party:"LNP", position:"conditional", note:"Supports fiscal restraint but raised concerns about implementation speed." },
      { party:"Greens", position:"oppose", note:"Argues cuts will harm participants. Wants more funding, not restrictions." },
      { party:"IND", position:"mixed", note:"Independents split — some support early intervention stream, concerned about re-assessments." },
    ],
    timeline:[
      { date:"27 Mar 2024", stage:"Introduced", chamber:"House", note:"Introduced alongside NDIS Review response package" },
      { date:"May 2024", stage:"Second reading", chamber:"House", note:"Passed House 89–58 with LNP conditional support" },
      { date:"Jun 2024", stage:"Committee", chamber:"Senate", note:"Senate Community Affairs Committee — 47 submissions received" },
      { date:"Pending", stage:"Third reading", chamber:"Senate", note:"Senate vote expected Aug 2024 — outcome uncertain" },
    ],
    currentStageIndex:2,
    relatedBills:["NDIS (Strengthening Governance) Amendment Bill 2023","Disability Services and Inclusion Act 2023"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"NDIS Review Final Report", url:"https://www.ndisreview.gov.au" }],
    hiddenProvisions:[
      { type:"delegated", severity:"high", clause:"Section 10 — 'NDIS Support' definition", title:"Core eligibility definition set by Minister, not Parliament", summary:"The definition of what constitutes an 'NDIS support' is delegated to the Minister to set via legislative rules, bypassing parliamentary debate.", whyItMatters:"The most consequential part of the bill — what the NDIS will and won't fund — is not actually in the legislation itself. It can change at any time without a vote.", scrutinyFlag:"Senate Scrutiny of Bills Committee — Scrutiny Digest 5 of 2024 (major concern raised)" },
      { type:"unrelated", severity:"medium", clause:"Schedule 5, Items 88–104", title:"AAT migration provisions bundled in", summary:"The bill includes 17 items transitioning NDIS review cases from the abolished AAT to the new Administrative Review Tribunal — a machinery-of-government change with no policy connection to NDIS reform.", whyItMatters:"Tribunal transition provisions belong in separate legislation — bundled to reduce the number of votes required.", scrutinyFlag:null },
    ],
  },
  {
    id:5, title:"Net Zero by 2035", party:"Greens", status:"Proposed", category:"Climate", colLiving:true,
    support:39, oppose:51, neutral:10, trend:"+3", trendDir:"up", heat:96,
    plain:"Would accelerate Australia's climate target by 15 years, to 2035.",
    means:"Energy costs and industry rules change faster. Coal jobs transition sooner. Lower long-term climate risk.",
    donations:[{ donor:"Woodside Energy", amount:"$510,000", party:"LNP", cycle:"2022–23" },{ donor:"Santos Ltd", amount:"$380,000", party:"LNP", cycle:"2022–23" }],
    priorAttempts:[{ year:2022, title:"Climate Change (Net Zero by 2035) Bill", outcome:"Defeated", notes:"Greens bill defeated 32–13 in Senate. Only Greens and two independents supported." }],
    meta:{ billNumber:"Climate Change Amendment (Keeping 1.5 Alive) Bill 2025", chamber:"Senate", portfolioMinister:"Adam Bandt, Greens Leader (Private Member's Bill)", introduced:"12 Feb 2025", lastUpdated:"6 hrs ago", stage:"Proposed" },
    fiscal:{ budgetImpact:"$250 billion in investment required across energy, transport, and industry over 10 years", perHousehold:"Energy transition costs offset by projected $1,400/year savings on power bills by 2035", costSource:"Climate Council modelling · Beyond Zero Emissions analysis", direction:"investment" },
    cohorts:[
      { group:"Fossil fuel workers", impact:"direct", detail:"Coal and gas jobs phased out by 2030. Just Transition Authority provides retraining." },
      { group:"Renewable energy sector", impact:"positive", detail:"Massive investment pipeline — est. 200,000 new jobs in solar, wind, and storage by 2035." },
      { group:"Electricity consumers", impact:"mixed", detail:"Short-term: higher transition costs. Long-term: cheaper power from zero-marginal-cost renewables." },
      { group:"Regional communities", impact:"direct", detail:"Coal communities in Hunter, Latrobe Valley, Bowen Basin face fastest transition." },
      { group:"Future generations", impact:"positive", detail:"Limiting warming to 1.5°C reduces risk of catastrophic climate impacts." },
    ],
    provisions:["Net zero target advanced from 2050 to 2035 in the Climate Change Act 2022","Carbon price floor of $40/tonne on industrial emitters, rising 5% per year","Coal export ban phased in from 2028, full prohibition by 2030","Just Transition Authority receives $20 billion to support affected workers","ARENA funding trebled to accelerate renewable deployment"],
    arguments:{ for:["IPCC data shows 1.5°C pathway requires global net zero by 2035","Australia's abundant renewables mean economic cost of early transition is lower than most nations","Climate-related disasters already cost Australia $39 billion per year"], against:["2035 timeframe is technically and economically infeasible — infrastructure lead times require 15–20 years","Coal export ban would cost $70 billion per year in export revenue","Unilateral action by Australia (1.3% of global emissions) has negligible climate impact"] },
    partyPositions:[
      { party:"Greens", position:"support", note:"Defining policy commitment. Frames 2050 target as insufficient given climate science." },
      { party:"ALP", position:"oppose", note:"Committed to 82% renewables by 2030 and 2050 net zero. Argues 2035 is not credible." },
      { party:"LNP", position:"oppose", note:"Strongly opposed. Argues it would destroy regional economies and energy security." },
      { party:"IND", position:"mixed", note:"Most support stronger climate action but few endorse 2035 timeline as feasible." },
    ],
    timeline:[
      { date:"12 Feb 2025", stage:"Introduced", chamber:"Senate", note:"Introduced with co-sponsorship from two crossbench senators" },
      { date:"Mar 2025", stage:"Second reading", chamber:"Senate", note:"Debate commenced. Major parties opposed." },
      { date:"Pending", stage:"Committee", chamber:"Senate", note:"Senate Environment Committee review expected Apr 2025" },
    ],
    currentStageIndex:1,
    relatedBills:["Climate Change Act 2022","Safeguard Mechanism (Crediting) Amendment Act 2023"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"IPCC Sixth Assessment Report", url:"https://www.ipcc.ch" },{ label:"Climate Council costing", url:"https://www.climatecouncil.org.au" }],
    hiddenProvisions:[
      { type:"expanded", severity:"high", clause:"Schedule 2, Part 3 — Export controls", title:"Coal export ban applies to metallurgical coal", summary:"The bill's coal phase-out applies to ALL coal — including metallurgical (coking) coal used in steel manufacturing, not just thermal coal. The bill's public framing only refers to 'energy coal'.", whyItMatters:"Metallurgical coal exports ($14B/year) supply steelmakers globally. Banning it goes well beyond the energy transition framing.", scrutinyFlag:"Senate Economics References Committee — Dissenting Report (LNP + ALP)" },
      { type:"delegated", severity:"medium", clause:"Clause 7 — Carbon price floor", title:"Carbon price trajectory set by regulation", summary:"The $40/tonne starting price is in the bill, but the annual 5% escalation rate and price ceiling are set by regulation — meaning future governments could freeze or remove the escalator without new legislation.", whyItMatters:"The long-term effectiveness of the carbon price mechanism could be gutted by regulation, not legislation.", scrutinyFlag:null },
    ],
  },
  {
    id:6, title:"Defence Spending 2.5% GDP", party:"LNP", status:"Proposed", category:"Defence", colLiving:false,
    support:56, oppose:31, neutral:13, trend:"+2", trendDir:"up", heat:68,
    plain:"Would increase defence funding from 2.1% to 2.5% of GDP by 2030.",
    means:"More money for submarines and cyber defence. Either improves security or diverts funds from social spending.",
    donations:[{ donor:"Lockheed Martin Australia", amount:"$95,000", party:"LNP", cycle:"2023–24" },{ donor:"BAE Systems Australia", amount:"$88,000", party:"LNP", cycle:"2023–24" }],
    priorAttempts:[],
    meta:{ billNumber:"Defence Amendment (Funding Commitment) Bill 2025", chamber:"House of Representatives", portfolioMinister:"Andrew Hastie, Shadow Minister for Defence", introduced:"8 Apr 2025", lastUpdated:"8 hrs ago", stage:"Proposed" },
    fiscal:{ budgetImpact:"$50 billion additional over 6 years (2024–25 to 2029–30)", perHousehold:"Funded through reallocation — specific offset measures not yet identified", costSource:"LNP policy costing · ASPI analysis", direction:"expenditure" },
    cohorts:[
      { group:"ADF personnel", impact:"positive", detail:"Increased funding for equipment, pay, and recruitment pipeline." },
      { group:"Defence industry", impact:"positive", detail:"Significant contracts in shipbuilding, cyber, and aerospace. Est. 20,000 new industrial jobs." },
      { group:"AUKUS partners (US, UK)", impact:"positive", detail:"Higher spend signals commitment and unlocks advanced technology transfers." },
      { group:"Social services", impact:"indirect", detail:"If funded via reallocation, other portfolio budgets would need to absorb cuts." },
      { group:"Regional Australia", impact:"positive", detail:"Major ADF bases in Darwin, Townsville, Nowra, Edinburgh are significant regional employers." },
    ],
    provisions:["Legislated minimum defence spending floor of 2.5% of GDP from FY2030","Independent capability review to identify highest-priority investments","AUKUS submarine pathway accelerated — $8 billion brought forward","Cyber Command established as joint ADF–civilian agency under ASD","Indo-Pacific partnership fund of $2 billion for regional capacity building"],
    arguments:{ for:["China's defence spending has grown 600% since 2000 — Australia's regional security environment is fundamentally changed","NATO members commit to 2% of GDP; 2.5% reflects Australia's unique strategic position","AUKUS requires sustained funding commitment to maintain credibility with US and UK"], against:["No identified offset — bill does not specify what spending would be reduced","ADF already struggling with recruitment — equipment without personnel is not capability","Diplomacy and regional engagement deliver more security per dollar than hardware"] },
    partyPositions:[
      { party:"LNP", position:"support", note:"Centrepiece security policy. Frames as minimum necessary given Indo-Pacific threat environment." },
      { party:"ALP", position:"conditional", note:"Supports increased defence investment but resists legislative floor — prefers budget flexibility." },
      { party:"Greens", position:"oppose", note:"Strongly opposed. Argues funds should go to climate action and social services." },
      { party:"IND", position:"mixed", note:"Most support AUKUS investment. Split on legislated floor vs. flexible budget approach." },
    ],
    timeline:[
      { date:"8 Apr 2025", stage:"Introduced", chamber:"House", note:"Introduced with ASPI briefing to crossbench." },
      { date:"May 2025", stage:"Second reading", chamber:"House", note:"Debate deferred — government business priority." },
      { date:"Pending", stage:"Committee", chamber:"House", note:"Joint Standing Committee on Foreign Affairs & Defence" },
    ],
    currentStageIndex:1,
    relatedBills:["Defence Strategic Review Implementation Act 2023","AUKUS Implementation Bill 2024"],
    sources:[{ label:"APH Bill page", url:"https://www.aph.gov.au" },{ label:"ASPI analysis", url:"https://www.aspi.org.au" }],
    hiddenProvisions:[
      { type:"unrelated", severity:"medium", clause:"Schedule 1, Clause 22", title:"ASD given new civilian surveillance powers", summary:"The bill establishes a new 'Cyber Command' but also grants the ASD new powers to monitor domestic civilian networks for 'cybersecurity threats' — unrelated to the defence spending commitment.", whyItMatters:"Domestic surveillance powers for a foreign signals intelligence agency represent a major civil liberties issue that deserves separate debate.", scrutinyFlag:"Parliamentary Joint Committee on Intelligence and Security — flagged for review" },
      { type:"delegated", severity:"low", clause:"Clause 4(3) — GDP measurement", title:"Treasury defines GDP measure used for spending floor", summary:"The 2.5% GDP floor uses a definition of GDP determined by the Secretary of the Treasury by instrument — meaning how the floor is measured is not fixed in law.", whyItMatters:"The definition of GDP used affects whether the spending target is actually being met — and can be adjusted without parliamentary oversight.", scrutinyFlag:null },
    ],
  },
];

// Budget tracker data
const BUDGET_MEASURES = [
  { id:"b1", title:"Energy Bill Relief Fund Extension", portfolio:"Treasury", amount:"$3.5B", direction:"expenditure", colLiving:true, plain:"Extends household electricity rebates of $300 for every Australian household.", impact:"Reduces average household electricity bill by $300 in 2024–25.", year:"2024–25" },
  { id:"b2", title:"Help to Buy Shared Equity Scheme", portfolio:"Housing", amount:"$5.5B", direction:"expenditure", colLiving:true, plain:"Government co-purchases up to 40% of a home with eligible first-home buyers.", impact:"Lowers deposit and mortgage repayments for eligible buyers. 40,000 places available.", year:"2024–25" },
  { id:"b3", title:"Medicare Urgent Care Clinics", portfolio:"Health", amount:"$227M", direction:"expenditure", colLiving:true, plain:"50 new Medicare-funded urgent care clinics to reduce emergency department pressure.", impact:"Free GP-level urgent care without needing an appointment or paying a gap fee.", year:"2024–25" },
  { id:"b4", title:"Stage 3 Tax Cut Restructure", portfolio:"Treasury", amount:"-$1.3B revenue", direction:"revenue", colLiving:true, plain:"Restructures previously legislated Stage 3 tax cuts to benefit lower and middle income earners more.", impact:"Average saving of $1,504 per year for incomes under $90,000. Less benefit for high incomes.", year:"2024–25" },
  { id:"b5", title:"NDIS Sustainability Measures", portfolio:"Social Services", amount:"-$14.4B savings", direction:"saving", colLiving:false, plain:"Projected savings from NDIS eligibility and plan management reforms over 4 years.", impact:"Scheme expenditure growth targeted at 8% per year, down from 14%.", year:"2024–25" },
  { id:"b6", title:"Defence AUKUS Capability Investments", portfolio:"Defence", amount:"$6.2B", direction:"expenditure", colLiving:false, plain:"Funding for AUKUS submarine pathway and cyber capability uplift.", impact:"Primarily affects defence industry employment in SA, WA, and NSW.", year:"2024–25" },
];

// Senators data
const SENATORS = {
  VIC:[ { name:"Penny Wong",       party:"ALP", role:"Minister for Foreign Affairs",        votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Don Farrell",       party:"ALP", role:"Minister for Trade",                   votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Jane Hume",         party:"LNP", role:"Shadow Minister for Finance",          votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"James Paterson",    party:"LNP", role:"Shadow Minister for Home Affairs",     votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Sarah Hanson-Young",party:"GRN", role:"Greens Senate spokesperson",           votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"Lidia Thorpe",      party:"IND", role:"Independent (formerly Greens)",        votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } } ],
  NSW:[ { name:"Deborah O'Neill",   party:"ALP", role:"Senator for NSW",                      votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Tim Ayres",         party:"ALP", role:"Assistant Minister for Industry",      votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Andrew Bragg",      party:"LNP", role:"Shadow Asst Minister — Financial Svcs",votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Hollie Hughes",     party:"LNP", role:"Senator for NSW",                      votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"David Shoebridge",  party:"GRN", role:"Greens Senator for NSW",               votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"Jacqui Lambie",     party:"IND", role:"Jacqui Lambie Network",                votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } } ],
  QLD:[ { name:"Murray Watt",       party:"ALP", role:"Minister for Agriculture",             votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Anthony Chisholm",  party:"ALP", role:"Senator for QLD",                      votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Matt Canavan",      party:"LNP", role:"Senator for QLD",                      votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Susan McDonald",    party:"LNP", role:"Senator for QLD",                      votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Larissa Waters",    party:"GRN", role:"Greens co-deputy leader",              votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"Pauline Hanson",    party:"IND", role:"One Nation leader",                    votes:{ 1:"nay",2:"aye",3:"nay",4:"nay",5:"nay",6:"aye" } } ],
  WA: [ { name:"Glenn Sterle",      party:"ALP", role:"Senator for WA",                       votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Sue Lines",         party:"ALP", role:"President of the Senate",              votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Michaelia Cash",    party:"LNP", role:"Leader of Opposition in Senate",       votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Dean Smith",        party:"LNP", role:"Senator for WA",                       votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Dorinda Cox",       party:"GRN", role:"Greens Senator for WA",               votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"David Pocock",      party:"IND", role:"Independent Senator for ACT",         votes:{ 1:"aye",2:"nay",3:"aye",4:"aye",5:"aye",6:"nay" } } ],
  SA: [ { name:"Penny Wong",        party:"ALP", role:"Minister for Foreign Affairs",         votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Alex Gallacher",    party:"ALP", role:"Senator for SA",                       votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Simon Birmingham",  party:"LNP", role:"Shadow Minister for Finance",          votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Anne Ruston",       party:"LNP", role:"Shadow Minister for Social Services",  votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Barbara Pocock",    party:"GRN", role:"Greens Senator for SA",               votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"Rex Patrick",       party:"IND", role:"Independent (formerly Centre Alliance)",votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } } ],
  TAS:[ { name:"Anne Urquhart",     party:"ALP", role:"Senator for TAS",                      votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Helen Polley",      party:"ALP", role:"Senator for TAS",                      votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } }, { name:"Jonathon Duniam",   party:"LNP", role:"Senator for TAS",                      votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Eric Abetz",        party:"LNP", role:"Senator for TAS",                      votes:{ 1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye" } }, { name:"Nick McKim",        party:"GRN", role:"Greens Senator for TAS",              votes:{ 1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay" } }, { name:"Jacqui Lambie",     party:"IND", role:"Jacqui Lambie Network",               votes:{ 1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay" } } ],
};

// Cabinet positions — rich data model
const CABINET = [
  {
    role:"Prime Minister", name:"Anthony Albanese", portfolio:"PM&C", party:"ALP", electorate:"Grayndler, NSW", since:"May 2022",
    emoji:"🏛️",
    what:"The PM leads the government, chairs Cabinet, and is responsible for overall policy direction. They represent Australia internationally and are accountable to parliament for all government decisions.",
    covers:["Sets national policy agenda","Chairs Cabinet meetings","Represents Australia internationally","Responsible for AUKUS and major defence decisions","Oversees intelligence agencies (ASIO, ASIS)"],
    budget:"The Department of PM&C coordinates across all portfolios — no single budget envelope.",
    keyPolicies:["Closing the Gap (First Nations)","AUKUS submarine program","National Reconstruction Fund"],
    relevantBills:[1,4],
    background:"First elected 1996. ALP leader since 2013. Led ALP to victory at May 2022 election ending 9 years of Coalition government.",
  },
  {
    role:"Deputy Prime Minister & Minister for Defence", name:"Richard Marles", portfolio:"Defence", party:"ALP", electorate:"Corio, VIC", since:"May 2022",
    emoji:"🛡️",
    what:"The Deputy PM steps in when the PM is unavailable. As Defence Minister, Marles oversees the Australian Defence Force, AUKUS negotiations, and all military capability decisions.",
    covers:["Australian Defence Force (Army, Navy, Air Force)","AUKUS submarine pathway","Defence industry and procurement","Veterans' affairs (joint responsibility)","Pine Gap and intelligence facilities"],
    budget:"$54.2 billion (2024–25) — rising to 2.1% of GDP",
    keyPolicies:["AUKUS submarine acquisition","Surface fleet review","Northern Australia infrastructure"],
    relevantBills:[6],
    background:"Geelong-born. Former shadow minister for foreign affairs. Key architect of AUKUS implementation strategy.",
  },
  {
    role:"Treasurer", name:"Jim Chalmers", portfolio:"Treasury", party:"ALP", electorate:"Rankin, QLD", since:"May 2022",
    emoji:"💰",
    what:"The Treasurer is responsible for managing the national economy. They deliver the annual federal budget, set fiscal policy, and oversee the tax system, superannuation, and financial regulation.",
    covers:["Federal Budget","Income tax policy","Superannuation","Banking and financial regulation (with APRA, ASIC, RBA)","Cost of living measures","Inflation and economic forecasting"],
    budget:"Administers the entire $700B+ federal budget envelope",
    keyPolicies:["Stage 3 tax cut restructure","$300 energy bill relief","HECS debt indexation changes","Superannuation on parental leave"],
    relevantBills:[1,3],
    background:"PhD in political science. Former adviser to Wayne Swan. First QLD-based Treasurer in decades. Delivered three consecutive surplus budgets.",
  },
  {
    role:"Minister for Foreign Affairs", name:"Penny Wong", portfolio:"DFAT", party:"ALP", electorate:"SA Senate", since:"May 2022",
    emoji:"🌏",
    what:"The Foreign Affairs Minister manages Australia's relationships with other nations, represents Australia at the United Nations, and oversees the diplomatic service and foreign aid program.",
    covers:["Australia's diplomatic relationships","United Nations and multilateral bodies","Foreign aid (Australian Aid program)","Consular services for Australians abroad","Trade policy (shared with Trade Minister)","Pacific Engagement Visa and Pacific step-up"],
    budget:"$7.2 billion (DFAT + overseas aid)",
    keyPolicies:["Pacific engagement strategy","Relations with China normalisation","Support for Ukraine","ASEAN centrality"],
    relevantBills:[],
    background:"Born in Malaysia. First LGBTQ+ senator in Australia. Led Australia's return to multilateral climate forums. Widely regarded as one of Australia's most effective Foreign Ministers.",
  },
  {
    role:"Attorney-General", name:"Mark Dreyfus", portfolio:"AG", party:"ALP", electorate:"Isaacs, VIC", since:"May 2022",
    emoji:"⚖️",
    what:"The Attorney-General is the government's chief law officer. They oversee the federal legal system, human rights, national security legislation, and appoint federal judges.",
    covers:["Federal courts and judges","Human rights legislation","National security laws and oversight","Privacy law and the Privacy Act","Anti-corruption (National Anti-Corruption Commission)","Freedom of information"],
    budget:"$1.6 billion",
    keyPolicies:["National Anti-Corruption Commission (NACC)","Privacy Act reforms","Voice to Parliament referendum legislation","Robodebt Royal Commission response"],
    relevantBills:[],
    background:"Barrister before entering parliament. Oversaw establishment of the NACC — Australia's first federal anti-corruption body. Has parliamentary experience as both A-G and Shadow A-G.",
  },
  {
    role:"Minister for Health and Aged Care", name:"Mark Butler", portfolio:"Health", party:"ALP", electorate:"Hindmarsh, SA", since:"May 2022",
    emoji:"🏥",
    what:"Oversees the entire health system including Medicare, hospitals funding (with states), the PBS (Pharmaceutical Benefits Scheme), aged care, and public health programs.",
    covers:["Medicare and GP bulk billing","Hospitals funding agreements with states","Pharmaceutical Benefits Scheme (PBS)","Aged care reform","Mental health","Tobacco and vaping regulation","TGA (Therapeutic Goods Administration)"],
    budget:"$125 billion (health and aged care combined)",
    keyPolicies:["Tripling bulk billing incentives","Vaping reforms and e-cigarette ban","Aged care minimum care minutes","Medicare Urgent Care Clinics"],
    relevantBills:[],
    background:"Long-serving ALP frontbencher. Previously held climate and environment portfolios. Oversaw controversial vaping legislation that banned recreational e-cigarettes.",
  },
  {
    role:"Minister for Education", name:"Jason Clare", portfolio:"Education", party:"ALP", electorate:"Blaxland, NSW", since:"May 2022",
    emoji:"🎓",
    what:"Responsible for federal school funding policy, universities, vocational education (TAFE), and student support including HECS-HELP debt.",
    covers:["School funding (Gonski agreements with states)","University fees and HECS-HELP","TAFE and vocational training","Early childhood education","Australian Curriculum","Universities Accord implementation"],
    budget:"$42 billion (education)",
    keyPolicies:["Universities Accord — 20% increase in student places","HECS indexation changes","Fee-free TAFE","Schools Upgrade Fund"],
    relevantBills:[],
    background:"Grew up in public housing in Cabramatta, NSW. First in his family to attend university. Background in union movement and previous experience as Home Affairs minister.",
  },
  {
    role:"Minister for Finance", name:"Katy Gallagher", portfolio:"Finance", party:"ALP", electorate:"ACT Senate", since:"May 2022",
    emoji:"📊",
    what:"The Finance Minister manages the government's spending and financial framework — essentially the internal budget management that sits alongside the Treasurer's macroeconomic role.",
    covers:["Government spending frameworks","Public service and APS reform","Federal property and assets","Government advertising policy","Parliamentary entitlements","Budget process administration"],
    budget:"Administers government-wide spending frameworks, not a single portfolio budget",
    keyPolicies:["APS reform and capability review","Government advertising code","Audit of defence contracts","Multinational tax reforms (with Treasurer)"],
    relevantBills:[],
    background:"Former ACT Chief Minister. Long Senate career. Considered a steady pair of hands on fiscal management within Cabinet.",
  },
  {
    role:"Minister for Housing", name:"Julie Collins", portfolio:"Housing", party:"ALP", electorate:"Franklin, TAS", since:"May 2022",
    emoji:"🏠",
    what:"Leads federal housing policy including the Housing Australia Future Fund, social housing investment, the Help to Buy shared equity scheme, and the National Housing Accord with states.",
    covers:["Housing Australia Future Fund ($10B)","Social housing construction","Help to Buy shared equity scheme","National Housing Accord (with states and territories)","Homelessness funding","National Rental Affordability Scheme"],
    budget:"$10B+ Housing Australia Future Fund; $350M/year in housing-specific grants",
    keyPolicies:["30,000 new social and affordable homes","Help to Buy for first home buyers","National Housing Accord","Rent relief via National Rental Assistance Supplement"],
    relevantBills:[1,3],
    background:"Tasmanian MP since 2010. Former shadow housing minister. Her portfolio directly relates to the two highest-community-heat bills currently tracked by Poli.",
  },
  {
    role:"Minister for Climate Change and Energy", name:"Chris Bowen", portfolio:"Climate & Energy", party:"ALP", electorate:"McMahon, NSW", since:"May 2022",
    emoji:"🌱",
    what:"Responsible for Australia's climate policy including the 82% renewables by 2030 target, the Capacity Investment Scheme, the Safeguard Mechanism, and energy market transition.",
    covers:["82% renewable electricity target by 2030","Capacity Investment Scheme (CIS)","Safeguard Mechanism (industrial emissions)","ARENA and CEFC (clean energy finance)","Gas market regulation","Net zero 2050 policy framework","Carbon Credit scheme"],
    budget:"$24.9 billion in clean energy investments over the forward estimates",
    keyPolicies:["Rewiring the Nation (electricity grid)","Safeguard Mechanism reforms","Hydrogen strategy","Electric vehicle strategy","Offshore wind zones"],
    relevantBills:[2,5],
    background:"Former Treasurer under Rudd/Gillard. Lost his seat in 2013. Returned in 2016. Now one of the most prominent climate voices in the government. Has visited Ukraine multiple times on energy resilience.",
  },
  {
    role:"Minister for the NDIS", name:"Bill Shorten", portfolio:"NDIS", party:"ALP", electorate:"Maribyrnong, VIC", since:"May 2022",
    emoji:"♿",
    what:"Oversees the National Disability Insurance Scheme — Australia's $42 billion support system for people with permanent and significant disabilities. Responsible for the NDIS Review implementation.",
    covers:["NDIS eligibility and plans","NDIA (National Disability Insurance Agency)","NDIS Quality and Safeguards Commission","Early childhood intervention","Foundational supports (outside NDIS)","Disability employment services"],
    budget:"$42 billion and growing — the fastest-growing federal program",
    keyPolicies:["NDIS Back on Track reforms","Early childhood approach","Registered provider framework","Foundational supports with states"],
    relevantBills:[4],
    background:"Former ALP leader who lost the 2019 election. Championed the original creation of the NDIS under Gillard. Now responsible for reforming the scheme he helped build.",
  },
  {
    role:"Minister for Trade and Tourism", name:"Don Farrell", portfolio:"Trade", party:"ALP", electorate:"SA Senate", since:"May 2022",
    emoji:"✈️",
    what:"Manages Australia's trade relationships, free trade agreements, export promotion, and inbound tourism strategy.",
    covers:["Free trade agreements (AUSFTA, ChAFTA, etc.)","World Trade Organization representation","Export Finance Australia","Austrade (export promotion)","Tourism Australia","Wine Australia"],
    budget:"$1.3 billion",
    keyPolicies:["China trade relationship normalisation","India free trade agreement","Critical minerals export strategy","Post-COVID tourism recovery"],
    relevantBills:[],
    background:"SA Senator and ALP powerbroker. Led normalisation of trade with China after the Coalition-era tensions — overseeing removal of Chinese tariffs on Australian barley, wine, and beef.",
  },
  {
    role:"Minister for Home Affairs", name:"Clare O'Neil", portfolio:"Home Affairs", party:"ALP", electorate:"Hotham, VIC", since:"May 2022",
    emoji:"🔒",
    what:"Oversees domestic security, border protection, immigration policy, cybersecurity, and emergency management.",
    covers:["Australian Border Force","Immigration and visa system","Cybersecurity (Australian Signals Directorate coordination)","ASIO (with PM)","Emergency Management Australia","Counter-terrorism policy","Migration policy and numbers"],
    budget:"$4.8 billion",
    keyPolicies:["Cybersecurity strategy 2023–2030","Migration strategy review","Post-Nauru offshore processing transition","Cyber incident reporting legislation"],
    relevantBills:[],
    background:"Former shadow treasurer. Took over Home Affairs mid-term after Clare O'Neil replaced Karen Andrews. Has been outspoken on cybersecurity following major corporate breaches (Medibank, Optus).",
  },
  {
    role:"Minister for Industry and Science", name:"Ed Husic", portfolio:"Industry", party:"ALP", electorate:"Chifley, NSW", since:"May 2022",
    emoji:"⚙️",
    what:"Responsible for Australian industry development, science policy, space, and the National Reconstruction Fund which supports sovereign manufacturing capability.",
    covers:["National Reconstruction Fund ($15B)","Advanced manufacturing policy","CSIRO and science agencies","Australian Space Agency","Critical technologies (AI, quantum)","Buy Australian plan","Industry policy"],
    budget:"$2.1 billion (plus $15B NRF)",
    keyPolicies:["National Reconstruction Fund","Made in Australia plan","AI policy framework","Quantum strategy","Critical minerals processing"],
    relevantBills:[],
    background:"First Muslim minister in Australian Cabinet history. Western Sydney MP representing one of Australia's most diverse electorates. Previously shadow minister for the digital economy.",
  },
  {
    role:"Minister for Agriculture, Fisheries and Forestry", name:"Murray Watt", portfolio:"Agriculture", party:"ALP", electorate:"QLD Senate", since:"May 2022",
    emoji:"🌾",
    what:"Responsible for Australia's agricultural sector, biosecurity, fisheries, and forestry. Manages the interface between rural industries and environmental policy.",
    covers:["Farm sector support and drought assistance","Biosecurity Australia (import controls)","Fisheries management","Forestry policy","Agricultural trade (with Trade Minister)","Live animal export","Murray-Darling Basin Plan"],
    budget:"$1.9 billion",
    keyPolicies:["Murray-Darling Basin Plan completion","Live sheep export phase-out","Biosecurity levy reform","Foot and mouth disease preparedness"],
    relevantBills:[],
    background:"QLD Senator. Previously held Emergency Management portfolio. Oversaw controversial live sheep export ban — a significant moment for animal welfare advocates and rural communities.",
  },
];

// Electorate historical data
const ELECTORATE_HISTORY = {
  Melbourne: { state:"VIC", current:"Adam Bandt (GRN)", margins:[{ year:2022,alp:26,lnp:13,grn:42,ind:10,other:9 },{ year:2019,alp:30,lnp:18,grn:39,ind:6,other:7 },{ year:2016,alp:35,lnp:21,grn:36,ind:4,other:4 }], twoParty:[{ year:2022, grn:61, lnp:39 },{ year:2019, grn:56, lnp:44 },{ year:2016, grn:54, lnp:46 }], classification:"Safe Greens", swing:"+3.2% to GRN" },
  Kooyong:   { state:"VIC", current:"Monique Ryan (IND)", margins:[{ year:2022,alp:15,lnp:38,grn:17,ind:26,other:4 },{ year:2019,alp:16,lnp:55,grn:18,ind:6,other:5 }], twoParty:[{ year:2022, ind:51, lnp:49 },{ year:2019, lnp:56, ind:44 }], classification:"Marginal Independent", swing:"+5.1% to IND" },
  Grayndler: { state:"NSW", current:"Anthony Albanese (ALP)", margins:[{ year:2022,alp:53,lnp:8,grn:28,ind:5,other:6 },{ year:2019,alp:50,lnp:10,grn:29,ind:5,other:6 }], twoParty:[{ year:2022, alp:68, grn:32 },{ year:2019, alp:65, grn:35 }], classification:"Safe ALP", swing:"+2.8% to ALP" },
  Berowra:   { state:"NSW", current:"Julian Leeser (LNP)", margins:[{ year:2022,alp:25,lnp:52,grn:10,ind:8,other:5 },{ year:2019,alp:22,lnp:57,grn:9,ind:6,other:6 }], twoParty:[{ year:2022, lnp:62, alp:38 },{ year:2019, lnp:66, alp:34 }], classification:"Safe LNP", swing:"+4.2% to ALP" },
};

// Party consistency data (said vs did)
const CONSISTENCY_DATA = {
  ALP:[
    { mp:"Anthony Albanese", date:"Oct 2019", said:"'We will not weaken negative gearing rules — that policy is done.'", did:"No negative gearing reform introduced in government.", verdict:"Consistent", note:"PM kept election commitment after 2019 loss made reform politically toxic." },
    { mp:"Jim Chalmers", date:"Aug 2023", said:"'The Stage 3 tax cuts are legislated, they are not our policy, we'll deliver them.'", did:"Restructured Stage 3 tax cuts in February 2024, redirecting benefit to lower incomes.", verdict:"Changed position", note:"Position changed after Treasury modelling showed distributional concerns." },
  ],
  LNP:[
    { mp:"Peter Dutton", date:"Sep 2022", said:"'Nuclear energy is the only technology that delivers 24/7 reliable zero-emissions power at scale.'", did:"Introduced nuclear feasibility bill and maintained position consistently.", verdict:"Consistent", note:"Policy position held through multiple media appearances." },
    { mp:"Angus Taylor", date:"Feb 2023", said:"'We will keep gas in the mix and not introduce any carbon price, ever.'", did:"Voted against all carbon pricing legislation and gas restriction measures.", verdict:"Consistent", note:"Voting record aligns fully with stated position." },
  ],
  Greens:[
    { mp:"Adam Bandt", date:"Jun 2023", said:"'We will not vote for any housing bill that doesn't address negative gearing.'", did:"Voted against the Help to Buy bill when negative gearing reform was excluded.", verdict:"Consistent", note:"Maintained negotiating position through Senate debate." },
    { mp:"Sarah Hanson-Young", date:"Mar 2024", said:"'Any deal on the NDIS must protect current participants from having their plans cut.'", did:"Voted against NDIS reform bill citing inadequate participant protections.", verdict:"Consistent", note:"Greens voted as a block against the bill." },
  ],
};

const ELECTORATE_DB = [
  { terms:["3000","3001","3002","melbourne","cbd","southbank","docklands"], electorate:"Melbourne", state:"VIC", mp:{ name:"Adam Bandt", party:"GRN", role:"Member for Melbourne · Greens Leader", since:2010, margin:8.4, votes:{1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay"} } },
  { terms:["3056","3057","3058","brunswick","coburg","fawkner"], electorate:"Wills", state:"VIC", mp:{ name:"Peter Khalil", party:"ALP", role:"Member for Wills", since:2016, margin:14.2, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["3181","3182","3183","prahran","st kilda","south yarra","toorak","windsor"], electorate:"Macnamara", state:"VIC", mp:{ name:"Kate Ashmor", party:"LNP", role:"Member for Macnamara", since:2025, margin:1.8, votes:{1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye"} } },
  { terms:["3121","3122","3123","richmond","hawthorn","burnley"], electorate:"Kooyong", state:"VIC", mp:{ name:"Monique Ryan", party:"IND", role:"Member for Kooyong · Independent", since:2022, margin:5.1, votes:{1:"aye",2:"nay",3:"aye",4:"aye",5:"aye",6:"nay"} } },
  { terms:["3144","3145","3146","malvern","glen iris","caulfield"], electorate:"Higgins", state:"VIC", mp:{ name:"Michelle Ananda-Rajah", party:"ALP", role:"Member for Higgins", since:2022, margin:3.2, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["2000","2001","2009","sydney","haymarket","pyrmont","ultimo"], electorate:"Sydney", state:"NSW", mp:{ name:"Tara Moriarty", party:"ALP", role:"Member for Sydney", since:2022, margin:11.3, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["2036","2037","2038","2040","2041","newtown","glebe","balmain","rozelle","leichhardt","enmore"], electorate:"Grayndler", state:"NSW", mp:{ name:"Anthony Albanese", party:"ALP", role:"Prime Minister · Member for Grayndler", since:1996, margin:17.8, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"aye",6:"nay"} } },
  { terms:["2060","2061","2062","north sydney","milsons point","neutral bay","crows nest"], electorate:"North Sydney", state:"NSW", mp:{ name:"Kylea Tink", party:"IND", role:"Member for North Sydney · Independent", since:2022, margin:4.3, votes:{1:"aye",2:"nay",3:"aye",4:"aye",5:"aye",6:"nay"} } },
  { terms:["2074","2075","2076","turramurra","pymble","gordon","wahroonga","hornsby"], electorate:"Berowra", state:"NSW", mp:{ name:"Julian Leeser", party:"LNP", role:"Member for Berowra", since:2016, margin:12.1, votes:{1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye"} } },
  { terms:["2150","2151","2152","parramatta","westmead","north rocks"], electorate:"Parramatta", state:"NSW", mp:{ name:"Andrew Charlton", party:"ALP", role:"Member for Parramatta", since:2022, margin:3.4, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["4000","4001","4006","brisbane","spring hill","fortitude valley","new farm"], electorate:"Brisbane", state:"QLD", mp:{ name:"Stephen Bates", party:"GRN", role:"Member for Brisbane", since:2022, margin:3.9, votes:{1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay"} } },
  { terms:["4101","4102","4103","west end","south brisbane","woolloongabba","annerley"], electorate:"Griffith", state:"QLD", mp:{ name:"Max Chandler-Mather", party:"GRN", role:"Member for Griffith", since:2022, margin:2.1, votes:{1:"aye",2:"nay",3:"aye",4:"nay",5:"aye",6:"nay"} } },
  { terms:["4217","4218","4219","surfers paradise","broadbeach","burleigh","gold coast"], electorate:"McPherson", state:"QLD", mp:{ name:"Karen Andrews", party:"LNP", role:"Member for McPherson", since:2010, margin:9.7, votes:{1:"nay",2:"aye",3:"nay",4:"aye",5:"nay",6:"aye"} } },
  { terms:["5000","5001","5006","adelaide","north adelaide","prospect","bowden"], electorate:"Adelaide", state:"SA", mp:{ name:"Steve Georganas", party:"ALP", role:"Member for Adelaide", since:2004, margin:6.8, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["6000","6001","6003","perth","northbridge","east perth","subiaco"], electorate:"Perth", state:"WA", mp:{ name:"Patrick Gorman", party:"ALP", role:"Member for Perth · Assistant Minister", since:2019, margin:9.2, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["6150","6151","6152","fremantle","east fremantle","beaconsfield","south fremantle"], electorate:"Fremantle", state:"WA", mp:{ name:"Josh Wilson", party:"ALP", role:"Member for Fremantle", since:2016, margin:13.6, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
  { terms:["6009","6010","6011","cottesloe","claremont","nedlands","dalkeith"], electorate:"Curtin", state:"WA", mp:{ name:"Kate Chaney", party:"IND", role:"Member for Curtin · Independent", since:2022, margin:3.8, votes:{1:"aye",2:"nay",3:"aye",4:"aye",5:"aye",6:"nay"} } },
  { terms:["2600","2601","2602","canberra","braddon","ainslie","reid","turner","barton"], electorate:"Canberra", state:"ACT", mp:{ name:"Alicia Payne", party:"ALP", role:"Member for Canberra", since:2019, margin:10.4, votes:{1:"aye",2:"nay",3:"nay",4:"aye",5:"nay",6:"nay"} } },
];

const findElectorate = q => {
  const s = q.toLowerCase().trim();
  if (s.length < 3) return null;
  return ELECTORATE_DB.find(e => e.terms.some(t => t.includes(s) || s.includes(t)) || e.electorate.toLowerCase().includes(s) || e.mp.name.toLowerCase().includes(s)) || null;
};

// ── Micro-components ──────────────────────────────────────────────────────────
const Divider = ({ my=16 }) => <div style={{ borderTop:`1px solid ${C.border}`, margin:`${my}px 0` }} />;

const Tag = ({ children, color=C.accent, bg, border }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:600, color, background:bg||color+"18", border:`1px solid ${border||color+"33"}` }}>
    {children}
  </span>
);

const StatusPill = ({ status }) => {
  const cfg = { Active:{color:C.green,bg:C.greenSoft,dot:C.green,label:"Active law"}, Proposed:{color:C.amber,bg:C.amberSoft,dot:C.amber,label:"Proposed"}, Legislation:{color:C.blue,bg:C.blueSoft,dot:C.blue,label:"In parliament"} }[status] || { color:C.faint, bg:C.surface, dot:C.faint, label:status };
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color }}><span style={{ width:5, height:5, borderRadius:"50%", background:cfg.dot }} />{cfg.label}</span>;
};

const PartyPill = ({ party }) => {
  const c = PARTY_COLOR[party]||C.mid;
  return <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, color:c, border:`1px solid ${c}30`, background:`${c}0D` }}>{party}</span>;
};

const CategoryPill = ({ cat }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:500, color:C.mid, border:`1px solid ${C.border}`, background:C.surface }}>{cat}</span>
);

const SectionLabel = ({ children, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
    <div style={{ width:3, height:14, borderRadius:99, background:color||C.accent, flexShrink:0 }} />
    <div style={{ fontSize:11, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.09em" }}>{children}</div>
  </div>
);

// ── Fade transition ───────────────────────────────────────────────────────────
function FadeTab({ activeKey, children }) {
  const [display, setDisplay] = useState(activeKey);
  const [visible, setVisible] = useState(true);
  const prev = useRef(activeKey);
  useEffect(() => {
    if (activeKey === prev.current) return;
    setVisible(false);
    const t = setTimeout(() => { setDisplay(activeKey); prev.current = activeKey; setVisible(true); }, 140);
    return () => clearTimeout(t);
  }, [activeKey]);
  return (
    <div style={{ opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(6px)", transition:"opacity 0.18s ease, transform 0.18s ease" }}>
      {children(display)}
    </div>
  );
}

// ── Splash screen ─────────────────────────────────────────────────────────────
// Full-bleed logo + loading animation shown for ~1.3s on first load, before
// the app fades into the home tab underneath the intro tour overlay.
function SplashScreen() {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:300, background:C.white,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"Inter,sans-serif", animation:"splashOut 0.4s ease 1.1s forwards",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes splashOut { from { opacity:1; } to { opacity:0; visibility:hidden; } }
        @keyframes dotPulse { 0%,80%,100% { transform:scale(0.6); opacity:0.35; } 40% { transform:scale(1); opacity:1; } }
      `}</style>
      <svg width={130} height={46} viewBox="0 0 130 46" style={{ display:"block", marginBottom:22 }}>
        <text x="0" y="34" fontFamily="Inter,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif" fontWeight="600" fontSize="34" fill={C.ink} letterSpacing="-0.025em">Poli</text>
        <circle cx="54" cy="8" r="3.6" fill={C.accent} />
      </svg>
      <div style={{ display:"flex", gap:7 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{ width:8, height:8, borderRadius:"50%", background:C.accent, display:"inline-block", animation:`dotPulse 1.1s ${i*0.15}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  );
}

// ── Intro tour ────────────────────────────────────────────────────────────────
// A focused popup shown over a dimmed, non-interactive home tab. Walks through
// the app's mission, then 3 core nav features, then hands control back to the
// person on the real home screen. Postcode capture (used to pre-fill the MP
// lookup) lives inside the "Find your MP" step so that feature stays intact.
function IntroTour({ onComplete }) {
  const [step, setStep]         = useState(0);
  const [postcode, setPostcode] = useState("");
  const [pcError, setPcError]   = useState(false);

  const screens = [
    { kind:"welcome", eyebrow:"Welcome to", title:"Poli", body:"Australia's civic intelligence platform — making federal politics understandable, trackable, and actionable for every Australian, in real time. No jargon. No spin. Just what's actually happening in parliament.", visual:"🏛️", cta:"Show me around" },
    { kind:"feature", eyebrow:"Policies", title:"Every bill, in plain English", body:"Live federal bills translated out of legal jargon, with who it affects, what's hidden in the fine print, and where every party stands.", visual:"📋", cta:"Next" },
    { kind:"feature", eyebrow:"My MP",    title:"See how your MP really votes", body:"Enter your suburb or postcode and Poli shows your representative's actual voting record — and whether it matches your views.", visual:"📍", cta:"Next", showPostcode:true },
    { kind:"feature", eyebrow:"Community",title:"Your voice, counted",          body:"Record your position on any bill anonymously. Poli aggregates real-time community sentiment alongside official polling.", visual:"🗳️", cta:"Explore Poli", isLast:true },
  ];
  const screen = screens[step];

  const handleCta = () => {
    if (screen.isLast) {
      if (postcode && !/^\d{4}$/.test(postcode)) { setPcError(true); return; }
      onComplete(postcode || null);
    } else setStep(s => s + 1);
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:250,
      background:"rgba(247,247,247,0.72)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
      animation:"introFadeIn 0.35s ease",
    }}>
      <style>{`@keyframes introFadeIn { from { opacity:0; } to { opacity:1; } } @keyframes introCardIn { from { opacity:0; transform:translateY(10px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
      <div style={{ width:"100%", maxWidth:420, background:C.white, borderRadius:24, border:`1px solid ${C.border}`, boxShadow:"0 24px 70px rgba(0,0,0,0.14)", display:"flex", flexDirection:"column", overflow:"hidden", animation:"introCardIn 0.35s ease" }}>
        <div style={{ display:"flex", justifyContent:"center", gap:6, paddingTop:28 }}>
          {screens.map((_,i) => <div key={i} style={{ width:i===step?22:7, height:7, borderRadius:99, background:i===step?C.accent:i<step?C.accentMid:C.border, transition:"all 0.3s" }} />)}
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"30px 36px 8px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:18 }}>{screen.visual}</div>
          <div style={{ fontSize:11, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:6 }}>{screen.eyebrow}</div>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:screen.kind==="welcome"?34:24, color:C.ink, lineHeight:1.2, marginBottom:14 }}>{screen.title}</div>
          <p style={{ fontSize:14, color:C.mid, lineHeight:1.65, maxWidth:320, marginBottom:screen.showPostcode?18:26 }}>{screen.body}</p>
          {screen.showPostcode && (
            <div style={{ width:"100%", maxWidth:260, marginBottom:22 }}>
              <input value={postcode} onChange={e=>{setPostcode(e.target.value);setPcError(false);}} placeholder="Postcode, e.g. 3056" maxLength={4} inputMode="numeric"
                style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:`1.5px solid ${pcError?C.red:C.border}`, fontSize:15, color:C.ink, background:C.surface, outline:"none", textAlign:"center", letterSpacing:"0.06em" }} />
              {pcError && <div style={{ fontSize:11, color:C.red, marginTop:5 }}>Please enter a valid 4-digit postcode</div>}
              <div style={{ fontSize:11, color:C.faint, marginTop:6 }}>Optional — pre-fills your MP lookup. Not stored.</div>
            </div>
          )}
        </div>
        <div style={{ padding:"6px 36px 32px" }}>
          <button onClick={handleCta} onMouseEnter={e=>e.currentTarget.style.background=C.accentDark} onMouseLeave={e=>e.currentTarget.style.background=C.accent} style={{ width:"100%", padding:"14px", background:C.accent, border:"none", borderRadius:14, fontSize:15, fontWeight:700, color:"#fff", cursor:"pointer" }}>
            {screen.cta}{!screen.isLast && " →"}
          </button>
          {!screen.isLast && <button onClick={()=>onComplete(null)} style={{ width:"100%", padding:"10px", marginTop:4, background:"none", border:"none", fontSize:12.5, color:C.faint, cursor:"pointer" }}>Skip tour</button>}
        </div>
      </div>
    </div>
  );
}

// ── Policy Card (button-only voting) ─────────────────────────────────────────
function PolicyCard({ policy, onVote, alerts, onToggleAlert }) {
  const [vote, setVote]         = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover]       = useState(false);
  const alertOn = alerts?.includes(policy.id);
  const castVote = pos => { setVote(pos); onVote?.(policy.id, pos); };

  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{ background:C.white, border:`1px solid ${hover?C.borderDark:C.border}`, borderRadius:20, padding:"22px 24px", marginBottom:16, boxShadow:hover?"0 4px 16px rgba(0,0,0,0.06)":"0 1px 3px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s, border-color 0.2s", breakInside:"avoid" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <PartyPill party={policy.party} /><StatusPill status={policy.status} /><CategoryPill cat={policy.category} />
          {policy.colLiving && <Tag color={C.teal}>Cost of living</Tag>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {vote && <span style={{ fontSize:11, fontWeight:600, color:vote==="support"?C.green:C.red, background:vote==="support"?C.greenSoft:C.redSoft, padding:"3px 10px", borderRadius:99 }}>{vote==="support"?"You support":"You oppose"}</span>}
          <button onClick={()=>onToggleAlert?.(policy.id)} title={alertOn?"Remove alert":"Track this bill"} style={{ background:alertOn?C.accentSoft:C.surface, border:`1px solid ${alertOn?C.accentMid:C.border}`, borderRadius:8, padding:"5px 8px", cursor:"pointer", fontSize:13, color:alertOn?C.accent:C.faint }}>
            {alertOn?"🔔":"🔕"}
          </button>
        </div>
      </div>
      <div style={{ display:"flex", gap:20, alignItems:"flex-start", marginBottom:16 }}>
        <div style={{ flexShrink:0, textAlign:"center" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:52, lineHeight:1, color:policy.support>50?C.green:policy.oppose>50?C.red:C.ink }}>{policy.support}<span style={{ fontSize:24, color:C.faint }}>%</span></div>
          <div style={{ fontSize:10, color:C.faint, fontWeight:500, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>support</div>
          <div style={{ fontSize:10, color:policy.trendDir==="up"?C.green:C.red, fontWeight:600, marginTop:4 }}>{policy.trendDir==="up"?"▲":"▼"} {policy.trend}</div>
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontFamily:"'Instrument Serif',serif", fontSize:19, fontWeight:400, color:C.ink, margin:"0 0 8px", lineHeight:1.3 }}>{policy.title}</h3>
          <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.6 }}>{policy.plain}</p>
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", height:6, borderRadius:99, overflow:"hidden", background:C.border, gap:"1px" }}>
          <div style={{ width:`${policy.support}%`, background:C.green, borderRadius:"99px 0 0 99px" }} />
          <div style={{ width:`${policy.neutral}%`, background:C.surfaceB }} />
          <div style={{ width:`${policy.oppose}%`, background:C.red, borderRadius:"0 99px 99px 0" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, fontSize:11, color:C.faint }}>
          <span style={{ color:C.green, fontWeight:600 }}>{policy.support}% support</span>
          <span>{policy.neutral}% neutral</span>
          <span style={{ color:C.red, fontWeight:600 }}>{policy.oppose}% oppose</span>
        </div>
      </div>
      <div style={{ background:C.surface, borderRadius:12, padding:"12px 14px", marginBottom:14, borderLeft:`3px solid ${C.accent}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>What this means for you</div>
        <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.6 }}>{policy.means}</p>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>setExpanded(x=>!x)} style={{
          flex:1, padding:"10px", borderRadius:10,
          border:`1.5px solid ${expanded?C.accent:C.border}`,
          background:expanded?C.accentSoft:"none",
          cursor:"pointer", fontSize:12, fontWeight:600,
          color:expanded?C.accent:C.mid,
          transition:"all 0.15s",
        }}>
          {expanded ? "Less detail ↑" : "Full detail ↓"}
        </button>
        {!vote ? (
          <><button onClick={()=>castVote("support")} style={{ padding:"9px 18px", borderRadius:10, border:`1px solid ${C.greenMid}`, background:C.greenSoft, cursor:"pointer", fontSize:12, fontWeight:600, color:C.green }}>Support</button>
          <button onClick={()=>castVote("oppose")} style={{ padding:"9px 18px", borderRadius:10, border:`1px solid ${C.redMid}`, background:C.redSoft, cursor:"pointer", fontSize:12, fontWeight:600, color:C.red }}>Oppose</button></>
        ) : (
          <button onClick={()=>setVote(null)} style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontSize:12, color:C.faint }}>Change</button>
        )}
      </div>
      {expanded && <PolicyDetail policy={policy} />}
    </div>
  );
}

// ── Full policy detail panel (tabbed briefing) ────────────────────────────────
const STAGE_PIPELINE = ["Introduced","Second reading","Committee","Third reading","Royal Assent"];

const TYPE_META = {
  unrelated:{ label:"Unrelated provision",  color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE", icon:"⚠" },
  expanded: { label:"Scope expansion",       color:C.amber,   bg:C.amberSoft, border:"#FDE68A", icon:"↗" },
  delegated:{ label:"Delegated to Minister", color:C.red,     bg:C.redSoft,   border:C.redMid,  icon:"⚙" },
  sunset:   { label:"Removes protection",    color:"#0891B2", bg:"#ECFEFF",   border:"#A5F3FC", icon:"↓" },
};
const SEVERITY_META = {
  high:  { label:"High concern",   color:C.red,   bg:C.redSoft   },
  medium:{ label:"Medium concern", color:C.amber, bg:C.amberSoft },
  low:   { label:"Low concern",    color:C.faint, bg:C.surface   },
};

function PolicyDetail({ policy }) {
  const [section, setSection] = useState("overview");
  const hidden     = policy.hiddenProvisions || [];
  const highCount  = hidden.filter(h => h.severity === "high").length;

  const sections = [
    { id:"overview",   label:"Overview"        },
    { id:"hidden",     label:"Hidden in bill",  count:hidden.length, alert:highCount > 0 },
    { id:"impact",     label:"Who's affected"  },
    { id:"debate",     label:"The debate"      },
    { id:"parliament", label:"Parliament"      },
  ];

  const impactColor = d => d==="positive"?C.green:d==="direct"?C.accent:d==="mixed"?C.amber:d==="none"?C.faint:C.blue;
  const impactBg    = d => d==="positive"?C.greenSoft:d==="direct"?C.accentSoft:d==="mixed"?C.amberSoft:d==="none"?C.surface:C.blueSoft;
  const posColor    = p => p==="support"?C.green:p==="oppose"?C.red:p==="conditional"?C.amber:C.blue;
  const posBg       = p => p==="support"?C.greenSoft:p==="oppose"?C.redSoft:p==="conditional"?C.amberSoft:C.blueSoft;
  const posLabel    = p => p==="support"?"Supports":p==="oppose"?"Opposes":p==="conditional"?"Conditional":"Mixed";

  return (
    <div style={{ marginTop:14, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>

      {/* Section nav */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.surface, overflowX:"auto", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flexShrink:0, padding:"12px 16px", background:"none", border:"none",
            borderBottom:`2.5px solid ${section===s.id?C.accent:"transparent"}`,
            fontSize:12, fontWeight:section===s.id?700:500,
            color:section===s.id?C.accent:C.faint,
            cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap",
            display:"inline-flex", alignItems:"center", gap:6,
          }}>
            {s.label}
            {s.count > 0 && (
              <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:18, height:18, borderRadius:99, padding:"0 4px", fontSize:9, fontWeight:800, background:s.alert?C.red:C.amber, color:"#fff" }}>{s.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding:"18px 20px", background:C.white }}>

        {/* OVERVIEW */}
        {section==="overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:8, marginBottom:16 }}>
              {[
                { label:"Bill", value:policy.meta?.billNumber },
                { label:"Minister", value:policy.meta?.portfolioMinister },
                { label:"Chamber", value:policy.meta?.chamber },
                { label:"Introduced", value:policy.meta?.introduced },
              ].map(m => (
                <div key={m.label} style={{ background:C.surface, borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:C.faint, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>{m.label}</div>
                  <div style={{ fontSize:12, color:C.ink, fontWeight:500, lineHeight:1.4 }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Fiscal impact</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.ink, marginBottom:4 }}>{policy.fiscal?.budgetImpact}</div>
              <div style={{ fontSize:12, color:C.mid, marginBottom:6 }}>{policy.fiscal?.perHousehold}</div>
              <div style={{ fontSize:10, color:C.faint }}>Source: {policy.fiscal?.costSource}</div>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Key provisions</div>
              {policy.provisions?.map((p, i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:10, alignItems:"flex-start" }}>
                  <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.accent, flexShrink:0, width:20, marginTop:1 }}>{i+1}</span>
                  <span style={{ fontSize:13, color:C.mid, lineHeight:1.6 }}>{p}</span>
                </div>
              ))}
            </div>

            {policy.relatedBills?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Related legislation</div>
                {policy.relatedBills.map((b,i) => <div key={i} style={{ fontSize:12, color:C.blue, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>{b}</div>)}
              </div>
            )}

            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Sources</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {policy.sources?.map((s,i) => <span key={i} style={{ fontSize:11, color:C.blue, background:C.blueSoft, padding:"4px 10px", borderRadius:99, fontWeight:500 }}>{s.label} ↗</span>)}
              </div>
            </div>

            {/* Prior attempts */}
            {policy.priorAttempts?.length > 0 && (
              <div style={{ background:C.purpleSoft, border:`1px solid ${"#7C3AED"}22`, borderRadius:12, padding:"14px", marginTop:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>📜 This has been tried before</div>
                {policy.priorAttempts.map((p,i) => (
                  <div key={i} style={{ marginBottom:i<policy.priorAttempts.length-1?12:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.ink, marginBottom:4 }}>{p.year} — {p.title}</div>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:p.outcome==="Passed"?C.greenSoft:C.redSoft, color:p.outcome==="Passed"?C.green:C.red, marginBottom:6 }}>{p.outcome}</div>
                    <div style={{ fontSize:12, color:C.mid, lineHeight:1.55 }}>{p.notes}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Donation context */}
            {policy.donations?.length > 0 && (
              <div style={{ background:C.amberSoft, border:`1px solid ${C.amber}22`, borderRadius:12, padding:"14px", marginTop:12 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>💰 Donation context</div>
                <p style={{ fontSize:11, color:C.mid, margin:"0 0 10px", lineHeight:1.5 }}>Groups with financial interests in this policy area made the following donations in recent election cycles. Poli shows correlation, not causation.</p>
                {policy.donations.map((d,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:i<policy.donations.length-1?`1px solid ${C.border}`:"none" }}>
                    <div><div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{d.donor}</div><div style={{ fontSize:10, color:C.faint }}>{d.cycle} · to {d.party}</div></div>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.amber }}>{d.amount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HIDDEN IN BILL */}
        {section==="hidden" && (
          <div>
            <div style={{ background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>What is this section?</div>
              <p style={{ fontSize:13, color:C.mid, margin:"0 0 8px", lineHeight:1.6 }}>Bills often contain provisions that go beyond — or are unrelated to — their stated purpose. Poli's AI layer cross-references each bill's operative clauses against its second reading speech to surface provisions that deserve closer attention.</p>
              <p style={{ fontSize:12, color:C.faint, margin:0 }}>These are flagged, not judged. Draw your own conclusions.</p>
            </div>

            {hidden.length === 0 && (
              <div style={{ background:C.greenSoft, border:`1px solid ${C.greenMid}`, borderRadius:12, padding:"20px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.green, marginBottom:6 }}>No significant concerns flagged</div>
                <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.6 }}>This bill's provisions appear consistent with its stated purpose.</p>
              </div>
            )}

            {hidden.map((h, i) => {
              const tMeta = TYPE_META[h.type] || TYPE_META.unrelated;
              const sMeta = SEVERITY_META[h.severity] || SEVERITY_META.low;
              return (
                <div key={i} style={{ border:`1.5px solid ${h.severity==="high"?C.redMid:h.severity==="medium"?"#FDE68A":C.border}`, borderRadius:14, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ background:h.severity==="high"?C.redSoft:h.severity==="medium"?C.amberSoft:C.surface, padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:6 }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:tMeta.bg, color:tMeta.color, border:`1px solid ${tMeta.border}` }}>{tMeta.icon} {tMeta.label}</span>
                      <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:600, background:sMeta.bg, color:sMeta.color }}>{sMeta.label}</span>
                      <span style={{ fontSize:10, color:C.faint, fontFamily:"monospace" }}>{h.clause}</span>
                    </div>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.ink, lineHeight:1.3 }}>{h.title}</div>
                  </div>
                  <div style={{ padding:"14px 16px", background:C.white }}>
                    <div style={{ fontSize:13, color:C.mid, lineHeight:1.65, marginBottom:12 }}>{h.summary}</div>
                    <div style={{ background:C.accentSoft, borderLeft:`3px solid ${C.accent}`, borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:h.scrutinyFlag?12:0 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Why it matters</div>
                      <div style={{ fontSize:13, color:C.mid, lineHeight:1.6 }}>{h.whyItMatters}</div>
                    </div>
                    {h.scrutinyFlag && (
                      <div style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"10px 12px", background:C.surface, borderRadius:8 }}>
                        <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>📋</span>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>Formally flagged by</div>
                          <div style={{ fontSize:12, color:C.blue, fontWeight:500 }}>{h.scrutinyFlag}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ background:C.surface, borderRadius:10, padding:"12px 14px", marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.faint, marginBottom:4 }}>About this analysis</div>
              <p style={{ fontSize:11, color:C.faint, margin:0, lineHeight:1.6 }}>Provisions are identified by cross-referencing operative bill clauses against the stated purpose in the second reading speech and explanatory memorandum. Senate Scrutiny of Bills Committee references are sourced from published Scrutiny Digests.</p>
            </div>
          </div>
        )}

        {/* WHO'S AFFECTED */}
        {section==="impact" && (
          <div>
            <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>How this policy would affect different groups of Australians, based on the bill's explanatory memorandum and independent modelling.</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:12 }}>
            {policy.cohorts?.map((c,i) => (
              <div key={i} style={{ display:"flex", gap:12, padding:"14px", background:C.surface, borderRadius:12, alignItems:"flex-start" }}>
                <div style={{ flexShrink:0 }}>
                  <span style={{ display:"inline-block", padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:impactBg(c.impact), color:impactColor(c.impact), whiteSpace:"nowrap" }}>{c.impact.charAt(0).toUpperCase()+c.impact.slice(1)}</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink, marginBottom:4 }}>{c.group}</div>
                  <div style={{ fontSize:13, color:C.mid, lineHeight:1.55 }}>{c.detail}</div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* THE DEBATE */}
        {section==="debate" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Party positions</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:10 }}>
              {policy.partyPositions?.map((p,i) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:C.surface, borderRadius:12 }}>
                  <div style={{ flexShrink:0, width:52 }}>
                    <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:posBg(p.position), color:posColor(p.position) }}>{p.party}</span>
                    <div style={{ fontSize:10, color:posColor(p.position), fontWeight:600, marginTop:3, paddingLeft:2 }}>{posLabel(p.position)}</div>
                  </div>
                  <div style={{ fontSize:13, color:C.mid, lineHeight:1.55 }}>{p.note}</div>
                </div>
              ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Arguments for</div>
                {policy.arguments?.for.map((a,i) => (
                  <div key={i} style={{ background:C.greenSoft, border:`1px solid ${C.greenMid}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontSize:12, color:C.ink, lineHeight:1.55 }}>{a}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Arguments against</div>
                {policy.arguments?.against.map((a,i) => (
                  <div key={i} style={{ background:C.redSoft, border:`1px solid ${C.redMid}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontSize:12, color:C.ink, lineHeight:1.55 }}>{a}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop:12, padding:"10px 14px", background:C.surface, borderRadius:10 }}>
              <div style={{ fontSize:11, color:C.faint, lineHeight:1.5 }}>Arguments sourced from Hansard second reading speeches and opposition responses. Poli does not endorse either position.</div>
            </div>
          </div>
        )}

        {/* PARLIAMENT */}
        {section==="parliament" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Parliamentary pipeline</div>
              <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto", paddingBottom:4 }}>
                {STAGE_PIPELINE.map((stage, i) => {
                  const passed  = i < (policy.currentStageIndex || 0);
                  const current = i === (policy.currentStageIndex || 0);
                  return (
                    <div key={stage} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                        <div style={{ width:28, height:28, borderRadius:"50%", background:passed?C.green:current?C.accent:C.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:passed||current?"#fff":C.faint, border:current?`2px solid ${C.accentDark}`:"none" }}>
                          {passed?"✓":i+1}
                        </div>
                        <div style={{ fontSize:9, color:passed?C.green:current?C.accent:C.faint, fontWeight:current?700:400, textAlign:"center", maxWidth:56, lineHeight:1.3 }}>{stage}</div>
                      </div>
                      {i < STAGE_PIPELINE.length-1 && <div style={{ width:20, height:2, background:i<(policy.currentStageIndex||0)?C.green:C.border, margin:"0 2px", marginBottom:20, flexShrink:0 }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>History</div>
            {policy.timeline?.map((t,i) => {
              const isPending = t.date === "Pending";
              return (
                <div key={i} style={{ display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:isPending?C.border:C.accent, border:isPending?`2px solid ${C.border}`:"none", marginTop:3 }} />
                    {i < (policy.timeline?.length||0)-1 && <div style={{ width:1, background:C.border, flex:1, minHeight:20, marginTop:3 }} />}
                  </div>
                  <div style={{ flex:1, paddingBottom:6 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:isPending?C.faint:C.mid }}>{t.date}</span>
                      <span style={{ fontSize:10, color:C.faint }}>{t.chamber}</span>
                    </div>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:isPending?C.faint:C.ink, marginBottom:3 }}>{t.stage}</div>
                    <div style={{ fontSize:12, color:C.faint, lineHeight:1.5 }}>{t.note}</div>
                  </div>
                </div>
              );
            })}

            <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px", marginTop:4 }}>
              <div style={{ fontSize:11, color:C.faint }}>Data sourced from Australian Parliament House bills database. Last updated {policy.meta?.lastUpdated}.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── MP Contact Tool ───────────────────────────────────────────────────────────
function ContactModal({ mp, userVotes, onClose }) {
  const [sent, setSent]       = useState(false);
  const [selPolicy, setSelPolicy] = useState(null);
  const [customMsg, setCustomMsg] = useState("");

  const templates = POLICIES.filter(p => userVotes?.[p.id]).map(p => {
    const uv  = userVotes[p.id];
    const mpv = mp.votes?.[p.id];
    const aligned = (mpv==="aye"&&uv==="support")||(mpv==="nay"&&uv==="oppose");
    return { policy:p, uv, mpv, aligned };
  });

  const getTemplate = (item) => `Dear ${mp.name.split(" ")[0]},\n\nI am writing as your constituent regarding the ${item.policy.title}.\n\nI ${item.uv} this policy because ${item.policy.means.toLowerCase()}\n\n${item.aligned ? `I was pleased to see that you also ${item.mpv==="aye"?"supported":"opposed"} this measure.` : `However, I note that you voted to ${item.mpv==="aye"?"support":"oppose"} this policy, which does not reflect my view as a constituent.`}\n\nI would welcome your response on this matter.\n\nYours sincerely,\n[Your name]\n[Your suburb]`;

  useEffect(() => {
    if (templates.length > 0) { setSelPolicy(templates[0]); setCustomMsg(getTemplate(templates[0])); }
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:C.white, borderRadius:20, width:"100%", maxWidth:560, maxHeight:"88vh", overflow:"auto", padding:"28px 28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink }}>Contact {mp.name.split(" ")[0]}</div>
          <button onClick={onClose} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:13, color:C.mid }}>✕</button>
        </div>
        {!sent ? (
          <>
            {templates.length > 0 && (
              <>
                <SectionLabel>Select a policy to write about</SectionLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
                  {templates.map((t,i) => (
                    <button key={i} onClick={()=>{setSelPolicy(t);setCustomMsg(getTemplate(t));}} style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${selPolicy===t?C.accent:C.border}`, background:selPolicy===t?C.accentSoft:C.surface, cursor:"pointer", fontSize:12, fontWeight:600, color:selPolicy===t?C.accent:C.ink, textAlign:"left", display:"flex", justifyContent:"space-between" }}>
                      <span>{t.policy.title}</span>
                      <span style={{ fontSize:10, color:t.aligned?C.green:C.red, fontWeight:700 }}>{t.aligned?"✓ Aligned":"✗ Disagrees"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <SectionLabel>Your message</SectionLabel>
            <textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={10}
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:12, color:C.ink, lineHeight:1.6, resize:"vertical", outline:"none", fontFamily:"Inter,sans-serif", marginBottom:12 }} />
            <div style={{ background:C.blueSoft, borderRadius:10, padding:"10px 12px", marginBottom:16, fontSize:11, color:C.blue, lineHeight:1.5 }}>
              📧 This drafts an email for you to send directly. Poli does not send emails on your behalf.
            </div>
            <button onClick={()=>setSent(true)} style={{ width:"100%", padding:"13px", borderRadius:12, background:C.accent, border:"none", cursor:"pointer", fontSize:14, fontWeight:700, color:"#fff" }}>
              Copy message ↗
            </button>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✉️</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:8 }}>Message ready to send</div>
            <p style={{ fontSize:13, color:C.mid, lineHeight:1.6, marginBottom:20 }}>Paste this into an email to {mp.name}'s parliamentary office. MP office emails follow the format: [FirstName.LastName]@aph.gov.au</p>
            <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:99, border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontSize:13, color:C.mid }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bill Alerts Tab ───────────────────────────────────────────────────────────
function AlertsTab({ alerts, onToggleAlert }) {
  const tracked = POLICIES.filter(p => alerts.includes(p.id));
  const FAKE_FEED = [
    { policyId:1, date:"2 hrs ago",  event:"Passed Senate Committee", note:"Senate Economics Committee recommended with minor amendments. Third reading expected next week." },
    { policyId:3, date:"1 day ago",  event:"Second reading debate",   note:"Debate resumed after recess. 4 senators have now spoken. Vote expected within 2 sitting weeks." },
    { policyId:5, date:"3 days ago", event:"New polling",             note:"Support dropped 2pts to 39% following media coverage of coal export ban provisions." },
  ].filter(f => alerts.includes(f.policyId));

  return (
    <div>
      <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:16, padding:"14px 16px", marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.accent, marginBottom:4 }}>Bill progress alerts</div>
        <p style={{ fontSize:12, color:C.mid, margin:0, lineHeight:1.5 }}>Track bills you care about. Tap 🔔 on any policy card to add it here. You'll see updates when bills advance, pass, or polling changes significantly.</p>
      </div>

      {tracked.length === 0 ? (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"32px 20px", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔕</div>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.ink, marginBottom:6 }}>No bills tracked yet</div>
          <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.5 }}>Tap the 🔔 icon on any policy card to track it here and receive status updates.</p>
        </div>
      ) : (
        <>
          {FAKE_FEED.length > 0 && (
            <>
              <SectionLabel>Recent updates</SectionLabel>
              {FAKE_FEED.map((f,i) => {
                const pol = POLICIES.find(p=>p.id===f.policyId);
                return (
                  <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:C.accent, background:C.accentSoft, padding:"2px 8px", borderRadius:99 }}>{f.event}</span>
                      <span style={{ fontSize:10, color:C.faint }}>{f.date}</span>
                    </div>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink, marginBottom:4 }}>{pol?.title}</div>
                    <div style={{ fontSize:12, color:C.mid, lineHeight:1.5 }}>{f.note}</div>
                  </div>
                );
              })}
              <Divider my={16} />
            </>
          )}
          <SectionLabel>Tracked bills ({tracked.length})</SectionLabel>
          {tracked.map(p => (
            <div key={p.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink, marginBottom:4 }}>{p.title}</div>
                <div style={{ display:"flex", gap:6 }}><PartyPill party={p.party} /><StatusPill status={p.status} /></div>
              </div>
              <button onClick={()=>onToggleAlert(p.id)} style={{ background:C.redSoft, border:`1px solid ${C.redMid}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:11, color:C.red, fontWeight:600, flexShrink:0 }}>Remove</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Electorate Comparison ─────────────────────────────────────────────────────
function ElectorateComparison() {
  const [selected, setSelected] = useState("Kooyong");
  const data = ELECTORATE_HISTORY[selected];
  const electorates = Object.keys(ELECTORATE_HISTORY);

  const partyBar = (votes, year) => {
    const colors = { alp:C.red, lnp:C.blue, grn:C.green, ind:C.teal, other:C.faint };
    return (
      <div>
        <div style={{ display:"flex", height:24, borderRadius:6, overflow:"hidden", marginBottom:4 }}>
          {Object.entries(colors).map(([k,c]) => votes[k]>0 && (
            <div key={k} title={`${k.toUpperCase()}: ${votes[k]}%`} style={{ width:`${votes[k]}%`, background:c, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {votes[k]>8 && <span style={{ fontSize:9, fontWeight:700, color:"#fff" }}>{votes[k]}%</span>}
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, color:C.faint }}>{year} primary vote</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Electorate history</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.5 }}>Historical primary votes and two-party preferred results. Compare how electorates have shifted over time.</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {electorates.map(e => (
            <button key={e} onClick={()=>setSelected(e)} style={{ padding:"6px 14px", borderRadius:99, border:`1.5px solid ${selected===e?C.accent:C.border}`, background:selected===e?C.accentSoft:C.surface, fontSize:12, fontWeight:600, color:selected===e?C.accent:C.mid, cursor:"pointer" }}>{e}</button>
          ))}
        </div>
      </div>

      {data && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
            <div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink }}>{selected}</div>
              <div style={{ fontSize:12, color:C.faint }}>{data.state} · {data.current}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:data.classification.includes("Safe ALP")?C.redSoft:data.classification.includes("Safe LNP")?C.blueSoft:data.classification.includes("Greens")?C.greenSoft:C.amberSoft, color:data.classification.includes("Safe ALP")?C.red:data.classification.includes("Safe LNP")?C.blue:data.classification.includes("Greens")?C.green:C.amber }}>{data.classification}</span>
              <div style={{ fontSize:11, color:C.faint, marginTop:4 }}>{data.swing}</div>
            </div>
          </div>

          <SectionLabel>Primary vote history</SectionLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            {data.margins.map(m => <div key={m.year}>{partyBar(m, m.year)}</div>)}
          </div>

          <SectionLabel>Two-party preferred</SectionLabel>
          {data.twoParty.map(t => {
            const keys = Object.keys(t).filter(k=>k!=="year");
            const colors = { alp:C.red, lnp:C.blue, grn:C.green, ind:C.teal };
            return (
              <div key={t.year} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", height:18, borderRadius:4, overflow:"hidden", marginBottom:3 }}>
                  {keys.map(k => <div key={k} style={{ width:`${t[k]}%`, background:colors[k]||C.faint, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {t[k]>15&&<span style={{ fontSize:9, fontWeight:700, color:"#fff" }}>{k.toUpperCase()} {t[k]}%</span>}
                  </div>)}
                </div>
                <div style={{ fontSize:10, color:C.faint }}>{t.year}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Party Consistency ─────────────────────────────────────────────────────────
function ConsistencyTracker() {
  const [party, setParty] = useState("ALP");
  const data = CONSISTENCY_DATA[party] || [];

  return (
    <div>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Said vs. did</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.5 }}>Cross-referencing what politicians say publicly against how they actually vote. Sourced from Hansard and media statements.</p>
        <div style={{ display:"flex", gap:8 }}>
          {["ALP","LNP","Greens"].map(p => <button key={p} onClick={()=>setParty(p)} style={{ padding:"6px 16px", borderRadius:99, border:`1.5px solid ${party===p?(PARTY_COLOR[p]||C.accent):C.border}`, background:party===p?`${PARTY_COLOR[p]}0D`:C.surface, fontSize:12, fontWeight:700, color:party===p?(PARTY_COLOR[p]||C.accent):C.mid, cursor:"pointer" }}>{p}</button>)}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))", gap:12 }}>
      {data.map((item,i) => (
        <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.ink }}>{item.mp}</div>
            <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:99, background:item.verdict==="Consistent"?C.greenSoft:C.redSoft, color:item.verdict==="Consistent"?C.green:C.red }}>
              {item.verdict==="Consistent"?"✓ Consistent":"⚠ Changed position"}
            </span>
          </div>
          <div style={{ background:C.surface, borderLeft:`3px solid ${C.blue}`, borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Said · {item.date}</div>
            <div style={{ fontSize:13, color:C.ink, fontStyle:"italic", lineHeight:1.55 }}>{item.said}</div>
          </div>
          <div style={{ background:C.surface, borderLeft:`3px solid ${item.verdict==="Consistent"?C.green:C.red}`, borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:item.verdict==="Consistent"?C.green:C.red, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Did</div>
            <div style={{ fontSize:13, color:C.ink, lineHeight:1.55 }}>{item.did}</div>
          </div>
          <div style={{ fontSize:11, color:C.faint, lineHeight:1.5 }}>Context: {item.note}</div>
        </div>
      ))}
      </div>
    </div>
  );
}

// ── Budget Tracker ────────────────────────────────────────────────────────────
function BudgetTracker() {
  const [filter, setFilter] = useState("All");
  const filtered = filter==="Cost of living" ? BUDGET_MEASURES.filter(m=>m.colLiving) : BUDGET_MEASURES;
  const dirColor = d => d==="expenditure"?C.red:d==="revenue"?C.amber:C.green;
  const dirLabel = d => d==="expenditure"?"Spending":"saving"?"Saving":"Revenue impact";

  return (
    <div>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Federal Budget 2024–25</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.5 }}>Key budget measures in plain English — what was funded, what was cut, and what it means for you.</p>
        <div style={{ display:"flex", gap:8 }}>
          {["All","Cost of living"].map(f => <button key={f} onClick={()=>setFilter(f)} style={{ padding:"6px 14px", borderRadius:99, border:`1.5px solid ${filter===f?C.accent:C.border}`, background:filter===f?C.accentSoft:C.surface, fontSize:12, fontWeight:600, color:filter===f?C.accent:C.mid, cursor:"pointer" }}>{f}</button>)}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))", gap:12 }}>
      {filtered.map(m => (
        <div key={m.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                <Tag color={dirColor(m.direction)}>{m.direction==="expenditure"?"Spending":m.direction==="saving"?"Saving":"Revenue"}</Tag>
                <Tag color={C.faint}>{m.portfolio}</Tag>
                {m.colLiving && <Tag color={C.teal}>Cost of living</Tag>}
              </div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:17, color:C.ink, marginBottom:4 }}>{m.title}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:dirColor(m.direction) }}>{m.amount}</div>
              <div style={{ fontSize:10, color:C.faint }}>{m.year}</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 10px", lineHeight:1.6 }}>{m.plain}</p>
          <div style={{ background:C.surface, borderLeft:`3px solid ${C.accent}`, borderRadius:"0 8px 8px 0", padding:"9px 12px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>What this means for you</div>
            <div style={{ fontSize:12, color:C.mid, lineHeight:1.5 }}>{m.impact}</div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

// ── Community Deliberation ────────────────────────────────────────────────────
function DeliberationTab() {
  const [selPolicy, setSelPolicy] = useState(POLICIES[0]);
  const [response, setResponse]   = useState("");
  const [submitted, setSubmitted] = useState({});

  const THEMES = {
    1:[{ theme:"Renter protections first", count:312, pct:41 },{ theme:"Supply is the real problem", count:228, pct:30 },{ theme:"Needs stronger enforcement", count:152, pct:20 },{ theme:"Other", count:68, pct:9 }],
    2:[{ theme:"Study is reasonable, no rush", count:198, pct:45 },{ theme:"Too expensive, renewables are cheaper", count:156, pct:36 },{ theme:"Needed for energy security", count:62, pct:14 },{ theme:"Other", count:22, pct:5 }],
    3:[{ theme:"Remove all negative gearing", count:267, pct:51 },{ theme:"Grandfathering is fair", count:189, pct:36 },{ theme:"Will reduce rental supply", count:55, pct:10 },{ theme:"Other", count:14, pct:3 }],
    5:[{ theme:"Must act faster on climate", count:445, pct:58 },{ theme:"2035 is too fast", count:234, pct:30 },{ theme:"Keep coal for export only", count:78, pct:10 },{ theme:"Other", count:17, pct:2 }],
  };

  const themes = THEMES[selPolicy.id] || [{ theme:"No responses yet", count:0, pct:100 }];
  const done   = submitted[selPolicy.id];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16, alignItems:"start" }}>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Community deliberation</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.5 }}>Beyond support or oppose — what do Australians actually think the solution should be? Anonymous free-text responses are clustered into themes by AI.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {POLICIES.slice(0,4).map(p => (
            <button key={p.id} onClick={()=>setSelPolicy(p)} style={{ padding:"10px 14px", borderRadius:10, border:`1.5px solid ${selPolicy.id===p.id?C.accent:C.border}`, background:selPolicy.id===p.id?C.accentSoft:C.surface, cursor:"pointer", fontSize:12, fontWeight:600, color:selPolicy.id===p.id?C.accent:C.ink, textAlign:"left" }}>
              {p.title}
            </button>
          ))}
        </div>
      </div>

      <div>
      {/* Community themes */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 20px", marginBottom:14 }}>
        <SectionLabel>Community themes — {selPolicy.title}</SectionLabel>
        {themes.map((t,i) => (
          <div key={i} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
              <span style={{ color:C.ink, fontWeight:500 }}>{t.theme}</span>
              <span style={{ color:C.faint, fontSize:11 }}>{t.count} responses</span>
            </div>
            <div style={{ height:6, background:C.border, borderRadius:99, overflow:"hidden" }}>
              <div style={{ width:`${t.pct}%`, height:"100%", background: i===0?C.accent:i===1?C.blue:i===2?C.green:C.faint, borderRadius:99, transition:"width 0.6s" }} />
            </div>
            <div style={{ fontSize:10, color:C.faint, marginTop:2 }}>{t.pct}%</div>
          </div>
        ))}
      </div>

      {/* Submit response */}
      {!done ? (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 20px" }}>
          <SectionLabel>Add your view</SectionLabel>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 12px", lineHeight:1.5 }}>What do you think the right approach is? Anonymous. Max 200 characters.</p>
          <textarea value={response} onChange={e=>setResponse(e.target.value.slice(0,200))} placeholder="e.g. We need to build more homes before capping rents, otherwise landlords will just sell up..." rows={3}
            style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, color:C.ink, lineHeight:1.6, resize:"none", outline:"none", fontFamily:"Inter,sans-serif", marginBottom:8 }} />
          <div style={{ fontSize:10, color:C.faint, marginBottom:10, textAlign:"right" }}>{response.length}/200</div>
          <button onClick={()=>{if(response.trim())setSubmitted(s=>({...s,[selPolicy.id]:true}));}} disabled={!response.trim()} style={{ width:"100%", padding:"11px", borderRadius:10, background:response.trim()?C.accent:"#ccc", border:"none", cursor:response.trim()?"pointer":"not-allowed", fontSize:13, fontWeight:600, color:"#fff" }}>
            Submit anonymously
          </button>
        </div>
      ) : (
        <div style={{ background:C.greenSoft, border:`1px solid ${C.greenMid}`, borderRadius:16, padding:"18px 20px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.green, marginBottom:6 }}>Response recorded</div>
          <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.5 }}>Your response will be clustered with similar views in the next AI analysis run (every 24 hours).</p>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

// ── Cabinet Cards component ───────────────────────────────────────────────────

function CabinetCards() {
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("All");

  const filters = ["All","Economy","Security","Social","Environment"];
  const filterMap = {
    Economy:     ["PM&C","Treasury","Finance","Trade","Industry"],
    Security:    ["Defence","Home Affairs","AG","DFAT"],
    Social:      ["Health","Education","Housing","NDIS","Agriculture"],
    Environment: ["Climate & Energy","Agriculture"],
  };

  const filtered = filter === "All" ? CABINET : CABINET.filter(m =>
    filterMap[filter]?.some(f => m.portfolio.includes(f))
  );

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:14, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:99, border:`1.5px solid ${filter===f?C.accent:C.border}`, background:filter===f?C.accentSoft:C.white, fontSize:12, fontWeight:filter===f?600:500, color:filter===f?C.accent:C.mid, cursor:"pointer", transition:"all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(420px, 1fr))", gap:12, alignItems:"start" }}>
      {filtered.map((m, i) => {
        const isOpen  = open === i;
        const pColor  = PARTY_COLOR[m.party] || C.mid;
        const relBills = POLICIES.filter(p => m.relevantBills?.includes(p.id));

        return (
          <div key={i} style={{
            background:C.white,
            border:`1px solid ${isOpen ? C.accent+"55" : C.border}`,
            borderRadius:16, overflow:"hidden",
            transition:"border-color 0.2s",
          }}>
            {/* Header row — always visible */}
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width:"100%", padding:"16px 18px", background:"none", border:"none",
                cursor:"pointer", display:"flex", gap:14, alignItems:"center", textAlign:"left",
              }}
            >
              {/* Emoji avatar */}
              <div style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background:`${pColor}10`, border:`1px solid ${pColor}25`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
              }}>
                {m.emoji}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.ink, lineHeight:1.2, marginBottom:3 }}>{m.name}</div>
                <div style={{ fontSize:11, color:C.mid, lineHeight:1.3 }}>{m.role}</div>
                <div style={{ display:"flex", gap:6, marginTop:5, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:pColor, background:`${pColor}0D`, border:`1px solid ${pColor}25`, padding:"2px 7px", borderRadius:99 }}>{m.party}</span>
                  <span style={{ fontSize:10, color:C.faint, background:C.surface, border:`1px solid ${C.border}`, padding:"2px 7px", borderRadius:99 }}>{m.electorate}</span>
                  <span style={{ fontSize:10, color:C.faint, background:C.surface, border:`1px solid ${C.border}`, padding:"2px 7px", borderRadius:99 }}>Since {m.since}</span>
                </div>
              </div>

              <span style={{ fontSize:14, color:C.faint, flexShrink:0 }}>{isOpen ? "↑" : "↓"}</span>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${C.border}`, background:C.surface }}>

                {/* What this role does */}
                <div style={{ padding:"16px 18px 0" }}>
                  <div style={{ background:C.white, borderRadius:12, padding:"14px", marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>What this role does</div>
                    <p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.65 }}>{m.what}</p>
                  </div>
                </div>

                {/* Portfolio responsibilities */}
                <div style={{ padding:"0 18px", marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Portfolio covers</div>
                  {m.covers.map((item, ci) => (
                    <div key={ci} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:7 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:pColor, marginTop:5, flexShrink:0 }} />
                      <span style={{ fontSize:13, color:C.mid, lineHeight:1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Budget */}
                <div style={{ padding:"0 18px", marginBottom:12 }}>
                  <div style={{ background:C.amberSoft, border:`1px solid ${C.amber}22`, borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Annual budget</div>
                    <div style={{ fontSize:13, color:C.ink, fontFamily:"'Instrument Serif',serif" }}>{m.budget}</div>
                  </div>
                </div>

                {/* Key policies */}
                <div style={{ padding:"0 18px", marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Key current policies</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {m.keyPolicies.map((kp, ki) => (
                      <span key={ki} style={{ fontSize:11, fontWeight:500, color:C.blue, background:C.blueSoft, border:`1px solid ${C.blue}20`, padding:"4px 10px", borderRadius:99 }}>{kp}</span>
                    ))}
                  </div>
                </div>

                {/* Relevant Poli bills */}
                {relBills.length > 0 && (
                  <div style={{ padding:"0 18px", marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Related bills tracked on Poli</div>
                    {relBills.map(p => (
                      <div key={p.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px", marginBottom:6, display:"flex", gap:10, alignItems:"center" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:p.support>50?C.green:C.red, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:C.ink, marginBottom:2 }}>{p.title}</div>
                          <div style={{ fontSize:11, color:C.faint }}>{p.support}% community support · {p.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Background */}
                <div style={{ padding:"0 18px 16px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Background</div>
                  <p style={{ fontSize:12, color:C.faint, margin:0, lineHeight:1.65, fontStyle:"italic" }}>{m.background}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── Parliament Map ────────────────────────────────────────────────────────────
function ParliamentMap() {
  const [active, setActive] = useState("overview");

  const sections = [
    { id:"overview",    label:"How it works"         },
    { id:"house",       label:"The House"            },
    { id:"senate",      label:"The Senate"           },
    { id:"cabinet",     label:"Cabinet"              },
    { id:"bill",        label:"Bill to law"          },
    { id:"voting",      label:"Preferential voting"  },
  ];

  // ── House of Representatives — hemicycle SVG matching Wikimedia chart style ──
  // 150 seats (2025 election), horseshoe arc, party-coloured dots
  // ALP: red, LNP: blue, GRN: green, IND: teal, Other: grey
  // Seat order: LNP left → crossbench top → ALP right (Westminster convention)
  const HouseSeats = () => {
    const W = 560, H = 320, CX = 280, CY = 300;
    const ROWS = [
      { r:100, seats:36 },
      { r:127, seats:46 },
      { r:154, seats:68 },
    ];
    // 2025 composition: ALP 94, LNP (Lib+Nat) 43, GRN 1, IND 10, Other 2 = 150
    const ORDER = [
      ...Array(43).fill({ color:"#1A56A0", label:"LNP" }),
      ...Array(1).fill({ color:"#1D8348", label:"GRN" }),
      ...Array(6).fill({ color:"#0D766E", label:"IND" }),
      ...Array(4).fill({ color:"#9CA3AF", label:"IND" }),
      ...Array(2).fill({ color:"#888",    label:"Other" }),
      ...Array(94).fill({ color:"#CC2936", label:"ALP" }),
    ];
    const START = 195 * Math.PI / 180;
    const END   = 345 * Math.PI / 180;
    const ARC   = END - START;
    const total = ROWS.reduce((s, r) => s + r.seats, 0);
    let dots = [], idx = 0;
    ROWS.forEach(row => {
      for (let i = 0; i < row.seats && idx < ORDER.length; i++, idx++) {
        const frac  = row.seats > 1 ? i / (row.seats - 1) : 0.5;
        const angle = START + frac * ARC;
        dots.push({ x: CX + row.r * Math.cos(angle), y: CY + row.r * Math.sin(angle), ...ORDER[idx] });
      }
    });
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", display:"block" }}>
          {/* Subtle chamber floor */}
          <path d={`M ${CX - 175} ${CY} A 175 175 0 0 1 ${CX + 175} ${CY} Z`} fill="#F4F4F2" />
          {/* Speaker label */}
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontFamily="Inter,sans-serif" fontWeight="500">Speaker</text>
          {/* Wing labels */}
          <text x={CX - 200} y={CY - 60} textAnchor="middle" fontSize="9" fill="#1A56A0" fontFamily="Inter,sans-serif" fontWeight="700">OPPOSITION</text>
          <text x={CX + 200} y={CY - 60} textAnchor="middle" fontSize="9" fill="#CC2936" fontFamily="Inter,sans-serif" fontWeight="700">GOVERNMENT</text>
          <text x={CX} y={54} textAnchor="middle" fontSize="9" fill="#6B6B6B" fontFamily="Inter,sans-serif" fontWeight="600">CROSSBENCH</text>
          {/* Seats */}
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={5.5} fill={d.color} opacity={0.88} />
          ))}
        </svg>
        {/* Legend */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 18px", marginTop:10 }}>
          {[["#CC2936","ALP","94 seats · Government"],["#1A56A0","LNP","43 seats · Opposition"],["#1D8348","Greens","1 seat"],["#0D766E","Independents","10 seats"],["#888","Other","2 seats"]].map(([c,p,s]) => (
            <div key={p} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }} />
              <span style={{ fontSize:11, color:"#1A1A1A", fontWeight:600 }}>{p}</span>
              <span style={{ fontSize:11, color:"#AFAFAF" }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, background:"#F7F7F7", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#6B6B6B", lineHeight:1.6 }}>
          <strong style={{ color:"#1A1A1A" }}>Westminster seating:</strong> Government (ALP) sits to the <strong style={{ color:"#1A1A1A" }}>Speaker's right</strong>, Opposition (LNP) to the left. Crossbench MPs — Greens and independents — occupy the curved top of the horseshoe. The PM and Opposition Leader face each other across the central table.
        </div>
        <div style={{ fontSize:10, color:"#AFAFAF", marginTop:6, textAlign:"right" }}>
          CC BY-SA 4.0 · Composition: 2025 Australian federal election
        </div>
      </div>
    );
  };

  // ── Senate — hemicycle SVG matching Wikimedia chart style ─────────────────
  // 76 senators: ALP 26, LNP 30, GRN 11, IND 5, Other 4
  const SenateSeats = () => {
    const W = 560, H = 290, CX = 280, CY = 270;
    const ROWS = [
      { r:88,  seats:22 },
      { r:113, seats:28 },
      { r:138, seats:26 },
    ];
    // Order: LNP left → GRN top-left → IND top → Other top-right → ALP right
    const ORDER = [
      ...Array(30).fill({ color:"#1A56A0" }),
      ...Array(11).fill({ color:"#1D8348" }),
      ...Array(5).fill({ color:"#0D766E" }),
      ...Array(4).fill({ color:"#9CA3AF" }),
      ...Array(26).fill({ color:"#CC2936" }),
    ];
    const START = 195 * Math.PI / 180;
    const END   = 345 * Math.PI / 180;
    const ARC   = END - START;
    let dots = [], idx = 0;
    ROWS.forEach(row => {
      for (let i = 0; i < row.seats && idx < ORDER.length; i++, idx++) {
        const frac  = row.seats > 1 ? i / (row.seats - 1) : 0.5;
        const angle = START + frac * ARC;
        dots.push({ x: CX + row.r * Math.cos(angle), y: CY + row.r * Math.sin(angle), ...ORDER[idx] });
      }
    });
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", display:"block" }}>
          <path d={`M ${CX - 158} ${CY} A 158 158 0 0 1 ${CX + 158} ${CY} Z`} fill="#FDF6F4" />
          {/* Red ochre tint — Senate is red-themed */}
          <text x={CX} y={CY - 8} textAnchor="middle" fontSize="10" fill="#9CA3AF" fontFamily="Inter,sans-serif" fontWeight="500">President</text>
          <text x={CX - 188} y={CY - 55} textAnchor="middle" fontSize="9" fill="#1A56A0" fontFamily="Inter,sans-serif" fontWeight="700">OPPOSITION</text>
          <text x={CX + 188} y={CY - 55} textAnchor="middle" fontSize="9" fill="#CC2936" fontFamily="Inter,sans-serif" fontWeight="700">GOVERNMENT</text>
          <text x={CX} y={46} textAnchor="middle" fontSize="9" fill="#6B6B6B" fontFamily="Inter,sans-serif" fontWeight="600">CROSSBENCH</text>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={6} fill={d.color} opacity={0.88} />
          ))}
        </svg>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 18px", marginTop:10 }}>
          {[["#CC2936","ALP","26 · Government"],["#1A56A0","LNP","30 · Opposition"],["#1D8348","Greens","11"],["#0D766E","Independents","5"],["#9CA3AF","Other","4"]].map(([c,p,s]) => (
            <div key={p} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }} />
              <span style={{ fontSize:11, color:"#1A1A1A", fontWeight:600 }}>{p}</span>
              <span style={{ fontSize:11, color:"#AFAFAF" }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, background:"#EBF2FB", border:"1px solid rgba(26,86,160,0.1)", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#6B6B6B", lineHeight:1.6 }}>
          <strong style={{ color:"#1A1A1A" }}>Balance of power:</strong> ALP needs 39 votes to pass legislation but holds only 26 seats. Every bill must be negotiated with the Greens or independents — giving crossbench senators like David Pocock extraordinary influence over what becomes law.
        </div>
        <div style={{ fontSize:10, color:"#AFAFAF", marginTop:6, textAlign:"right" }}>
          CC BY-SA 4.0 · Composition: 2025 Australian federal election
        </div>
      </div>
    );
  };
  // Bill lifecycle
  const BillFlow = () => {
    const stages = ["Introduced","Second reading","Committee","Third reading","Other house","Royal Assent","Law ✓"];
    const [active, setActive] = useState(2);
    return (
      <div>
        <div style={{ display:"flex", overflowX:"auto", gap:0, paddingBottom:8, marginBottom:16 }}>
          {stages.map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
              <div onClick={()=>setActive(i)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:i<active?C.green:i===active?C.accent:C.border, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:i<=active?"#fff":C.faint }}>
                  {i<active?"✓":i+1}
                </div>
                <div style={{ fontSize:8, color:i===active?C.accent:C.faint, textAlign:"center", maxWidth:50, lineHeight:1.3, fontWeight:i===active?700:400 }}>{s}</div>
              </div>
              {i<stages.length-1 && <div style={{ width:16, height:2, background:i<active?C.green:C.border, marginBottom:18, flexShrink:0 }} />}
            </div>
          ))}
        </div>
        <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:4 }}>Currently showing: {stages[active]}</div>
          <div style={{ fontSize:12, color:C.mid, lineHeight:1.6 }}>{[
            "The MP introduces the bill and gives a first reading speech outlining its purpose.",
            "The bill is debated in principle. MPs explain why they support or oppose it.",
            "A committee of MPs reviews the bill in detail, hears expert submissions, and may recommend changes.",
            "Final vote on the bill in this chamber. A simple majority is needed to pass.",
            "The bill goes to the other chamber (Senate or House) and repeats the process.",
            "Once both chambers agree, the Governor-General signs the bill into law.",
            "The Act comes into force. It is now the law of Australia.",
          ][active]}</div>
        </div>
      </div>
    );
  };

  // Preferential voting explainer
  const PrefVoting = () => {
    const [round, setRound] = useState(0);
    const rounds = [
      { title:"First preferences", votes:[{ party:"ALP", pct:38, color:C.red },{ party:"LNP", pct:34, color:C.blue },{ party:"Greens", pct:16, color:C.green },{ party:"IND", pct:12, color:C.teal }], note:"No one has a majority (50%+). The lowest candidate — IND with 12% — is eliminated and their preferences distributed." },
      { title:"After round 1: IND eliminated", votes:[{ party:"ALP", pct:44, color:C.red },{ party:"LNP", pct:36, color:C.blue },{ party:"Greens", pct:20, color:C.green }], note:"IND preferences flowed mostly to Greens and some to ALP. Still no majority. Greens with 20% are eliminated." },
      { title:"After round 2: Greens eliminated", votes:[{ party:"ALP", pct:56, color:C.red },{ party:"LNP", pct:44, color:C.blue }], note:"Greens preferences flowed mostly to ALP. ALP now has 56% — a majority. ALP wins the seat." },
    ];
    const r = rounds[round];
    return (
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {rounds.map((_,i) => <button key={i} onClick={()=>setRound(i)} style={{ flex:1, padding:"8px 4px", borderRadius:8, border:`1.5px solid ${round===i?C.accent:C.border}`, background:round===i?C.accentSoft:C.surface, fontSize:11, fontWeight:round===i?700:500, color:round===i?C.accent:C.mid, cursor:"pointer" }}>Round {i+1}</button>)}
        </div>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.ink, marginBottom:12 }}>{r.title}</div>
        {r.votes.map(v => (
          <div key={v.party} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
              <span style={{ fontWeight:600, color:v.color }}>{v.party}</span>
              <span style={{ color:C.faint }}>{v.pct}%</span>
            </div>
            <div style={{ height:20, background:C.border, borderRadius:4, overflow:"hidden" }}>
              <div style={{ width:`${v.pct}%`, height:"100%", background:v.color, borderRadius:4, transition:"width 0.4s", display:"flex", alignItems:"center" }}>
                {v.pct>8&&<span style={{ fontSize:10, fontWeight:700, color:"#fff", paddingLeft:6 }}>{v.pct}%</span>}
              </div>
            </div>
          </div>
        ))}
        <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px", marginTop:12, fontSize:12, color:C.mid, lineHeight:1.6 }}>
          <strong style={{ color:C.ink }}>What's happening:</strong> {r.note}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Section picker */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:16, WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {sections.map(s => <button key={s.id} onClick={()=>setActive(s.id)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:99, border:`1.5px solid ${active===s.id?C.accent:C.border}`, background:active===s.id?C.accentSoft:C.white, fontSize:12, fontWeight:active===s.id?700:500, color:active===s.id?C.accent:C.mid, cursor:"pointer" }}>{s.label}</button>)}
      </div>

      {/* Overview */}
      {active==="overview" && (
        <div>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink, marginBottom:8 }}>How Australian parliament works</div>
            <p style={{ fontSize:13, color:C.mid, lineHeight:1.65, marginBottom:14 }}>Australia has a bicameral (two-chamber) parliament. Both chambers must agree on a law before it can be passed.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { title:"House of Representatives", seats:151, desc:"Where government is formed. The party (or coalition) with the most seats forms government. Your MP sits here.", color:C.red },
                { title:"The Senate",               seats:76,  desc:"The 'house of review'. Reviews and can block legislation. 12 senators per state, 2 per territory.", color:C.blue },
              ].map(c => (
                <div key={c.title} onClick={()=>setActive(c.title.includes("House")?"house":"senate")} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px", cursor:"pointer" }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:c.color, marginBottom:4 }}>{c.seats} seats</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:4 }}>{c.title}</div>
                  <div style={{ fontSize:11, color:C.mid, lineHeight:1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:14, padding:"14px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:18 }}>💡</span>
            <div style={{ fontSize:13, color:C.mid, lineHeight:1.6 }}>The key difference: the PM and Cabinet come from the <strong style={{ color:C.ink }}>House</strong>. But many bills only pass because the <strong style={{ color:C.ink }}>Senate</strong> crossbench supports them. This is why minor parties and independents have enormous power.</div>
          </div>
        </div>
      )}

      {/* House */}
      {active==="house" && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>House of Representatives</div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>151 elected members — one per federal electorate. The party with 76+ seats forms government. Seats are arranged in a horseshoe facing the Speaker's chair.</p>
          <HouseSeats />
        </div>
      )}

      {/* Senate */}
      {active==="senate" && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>The Senate</div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>76 senators — 12 from each state, 2 each from ACT and NT. Elected by proportional representation, which is why minor parties hold significant power here.</p>
          <SenateSeats />
        </div>
      )}

      {/* Cabinet */}
      {active==="cabinet" && (
        <div>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:8 }}>The Cabinet</div>
            <p style={{ fontSize:13, color:C.mid, margin:"0 0 12px", lineHeight:1.6 }}>The Cabinet is the senior decision-making body of government. The PM selects ministers from elected MPs in the governing party. They collectively decide all major policy. Tap any minister to see what their portfolio covers.</p>
            <div style={{ background:C.accentSoft, border:`1px solid ${C.accentMid}`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.mid, lineHeight:1.5 }}>
              💡 <strong style={{ color:C.ink }}>How Cabinet works:</strong> Each minister is individually responsible to parliament for their portfolio. If Cabinet collectively decides a policy, all ministers must publicly support it — or resign. This is called "cabinet solidarity."
            </div>
          </div>
          <CabinetCards />
        </div>
      )}

      {/* Bill lifecycle */}
      {active==="bill" && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>How a bill becomes law</div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>Tap each stage to see what happens at that point in the process.</p>
          <BillFlow />
        </div>
      )}

      {/* Preferential voting */}
      {active==="voting" && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Preferential voting</div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>Australia uses preferential voting. You rank candidates in order. If no one gets 50%+, the lowest candidate is eliminated and their votes redistributed. Step through a worked example:</p>
          <PrefVoting />
        </div>
      )}
    </div>
  );
}

// ── My MP Tab (enhanced with contact) ────────────────────────────────────────
function MyMPTab({ userVotes, initialPostcode, initialView }) {
  const [query, setQuery]       = useState(initialPostcode||"");
  const [result, setResult]     = useState(initialPostcode?findElectorate(initialPostcode):null);
  const [searched, setSearched] = useState(!!initialPostcode);
  const [loading, setLoading]   = useState(false);
  const [showContact, setShowContact] = useState(false);
  // activeView driven by initialView prop from shell sub-nav, or local state
  const [activeView, setActiveView] = useState(initialView||"mp");
  useEffect(() => { if (initialView) setActiveView(initialView); }, [initialView]);

  const doSearch = q => {
    if (!q.trim()||q.trim().length<3) return;
    setLoading(true); setSearched(false);
    setTimeout(()=>{ setResult(findElectorate(q)); setSearched(true); setLoading(false); },500);
  };

  const mpColor = result?(PARTY_COLOR[result.mp.party]||C.mid):C.accent;

  const matchScore = () => {
    if (!result||!userVotes||!Object.keys(userVotes).length) return null;
    const ids = Object.keys(result.mp.votes).map(Number);
    const compared = ids.filter(id=>userVotes[id]);
    if (!compared.length) return null;
    const matches = compared.filter(id=>(result.mp.votes[id]==="aye"&&userVotes[id]==="support")||(result.mp.votes[id]==="nay"&&userVotes[id]==="oppose"));
    return { matches:matches.length, total:compared.length };
  };
  const score = result?matchScore():null;

  return (
    <div>
      {showContact && result && <ContactModal mp={result.mp} userVotes={userVotes} onClose={()=>setShowContact(false)} />}

      {/* Search */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"22px 24px", marginBottom:16 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink, marginBottom:4 }}>Find your representative</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>Enter your suburb, postcode, or electorate name.</p>
        <div style={{ display:"flex", gap:8, maxWidth:480 }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch(query)} placeholder="e.g. Brunswick, 3056, Kooyong…"
            style={{ flex:1, padding:"11px 14px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, color:C.ink, background:C.surface, outline:"none" }} />
          <button onClick={()=>doSearch(query)} style={{ padding:"11px 20px", borderRadius:10, background:C.accent, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"#fff", flexShrink:0 }}>
            {loading?"…":"Search"}
          </button>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
          {["Melbourne","Newtown","North Sydney","Brisbane","Fremantle","Canberra"].map(s=>(
            <button key={s} onClick={()=>{setQuery(s);doSearch(s);}} style={{ padding:"4px 10px", borderRadius:99, border:`1px solid ${C.border}`, background:C.surface, fontSize:11, fontWeight:500, color:C.mid, cursor:"pointer" }}>{s}</button>
          ))}
        </div>
      </div>

      {result && !loading && (
        <div style={{ marginBottom:14, background:C.surface, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.mid }}>
          Showing: <strong style={{ color:C.ink }}>{activeView==="mp"?"Your MP":activeView==="senators"?"Your senators":"Electorate history"}</strong> — use the tab above to switch views.
        </div>
      )}

      {loading && <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"32px", textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.faint }}>Looking up your electorate…</div></div>}
      {searched&&!loading&&!result && <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"28px 24px", textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:8 }}>Electorate not found</div><p style={{ fontSize:13, color:C.mid, margin:0 }}>Try a postcode, suburb name, or electorate name.</p></div>}

      {result && !loading && activeView==="mp" && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(280px, 380px) 1fr", gap:16, alignItems:"start" }}>
          <div>
          {/* MP card */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"22px 24px", marginBottom:12 }}>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:`${mpColor}0D`, color:mpColor, border:`1px solid ${mpColor}30` }}>{result.state}</span>
              <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, color:C.mid, background:C.surface, border:`1px solid ${C.border}` }}>Federal Electorate</span>
            </div>
            <div style={{ display:"flex", gap:16, alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:`${mpColor}15`, border:`1px solid ${mpColor}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:mpColor }}>{result.mp.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
              </div>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink, marginBottom:3 }}>{result.mp.name}</div>
                <div style={{ fontSize:13, color:C.mid, marginBottom:8 }}>{result.mp.role}</div>
                <div style={{ display:"flex", gap:6 }}><PartyPill party={result.mp.party} /><span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, color:C.mid, background:C.surface, border:`1px solid ${C.border}` }}>Since {result.mp.since}</span></div>
              </div>
            </div>
            <Divider my={16} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              <div style={{ background:C.surface, borderRadius:12, padding:"12px 14px" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:mpColor }}>{result.electorate}</div><div style={{ fontSize:11, color:C.faint, marginTop:2 }}>Electorate</div></div>
              <div style={{ background:C.surface, borderRadius:12, padding:"12px 14px" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:result.mp.margin<5?C.amber:C.green }}>{result.mp.margin}%</div><div style={{ fontSize:11, color:C.faint, marginTop:2 }}>{result.mp.margin<5?"Marginal ⚠":"Safe seat"}</div></div>
            </div>
            {/* Contact button */}
            <button onClick={()=>setShowContact(true)} style={{ width:"100%", padding:"12px", borderRadius:12, background:C.accent, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#fff" }}>
              ✉️ Write to {result.mp.name.split(" ")[0]}
            </button>
          </div>

          {/* Alignment score */}
          {score && (
            <div style={{ background:score.matches/score.total>=0.5?C.greenSoft:C.redSoft, border:`1px solid ${score.matches/score.total>=0.5?C.greenMid:C.redMid}`, borderRadius:16, padding:"18px 20px", display:"flex", gap:16, alignItems:"center" }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:48, color:score.matches/score.total>=0.5?C.green:C.red, lineHeight:1, flexShrink:0 }}>{score.matches}/{score.total}</div>
              <div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:17, color:C.ink, marginBottom:4 }}>Your alignment with {result.mp.name.split(" ")[0]}</div><p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.5 }}>{score.matches===score.total?"You agree on every policy you've voted on.":score.matches===0?"You disagree on every tracked policy.":`You agree on ${score.matches} of ${score.total} policies you've voted on.`}</p></div>
            </div>
          )}
          </div>

          <div>
          {/* Voting record */}
          <SectionLabel>Voting record</SectionLabel>
          {POLICIES.map(policy=>{
            const mpVote=result.mp.votes[policy.id]; const uVote=userVotes?.[policy.id];
            const forVote=mpVote==="aye";
            const aligned=uVote&&((mpVote==="aye"&&uVote==="support")||(mpVote==="nay"&&uVote==="oppose"));
            const opposed=uVote&&((mpVote==="aye"&&uVote==="oppose")||(mpVote==="nay"&&uVote==="support"));
            return (
              <div key={policy.id} style={{ background:C.white, border:`1px solid ${aligned?C.greenMid:opposed?C.redMid:C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:8, display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink, marginBottom:5 }}>{policy.title}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:600, color:forVote?C.green:C.red, background:forVote?C.greenSoft:C.redSoft, padding:"2px 8px", borderRadius:99 }}>{forVote?"✓ Voted for":"✗ Voted against"}</span>
                    {uVote&&<span style={{ fontSize:11, fontWeight:500, color:aligned?C.green:opposed?C.red:C.faint }}>{aligned?"Agrees with you":opposed?"Disagrees with you":""}</span>}
                    {!uVote&&<span style={{ fontSize:11, color:C.faint }}>Vote a policy to compare</span>}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {result && !loading && activeView==="senators" && (
        <div>
          <SenatorTracker stateOverride={result.state} />
        </div>
      )}

      {result && !loading && activeView==="comparison" && (
        <ElectorateComparison electorateOverride={result.electorate} />
      )}

      {!searched && !loading && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 20px" }}>
          <SectionLabel>How it works</SectionLabel>
          {[["01","Enter your suburb or postcode"],["02","See your federal MP and their party"],["03","Check how they voted on every tracked policy"],["04","Compare their record to your own positions"],["05","Write to them directly from the app"]].map(([n,t])=>(
            <div key={n} style={{ display:"flex", gap:14, alignItems:"center", marginBottom:12 }}>
              <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.accent, width:28, flexShrink:0 }}>{n}</span>
              <span style={{ fontSize:14, color:C.mid }}>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Senator tracker — now pulling real data from Supabase ────────────────────
// State names in Supabase (from They Vote For You) are full words for some
// and abbreviations for others depending on source formatting, so we map
// both the display buttons and the query consistently off this list.
const AU_STATES = ["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"];
const STATE_ALIASES = { NSW:["NSW"], VIC:["Victoria","VIC"], QLD:["Queensland","QLD"], WA:["WA"], SA:["SA"], TAS:["Tasmania","TAS"], ACT:["ACT"], NT:["NT"] };

function SenatorTracker({ stateOverride }) {
  const [state, setState]       = useState(stateOverride || "VIC");
  const [senators, setSenators] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const aliases = STATE_ALIASES[state] || [state];
    supabase
      .from("mps")
      .select("*")
      .eq("chamber", "senate")
      .in("state", aliases)
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setError(error.message); setSenators([]); }
        else { setSenators(data || []); }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [state]);

  return (
    <div>
      {!stateOverride && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px", marginBottom:14 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:4 }}>Your senators</div>
          <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.5 }}>Every Australian has 12 senators — 6 per state. Select your state to see who represents you in the Senate.</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {AU_STATES.map(s=><button key={s} onClick={()=>setState(s)} style={{ padding:"6px 14px", borderRadius:99, border:`1.5px solid ${state===s?C.accent:C.border}`, background:state===s?C.accentSoft:C.surface, fontSize:12, fontWeight:600, color:state===s?C.accent:C.mid, cursor:"pointer" }}>{s}</button>)}
          </div>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12, fontSize:11, color:C.faint }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }} />
        Live from Supabase
      </div>

      {loading && <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"28px", textAlign:"center", color:C.faint, fontSize:13 }}>Loading senators…</div>}

      {error && <div style={{ background:C.redSoft, border:`1px solid ${C.redMid}`, borderRadius:16, padding:"18px", color:C.red, fontSize:13 }}>Couldn't load senators: {error}</div>}

      {!loading && !error && senators.length === 0 && (
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"28px", textAlign:"center", color:C.faint, fontSize:13 }}>No senators found for {state} in the database yet.</div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:12 }}>
      {senators.map((sen) => {
        const c = PARTY_COLOR[sen.party] || C.mid;
        const attendancePct = (sen.votes_attended != null && sen.votes_possible) ? Math.round((sen.votes_attended / sen.votes_possible) * 100) : null;
        const topPolicies = Array.isArray(sen.policy_positions) ? sen.policy_positions.filter(p => p.voted).slice(0, 3) : [];
        return (
          <div key={sen.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px" }}>
            <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${c}18`, border:`1px solid ${c}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:14, color:c }}>{sen.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:16, color:C.ink, marginBottom:3 }}>{sen.name}</div>
                <div style={{ fontSize:11, color:C.mid }}>{sen.party}</div>
              </div>
            </div>

            {(attendancePct != null || sen.rebellions != null) && (
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                {attendancePct != null && (
                  <div style={{ flex:1, background:C.surface, borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:17, color:C.ink }}>{attendancePct}%</div>
                    <div style={{ fontSize:9, color:C.faint, textTransform:"uppercase", letterSpacing:"0.05em" }}>Attendance</div>
                  </div>
                )}
                {sen.rebellions != null && (
                  <div style={{ flex:1, background:C.surface, borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:17, color:C.ink }}>{sen.rebellions}</div>
                    <div style={{ fontSize:9, color:C.faint, textTransform:"uppercase", letterSpacing:"0.05em" }}>Party rebellions</div>
                  </div>
                )}
              </div>
            )}

            {topPolicies.length > 0 ? (
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:C.faint, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Voting record on key policies</div>
                {topPolicies.map((p, i) => (
                  <div key={i} style={{ marginBottom:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:2 }}>
                      <span style={{ color:C.ink }}>{p.name}</span>
                      <span style={{ color:C.faint }}>{p.agreement}%</span>
                    </div>
                    <div style={{ height:4, background:C.border, borderRadius:99, overflow:"hidden" }}>
                      <div style={{ width:`${p.agreement}%`, height:"100%", background:p.agreement>=50?C.green:C.red, borderRadius:99 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize:10, color:C.faint, fontStyle:"italic" }}>No policy voting data available yet</span>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── Parties tab ───────────────────────────────────────────────────────────────
function PartiesTab() {
  const [open, setOpen] = useState(null);
  const PARTIES = [
    { id:"ALP", name:"Australian Labor Party", short:"Labor", primary:33, twoParty:52, seats:94, color:C.red, trend:"-1", bio:"Centre-left. In government. Focus on workers' rights, Medicare, housing, and climate action." },
    { id:"LNP", name:"Liberal–National Coalition", short:"Coalition", primary:36, twoParty:48, seats:43, color:C.blue, trend:"+1", bio:"Centre-right. In opposition. Focus on economic management, defence, lower taxes, and energy." },
    { id:"GRN", name:"Australian Greens", short:"Greens", primary:14, twoParty:null, seats:4, color:C.green, trend:"+2", bio:"Progressive. Focus on climate action, housing reform, First Nations rights, and wealth taxes." },
    { id:"IND", name:"Teal Independents", short:"Teals", primary:10, twoParty:null, seats:10, color:C.teal, trend:"–", bio:"Moderate independents. Integrity, climate, gender equality. Mostly former Liberal seats." },
  ];
  return (
    <div>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"24px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink }}>Two-party preferred</div><div style={{ fontSize:12, color:C.faint, marginTop:2 }}>Aggregate · Newspoll / Essential / Roy Morgan</div></div>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:C.accent, background:C.accentSoft, border:`1px solid ${C.accentMid}`, padding:"3px 9px", borderRadius:99 }}><span style={{ width:5,height:5,borderRadius:"50%",background:C.accent }} /> Live</span>
        </div>
        <Divider my={16} />
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:48, color:C.red, lineHeight:1 }}>52</div><div style={{ fontSize:11, color:C.faint }}>ALP %</div></div>
          <div style={{ flex:1, height:10, borderRadius:99, overflow:"hidden", display:"flex", background:C.border }}><div style={{ width:"52%", background:C.red }} /><div style={{ width:"48%", background:C.blue }} /></div>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:48, color:C.blue, lineHeight:1 }}>48</div><div style={{ fontSize:11, color:C.faint }}>LNP %</div></div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))", gap:12 }}>
      {PARTIES.map(p=>{
        const isOpen=open===p.id;
        return (
          <div key={p.id} style={{ background:C.white, border:`1px solid ${isOpen?p.color+"44":C.border}`, borderRadius:16, padding:"18px 20px", transition:"border-color 0.2s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.ink }}>{p.name}</div><div style={{ fontSize:12, color:C.faint, marginTop:2 }}>{p.seats} seats · trend {p.trend}</div></div>
              <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                <div style={{ textAlign:"right" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:p.color, lineHeight:1 }}>{p.primary}%</div><div style={{ fontSize:10, color:C.faint }}>primary vote</div></div>
                <button onClick={()=>setOpen(isOpen?null:p.id)} style={{ width:32, height:32, borderRadius:99, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontSize:13, color:C.mid, display:"flex", alignItems:"center", justifyContent:"center" }}>{isOpen?"↑":"↓"}</button>
              </div>
            </div>
            <div style={{ height:4, borderRadius:99, background:C.border, overflow:"hidden", marginTop:12 }}><div style={{ width:`${Math.min(p.primary*2.4,100)}%`, height:"100%", background:p.color, borderRadius:99, transition:"width 0.7s" }} /></div>
            {p.twoParty&&<div style={{ fontSize:11, color:C.faint, marginTop:6 }}>Two-party preferred: <strong style={{ color:C.ink }}>{p.twoParty}%</strong></div>}
            {isOpen&&<><Divider my={12} /><p style={{ fontSize:13, color:C.mid, margin:0, lineHeight:1.65 }}>{p.bio}</p></>}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── Learn tab ─────────────────────────────────────────────────────────────────
const LEARN_CARDS = [
  { q:"How does preferential voting work?", a:"You number every candidate in order. If no one gets a majority of first preferences, the lowest-scoring candidates are eliminated and their votes redistributed until someone wins. Your vote is never truly wasted.", xp:50 },
  { q:"What's the difference between the House and Senate?", a:"The House of Representatives forms government — whoever has the most seats becomes PM. The Senate reviews and can block laws. Minor parties often hold the balance of power there.", xp:50 },
  { q:"How does polling actually work?", a:"Pollsters survey 1,000–2,000 people and weight the results to match the national population. There's always a ±3% margin of error. Aggregating multiple polls gives a more reliable picture.", xp:75 },
  { q:"What does the federal government actually control?", a:"Federal: income tax, Medicare, defence, immigration, welfare. State: schools, hospitals, roads, police. Local council: parks, rubbish, local planning. Many issues are split across all three.", xp:50 },
  { q:"What is two-party preferred (2PP)?", a:"Analysts calculate what the result would look like if only Labor and the Coalition were competing. It's the most reliable predictor of who forms government, even with many parties in the race.", xp:75 },
  { q:"Why do independents matter so much?", a:"They can hold the 'balance of power' in the Senate — neither major party can pass laws without their support. This gives smaller parties real influence even when they never form government.", xp:50 },
];

const GLOSSARY = {
  "Two-party preferred":"What the result would look like if only Labor and the Coalition were competing.",
  "Negative gearing":"When your investment property costs more than it earns. You can deduct that loss from your taxable income.",
  "CGT discount":"If you sell an asset after holding it 12+ months, you only pay capital gains tax on half the profit.",
  "Net zero":"When greenhouse gases produced are balanced by the amount removed. Net addition = zero.",
  "NDIS":"National Disability Insurance Scheme — government funding for Australians with permanent, significant disabilities.",
  "Moratorium":"An official pause or temporary ban on something.",
  "GDP":"Gross Domestic Product — the total value of everything a country produces in a year.",
  "Primary vote":"The first-preference vote percentage for each party, before preferences are distributed.",
};

function LearnTab({ xp=75, streak=4, onXpGain }) {
  const [done, setDone]           = useState(new Set([0]));
  const [active, setActive]       = useState(null);
  const [glossOpen, setGlossOpen] = useState(null);

  const claim = (i, pts) => { if (!done.has(i)) { setDone(d=>new Set([...d,i])); onXpGain?.(pts); } setActive(null); };
  const level  = getLevel(xp);
  const nextLv = XP_LEVELS.find(l=>l.level===level.level+1);
  const xpIn   = xp - level.minXp;
  const xpNeed = (nextLv?.minXp||level.maxXp) - level.minXp;
  const pct    = Math.min(100, (xpIn/xpNeed)*100);

  return (
    <div>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px 24px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink }}>Civic progress</div><div style={{ fontSize:12, color:C.faint, marginTop:2 }}>{done.size} of {LEARN_CARDS.length} lessons · {level.label}</div></div>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, color:C.accent, lineHeight:1 }}>{streak}</div><div style={{ fontSize:10, color:C.faint }}>streak</div></div>
            <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, color:C.ink, lineHeight:1 }}>{xp}</div><div style={{ fontSize:10, color:C.faint }}>XP</div></div>
          </div>
        </div>
        <div style={{ height:6, borderRadius:99, background:C.border, overflow:"hidden", marginBottom:5 }}><div style={{ width:`${pct}%`, height:"100%", background:C.accent, borderRadius:99, transition:"width 0.6s" }} /></div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.faint }}>
          <span>{xpIn}/{xpNeed} XP to Level {level.level+1}</span>
          {nextLv?.unlock&&<span style={{ color:C.accent, fontWeight:600 }}>🔓 {nextLv.unlock}</span>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:24, alignItems:"start" }}>
      <div>
      <SectionLabel>Lessons</SectionLabel>
      {LEARN_CARDS.map((card,i)=>{
        const isDone=done.has(i); const isActive=active===i;
        return (
          <div key={i} style={{ background:C.white, border:`1px solid ${isActive?C.accent+"44":C.border}`, borderRadius:16, padding:"16px 18px", marginBottom:10, transition:"border-color 0.2s" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:isDone?C.greenSoft:C.surface, border:`1px solid ${isDone?C.greenMid:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:isDone?C.green:C.faint, flexShrink:0 }}>{isDone?"✓":i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink, lineHeight:1.3 }}>{card.q}</div>
                <div style={{ fontSize:11, color:isDone?C.green:C.faint, marginTop:3, fontWeight:600 }}>+{card.xp} XP{isDone?" · Complete":""}</div>
              </div>
              <button onClick={()=>setActive(isActive?null:i)} style={{ width:30, height:30, borderRadius:99, border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontSize:13, color:C.mid, display:"flex", alignItems:"center", justifyContent:"center" }}>{isActive?"↑":"↓"}</button>
            </div>
            {isActive&&(<><Divider my={12} /><p style={{ fontSize:13, color:C.mid, margin:"0 0 12px", lineHeight:1.7 }}>{card.a}</p>{!isDone&&<button onClick={()=>claim(i,card.xp)} style={{ width:"100%", padding:"10px", borderRadius:10, background:C.accent, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"#fff" }}>Got it · Claim +{card.xp} XP</button>}</>)}
          </div>
        );
      })}
      </div>

      <div>
      <SectionLabel>Glossary</SectionLabel>
      {Object.entries(GLOSSARY).map(([term,def],i)=>(
        <div key={term} style={{ background:C.white, border:`1px solid ${glossOpen===i?C.accent+"44":C.border}`, borderRadius:12, marginBottom:8, overflow:"hidden" }}>
          <button onClick={()=>setGlossOpen(glossOpen===i?null:i)} style={{ width:"100%", padding:"13px 16px", background:"none", border:"none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"left" }}>
            <span style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, color:C.ink }}>{term}</span>
            <span style={{ fontSize:13, color:C.faint }}>{glossOpen===i?"↑":"↓"}</span>
          </button>
          {glossOpen===i&&<div style={{ padding:"0 16px 14px", fontSize:13, color:C.mid, lineHeight:1.65 }}>{def}</div>}
        </div>
      ))}
      </div>
      </div>
    </div>
  );
}

// ── Vote tab ──────────────────────────────────────────────────────────────────
function VoteTab() {
  const [partyVote, setPartyVote] = useState(null);
  const [topIssue, setTopIssue]   = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const issues = ["Cost of living","Housing","Climate","Healthcare","Defence","Education","Immigration","Integrity"];
  const PARTIES = [
    { id:"ALP", name:"Australian Labor Party", color:C.red },
    { id:"LNP", name:"Liberal–National Coalition", color:C.blue },
    { id:"GRN", name:"Australian Greens", color:C.green },
    { id:"IND", name:"Teal Independents / Other", color:C.teal },
    { id:"other", name:"Other / Undecided", color:C.faint },
  ];

  if (submitted) return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"32px 24px", textAlign:"center", maxWidth:520 }}>
      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:C.ink, marginBottom:8 }}>Voice recorded</div>
      <p style={{ fontSize:14, color:C.mid, lineHeight:1.6, marginBottom:20 }}>Anonymous and never stored. Your input helps Poli surface what everyday Australians actually think.</p>
      <div style={{ background:C.surface, borderRadius:14, padding:"16px 20px", textAlign:"left", marginBottom:16 }}>
        <div style={{ fontSize:11, color:C.faint, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Your responses</div>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:C.ink }}>{PARTIES.find(p=>p.id===partyVote)?.name||"Other"}</div>
        <div style={{ fontSize:13, color:C.mid, marginTop:4 }}>Top issue: {topIssue}</div>
      </div>
      <button onClick={()=>{setSubmitted(false);setPartyVote(null);setTopIssue(null);}} style={{ padding:"10px 24px", borderRadius:99, border:`1px solid ${C.border}`, background:"none", cursor:"pointer", fontSize:13, color:C.mid }}>Reset</button>
    </div>
  );

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px 24px", marginBottom:16 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink, marginBottom:4 }}>How would you vote today?</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 16px", lineHeight:1.6 }}>Anonymous · not stored · helps Poli show real-time grassroots sentiment alongside official polls</p>
        <Divider my={16} />
        <SectionLabel>Party preference</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {PARTIES.map(p=>{
            const sel=partyVote===p.id;
            return <button key={p.id} onClick={()=>setPartyVote(p.id)} style={{ padding:"13px 16px", borderRadius:12, border:`1.5px solid ${sel?p.color:C.border}`, background:sel?`${p.color}0D`:C.surface, cursor:"pointer", fontFamily:"'Instrument Serif',serif", fontSize:16, color:sel?p.color:C.ink, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all 0.15s" }}>
              {p.name}{sel&&<span style={{ fontSize:14, color:p.color }}>✓</span>}
            </button>;
          })}
        </div>
      </div>
      {partyVote&&(
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"20px 24px", marginBottom:16 }}>
          <SectionLabel>Top issue for you</SectionLabel>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {issues.map(iss=>{
              const sel=topIssue===iss;
              return <button key={iss} onClick={()=>setTopIssue(iss)} style={{ padding:"8px 16px", borderRadius:99, border:`1.5px solid ${sel?C.accent:C.border}`, background:sel?C.accentSoft:C.surface, fontSize:13, fontWeight:500, color:sel?C.accent:C.mid, cursor:"pointer", transition:"all 0.15s" }}>{iss}</button>;
            })}
          </div>
        </div>
      )}
      {partyVote&&topIssue&&(
        <button onClick={()=>setSubmitted(true)} style={{ width:"100%", padding:"15px", borderRadius:14, background:C.accent, border:"none", cursor:"pointer", fontSize:15, fontWeight:600, color:"#fff", fontFamily:"'Instrument Serif',serif" }}>
          Submit my voice →
        </button>
      )}
    </div>
  );
}

// ── Home dashboard ────────────────────────────────────────────────────────────
function HomeTab({ userVotes, xp, streak, onTabChange }) {
  const level      = getLevel(xp);
  const nextLevel  = XP_LEVELS.find(l=>l.level===level.level+1);
  const xpInLevel  = xp - level.minXp;
  const xpNeeded   = (nextLevel?.minXp||level.maxXp) - level.minXp;
  const pct        = Math.min(100,(xpInLevel/xpNeeded)*100);
  const votedCount = Object.keys(userVotes).length;
  const hotBill    = POLICIES.reduce((a,b)=>b.heat>a.heat?b:a);
  const hotColor   = PARTY_COLOR[hotBill.party]||C.mid;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, alignItems:"start", marginBottom:16 }}>
      <div>
      {/* Hot bill */}
      <SectionLabel>🔥 Hottest right now</SectionLabel>
      <div onClick={()=>onTabChange("feed")} style={{ background:C.white, border:`1.5px solid ${hotColor}33`, borderRadius:20, padding:"20px 22px", marginBottom:14, cursor:"pointer" }}>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}><PartyPill party={hotBill.party} /><StatusPill status={hotBill.status} /><Tag color={C.accent}>Heat {hotBill.heat}</Tag></div>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:21, color:C.ink, marginBottom:8, lineHeight:1.25 }}>{hotBill.title}</div>
        <p style={{ fontSize:13, color:C.mid, margin:"0 0 14px", lineHeight:1.6 }}>{hotBill.plain}</p>
        <div style={{ display:"flex", gap:20, alignItems:"center", marginBottom:14 }}>
          <div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:36, color:hotBill.support>50?C.green:C.red, lineHeight:1 }}>{hotBill.support}%</div><div style={{ fontSize:10, color:C.faint, marginTop:2 }}>community support</div></div>
          <div style={{ flex:1 }}>
            <div style={{ height:4, background:C.border, borderRadius:99, overflow:"hidden", display:"flex", gap:"1px", marginBottom:5 }}>
              <div style={{ width:`${hotBill.support}%`, background:C.green }} /><div style={{ width:`${hotBill.neutral}%`, background:C.border }} /><div style={{ width:`${hotBill.oppose}%`, background:C.red }} />
            </div>
            <div style={{ fontSize:11, color:hotBill.trendDir==="up"?C.green:C.red, fontWeight:600 }}>{hotBill.trendDir==="up"?"▲":"▼"} {hotBill.trend}pts this week</div>
          </div>
        </div>
        <div style={{ fontSize:12, color:C.accent, fontWeight:600 }}>View all policies →</div>
      </div>

      {/* 2PP */}
      <SectionLabel>Live polling</SectionLabel>
      <div onClick={()=>onTabChange("parties")} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"18px 20px", cursor:"pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>Two-party preferred</div>
          <Tag color={C.accent}>Live</Tag>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:36, color:C.red, lineHeight:1 }}>52</div><div style={{ fontSize:10, color:C.faint }}>ALP %</div></div>
          <div style={{ flex:1, height:8, borderRadius:99, overflow:"hidden", display:"flex" }}><div style={{ width:"52%", background:C.red }} /><div style={{ width:"48%", background:C.blue }} /></div>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:36, color:C.blue, lineHeight:1 }}>48</div><div style={{ fontSize:10, color:C.faint }}>LNP %</div></div>
        </div>
        <div style={{ fontSize:12, color:C.accent, fontWeight:600 }}>Full party breakdown →</div>
      </div>
      </div>

      <div>
      {/* Stats */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:"18px 20px", marginBottom:14 }}>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.faint, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{level.label}</div><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:C.ink }}>Level {level.level}</div>
        </div>
        <div style={{ display:"flex", gap:16, marginBottom:14 }}>
          {[{v:streak,l:"streak",c:C.accent},{v:xp,l:"XP",c:C.ink},{v:votedCount,l:"votes",c:C.green}].map((s,i)=>(
            <div key={i} style={{ textAlign:"center" }}><div style={{ fontFamily:"'Instrument Serif',serif", fontSize:24, color:s.c, lineHeight:1 }}>{s.v}</div><div style={{ fontSize:10, color:C.faint, marginTop:2 }}>{s.l}</div></div>
          ))}
        </div>
        <div style={{ height:5, background:C.border, borderRadius:99, overflow:"hidden", marginBottom:5 }}><div style={{ width:`${pct}%`, height:"100%", background:C.accent, borderRadius:99, transition:"width 0.6s" }} /></div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.faint }}>
          <span>{xpInLevel}/{xpNeeded} XP to Level {level.level+1}</span>
        </div>
        {nextLevel?.unlock&&<div style={{ fontSize:10, color:C.accent, fontWeight:600, marginTop:4 }}>🔓 {nextLevel.unlock}</div>}
      </div>

      {/* Quick actions */}
      <SectionLabel>Quick actions</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { label:"My MP",              sub:"Contact & voting record",                        tab:"mymp",        icon:"📍" },
          { label:"Civic lessons",      sub:votedCount>0?`${votedCount} votes cast`:"Earn XP", tab:"learn",     icon:"🎓" },
          { label:"How parliament works", sub:"Interactive explainer",                        tab:"parliament",  icon:"🏛️" },
          { label:"Budget tracker",     sub:"2024–25 measures explained",                    tab:"budget",      icon:"💰" },
        ].map(a=>(
          <div key={a.tab} onClick={()=>onTabChange(a.tab)} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"box-shadow 0.15s", display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:20, flexShrink:0 }}>{a.icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:2 }}>{a.label}</div>
              <div style={{ fontSize:11, color:C.faint, lineHeight:1.4 }}>{a.sub}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
// 6 primary tabs, each with optional sub-navigation
// All 11 features preserved — intelligently grouped

const PRIMARY_TABS = [
  { id:"home",       label:"Home"       },
  { id:"policies",   label:"Policies"   },
  { id:"politics",   label:"Politics"   },
  { id:"mymp",       label:"My MP"      },
  { id:"understand", label:"Understand" },
  { id:"community",  label:"Community"  },
];

// Clean SVG nav icons — 20×20, 1.6px stroke, geometric line style
const NAV_ICONS = {
  home: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  policies: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="13" height="17" rx="1.5"/>
      <path d="M8 8h6M8 12h6M8 16h3"/>
      <path d="M17 7h2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2"/>
    </svg>
  ),
  politics: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V14M8 20V10M12 20V12M16 20V6M20 20V8"/>
      <path d="M3 20h18"/>
    </svg>
  ),
  mymp: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4"/>
      <path d="M4 21v-1a7 7 0 0 1 16 0v1"/>
    </svg>
  ),
  understand: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v13.5"/>
      <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>
      <path d="M9 7h6M9 11h4"/>
    </svg>
  ),
  community: (active) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={active ? "#E8573A" : "#8A8A8A"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const SUB_TABS = {
  policies:   [{ id:"feed",        label:"All bills"    },{ id:"alerts",      label:"Tracked"      }],
  politics:   [{ id:"parties",     label:"Polling"      },{ id:"consistency", label:"Said vs did"  },{ id:"budget",      label:"Budget"       }],
  mymp:       [{ id:"mp",          label:"My MP"        },{ id:"senators",    label:"My senators"  },{ id:"comparison",  label:"Electorate"   }],
  understand: [{ id:"parliament",  label:"Parliament"   },{ id:"learn",       label:"Lessons"      }],
  community:  [{ id:"vote",        label:"My vote"      },{ id:"deliberation",label:"Discuss"      }],
};

const CATS = ["All","Housing","Energy","Climate","Social","Defence"];

// Page metadata
const PAGE_META = {
  home:        { title:"Good morning",              sub:"Here's what matters in Australian politics today."           },
  feed:        { title:"Policy tracker",            sub:"Live federal bills in plain English."                        },
  alerts:      { title:"Tracked bills",             sub:"Bills you're following — updates as they progress."          },
  parties:     { title:"Party polling",             sub:"Live polling averages and where each party stands."          },
  consistency: { title:"Said vs. did",              sub:"What politicians said publicly vs. how they actually voted." },
  budget:      { title:"Federal Budget 2024–25",    sub:"Key budget measures explained in plain English."            },
  mp:          { title:"Your representative",       sub:"Find your MP and see how they voted on every bill."         },
  senators:    { title:"Your senators",             sub:"All 12 senators representing your state, and their records." },
  comparison:  { title:"Electorate history",        sub:"How your electorate has voted over time."                   },
  parliament:  { title:"How parliament works",      sub:"Interactive explainers — no background needed."             },
  learn:       { title:"Civic lessons",             sub:"Short lessons that earn XP. Real answers, no jargon."       },
  vote:        { title:"Your voice",                sub:"Anonymous · grassroots · real-time community polling."      },
  deliberation:{ title:"Community discussion",      sub:"What do Australians actually think the solution should be?" },
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function PoliApp() {
  const [booting, setBooting]       = useState(true);   // splash screen, ~1.3s
  const [showIntro, setShowIntro]   = useState(true);   // intro tour over dimmed home
  const [postcode, setPostcode]     = useState(null);
  const [primaryTab, setPrimaryTab] = useState("home");
  const [subTab, setSubTab]         = useState("feed");   // tracks active sub-tab per group
  const [cat, setCat]               = useState("All");
  const [search, setSearch]         = useState("");
  const [userVotes, setUserVotes]   = useState({});
  const [alerts, setAlerts]         = useState([1,3]);
  const [xp, setXp]                 = useState(75);
  const [streak]                    = useState(4);

  const onVote      = (id, pos) => setUserVotes(v=>({...v,[id]:pos}));
  const addXp       = pts => setXp(x=>x+pts);
  const toggleAlert = id  => setAlerts(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);

  // Splash screen shows for ~1.3s on first load, then fades to reveal
  // the home tab (dimmed) underneath the intro tour popup.
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Navigate to a primary tab, optionally setting sub-tab too
  const goTo = (primary, sub) => {
    setPrimaryTab(primary);
    if (sub) setSubTab(sub);
    else if (SUB_TABS[primary]) setSubTab(SUB_TABS[primary][0].id);
  };

  // Legacy changeTab shim — lets HomeTab still navigate by feature name
  const changeTab = t => {
    const map = {
      home:"home", feed:"policies", alerts:"policies",
      parties:"politics", consistency:"politics", budget:"politics",
      mymp:"mymp", parliament:"understand", learn:"understand",
      vote:"community", deliberation:"community",
    };
    const subMap = {
      feed:"feed", alerts:"alerts",
      parties:"parties", consistency:"consistency", budget:"budget",
      parliament:"parliament", learn:"learn",
      vote:"vote", deliberation:"deliberation",
    };
    goTo(map[t]||t, subMap[t]);
  };

  const subs     = SUB_TABS[primaryTab] || [];
  const activeTab = primaryTab === "home" ? "home" : subTab;

  const filtered = POLICIES.filter(p =>
    (cat==="All"||p.category===cat) &&
    (!search||p.title.toLowerCase().includes(search.toLowerCase())||p.plain.toLowerCase().includes(search.toLowerCase()))
  );

  const meta = PAGE_META[activeTab] || PAGE_META.home;

  return (
    <>
      {booting && <SplashScreen />}
      {!booting && showIntro && (
        <IntroTour onComplete={pc => { setPostcode(pc); setShowIntro(false); }} />
      )}
    <div style={{
      minHeight:"100vh", background:C.surface, fontFamily:"Inter,sans-serif", color:C.ink, display:"flex",
      opacity:showIntro?0.45:1, pointerEvents:showIntro?"none":"auto",
      filter:showIntro?"saturate(0.85)":"none",
      transition:"opacity 0.5s ease, filter 0.5s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button,input,textarea{font-family:Inter,sans-serif;}
        ::selection{background:${C.accentMid};}
        input::placeholder,textarea::placeholder{color:${C.faint};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .poli-scroll::-webkit-scrollbar{width:8px;height:8px;}
        .poli-scroll::-webkit-scrollbar-thumb{background:${C.borderDark};border-radius:99px;}
        .poli-scroll::-webkit-scrollbar-track{background:transparent;}
        .navlink:hover{ background:${C.surface} !important; }
      `}</style>

      {/* ── Left sidebar (desktop nav) ── */}
      <div style={{ width:240, flexShrink:0, background:C.white, borderRight:`1px solid ${C.border}`, height:"100vh", position:"sticky", top:0, display:"flex", flexDirection:"column" }}>
        {/* Wordmark */}
        <div style={{ padding:"24px 22px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {(() => {
              const fs = 25, tx = 0, by = 25 * 0.82;
              const dx = tx + fs * 1.584, dy = by - fs * 0.695, dr = fs * 0.105;
              return (
                <svg width={fs*3.15} height={fs*1.1} viewBox={`0 0 ${fs*3.15} ${fs*1.1}`} style={{ display:"block", overflow:"visible" }}>
                  <text x={tx} y={by}
                    fontFamily="Inter,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif"
                    fontWeight="600" fontSize={fs} fill={C.ink} letterSpacing="-0.025em">
                    Poli
                  </text>
                  <circle cx={dx} cy={dy} r={dr} fill="#E8573A" />
                </svg>
              );
            })()}
          </div>
          <div style={{ fontSize:10, color:C.faint, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:2 }}>Australia · Civic intelligence</div>
        </div>

        {/* Status pills */}
        <div style={{ padding:"0 22px 18px", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:11, fontWeight:600, color:C.mid, background:C.surface, border:`1px solid ${C.border}`, padding:"7px 12px", borderRadius:10 }}>
            <span>{getLevel(xp).label}</span><span>{xp} XP · L{getLevel(xp).level}</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {alerts.length > 0 && (
              <button onClick={()=>goTo("policies","alerts")} style={{ flex:1, fontSize:11, fontWeight:600, color:C.accent, background:C.accentSoft, border:`1px solid ${C.accentMid}`, padding:"6px 10px", borderRadius:99, cursor:"pointer" }}>
                🔔 {alerts.length} tracked
              </button>
            )}
            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:4, fontSize:11, fontWeight:600, color:C.green, background:C.greenSoft, border:`1px solid ${C.greenMid}`, padding:"6px 10px", borderRadius:99, flexShrink:0 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:C.green, display:"inline-block" }} />
              Live
            </span>
          </div>
        </div>

        <Divider my={0} />

        {/* Primary nav */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 14px" }} className="poli-scroll">
          {PRIMARY_TABS.map(t => {
            const active = primaryTab === t.id;
            return (
              <div key={t.id}>
                <button className="navlink" onClick={() => goTo(t.id)} style={{
                  width:"100%", padding:"10px 12px", marginBottom:2,
                  background:active?C.accentSoft:"none", border:"none", borderRadius:10, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:10, textAlign:"left",
                  transition:"background 0.15s",
                }}>
                  {NAV_ICONS[t.id]?.(active)}
                  <span style={{ fontSize:13.5, fontWeight:active?700:500, color:active?C.accent:C.ink }}>{t.label}</span>
                </button>
                {/* Sub-nav, shown inline under active primary tab */}
                {active && SUB_TABS[t.id] && (
                  <div style={{ marginLeft:29, marginBottom:8, display:"flex", flexDirection:"column", gap:1 }}>
                    {SUB_TABS[t.id].map(s => (
                      <button key={s.id} onClick={()=>setSubTab(s.id)} style={{
                        padding:"7px 10px", background:"none", border:"none", cursor:"pointer",
                        textAlign:"left", fontSize:12.5,
                        fontWeight:subTab===s.id?700:400,
                        color:subTab===s.id?C.accent:C.mid,
                        borderLeft:`2px solid ${subTab===s.id?C.accent:C.border}`,
                        borderRadius:"0 6px 6px 0",
                      }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, fontSize:10, color:C.faint, lineHeight:1.5 }}>
          Nonpartisan · Ad-free<br/>Data: APH · They Vote For You
        </div>
      </div>

      {/* ── Main column ── */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden" }}>

        {/* Top bar */}
        <div style={{ background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ maxWidth:1080, margin:"0 auto", padding:"20px 32px 18px" }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, color:C.ink, marginBottom:3, letterSpacing:"-0.01em" }}>
              {meta.title}
            </div>
            <div style={{ fontSize:13.5, color:C.mid, lineHeight:1.5 }}>{meta.sub}</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="poli-scroll" style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:1080, margin:"0 auto", padding:"28px 32px 60px" }}>
            <FadeTab activeKey={activeTab}>
              {view => (
                <>
                  {/* HOME */}
                  {view==="home" && (
                    <HomeTab userVotes={userVotes} xp={xp} streak={streak} onTabChange={changeTab} />
                  )}

                  {/* POLICIES — All bills */}
                  {view==="feed" && (
                    <div style={{ animation:"fadeUp 0.2s ease" }}>
                      {/* Mini stats */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20, maxWidth:820 }}>
                        {[
                          { v:POLICIES.length, l:"Bills tracked",   c:C.accent },
                          { v:"Housing",       l:"Hottest topic",   c:C.ink    },
                          { v:"2.4k",          l:"Community votes", c:C.green  },
                        ].map((s,i) => (
                          <div key={i} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 10px", textAlign:"center" }}>
                            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:s.c, lineHeight:1 }}>{s.v}</div>
                            <div style={{ fontSize:10, color:C.faint, marginTop:4, fontWeight:500 }}>{s.l}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap", alignItems:"center", maxWidth:820 }}>
                        {/* Search */}
                        <div style={{ position:"relative", flex:"1 1 260px", minWidth:220 }}>
                          <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:14, color:C.faint, pointerEvents:"none" }}>🔍</span>
                          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search policies…"
                            style={{ width:"100%", padding:"11px 14px 11px 36px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, background:C.white, color:C.ink, outline:"none" }} />
                        </div>

                        {/* Category pills */}
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {CATS.map(c => (
                            <button key={c} onClick={()=>setCat(c)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:99, border:`1.5px solid ${cat===c?C.accent:C.border}`, background:cat===c?C.accentSoft:C.white, color:cat===c?C.accent:C.mid, fontSize:12, fontWeight:cat===c?600:500, cursor:"pointer", transition:"all 0.15s" }}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ fontSize:11, color:C.faint, marginBottom:14 }}>{filtered.length} of {POLICIES.length} policies</div>

                      {filtered.length === 0
                        ? <EmptyState title="No policies match" sub="Try adjusting your search or category filter" />
                        : <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:820, margin:"0 auto" }}>
                            {filtered.map(p => <PolicyCard key={p.id} policy={p} onVote={onVote} alerts={alerts} onToggleAlert={toggleAlert} />)}
                          </div>
                      }
                    </div>
                  )}

                  {/* POLICIES — Tracked / Alerts */}
                  {view==="alerts" && <AlertsTab alerts={alerts} onToggleAlert={toggleAlert} />}

                  {/* POLITICS — Polling */}
                  {view==="parties" && <PartiesTab />}

                  {/* POLITICS — Said vs Did */}
                  {view==="consistency" && <ConsistencyTracker />}

                  {/* POLITICS — Budget */}
                  {view==="budget" && <BudgetTracker />}

                  {/* MY MP — tabs handled internally */}
                  {view==="mp"         && <MyMPTab userVotes={userVotes} initialPostcode={postcode} initialView="mp" />}
                  {view==="senators"   && <MyMPTab userVotes={userVotes} initialPostcode={postcode} initialView="senators" />}
                  {view==="comparison" && <MyMPTab userVotes={userVotes} initialPostcode={postcode} initialView="comparison" />}

                  {/* UNDERSTAND — Parliament */}
                  {view==="parliament" && <ParliamentMap />}

                  {/* UNDERSTAND — Learn / XP */}
                  {view==="learn" && <LearnTab xp={xp} streak={streak} onXpGain={addXp} />}

                  {/* COMMUNITY — Vote */}
                  {view==="vote" && <VoteTab />}

                  {/* COMMUNITY — Deliberation */}
                  {view==="deliberation" && <DeliberationTab />}
                </>
              )}
            </FadeTab>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────
function EmptyState({ title, sub, icon="🔍" }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:"48px 24px", textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:C.ink, marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:C.faint, lineHeight:1.5 }}>{sub}</div>}
    </div>
  );
}
