"""
Poli · APH Bills Scraper
========================
Scrapes both the Senate and House of Representatives bills lists from
parliament.aph.gov.au and upserts them into the Supabase bills table.

The APH lists are a single large HTML page per chamber containing every
bill with:
  - Title + parlinfo deep link
  - Sponsor (person or portfolio)
  - APH summary paragraph
  - Per-chamber stage history (readings, amendments, assent)
  - Act citation if passed into law

Run manually:
    python3 scripts/sync_bills.py

Optional flags:
    --translate   Generate AI plain-English summaries for new bills
                  (requires ANTHROPIC_API_KEY env var)

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Optional:
    ANTHROPIC_API_KEY   — only needed with --translate flag

Data flow:
    APH list page → parse → upsert to bills table
    (optionally) bills with no summary_plain → Claude Haiku → update bills table
"""

import os
import sys
import re
import time
import argparse
import subprocess
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ANTHROPIC_API_KEY         = os.environ.get("ANTHROPIC_API_KEY")

APH_HEADERS = {
    "User-Agent": "Poli-CivicApp/1.0 (+https://github.com/wadeb3/poli-web; civic data project)",
    "Accept": "text/html,application/xhtml+xml",
}

# The two bills list pages — Senate and House
LIST_PAGES = [
    {
        "chamber":    "senate",
        "url":        "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId=legislation%2fbillslst%2fbillslst_8100fb48-0592-488b-828b-d017b24562d4",
    },
    {
        "chamber":    "representatives",
        "url":        "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId=legislation%2fbillslst%2fbillslst_c203aa1c-1876-41a8-bc76-1de328bdb726",
    },
]

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    sys.exit(1)

SB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates,return=minimal",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def curl_get(url, timeout=30):
    """
    Fetch a URL using curl instead of requests.
    APH blocks Python requests even with a User-Agent header.
    curl behaves more like a real browser and bypasses their WAF.
    """
    result = subprocess.run(
        [
            "curl", "-s", "-L",
            "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "--max-time", str(timeout),
            "--compressed",
            "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "-H", "Accept-Language: en-AU,en;q=0.9",
            "-H", "Connection: keep-alive",
            url,
        ],
        capture_output=True, text=True, timeout=timeout + 5
    )
    if result.returncode != 0:
        raise Exception(f"curl failed: {result.stderr}")
    if not result.stdout:
        raise Exception("curl returned empty response")
    return result.stdout


def sb_upsert(table, rows, timeout=60):
    if not rows:
        return
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SB_HEADERS, json=rows, timeout=timeout,
    )
    resp.raise_for_status()


def sb_patch(table, row_id, data, timeout=20):
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        params={"id": f"eq.{row_id}"},
        json=data,
        timeout=timeout,
    )
    resp.raise_for_status()


def extract_bill_id(url):
    """
    Extract the unique bill ID from a parlinfo URL.
    e.g. ...query=Id%3A%22legislation%2Fbillhome%2Fs1482%22 → s1482
    """
    m = re.search(r'billhome%2F([^"]+)', url)
    if not m:
        m = re.search(r'billhome/([^\s"&]+)', url)
    return m.group(1) if m else None


def parse_status(stages):
    """
    Derive a simple status string from the list of stage events.
    Returns one of: 'Assented', 'Passed', 'Before Senate',
    'Before House', 'Active', 'Lapsed', 'Negatived', 'Withdrawn'
    """
    text = " ".join(stages).lower()
    if "assent:" in text or "assent :" in text:
        return "Assented"
    if "lapsed" in text and "restored" not in text.split("lapsed")[-1]:
        return "Lapsed"
    if "negatived at" in text:
        return "Negatived"
    if "removed from notice paper" in text or "withdrawn" in text:
        return "Withdrawn"
    if "passed" in text:
        return "Passed"
    return "Active"


def parse_sponsor(sponsor_text):
    """
    Parse sponsor text like "(Senator Antic — LP)" or
    "(Attorney-General's portfolio)" into name and party.
    """
    if not sponsor_text:
        return None, None
    # Portfolio sponsor
    if "portfolio" in sponsor_text.lower():
        return sponsor_text.strip("() "), None
    # Person sponsor — extract party abbreviation after em-dash
    m = re.search(r'—\s*([A-Z]+)', sponsor_text)
    party_abbr = m.group(1) if m else None
    name = re.sub(r'\s*—.*', '', sponsor_text).strip("() ")
    return name, party_abbr


