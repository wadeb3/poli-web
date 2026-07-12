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
import json
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

            # Prompt 3 — category classification
            CATEGORIES = [
                "Economy & Tax", "Health", "Environment", "Immigration",
                "Defence & Security", "Education", "Social Services",
                "Justice & Law", "Agriculture", "Government & Parliament"
            ]
            category = claude_call(
                f"Classify this Australian parliamentary bill into exactly one of these "
                f"categories. Reply with only the category name, nothing else.\n\n"
                f"Categories: {', '.join(CATEGORIES)}\n\n"
                f"Bill: {bill['title']}\n"
                f"Summary: {clean[:400]}",
                max_tokens=20
            )
            # Validate — if Claude returns something unexpected, default to closest match
            if category not in CATEGORIES:
                category = next((c for c in CATEGORIES if c.lower() in category.lower()), "Government & Parliament")

            if plain or means or category:
                update = {}
                if plain:    update["summary_plain"] = plain
                if means:    update["means_plain"]   = means
                if category: update["category"]      = category
                sb_patch("bills", bill["id"], update)
                translated += 1
                print(f"  [{i}/{len(to_translate)}] {bill['title'][:55]}")
                if plain:    print(f"    summary  → {plain[:70]}…")
                if means:    print(f"    means    → {means[:70]}…")
                if category: print(f"    category → {category}")

        except Exception as e:
            print(f"  [{i}/{len(to_translate)}] {bill['title'][:50]} — failed: {e}")

        time.sleep(0.5)

    print(f"\n  ✅ {translated} bills translated.")



# ── Layer 2 — Bill detail enrichment ─────────────────────────────────────────
#
# For each bill that has a parlinfo_url, fetches the individual APH bill page
# to extract the explanatory memorandum and second reading speech text, then
# runs five targeted AI prompts to populate:
#   provisions, cohorts, arguments, hidden_provisions, party_positions
#
# Run with: python3 scripts/sync_bills.py --enrich
#
# Incremental — only processes bills where enriched_at is null.
# Re-run with: python3 scripts/sync_bills.py --re-enrich (reprocesses all)
#
# APH WAF blocks Python requests — uses curl subprocess (same as list scraper).

def fetch_bill_detail_page(bill_id):
    """
    Fetch the APH bill detail page using curl.
    URL format: https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/
                Bills_Search_Results/Result?bId={bill_id}
    Returns raw HTML string or None on failure.
    """
    url = f"https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId={bill_id}"
    try:
        result = subprocess.run(
            [
                "curl", "-s", "-L",
                "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "--max-time", "30",
                "--compressed",
                "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "-H", "Accept-Language: en-AU,en;q=0.9",
                url,
            ],
            capture_output=True, text=True, timeout=35
        )
        if result.returncode != 0 or not result.stdout:
            return None
        return result.stdout
    except Exception as e:
        print(f"    curl failed: {e}")
        return None


def extract_bill_texts(html):
    """
    Extract explanatory memorandum and second reading speech text
    from an APH bill detail page HTML.
    Returns (em_text, speech_text) tuple — either may be None.
    """
    if not html:
        return None, None

    soup = BeautifulSoup(html, "html.parser")
    em_text = None
    speech_text = None

    # The bill detail page has sections separated by headings.
    # We look for the EM and second reading speech link text, then
    # follow the HTML link to the actual document HTML if available.
    # For now, extract the summary/description text visible on the page.

    # Find all text content in the main bill description area
    main = soup.find("div", class_="bill-home") or soup.find("div", {"id": "billhome"}) or soup.find("main")

    if main:
        # Extract the full text content, which contains the bill summary,
        # stage history, and any inline EM content
        full_text = main.get_text(" ", strip=True)

        # Split into rough sections by known headings
        em_match = re.search(
            r'(?:Explanatory memoranda?|Summary)[:\s]+(.{100,3000}?)(?:Second reading|Progress of bill|Text of bill|$)',
            full_text, re.IGNORECASE | re.DOTALL
        )
        if em_match:
            em_text = em_match.group(1).strip()

        speech_match = re.search(
            r'(?:Second reading speech[es]*)[:\s]+(.{100,3000}?)(?:Committee|Third reading|Progress|$)',
            full_text, re.IGNORECASE | re.DOTALL
        )
        if speech_match:
            speech_text = speech_match.group(1).strip()

        # Fallback: use the full page text (capped) as EM source
        if not em_text:
            em_text = full_text[:3000]

    return em_text, speech_text


