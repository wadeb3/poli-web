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
import requests

TVFY_API_KEY = os.environ.get("TVFY_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not all([TVFY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    print("❌ Missing one or more required environment variables.")
    sys.exit(1)


def fetch_people():
    url = f"https://theyvoteforyou.org.au/api/v1/people.json?key={TVFY_API_KEY}"
    headers = {
        "User-Agent": "Poli-CivicApp/1.0 (+https://github.com/wadeb3/poli-web; civic data project)",
        "Accept": "application/json",
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def transform(people):
    rows = []
    for p in people:
        m = p.get("latest_member")
        if not m:
            continue
        house = m.get("house") or ""
        electorate = m.get("electorate") or ""
        rows.append({
            "id": str(p["id"]),
            "name": f'{m["name"]["first"]} {m["name"]["last"]}',
            "party": m.get("party") or "",
            "electorate": electorate,
            "chamber": house,
            # TVFY's "electorate" field holds the state name for senators.
            "state": electorate if house == "senate" else None,
        })
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
    resp = requests.post(url, headers=headers, json=rows, timeout=30)
    resp.raise_for_status()


def main():
    print("Fetching current people from They Vote For You...")
    people = fetch_people()
    rows = transform(people)
    print(f"Transformed {len(rows)} people. Upserting to Supabase...")
    upsert_to_supabase(rows)
    print(f"✅ Done — {len(rows)} MPs/Senators synced.")


if __name__ == "__main__":
    main()