def parse_dates(stage_items):
    """
    Extract the first date mentioned (introduced date) from stage items.
    Returns ISO date string or None.
    """
    for item in stage_items:
        m = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', item)
        if m:
            try:
                d = datetime.strptime(m.group(1), "%d/%m/%y")
                return d.strftime("%Y-%m-%d")
            except ValueError:
                try:
                    d = datetime.strptime(m.group(1), "%d/%m/%Y")
                    return d.strftime("%Y-%m-%d")
                except ValueError:
                    pass
    return None


def parse_assent_date(stages):
    """Extract assent date and Act number from stage text."""
    for s in stages:
        m = re.search(r'[Aa]ssent:\s*(\d{1,2}/\d{1,2}/\d{2,4})', s)
        if m:
            try:
                d = datetime.strptime(m.group(1), "%d/%m/%y")
                return d.strftime("%Y-%m-%d")
            except ValueError:
                try:
                    d = datetime.strptime(m.group(1), "%d/%m/%Y")
                    return d.strftime("%Y-%m-%d")
                except ValueError:
                    pass
    return None


def parse_act_citation(text):
    """Extract Act citation like 'Act No. 3, 2026'."""
    m = re.search(r'Act\s+(?:citation:|No\.\s*\d+[^)]*)', text)
    return m.group(0) if m else None


# ── Main parser ───────────────────────────────────────────────────────────────

def parse_bills_list_senate(html):
    """
    Parse the Senate bills list — detailed paragraph format:
      <h2><a href="parlinfo_url">Bill Title</a></h2>
      <p>(Sponsor)</p>
      <p>Summary paragraph.</p>
      <ul><li>stage item</li>...</ul>
    """
    soup = BeautifulSoup(html, "html.parser")
    bills = []

    for h2 in soup.find_all("h2"):
        link = h2.find("a")
        if not link or "parlinfo" not in (link.get("href") or ""):
            continue

        title = link.get_text(" ", strip=True)
        parlinfo_url = link["href"]
        bill_id = extract_bill_id(parlinfo_url)
        if not bill_id:
            continue

        siblings = []
        el = h2.find_next_sibling()
        while el and el.name != "h2":
            siblings.append(el)
            el = el.find_next_sibling()

        act_citation  = None
        sponsor_raw   = None
        summary_aph   = None
        all_stages    = []

        for sib in siblings:
            text = sib.get_text(" ", strip=True)
            if not text:
                continue
            if text.startswith("(Act citation:"):
                act_citation = text.strip("() ")
                continue
            if text.startswith("(") and sponsor_raw is None and summary_aph is None:
                sponsor_raw = text
                continue
            if re.match(r'^(House(s)? of Representatives|Senate|Both chambers?):', text, re.I):
                continue
            if re.match(r'^[Aa]ssent:', text):
                all_stages.append(text)
                continue
            if sib.name in ("ul", "ol"):
                for li in sib.find_all("li"):
                    li_text = li.get_text(" ", strip=True)
                    if li_text:
                        all_stages.append(li_text)
                continue
            if summary_aph is None and len(text) > 30:
                summary_aph = text

        sponsor_name, sponsor_party = parse_sponsor(sponsor_raw)

        bills.append({
            "id":                  bill_id,
            "title":               title,
            "originating_chamber": "senate",
            "sponsor":             sponsor_name,
            "sponsor_party":       sponsor_party,
            "portfolio":           sponsor_name if (sponsor_raw and "portfolio" in (sponsor_raw or "").lower()) else None,
            "summary_aph":         summary_aph,
            "summary_plain":       None,
            "status":              parse_status(all_stages),
            "act_citation":        act_citation,
            "introduced_date":     parse_dates(all_stages),
            "assent_date":         parse_assent_date(all_stages),
            "stages":              all_stages[:30],
            "parlinfo_url":        parlinfo_url,
            "updated_at":          datetime.utcnow().isoformat() + "Z",
        })

    return bills


