"""
sync_budget_measures.py — Poli data pipeline · Federal Budget measures sync

Two sources, kept deliberately separate rather than force-matched together:

  1. Budget Paper No. 2 (BP2) — the exhaustive, portfolio-organised list of
     every new budget measure, each with a $ table by year and a narrative
     paragraph. Source of `title` / `portfolio` / `amount` / `direction` /
     `plain`. Government prose, not written in second person.

  2. The 6 budget theme pages (Cost of living, Tax reform, Fuel supply and
     security, Productivity, Care and opportunity, Security and investment)
     — plain HTML, already written in "what this means for you" voice with
     case studies. These become their OWN featured entries (source="theme"),
     not merged onto BP2 rows — there's no explicit link between a theme
     page's prose and a specific BP2 measure title, and fuzzy-matching by
     keyword risks pairing the wrong measure with the wrong claim. Safer to
     keep them as a separate "featured" tier the UI can lead with.

`amount` comes from the financial table's Total row summed across all 5
published years — not from the "This measure is estimated to..." sentence,
which is frequently absent or phrased inconsistently. The table is always
present and always the same shape.

Licensing: BP2 is Creative Commons Attribution 4.0. Treasury's stated
preferred attribution for anything transformed (which summing a table and
re-presenting it is): "Based on Commonwealth of Australia data."

NOT executed against the live network in this environment (sandboxed, no
internet access). The parser IS tested — against bp2_fixture.txt, built
from real text extracted from the live 2026–27 PDF during this session,
covering both Part 1 (Receipts) and Part 2 (Payments), multi-agency tables,
missing summary sentences, and nfp/*/".." placeholder values. Run once
against the real downloaded PDF and spot-check before trusting it in a
scheduled job — a page-layout change would need the measure-boundary
detection (title immediately followed by "Receipts ($m)"/"Payments ($m)")
revisited.

Requires: requests, beautifulsoup4, pdfplumber, supabase (pip install --break-system-packages)
"""

from __future__ import annotations  # lets 3.9 tolerate any 3.10+ type-hint syntax below

import os
import re
import sys

import requests
from bs4 import BeautifulSoup

BASE = "https://budget.gov.au"
DOWNLOADS_PAGE = f"{BASE}/content/downloads.htm"
HEADERS = {"User-Agent": "Poli civic-tech data pipeline (contact: <your email>)"}

THEME_PAGES = [
    ("01-fuel-supply-and-security.htm", "Fuel supply and security", False),
    ("02-cost-of-living.htm", "Cost of living", True),
    ("03-productivity.htm", "Productivity", False),
    ("04-tax-reform.htm", "Tax reform", False),
    ("05-care-and-opportunity.htm", "Care and opportunity", False),
    ("06-security-and-investment.htm", "Security and investment", False),
]

KNOWN_PORTFOLIOS = [
    "Agriculture, Fisheries and Forestry", "Attorney-General's", "Attorney‑General's",
    "Climate Change, Energy, the Environment and Water", "Cross Portfolio", "Defence",
    "Education", "Employment and Workplace Relations", "Finance",
    "Foreign Affairs and Trade", "Health, Disability and Ageing", "Home Affairs",
    "Industry, Science and Resources",
    "Infrastructure, Transport, Regional Development, Communications, Sport and the Arts",
    "Parliament", "Prime Minister and Cabinet", "Social Services", "Treasury",
]


# ── Step 1: find the current BP2 URL ──────────────────────────────────────────