def parse_json_response(text, fallback):
    """
    Safely parse JSON from a Claude response.
    Strips markdown fences, handles common formatting issues.
    Returns parsed object or fallback on failure.
    """
    if not text:
        return fallback
    # Strip markdown code fences
    text = re.sub(r'```(?:json)?\s*', '', text).strip()
    text = re.sub(r'```\s*$', '', text).strip()
    try:
        return json.loads(text)
    except Exception:
        # Try to find JSON within the text
        arr_match = re.search(r'(\[.*\])', text, re.DOTALL)
        obj_match = re.search(r'(\{.*\})', text, re.DOTALL)
        for m in [arr_match, obj_match]:
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass
    return fallback


def enrich_bill(bill, em_text, speech_text):
    """
    Run all five AI enrichment prompts for a single bill.
    Returns a dict of the enriched fields.
    """
    if not ANTHROPIC_API_KEY:
        return {}

    title = bill.get("title", "")
    # Use em_text as primary source, fall back to APH summary
    primary_text = em_text or bill.get("summary_aph") or title
    debate_text   = speech_text or primary_text

    results = {}

    # ── Prompt 1: Provisions ─────────────────────────────────────────────────
    try:
        raw = claude_call(
            f"Extract 4-6 key operative provisions from this Australian parliamentary bill.\n"
            f"Each provision must be one factual sentence describing something the bill "
            f"specifically requires, prohibits, creates, or amends. Use active voice starting "
            f"with a verb. Do not include political framing, background context, or opinions.\n"
            f"Only include provisions explicitly stated in the source text.\n\n"
            f"Output ONLY a JSON array of strings. Example: [\"Requires X to do Y\", \"Establishes Z\"]\n\n"
            f"Bill: {title}\n"
            f"Text: {primary_text[:2000]}",
            max_tokens=400
        )
        parsed = parse_json_response(raw, [])
        if isinstance(parsed, list) and parsed:
            results["provisions"] = parsed
    except Exception as e:
        print(f"    provisions failed: {e}")

    time.sleep(0.3)

    # ── Prompt 2: Cohorts ────────────────────────────────────────────────────
    try:
        raw = claude_call(
            f"Identify 4-6 distinct groups of Australians directly or indirectly affected by "
            f"this bill. For each group state only observable, factual impacts as described "
            f"in the bill or explanatory memorandum. Do not characterise impacts as positive "
            f"or negative. Do not infer impacts not described in the source text.\n\n"
            f"The 'group' field must be a SHORT noun phrase of 1-3 words maximum "
            f"(e.g. 'Aged care residents', 'Small businesses', 'Renters', 'Employers'). "
            f"The 'detail' field is one factual sentence.\n\n"
            f"Output ONLY a JSON array: "
            f"[{{\"group\":\"short noun phrase\",\"impact\":\"direct or indirect\",\"detail\":\"string\"}}]\n\n"
            f"Bill: {title}\n"
            f"Text: {primary_text[:2000]}",
            max_tokens=500
        )
        parsed = parse_json_response(raw, [])
        if isinstance(parsed, list) and parsed:
            results["cohorts"] = parsed
    except Exception as e:
        print(f"    cohorts failed: {e}")

    time.sleep(0.3)

    # ── Prompt 3: Arguments ──────────────────────────────────────────────────
    try:
        raw = claude_call(
            f"Based only on the text provided, extract the arguments made IN FAVOUR of and "
            f"AGAINST this bill as stated by their respective proponents. Report only what "
            f"was actually argued — do not invent, embellish, or editorialize. Up to 3 "
            f"arguments per side, one factual sentence each. If fewer than 3 arguments are "
            f"present on either side, include only those explicitly stated.\n\n"
            f"Output ONLY a JSON object:\n"
            f"{{\"for\":[\"string\"],\"against\":[\"string\"]}}\n\n"
            f"Bill: {title}\n"
            f"Text: {debate_text[:2000]}",
            max_tokens=400
        )
        parsed = parse_json_response(raw, {"for": [], "against": []})
        if isinstance(parsed, dict) and ("for" in parsed or "against" in parsed):
            results["arguments"] = parsed
    except Exception as e:
        print(f"    arguments failed: {e}")

    time.sleep(0.3)

    # ── Prompt 4: Hidden provisions ──────────────────────────────────────────
    try:
        raw = claude_call(
            f"Identify provisions in this bill that meet ONE OR MORE of these specific criteria:\n"
            f"1. Substantively unrelated to the bill's stated primary purpose\n"
            f"2. Delegate significant discretionary power to a Minister without parliamentary "
            f"vote or oversight mechanism\n"
            f"3. Remove or reduce an existing legal protection\n"
            f"4. Contain a sunset clause that removes a protection (not routine administrative)\n\n"
            f"Return an empty array if no provisions clearly meet these criteria.\n"
            f"Do not flag standard legislative drafting, definitions, or procedural clauses.\n"
            f"Be conservative — only flag provisions a reasonable person would find notable.\n\n"
            f"Output ONLY a JSON array with these exact fields:\n"
            f"- type: one of exactly: unrelated, delegated, expanded, sunset\n"
            f"- severity: one of exactly: high, medium, low\n"
            f"- clause: the specific clause reference e.g. 'Schedule 2, Clause 18'\n"
            f"- title: a SHORT heading of 4-7 words describing what the provision does "
            f"(NOT a full sentence — e.g. 'Minister sets cap by instrument', not "
            f"'The Minister is given the power to set the cap')\n"
            f"- summary: one factual sentence describing what the provision does\n"
            f"- whyItMatters: one factual sentence explaining why this warrants scrutiny\n\n"
            f"[{{\"type\":\"string\",\"severity\":\"string\",\"clause\":\"string\","
            f"\"title\":\"string\",\"summary\":\"string\",\"whyItMatters\":\"string\"}}]\n\n"
            f"Bill: {title}\n"
            f"Text: {primary_text[:2000]}",
            max_tokens=500
        )
        parsed = parse_json_response(raw, [])
        if isinstance(parsed, list):
            results["hidden_provisions"] = parsed
    except Exception as e:
        print(f"    hidden_provisions failed: {e}")

    time.sleep(0.3)

    # ── Prompt 5: Party positions ────────────────────────────────────────────
    try:
        raw = claude_call(
            f"Based only on the text provided, state each party's position on this bill.\n"
            f"Only include parties with an explicitly stated position in the source text.\n"
            f"Do not infer positions from general ideology or past voting patterns.\n"
            f"Include all parties mentioned regardless of size.\n\n"
            f"The 'party' field must use EXACTLY one of these names (no variations):\n"
            f"Australian Labor Party, Liberal Party, National Party, Australian Greens, "
            f"Liberal National Party, Independent, One Nation, Katter's Australian Party, "
            f"Jacqui Lambie Network, United Australia Party, Centre Alliance\n\n"
            f"The 'note' field must be one SHORT factual sentence (max 15 words) "
            f"stating their stated reason.\n\n"
            f"Output ONLY a JSON array:\n"
            f"[{{\"party\":\"string\",\"position\":\"support|oppose|conditional\","
            f"\"note\":\"string\"}}]\n\n"
            f"Bill: {title}\n"
            f"Text: {debate_text[:2000]}",
            max_tokens=400
        )
        parsed = parse_json_response(raw, [])
        if isinstance(parsed, list) and parsed:
            results["party_positions"] = parsed
    except Exception as e:
        print(f"    party_positions failed: {e}")

    return results