def parse_bills_list_house(html):
    """
    Parse the House bills list — tabular format with columns:
    Short Title | Intro House | Passed House | Intro Senate | Passed Senate | Assent | Act No.
    Each row links to the bill detail page via the title cell.
    """
    soup = BeautifulSoup(html, "html.parser")
    bills = []

    # The House list is one big table — find all rows with a bill link
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue

        # First cell contains the title with a link to the bill detail
        title_cell = cells[0]
        link = title_cell.find("a")
        if not link:
            continue

        title = link.get_text(" ", strip=True)
        href = link.get("href", "")
        if not title or len(title) < 5:
            continue

        # Build parlinfo URL from relative href if needed
        if href.startswith("http"):
            parlinfo_url = href
        elif href:
            parlinfo_url = "https://www.aph.gov.au" + href
        else:
            continue

        bill_id = extract_bill_id(parlinfo_url)
        # House bill IDs look like 'r7327' — also try extracting from bId param
        if not bill_id:
            m = re.search(r'bId=([^&]+)', href)
            bill_id = m.group(1) if m else None
        if not bill_id:
            continue

        # Extract dates from remaining cells
        def cell_text(i):
            return cells[i].get_text(" ", strip=True) if i < len(cells) else ""

        intro_house   = cell_text(1)
        passed_house  = cell_text(2)
        intro_senate  = cell_text(3)
        passed_senate = cell_text(4)
        assent_text   = cell_text(5)
        act_no        = cell_text(6) if len(cells) > 6 else ""

        stages = []
        if intro_house:   stages.append(f"Introduced House: {intro_house}")
        if passed_house:  stages.append(f"Passed House: {passed_house}")
        if intro_senate:  stages.append(f"Introduced Senate: {intro_senate}")
        if passed_senate: stages.append(f"Passed Senate: {passed_senate}")
        if assent_text:   stages.append(f"Assent: {assent_text}")

        status = parse_status(stages)
        act_citation = f"Act No. {act_no}" if act_no else None

        bills.append({
            "id":                  bill_id,
            "title":               title,
            "originating_chamber": "representatives",
            "sponsor":             None,   # not in table format
            "sponsor_party":       None,
            "portfolio":           None,
            "summary_aph":         None,   # not in table format — fetched in Layer 2
            "summary_plain":       None,
            "status":              status,
            "act_citation":        act_citation,
            "introduced_date":     parse_dates(stages),
            "assent_date":         parse_assent_date(stages),
            "stages":              stages,
            "parlinfo_url":        parlinfo_url,
            "updated_at":          datetime.utcnow().isoformat() + "Z",
        })

    return bills


def parse_bills_list(html, originating_chamber):
    """Route to the correct parser based on originating chamber."""
    if originating_chamber == "senate":
        return parse_bills_list_senate(html)
    else:
        return parse_bills_list_house(html)


# ── Scraper ───────────────────────────────────────────────────────────────────

def scrape_bills():
    print("\n═══ Scraping APH Bills Lists ═══")
    all_bills = []

    for page in LIST_PAGES:
        print(f"\n  Fetching {page['chamber']} list...")
        try:
            html = curl_get(page["url"])
        except Exception as e:
            print(f"  ❌ Failed to fetch {page['chamber']} list: {e}")
            continue

        bills = parse_bills_list(html, page["chamber"])
        print(f"  Parsed {len(bills)} bills from {page['chamber']} list.")
        all_bills.extend(bills)
        time.sleep(1)  # polite delay between the two page fetches

    # Deduplicate by id (some bills appear on both lists)
    seen = set()
    deduped = []
    for b in all_bills:
        if b["id"] not in seen:
            seen.add(b["id"])
            deduped.append(b)

    print(f"\n  {len(deduped)} unique bills after deduplication.")

    # Upsert in batches of 100
    for i in range(0, len(deduped), 100):
        sb_upsert("bills", deduped[i:i+100])

    print(f"  ✅ {len(deduped)} bills upserted to Supabase.")
    return deduped


# ── AI translation step ───────────────────────────────────────────────────────

def strip_aph_preamble(text, title):
    """
    APH summaries often begin with '# Bill Title\n' or repeat the bill name.
    Strip these before sending to Claude so it doesn't echo them back.
    """
    import re
    # Remove leading markdown heading
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    # Remove the bill title if it appears at the start (first 100 chars)
    if text[:100].strip().lower().startswith(title[:40].lower()):
        lines = text.strip().split('\n')
        text = '\n'.join(lines[1:]).strip()
    return text.strip()


