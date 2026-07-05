"""
Sync current Australian MPs and Senators from They Vote For You into Supabase.

Run manually with:
    python3 scripts/sync_mps.py

Requires three environment variables (set as GitHub Secrets in production,
or in your own shell / a local .env when testing manually):
    TVFY_API_KEY               — your They Vote For You personal API key
    SUPABASE_URL                — e.g. https://xxxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY   — the SERVICE ROLE key, not the anon key.
                                   Found in Supabase → Settings → API.
                                   This key bypasses RLS, so it must never be
                                   put in frontend code or committed to git —
                                   it only ever lives as a GitHub Secret.
"""

import os
import sys
import time
import requests

TVFY_API_KEY = os.environ.get("TVFY_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "User-Agent": "Poli-CivicApp/1.0 (+https://github.com/wadeb3/poli-web; civic data project)",
    "Accept": "application/json",
}

# Seconds to wait between per-person detail requests, to be a polite API
# citizen — 226 people at 0.3s apart takes about a minute total.
REQUEST_DELAY = 0.3

if not all([TVFY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    print("❌ Missing one or more required environment variables.")
    sys.exit(1)


def fetch_people():
    url = f"https://theyvoteforyou.org.au/api/v1/people.json?key={TVFY_API_KEY}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_person_detail(person_id):
    """Fetch attendance, rebellions, and policy agreement scores for one person."""
    url = f"https://theyvoteforyou.org.au/api/v1/people/{person_id}.json?key={TVFY_API_KEY}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def transform(people):
    rows = []
    total = len(people)
    for i, p in enumerate(people, start=1):
        m = p.get("latest_member")
        if not m:
            continue
        house = m.get("house") or ""
        electorate = m.get("electorate") or ""
        pid = str(p["id"])

        row = {
            "id": pid,
            "name": f'{m["name"]["first"]} {m["name"]["last"]}',
            "party": m.get("party") or "",
            "electorate": electorate,
            "chamber": house,
            "state": electorate if house == "senate" else None,
        }

        # Enrich with per-person detail (attendance, rebellions, policy scores).
        try:
            detail = fetch_person_detail(p["id"])
            row["votes_attended"] = detail.get("votes_attended")
            row["votes_possible"] = detail.get("votes_possible")
            row["rebellions"] = detail.get("rebellions")
            row["policy_positions"] = detail.get("policy_comparisons") or []
            print(f"  [{i}/{total}] {row['name']} — detail fetched")
        except requests.exceptions.RequestException as e:
            print(f"  [{i}/{total}] {row['name']} — detail fetch failed ({e}), continuing with basic info only")
            row["votes_attended"] = None
            row["votes_possible"] = None
            row["rebellions"] = None
            row["policy_positions"] = None

        rows.append(row)
        time.sleep(REQUEST_DELAY)
    return rows


def upsert_to_supabase(rows):
    url = f"{SUPABASE_URL}/rest/v1/mps"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        # merge-duplicates = upsert on primary key conflict instead of erroring
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = requests.post(url, headers=headers, json=rows, timeout=60)
    resp.raise_for_status()


def main():
    print("Fetching current people from They Vote For You...")
    people = fetch_people()
    print(f"Got {len(people)} people. Fetching individual voting details (this takes about a minute)...")
    rows = transform(people)
    print(f"Transformed {len(rows)} people. Upserting to Supabase...")
    upsert_to_supabase(rows)
    print(f"✅ Done — {len(rows)} MPs/Senators synced, including voting records.")


if __name__ == "__main__":
    main()