def enrich_bills(reenrich=False):
    """
    Layer 2 enrichment — fetch each bill's APH detail page,
    extract EM + speech text, run 5 AI prompts, store results.
    """
    if not ANTHROPIC_API_KEY:
        print("\n❌ ANTHROPIC_API_KEY not set — skipping enrichment.")
        return

    print(f"\n═══ Enriching bill details {'(re-enrich all)' if reenrich else '(new only)'} ═══")

    params = {
        "select":  "id,title,parlinfo_url,summary_aph",
        "order":   "introduced_date.desc",
        "limit":   "500",
    }
    if not reenrich:
        params["enriched_at"] = "is.null"

    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/bills",
        headers={**SB_HEADERS, "Prefer": "count=none"},
        params=params, timeout=30,
    )
    resp.raise_for_status()
    bills = [b for b in resp.json() if b.get("parlinfo_url") or b.get("summary_aph")]
    print(f"  {len(bills)} bills to enrich.")

    enriched = 0
    for i, bill in enumerate(bills, 1):
        print(f"\n  [{i}/{len(bills)}] {bill['title'][:60]}")

        # Fetch the APH detail page
        em_text, speech_text = None, None
        if bill.get("parlinfo_url"):
            # Extract bill ID from the parlinfo URL
            bill_id = extract_bill_id(bill["parlinfo_url"])
            if bill_id:
                html = fetch_bill_detail_page(bill_id)
                em_text, speech_text = extract_bill_texts(html)
                if em_text:
                    print(f"    ✓ Page fetched ({len(em_text)} chars)")
                else:
                    print(f"    ⚠ Page fetched but no EM text extracted")
            time.sleep(1)  # polite delay between page fetches

        # Run AI enrichment
        enrichment = enrich_bill(bill, em_text, speech_text)

        if enrichment or em_text:
            update = {
                "enriched_at": datetime.utcnow().isoformat() + "Z",
            }
            if em_text:     update["em_text"]     = em_text[:5000]
            if speech_text: update["speech_text"] = speech_text[:3000]
            update.update(enrichment)

            sb_patch("bills", bill["id"], update)
            enriched += 1

            for field in ["provisions", "cohorts", "arguments", "hidden_provisions", "party_positions"]:
                val = enrichment.get(field)
                if val:
                    if isinstance(val, list):
                        print(f"    {field}: {len(val)} items")
                    else:
                        print(f"    {field}: ✓")

        time.sleep(0.5)

    print(f"\n  ✅ {enriched} bills enriched.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape APH bills and optionally translate.")
    parser.add_argument("--translate",   action="store_true",
                        help="Generate AI plain-English summaries for new bills")
    parser.add_argument("--retranslate", action="store_true",
                        help="Re-generate all summaries (use when prompt has been improved)")
    parser.add_argument("--enrich",      action="store_true",
                        help="Layer 2: fetch bill detail pages and run 5 AI enrichment prompts")
    parser.add_argument("--re-enrich",   action="store_true", dest="reenrich",
                        help="Re-enrich all bills (reprocesses even if already enriched)")
    args = parser.parse_args()

    run_scrape = not any([args.translate, args.retranslate, args.enrich, args.reenrich])

    if run_scrape:
        scrape_bills()
    if args.translate:
        scrape_bills()
        translate_bills(retranslate=False)
    if args.retranslate:
        translate_bills(retranslate=True)
    if args.enrich:
        enrich_bills(reenrich=False)
    if args.reenrich:
        enrich_bills(reenrich=True)

    print("\n✅ Bills sync complete.")


if __name__ == "__main__":
    main()