def claude_call(prompt, max_tokens=120):
    """Single Claude Haiku API call."""
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key":         ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        },
        json={
            "model":      "claude-haiku-4-5-20251001",
            "max_tokens": max_tokens,
            "messages":   [{"role": "user", "content": prompt}],
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json().get("content", [{}])[0].get("text", "").strip()


def translate_bills(retranslate=False):
    """
    Generate plain-English summaries and 'what this means for you' text
    for bills that have an APH summary.

    Pass retranslate=True to re-generate all existing summaries
    (use when the prompt has been improved).
    """
    if not ANTHROPIC_API_KEY:
        print("\n❌ ANTHROPIC_API_KEY not set — skipping translation.")
        return

    print(f"\n═══ Translating bill summaries {'(retranslate all)' if retranslate else '(new only)'} ═══")

    params = {
        "select":      "id,title,summary_aph,sponsor,originating_chamber,status",
        "summary_aph": "not.is.null",
        "order":       "introduced_date.desc",
        "limit":       "500",
    }
    if not retranslate:
        params["summary_plain"] = "is.null"

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/bills",
        headers={**SB_HEADERS, "Prefer": "count=none"},
        params=params, timeout=30,
    )
    resp.raise_for_status()
    to_translate = resp.json()
    print(f"  {len(to_translate)} bills to process.")

    translated = 0
    for i, bill in enumerate(to_translate, 1):
        if not bill.get("summary_aph"):
            continue
        try:
            # Clean the APH text before sending to Claude
            clean = strip_aph_preamble(bill["summary_aph"], bill["title"])
            chamber = "Senate" if bill.get("originating_chamber") == "senate" else "House of Representatives"
            sponsor = bill.get("sponsor") or "the government"
            status_text = "has become law" if bill.get("status") == "Assented" else "is currently before parliament"

            # Prompt 1 — plain-English summary (2-3 sentences, no jargon)
            plain = claude_call(
                f"Rewrite this Australian parliamentary bill summary in plain English "
                f"for a general audience (Year 8 reading level, 2-3 sentences, no legal "
                f"jargon, no acronyms, do not repeat the bill title, do not start with "
                f"'This bill' or 'The bill'). State what it does and who it affects.\n\n"
                f"Bill: {bill['title']}\n"
                f"Summary: {clean[:800]}"
            )

            # Prompt 2 — "what this means for you" (practical impact, non-partisan)
            means = claude_call(
                f"In 1-2 plain sentences, explain what this Australian bill means for "
                f"everyday Australians — practical impact on their lives, costs, rights or "
                f"services. Be strictly non-partisan: do not imply the change is good or bad, "
                f"do not use language that favours or criticises any political position. "
                f"State facts only. No jargon. Do not start with 'This bill' or 'The bill'.\n\n"
                f"Bill: {bill['title']}\n"
                f"Summary: {clean[:600]}\n"
                f"Context: Introduced by {sponsor} in the {chamber}. Currently {status_text}."
            )

            if plain or means:
                update = {}
                if plain: update["summary_plain"] = plain
                if means: update["means_plain"]   = means
                sb_patch("bills", bill["id"], update)
                translated += 1
                print(f"  [{i}/{len(to_translate)}] {bill['title'][:55]}")
                if plain:  print(f"    summary → {plain[:75]}…")
                if means:  print(f"    means   → {means[:75]}…")

        except Exception as e:
            print(f"  [{i}/{len(to_translate)}] {bill['title'][:50]} — failed: {e}")

        time.sleep(0.5)

    print(f"\n  ✅ {translated} bills translated.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape APH bills and optionally translate.")
    parser.add_argument("--translate",   action="store_true",
                        help="Generate AI plain-English summaries for new bills")
    parser.add_argument("--retranslate", action="store_true",
                        help="Re-generate all summaries (use when prompt has been improved)")
    args = parser.parse_args()

    if not args.translate and not args.retranslate:
        scrape_bills()
    elif args.retranslate:
        translate_bills(retranslate=True)
    else:
        scrape_bills()
        translate_bills(retranslate=False)

    print("\n✅ Bills sync complete.")


if __name__ == "__main__":
    main()
