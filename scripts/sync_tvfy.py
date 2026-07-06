"""
Poli · TVFY full data sync
===========================
Pulls three data sets from They Vote For You and upserts them into Supabase:

  1. mps          — current MPs/Senators with attendance, offices, policy positions
  2. tvfy_policies — TVFY policy definitions with official category labels
  3. divisions    — individual parliamentary votes with per-member aye/no records

Run manually:
    python3 scripts/sync_tvfy.py [--mps] [--policies] [--divisions]

With no flags, all three are synced.

Environment variables required (same as sync_mps.py):
    TVFY_API_KEY
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Division pagination note: TVFY returns at most 100 divisions per request.
We page backwards by date range from today, stopping once we've covered
the full 48th Parliament (from May 2022). Takes ~5–10 min on first run;
subsequent runs only fetch new divisions (uses start_date = last known).
"""

import os
import sys
import time
import argparse
import requests
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Config ─────────────────────────────────────────────────────────────────────
TVFY_API_KEY          = os.environ.get("TVFY_API_KEY")
SUPABASE_URL          = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "User-Agent": "Poli-CivicApp/1.0 (+https://github.com/wadeb3/poli-web; civic data project)",
    "Accept":     "application/json",
}

# 48th Parliament started after the May 2022 election
PARLIAMENT_START = "2022-05-22"

REQUEST_DELAY   = 0.25   # seconds between per-person/policy/division requests
DIVISION_WINDOW = 90     # days per division page request

if not all([TVFY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    print("❌ Missing one or more required environment variables.")
    sys.exit(1)

SB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates,return=minimal",
}


# ── Shared helpers ─────────────────────────────────────────────────────────────

def tvfy_get(path, params=None):
    url = f"https://theyvoteforyou.org.au/api/v1/{path}"
    p = {"key": TVFY_API_KEY}
    if params:
        p.update(params)
    resp = requests.get(url, headers=HEADERS, params=p, timeout=30)
    resp.raise_for_status()
    return resp.json()


def sb_upsert(table, rows, timeout=60):
    if not rows:
        return
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SB_HEADERS, json=rows, timeout=timeout,
    )
    resp.raise_for_status()


def sb_get(table, select="*", filters=None, limit=1):
    """Fetch a small result from Supabase for state checking."""
    params = {"select": select, "limit": limit}
    if filters:
        params.update(filters)
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "count=none"},
        params=params, timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


# ── 1. MPs / Senators ──────────────────────────────────────────────────────────

def sync_mps():
    print("\n═══ Syncing MPs/Senators ═══")
    people = tvfy_get("people.json")
    print(f"  {len(people)} people fetched. Enriching with detail...")
    rows = []
    for i, p in enumerate(people, 1):
        m = p.get("latest_member")
        if not m:
            continue
        pid  = str(p["id"])
        house = m.get("house") or ""
        electorate = m.get("electorate") or ""
        row = {
            "id":        pid,
            "name":      f'{m["name"]["first"]} {m["name"]["last"]}',
            "party":     m.get("party") or "",
            "electorate":electorate,
            "chamber":   house,
            "state":     electorate if house == "senate" else None,
        }
        try:
            d = tvfy_get(f"people/{p['id']}.json")
            row["votes_attended"] = d.get("votes_attended")
            row["votes_possible"] = d.get("votes_possible")
            row["rebellions"]     = d.get("rebellions")
            row["offices"]        = d.get("offices") or []
            flat = []
            for pc in (d.get("policy_comparisons") or []):
                pol = pc.get("policy") or {}
                try:    ag = float(pc.get("agreement"))
                except: ag = None
                flat.append({
                    "id":            pol.get("id"),
                    "name":          pol.get("name"),
                    "agreement":     ag,
                    "category":      pc.get("category"),   # ← TVFY official label
                    "voted":         pc.get("voted"),
                    "last_edited_at":pol.get("last_edited_at"),
                })
            row["policy_positions"] = flat
            print(f"  [{i}/{len(people)}] {row['name']} — {len(flat)} policies")
        except Exception as e:
            print(f"  [{i}/{len(people)}] {row['name']} — detail failed: {e}")
            row.update({"votes_attended":None,"votes_possible":None,
                        "rebellions":None,"offices":None,"policy_positions":None})
        rows.append(row)
        time.sleep(REQUEST_DELAY)
    sb_upsert("mps", rows)
    print(f"  ✅ {len(rows)} MPs/Senators upserted.")


# ── 2. TVFY Policies ───────────────────────────────────────────────────────────

def sync_policies():
    print("\n═══ Syncing TVFY Policies ═══")
    policies = tvfy_get("policies.json")
    print(f"  {len(policies)} policies fetched. Enriching with detail...")
    rows = []
    for i, p in enumerate(policies, 1):
        pid = str(p["id"])
        row = {
            "id":            pid,
            "name":          p.get("name"),
            "description":   p.get("description"),
            "provisional":   p.get("provisional", False),
            "last_edited_at":p.get("last_edited_at"),
        }
        try:
            d = tvfy_get(f"policies/{pid}.json")
            row["description"]    = d.get("description") or p.get("description")
            row["provisional"]    = d.get("provisional", row["provisional"])
            row["last_edited_at"] = d.get("last_edited_at") or p.get("last_edited_at")
            # Store people_comparisons so we can show "all MPs who voted on X"
            comparisons = []
            for pc in (d.get("people_comparisons") or []):
                try:    ag = float(pc.get("agreement"))
                except: ag = None
                comparisons.append({
                    "person_id": pc.get("person", {}).get("id"),
                    "agreement": ag,
                    "category":  pc.get("category"),
                    "voted":     pc.get("voted"),
                })
            row["people_comparisons"] = comparisons
            print(f"  [{i}/{len(policies)}] {row['name']} — {len(comparisons)} members")
        except Exception as e:
            print(f"  [{i}/{len(policies)}] {p.get('name')} — detail failed: {e}")
            row["people_comparisons"] = []
        rows.append(row)
        time.sleep(REQUEST_DELAY)
    sb_upsert("tvfy_policies", rows)
    print(f"  ✅ {len(rows)} policies upserted.")