def find_bp2_url() -> str:
    resp = requests.get(DOWNLOADS_PAGE, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    link = soup.find("a", href=re.compile(r"bp2.*\.pdf", re.I))
    if not link:
        raise RuntimeError("Could not find the BP2 PDF link — downloads page structure may have changed.")
    href = link["href"]
    return href if href.startswith("http") else BASE + href


# ── Step 2: PDF → text ────────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: str) -> str:
    import pdfplumber
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return "\n".join(pages)


# ── Step 3: locate Part 1 / Part 2 detail sections (skip Contents/TOC) ───────

def find_detail_sections(text: str) -> dict:
    """Returns {'receipts': text, 'payments': text} for the per-measure detail
    sections only — skips the Contents, the portfolio index, and the
    aggregate Table 1/Table 2 summary (which has no narrative, just figures)."""
    # "Table 1: Receipt measures since the 2025..." without "(continued)" is
    # unique — it's the true start of Part 1 (Contents/index don't contain it).
    r1 = re.search(r"Table 1: Receipt measures since the 20\d\d(?!.*\(continued\))", text)
    r2 = re.search(r"Table 2: Payment measures since the 20\d\d(?!.*\(continued\))", text)
    if not r1 or not r2:
        raise RuntimeError("Could not find Table 1 / Table 2 anchors — PDF structure may have changed.")

    # Within each part, the per-measure detail section starts after the
    # aggregate summary table, at "Total impact of receipt/payment measures".
    receipts_agg_end = text.find("Total impact of receipt measures", r1.start())
    payments_agg_end = text.find("Total impact of payment measures", r2.start())
    if receipts_agg_end == -1 or payments_agg_end == -1:
        raise RuntimeError("Could not find 'Total impact of ... measures' — PDF structure may have changed.")

    receipts_detail = text[receipts_agg_end:r2.start()]
    payments_detail = text[payments_agg_end:]
    return {"receipts": receipts_detail, "payments": payments_detail}


# ── Step 4: split each part into per-portfolio chunks via the running header ─

PORTFOLIO_HEADER_RE = re.compile(
    r"\n([A-Za-z][A-Za-z,\u2019'\-\s]{2,80}?)\s*\|\s*\nPart \d: (?:Receipt|Payment) Measures \| Page \d+",
)

def split_by_portfolio(detail_text: str) -> list[tuple[str, str]]:
    """Returns [(portfolio_name, chunk_text), ...] using the recurring
    '{Portfolio} | Part N: ... Measures | Page X' running header that
    appears on odd (recto) pages — more reliable than the once-per-portfolio
    standalone heading line for most of the document, but BP2 alternates
    with a generic 'Budget Paper No. 2 / Page X | Part N: ... Measures'
    header on even (verso) pages, which carries no portfolio name at all.
    The very first measure in the whole detail section always falls on one
    of these headerless pages, before any running-header match exists — so
    that leading chunk is resolved from its own standalone portfolio-name
    line instead (checked against KNOWN_PORTFOLIOS)."""
    matches = list(PORTFOLIO_HEADER_RE.finditer(detail_text))
    chunks = []

    leading = detail_text[:matches[0].start()] if matches else detail_text
    for p in KNOWN_PORTFOLIOS:
        if re.search(rf"\n{re.escape(p)}\s*\n", leading):
            chunks.append((p, leading))
            break
    else:
        if leading.strip():
            chunks.append(("UNKNOWN", leading))

    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(detail_text)
        chunks.append((m.group(1).strip(), detail_text[start:end]))
    return chunks


# ── Step 5: find measures within a portfolio chunk, extract table + narrative ─

MEASURE_TITLE_RE = re.compile(r"\n([A-Z][^\n]{3,140}?)\n(Receipts \(\$m\)|Payments \(\$m\))\n")
NUMERIC_ROW_RE = re.compile(r"^[\-.\d,*]+(?:\s+[\-.\d,*]+){4}\s*$|^(?:nfp\s*){5}$|^[\-.\d,*a-z]+(?:\s+[\-.\d,*a-z]+){4}\s*$")
YEAR_HEADER_RE = re.compile(r"^20\d\d-\d\d\s+20\d\d-\d\d")

def parse_dollar_value(token: str) -> float:
    token = token.strip()
    if token in ("-", "..", "*", "nfp", ""):
        return 0.0
    try:
        return float(token.replace(",", ""))
    except ValueError:
        return 0.0

def sum_table_block(block_lines: list[str]) -> tuple[float, bool]:
    """Sums the primary table's 5-year figures. Prefers a 'Total –' row;
    falls back to summing all agency rows if no explicit total exists
    (single-agency measures don't get one). Flags hasUnquantified if any
    nfp/* appears, since the sum is then a floor, not the true figure."""
    total_row = None
    agency_rows = []
    has_unquantified = False
    for line in block_lines:
        nums = re.findall(r"-?[\d,]+\.?\d*|\.\.|-|\*|nfp", line)
        # crude column split: take the LAST 5 number-like tokens on the line
        tail = [t for t in line.split() if re.match(r"^-?[\d,]+\.?\d*$|^\.\.$|^-$|^\*$|^nfp$", t)]
        if len(tail) < 5:
            continue
        vals = tail[-5:]
        if any(v in ("*", "nfp") for v in vals):
            has_unquantified = True
        parsed = [parse_dollar_value(v) for v in vals]
        if line.strip().lower().startswith("total"):
            total_row = parsed
        else:
            agency_rows.append(parsed)
    if total_row:
        yearly = total_row
    elif agency_rows:
        yearly = [sum(col) for col in zip(*agency_rows)]
    else:
        return 0.0, has_unquantified
    return sum(yearly), has_unquantified


def parse_measures_in_chunk(chunk: str, portfolio: str, part: str) -> list[dict]:
    title_matches = list(MEASURE_TITLE_RE.finditer(chunk))
    measures = []
    for i, m in enumerate(title_matches):
        title = m.group(1).strip()
        table_type = "Receipts" if m.group(2).startswith("Receipts") else "Payments"
        block_start = m.end()
        block_end = title_matches[i + 1].start() if i + 1 < len(title_matches) else len(chunk)
        block = chunk[block_start:block_end]

        # Primary table ends at the first "Related " sub-table — don't let
        # related/secondary figures pollute the primary amount.
        related_idx = block.find("\nRelated ")
        primary_block = block[:related_idx] if related_idx != -1 else block

        lines = [l for l in primary_block.split("\n")]
        table_lines, narrative_lines, in_table = [], [], True
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if YEAR_HEADER_RE.match(stripped):
                continue  # year column header, not data
            looks_numeric_row = bool(re.search(r"(?:-?[\d,]+\.?\d*|\.\.|nfp|\*)(?:\s+(?:-?[\d,]+\.?\d*|\.\.|nfp|\*)){4}\s*$", stripped))
            if in_table and (looks_numeric_row or len(stripped) < 60):
                table_lines.append(stripped)
                if looks_numeric_row:
                    continue
            else:
                in_table = False
                narrative_lines.append(stripped)

        amount_m, unquantified = sum_table_block(table_lines)
        narrative = " ".join(narrative_lines).strip()

        direction = ("saving" if amount_m < 0 else "expenditure") if table_type == "Payments" else "revenue"

        measures.append({
            "portfolio": portfolio,
            "part": part,  # "receipts" | "payments"
            "title": title,
            "direction": direction,
            "amount_m": round(amount_m, 1),
            "unquantified": unquantified,
            "plain": narrative[:800],  # keep full paragraph, cap for sanity
            "source": "bp2",
        })
    return measures


def parse_bp2(text: str) -> list[dict]:
    sections = find_detail_sections(text)
    all_measures = []
    for part, detail_text in sections.items():
        for portfolio, chunk in split_by_portfolio(detail_text):
            all_measures.extend(parse_measures_in_chunk(chunk, portfolio, part))
    return all_measures


# ── Step 6: theme pages — featured, plain-English, kept separate from BP2 ────

def parse_theme_page(html: str, theme_label: str, is_cost_of_living: bool) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup
    featured = []
    for h3 in main.find_all("h3"):
        title = h3.get_text(strip=True)
        if not title:
            continue
        paras = []
        for sib in h3.find_next_siblings():
            if sib.name in ("h2", "h3"):
                break
            if sib.name == "p":
                paras.append(sib.get_text(" ", strip=True))
        if not paras:
            continue
        featured.append({
            "portfolio": theme_label,
            "part": "theme",
            "title": title,
            "direction": "expenditure",  # theme highlights skew toward announced spending/relief; refine by hand if needed
            "amount_m": None,
            "unquantified": True,
            "plain": " ".join(paras)[:800],
            "colLiving": is_cost_of_living,
            "source": "theme",
        })
    return featured


def fetch_theme_measures() -> list[dict]:
    all_featured = []
    for slug, label, is_col in THEME_PAGES:
        resp = requests.get(f"{BASE}/content/{slug}", headers=HEADERS, timeout=30)
        resp.raise_for_status()
        all_featured.extend(parse_theme_page(resp.text, label, is_col))
    return all_featured


# ── Step 7: format + upsert ───────────────────────────────────────────────────

def format_amount(amount_m, unquantified: bool) -> str:
    # amount_m: float or None — written without the `float | None` union
    # syntax (that's Python 3.10+ only; this project runs on 3.9).
    if amount_m is None:
        return "Not separately quantified"
    prefix = "At least " if unquantified else ""
    abs_m = abs(amount_m)
    sign = "-" if amount_m < 0 else ""
    if abs_m >= 1000:
        return f"{prefix}{sign}${abs_m/1000:.1f} billion over 5 years"
    return f"{prefix}{sign}${abs_m:.1f} million over 5 years"


def upsert_to_supabase(measures: list[dict]):
    from supabase import create_client
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
    sb.table("budget_measures").delete().neq("title", "").execute()  # full refresh, one budget cycle at a time
    rows = []
    for i, m in enumerate(measures):
        rows.append({
            "id": f"bm{i:04d}",
            "title": m["title"],
            "portfolio": m["portfolio"],
            "direction": m["direction"],
            "amount": format_amount(m.get("amount_m"), m.get("unquantified", False)),
            "plain": m["plain"],
            "col_living": m.get("colLiving", False),
            "source": m["source"],
        })
    sb.table("budget_measures").insert(rows).execute()
    print(f"Upserted {len(rows)} measures.")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    bp2_url = find_bp2_url()
    print(f"BP2: {bp2_url}")
    pdf_path = "/tmp/bp2.pdf"
    resp = requests.get(bp2_url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    with open(pdf_path, "wb") as f:
        f.write(resp.content)

    text = extract_pdf_text(pdf_path)
    bp2_measures = parse_bp2(text)
    print(f"Parsed {len(bp2_measures)} BP2 measures.")
    unknown = [m for m in bp2_measures if m["portfolio"] == "UNKNOWN"]
    if unknown:
        print(f"  WARNING: {len(unknown)} measures had no resolvable portfolio — check parser against real layout.", file=sys.stderr)

    theme_measures = fetch_theme_measures()
    print(f"Parsed {len(theme_measures)} theme-page featured measures.")

    all_measures = bp2_measures + theme_measures
    if os.environ.get("SUPABASE_URL"):
        upsert_to_supabase(all_measures)
    else:
        print("\nSUPABASE_URL not set — dry run. First 5 BP2 measures:")
        for m in bp2_measures[:5]:
            print(f"  [{m['portfolio']}] {m['title']} — {format_amount(m['amount_m'], m['unquantified'])} ({m['direction']})")
        print("\nFirst 3 theme measures:")
        for m in theme_measures[:3]:
            print(f"  [{m['portfolio']}] {m['title']}")


if __name__ == "__main__":
    main()
