// ─────────────────────────────────────────────────────────────────────────────
// CABINET seed data — Albanese Ministry, sourced from pm.gov.au (fetched 11 Jul
// 2026). Tier boundaries (Cabinet/Outer/Assistant) are inferred from page order
// plus the reported 30-person Cabinet+Outer ministry size — spot-check against
// https://www.pm.gov.au/your-ministry before shipping, and treat dataState as
// "cached" rather than "live" until this is backed by a real table. Ministries
// change with reshuffles; this is a point-in-time seed, not a pipeline.
//
// All ALP — this is the sitting government's ministry, not a full parliament
// roster (that's HOUSE/SENATE + MEMBERS elsewhere).
// ─────────────────────────────────────────────────────────────────────────────

export const CABINET = [
  // ── PM + Deputy PM ──────────────────────────────────────────────────────
  { id: "c01", name: "Anthony Albanese", party: "ALP", chamber: "House", tier: "pm",
    portfolios: ["Prime Minister"] },
  { id: "c02", name: "Richard Marles", party: "ALP", chamber: "House", tier: "deputy",
    portfolios: ["Deputy Prime Minister", "Minister for Defence"] },

  // ── Cabinet (23 incl. PM + Deputy PM) ───────────────────────────────────
  { id: "c03", name: "Penny Wong", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for Foreign Affairs"] },
  { id: "c04", name: "Jim Chalmers", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Treasurer"] },
  { id: "c05", name: "Katy Gallagher", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for Finance", "Minister for Women", "Minister for the Public Service", "Minister for Government Services"] },
  { id: "c06", name: "Don Farrell", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for Trade and Tourism", "Special Minister of State"] },
  { id: "c07", name: "Tony Burke", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Home Affairs", "Minister for Immigration and Citizenship", "Minister for Cyber Security", "Minister for the Arts", "Leader of the House"] },
  { id: "c08", name: "Mark Butler", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Health and Ageing", "Minister for Disability and the NDIS"] },
  { id: "c09", name: "Chris Bowen", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Climate Change and Energy"] },
  { id: "c10", name: "Catherine King", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Infrastructure, Transport, Regional Development and Local Government"] },
  { id: "c11", name: "Amanda Rishworth", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Employment and Workplace Relations"] },
  { id: "c12", name: "Jason Clare", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Education"] },
  { id: "c13", name: "Michelle Rowland", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Attorney-General"] },
  { id: "c14", name: "Tanya Plibersek", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Social Services"] },
  { id: "c15", name: "Julie Collins", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Agriculture, Fisheries and Forestry"] },
  { id: "c16", name: "Clare O'Neil", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Housing", "Minister for Homelessness", "Minister for Cities"] },
  { id: "c17", name: "Madeleine King", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Resources", "Minister for Northern Australia"] },
  { id: "c18", name: "Murray Watt", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for the Environment and Water"] },
  { id: "c19", name: "Malarndirri McCarthy", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for Indigenous Australians"] },
  { id: "c20", name: "Anika Wells", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Communications", "Minister for Sport"] },
  { id: "c21", name: "Pat Conroy", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for Defence Industry", "Minister for Pacific Island Affairs"] },
  { id: "c22", name: "Anne Aly", party: "ALP", chamber: "House", tier: "cabinet",
    portfolios: ["Minister for International Development", "Minister for Small Business", "Minister for Multicultural Affairs"] },
  { id: "c23", name: "Tim Ayres", party: "ALP", chamber: "Senate", tier: "cabinet",
    portfolios: ["Minister for Industry and Innovation", "Minister for Science"] },

  // ── Outer ministry (7) ──────────────────────────────────────────────────
  { id: "c24", name: "Matt Keogh", party: "ALP", chamber: "House", tier: "outer",
    portfolios: ["Minister for Veterans' Affairs", "Minister for Defence Personnel"] },
  { id: "c25", name: "Kristy McBain", party: "ALP", chamber: "House", tier: "outer",
    portfolios: ["Minister for Regional Development, Local Government and Territories", "Minister for Emergency Management"] },
  { id: "c26", name: "Andrew Giles", party: "ALP", chamber: "House", tier: "outer",
    portfolios: ["Minister for Skills and Training"] },
  { id: "c27", name: "Jenny McAllister", party: "ALP", chamber: "Senate", tier: "outer",
    portfolios: ["Minister for the NDIS"] },
  { id: "c28", name: "Daniel Mulino", party: "ALP", chamber: "House", tier: "outer",
    portfolios: ["Assistant Treasurer", "Minister for Financial Services"] },
  { id: "c29", name: "Jess Walsh", party: "ALP", chamber: "Senate", tier: "outer",
    portfolios: ["Minister for Early Childhood Education", "Minister for Youth"] },
  { id: "c30", name: "Sam Rae", party: "ALP", chamber: "House", tier: "outer",
    portfolios: ["Minister for Aged Care and Seniors"] },

  // ── Assistant ministers (12) ────────────────────────────────────────────
  { id: "c31", name: "Patrick Gorman", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister to the Prime Minister", "Assistant Minister for the Public Service", "Assistant Minister for Employment and Workplace Relations"] },
  { id: "c32", name: "Matt Thistlethwaite", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Foreign Affairs and Trade", "Assistant Minister for Immigration"] },
  { id: "c33", name: "Andrew Leigh", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Productivity, Competition, Charities and Treasury"] },
  { id: "c34", name: "Ged Kearney", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Social Services", "Assistant Minister for the Prevention of Family Violence"] },
  { id: "c35", name: "Emma McBride", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Mental Health and Suicide Prevention", "Assistant Minister for Rural and Regional Health"] },
  { id: "c36", name: "Anthony Chisholm", party: "ALP", chamber: "Senate", tier: "assistant",
    portfolios: ["Assistant Minister for Regional Development", "Assistant Minister for Agriculture, Fisheries and Forestry", "Assistant Minister for Resources"] },
  { id: "c37", name: "Josh Wilson", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Emergency Management", "Assistant Minister for Climate Change and Energy"] },
  { id: "c38", name: "Julian Hill", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Citizenship, Customs and Multicultural Affairs", "Assistant Minister for International Education"] },
  { id: "c39", name: "Rebecca White", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Women", "Assistant Minister for Health and Aged Care", "Assistant Minister for Indigenous Health"] },
  { id: "c40", name: "Andrew Charlton", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Cabinet Secretary", "Assistant Minister for Science, Technology and the Digital Economy"] },
  { id: "c41", name: "Nita Green", party: "ALP", chamber: "Senate", tier: "assistant",
    portfolios: ["Assistant Minister for Tourism", "Assistant Minister for Pacific Island Affairs", "Assistant Minister for Northern Australia"] },
  { id: "c42", name: "Peter Khalil", party: "ALP", chamber: "House", tier: "assistant",
    portfolios: ["Assistant Minister for Defence"] },
];