# ── 3. Divisions ───────────────────────────────────────────────────────────────

def fetch_division_window(start_str, end_str, house):
    """Fetch up to 100 divisions in a date window for one chamber."""
    return tvfy_get("divisions.json", {
        "start_date": start_str,
        "end_date":   end_str,
        "house":      house,
    })


def fetch_division_detail(div_id):
    return tvfy_get(f"divisions/{div_id}.json")


def sync_divisions():
    print("\n═══ Syncing Divisions ═══")

    # Find the most recent division we already have, so we only fetch new ones
    try:
        existing = sb_get("divisions", select="date", filters={"order": "date.desc"})
        if existing and existing[0].get("date"):
            resume_from = existing[0]["date"]
            print(f"  Resuming from {resume_from} (most recent in Supabase)")
        else:
            resume_from = PARLIAMENT_START
            print(f"  No existing divisions — fetching full 48th Parliament from {resume_from}")
    except Exception as e:
        resume_from = PARLIAMENT_START
        print(f"  Couldn't check existing divisions ({e}) — starting from {resume_from}")

    today     = date.today()
    start_dt  = date.fromisoformat(resume_from)
    end_dt    = today
    houses    = ["representatives", "senate"]

    # Collect all division stubs across the date range in windows
    all_stubs = []
    current = start_dt
    while current <= end_dt:
        window_end = min(current + timedelta(days=DIVISION_WINDOW), end_dt)
        for house in houses:
            try:
                stubs = fetch_division_window(
                    current.isoformat(), window_end.isoformat(), house
                )
                all_stubs.extend(stubs)
                print(f"  {current} → {window_end} [{house}]: {len(stubs)} divisions")
            except Exception as e:
                print(f"  {current} → {window_end} [{house}]: failed — {e}")
            time.sleep(REQUEST_DELAY)
        current = window_end + timedelta(days=1)

    if not all_stubs:
        print("  No new divisions found.")
        return

    print(f"\n  {len(all_stubs)} division stubs — fetching detail...")

    rows      = []
    vote_rows = []
    seen_ids  = set()

    for i, stub in enumerate(all_stubs, 1):
        div_id = str(stub["id"])
        if div_id in seen_ids:
            continue
        seen_ids.add(div_id)

        try:
            d = fetch_division_detail(div_id)

            row = {
                "id":          div_id,
                "house":       d.get("house"),
                "name":        d.get("name"),
                "date":        d.get("date"),
                "clock_time":  d.get("clock_time"),
                "number":      d.get("number"),
                "aye_votes":   d.get("aye_votes"),
                "no_votes":    d.get("no_votes"),
                "possible_turnout": d.get("possible_turnout"),
                "rebellions":  d.get("rebellions"),
                "edited":      d.get("edited", False),
                "summary":     d.get("summary"),
                # policy + bill links for future cross-referencing with APH data
                "policy_division_ids": [
                    str(pd.get("policy", {}).get("id"))
                    for pd in (d.get("policy_divisions") or [])
                    if pd.get("policy", {}).get("id")
                ],
                "bill_ids": [
                    str(b.get("id")) for b in (d.get("bills") or []) if b.get("id")
                ],
            }
            rows.append(row)

            # Per-member vote records — stored separately for efficient lookup
            for v in (d.get("votes") or []):
                mp = v.get("member") or {}
                vote_rows.append({
                    "division_id": div_id,
                    "mp_id":       str(mp.get("id") or ""),
                    "mp_name":     f'{mp.get("name", {}).get("first", "")} {mp.get("name", {}).get("last", "")}'.strip(),
                    "vote":        v.get("vote"),    # "aye" or "no"
                    "rebel":       v.get("rebel", False),
                    "division_date": d.get("date"),
                    "division_name": d.get("name"),
                    "house":       d.get("house"),
                })

            print(f"  [{i}/{len(all_stubs)}] {d.get('date')} · {d.get('name')[:60]}")
        except Exception as e:
            print(f"  [{i}/{len(all_stubs)}] Division {div_id} — detail failed: {e}")

        time.sleep(REQUEST_DELAY)

    # Upsert divisions in batches of 100
    print(f"\n  Upserting {len(rows)} divisions...")
    for chunk_start in range(0, len(rows), 100):
        sb_upsert("divisions", rows[chunk_start:chunk_start + 100])

    # Upsert per-member votes in batches of 200
    print(f"  Upserting {len(vote_rows)} individual votes...")
    for chunk_start in range(0, len(vote_rows), 200):
        sb_upsert("member_votes", vote_rows[chunk_start:chunk_start + 200])

    print(f"  ✅ {len(rows)} divisions and {len(vote_rows)} individual votes upserted.")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sync TVFY data into Supabase.")
    parser.add_argument("--mps",       action="store_true", help="Sync MPs/Senators only")
    parser.add_argument("--policies",  action="store_true", help="Sync TVFY policies only")
    parser.add_argument("--divisions", action="store_true", help="Sync divisions only")
    args = parser.parse_args()

    run_all = not any([args.mps, args.policies, args.divisions])

    if run_all or args.mps:
        sync_mps()
    if run_all or args.policies:
        sync_policies()
    if run_all or args.divisions:
        sync_divisions()

    print("\n✅ Sync complete.")


if __name__ == "__main__":
    main()
