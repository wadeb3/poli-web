"""
Poli · AEC Annual Donor Sync
=============================
Downloads the AEC Transparency Register annual donor data and upserts
to the Supabase donations table.

Data source:
  https://transparency.aec.gov.au/Download/AllAnnualData
  — Public ZIP, no authentication required.
  — Contains a CSV for annual donor donations made.
  — Updated annually (first working day of February each year).

Run:
  python3 scripts/sync_aec.py

Optional flags:
  --year 2024-25    Only import a specific financial year
  --clear           Clear existing donations before re-importing

Environment variables required:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import os, sys, io, re, csv, time, zipfile, argparse, subprocess, requests
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL              = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

AEC_ZIP_URL = "https://transparency.aec.gov.au/Download/AllAnnualData"

SB_HEADERS = {
    "apikey":        SUPABASE_SERVICE_ROLE_KEY or "",
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY or ''}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates,return=minimal",
}

# ── Party name normalisation ──────────────────────────────────────────────────
# AEC uses full party names — map to the codes our UI uses
PARTY_MAP = {
    # Labor
    "australian labor party":                   "ALP",
    "australian labor party (nsw branch)":      "ALP",
    "australian labor party (victorian branch)":"ALP",
    "australian labor party (queensland branch)":"ALP",
    "alp":                                       "ALP",
    # Liberal
    "liberal party of australia":               "LIB",
    "liberal party of australia (nsw division)":"LIB",
    "liberal party of australia (victorian division)":"LIB",
    "liberal party of australia (wa division)": "LIB",
    "liberal party":                            "LIB",
    # LNP (Qld)
    "liberal national party of queensland":     "LNP",
    "lnp":                                      "LNP",
    # Nationals
    "the nationals":                            "NAT",
    "national party of australia":              "NAT",
    "nationals":                                "NAT",
    # Greens
    "the australian greens":                    "Greens",
    "australian greens":                        "Greens",
    "the greens":                               "Greens",
    # One Nation
    "pauline hanson's one nation":              "ONP",
    "one nation":                               "ONP",
    # Others
    "the united australia party":               "OTH",
    "united australia party":                   "OTH",
    "katter's australian party":                "OTH",
    "jacqui lambie network":                    "OTH",
    "centre alliance":                          "OTH",
    "independent":                              "IND",
}

def normalise_party(raw):
    if not raw:
        return "OTH"
    return PARTY_MAP.get(raw.strip().lower(), "OTH")


# ── Donor type classification ─────────────────────────────────────────────────
# Simple keyword rules to classify donor entities
DONOR_TYPE_RULES = [
    (["pty ltd", "pty. ltd", "limited", "ltd", "inc.", " plc"], "Corporation"),
    (["union", "workers", "employees", "industrial"],           "Union"),
    (["association", "institute", "council", "federation",
      "chamber", "industry group", "peak body"],                "Industry Body"),
    (["trust", "foundation", "fund"],                           "Foundation"),
    (["property", "real estate", "development", "developer"],   "Property"),
    (["mining", "resources", "energy", "petroleum", "gas",
      "coal", "oil"],                                           "Resources & Energy"),
    (["health", "hospital", "medical", "pharmacy", "aged care"],"Health"),
    (["bank", "finance", "financial", "insurance", "invest"],   "Finance"),
    (["law firm", "legal", "solicitor", "barrister"],           "Legal"),
]

def classify_donor(name):
    n = name.lower()
    for keywords, label in DONOR_TYPE_RULES:
        if any(kw in n for kw in keywords):
            return label
    return "Other"


# ── AEC CSV parsing ───────────────────────────────────────────────────────────
def download_aec_zip():
    """Download the AEC annual data ZIP using curl (avoids user-agent issues)."""
    print("  Downloading AEC annual data ZIP…")
    result = subprocess.run(
        ["curl", "-s", "-L",
         "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
         "--max-time", "60",
         AEC_ZIP_URL, "-o", "/tmp/aec_annual.zip"],
        capture_output=True, timeout=65
    )
    if result.returncode != 0:
        raise Exception(f"curl failed: {result.stderr}")
    print("  ✓ ZIP downloaded")
    with open("/tmp/aec_annual.zip", "rb") as f:
        return f.read()


def find_donor_csv(zip_bytes):
    """
    Find the annual donor donations CSV inside the AEC ZIP.
    AEC zips contain multiple CSVs — we want the one about
    donations made (not receipts).
    """
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        print(f"  ZIP contains: {names}")
        # Look for the donations made CSV — AEC naming varies by year
        target = None
        for name in names:
            n = name.lower()
            if ("donor" in n or "donation" in n) and n.endswith(".csv"):
                target = name
                break
        if not target:
            # Fall back to first CSV
            csvs = [n for n in names if n.endswith(".csv")]
            if csvs:
                target = csvs[0]
        if not target:
            raise Exception("No CSV found in AEC ZIP")
        print(f"  Using CSV: {target}")
        with zf.open(target) as f:
            return f.read().decode("utf-8-sig", errors="replace")


def parse_donations_csv(csv_text, filter_year=None):
    """
    Parse the AEC annual donor CSV.
    AEC column names vary slightly by year — we try common variations.
    """
    reader = csv.DictReader(io.StringIO(csv_text))
    headers = reader.fieldnames or []
    print(f"  CSV headers: {headers}")

    # Map common AEC column name variations
    def col(row, *candidates):
        for c in candidates:
            for h in headers:
                if c.lower() in h.lower():
                    return row.get(h, "").strip()
        return ""

    rows = []
    for r in reader:
        donor  = col(r, "DonorName", "Donor Name", "Name")
        to     = col(r, "DonationMadeTo", "Donation Made To", "Recipient", "Party")
        amt    = col(r, "Amount", "Total Amount", "Value")
        date   = col(r, "Date", "DonationDate", "Donation Date")
        year   = col(r, "Financial Year", "FinancialYear", "Year")

        if not donor or not to:
            continue

        # Parse amount — strip currency symbols and commas
        try:
            amount = float(re.sub(r"[^0-9.]", "", amt)) if amt else 0
        except ValueError:
            amount = 0

        # Parse date
        parsed_date = None
        if date:
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y"):
                try:
                    parsed_date = datetime.strptime(date.strip(), fmt).date().isoformat()
                    break
                except ValueError:
                    continue

        # Infer financial year from date if not provided
        if not year and parsed_date:
            y = int(parsed_date[:4])
            m = int(parsed_date[5:7])
            fy_start = y if m >= 7 else y - 1
            year = f"{fy_start}-{str(fy_start+1)[-2:]}"

        if filter_year and year != filter_year:
            continue

        rows.append({
            "donor_name":     donor[:200],
            "party":          normalise_party(to),
            "party_raw":      to[:200],
            "amount":         amount,
            "financial_year": year or "Unknown",
            "donation_date":  parsed_date,
            "donor_type":     classify_donor(donor),
        })

    return rows


def upsert_donations(rows, batch_size=500):
    """Upsert donation rows to Supabase in batches."""
    if not rows:
        print("  No rows to upsert.")
        return

    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/donations",
            headers=SB_HEADERS,
            json=batch,
            timeout=60,
        )
        if resp.status_code not in (200, 201):
            print(f"  ⚠ Batch {i//batch_size+1} failed: {resp.status_code} {resp.text[:200]}")
        else:
            total += len(batch)
            print(f"  ✓ Upserted rows {i+1}–{i+len(batch)}")
        time.sleep(0.2)

    print(f"\n  ✅ {total} donation records stored.")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="Sync AEC annual donation data to Supabase.")
    parser.add_argument("--year",  help="Only import a specific year e.g. 2024-25")
    parser.add_argument("--clear", action="store_true", help="Clear existing donations first")
    args = parser.parse_args()

    print("\n═══ AEC Annual Donor Sync ═══")

    if args.clear:
        print("  Clearing existing donations…")
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/donations",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            params={"id": "gte.0"},
            timeout=30,
        )

    zip_bytes  = download_aec_zip()
    csv_text   = find_donor_csv(zip_bytes)
    rows       = parse_donations_csv(csv_text, filter_year=args.year)

    print(f"  Parsed {len(rows)} donation records" + (f" for {args.year}" if args.year else ""))
    if rows:
        years = sorted(set(r["financial_year"] for r in rows))
        print(f"  Years covered: {', '.join(years)}")
        print(f"  Total value: ${sum(r['amount'] for r in rows):,.0f}")

    upsert_donations(rows)
    print("\n✅ AEC sync complete.")


if __name__ == "__main__":
    main()
