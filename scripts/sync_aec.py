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
    key = raw.strip().lower()

    # Exact matches first
    exact = PARTY_MAP.get(key)
    if exact:
        return exact

    # Partial / contains matching for state branches and variations
    if "labor" in key or "labour" in key:
        return "ALP"
    if "liberal national" in key or "lnp" in key:
        return "LNP"
    if "liberal" in key:
        return "LIB"
    if "national party" in key or "nationals" in key or "the nationals" in key:
        return "NAT"
    if "greens" in key or "green party" in key:
        return "Greens"
    if "one nation" in key or "pauline hanson" in key:
        return "ONP"
    if "independent" in key:
        return "IND"
    if "united australia" in key or "uap" in key:
        return "OTH"
    if "lambie" in key or "jln" in key:
        return "OTH"
    if "katter" in key or "kap" in key:
        return "OTH"
    if "centre alliance" in key or "nick xenophon" in key:
        return "OTH"

    return "OTH"


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

    The AEC ZIP (AllAnnualData) contains multiple CSVs:
      - AnnualDonor.csv             — donor returns (who donated)
      - AnnualDonorDonationsMade.csv — donations made details (to whom, how much)
      - AnnualDetailedReceipts.csv   — party receipts
      - AnnualPoliticalParty.csv     — party returns
      - etc.

    We want AnnualDonorDonationsMade — the "Donations Made Details" tab
    visible on the AEC website, which has:
      Financial Year, DonorName, DonationMadeTo, Date, Amount
    """
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        print(f"  ZIP contains {len(names)} files:")
        for n in names:
            print(f"    {n}")

        # Priority order — exact filename first
        targets = [
            "Donations Made.csv",
            "AnnualDonorDonationsMade.csv",
            "AnnualDonor_DonationsMade.csv",
            "DonationsMade.csv",
        ]
        # Try exact names first
        for t in targets:
            if t in names:
                print(f"  ✓ Using: {t}")
                with zf.open(t) as f:
                    return f.read().decode("utf-8-sig", errors="replace"), t

        # Fall back: any CSV with "donations made" or "made" in the name
        for name in names:
            n = name.lower()
            if "donations made" in n and n.endswith(".csv"):
                print(f"  ✓ Using (fallback match): {name}")
                with zf.open(name) as f:
                    return f.read().decode("utf-8-sig", errors="replace"), name

        # Last resort: any donor CSV
        for name in names:
            n = name.lower()
            if "donor" in n and n.endswith(".csv"):
                print(f"  ⚠ Using (last resort): {name}")
                with zf.open(name) as f:
                    return f.read().decode("utf-8-sig", errors="replace"), name

        # List all CSVs so the user can identify the right one
        csvs = [n for n in names if n.lower().endswith(".csv")]
        raise Exception(
            f"Could not find donor donations CSV in ZIP.\n"
            f"Available CSVs: {csvs}\n"
            f"Re-run with --list to see all files."
        )


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
        # Actual AEC "Donations Made.csv" headers:
        #   Financial Year | Name | Donation Received From | Date | Value
        # Where:
        #   Name                  = the donor making the donation
        #   Donation Received From = the party/entity receiving it
        #   Value                 = dollar amount
        donor  = col(r, "Name", "DonorName", "Donor Name", "Donor")
        to     = col(r, "Donation Received From", "DonationMadeTo", "Donation Made To",
                        "Recipient", "Received From", "Party")
        amt    = col(r, "Value", "Amount", "Total Amount")
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
    parser.add_argument("--year",     help="Only import a specific year e.g. 2024-25")
    parser.add_argument("--clear",    action="store_true", help="Clear existing donations first")
    parser.add_argument("--dry-run",  action="store_true", help="Parse and print rows without writing to Supabase")
    parser.add_argument("--list",     action="store_true", help="List ZIP contents and exit")
    args = parser.parse_args()

    print("\n═══ AEC Annual Donor Sync ═══")

    zip_bytes = download_aec_zip()

    if args.list:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            print("\nZIP contents:")
            for name in zf.namelist():
                info = zf.getinfo(name)
                print(f"  {name:50s} {info.file_size:>10,} bytes")
        return

    csv_text, csv_name = find_donor_csv(zip_bytes)
    rows = parse_donations_csv(csv_text, filter_year=args.year)

    print(f"\n  Parsed {len(rows)} donation records from {csv_name}" +
          (f" for {args.year}" if args.year else ""))

    if rows:
        years = sorted(set(r["financial_year"] for r in rows))
        total = sum(r["amount"] for r in rows)
        parties = {}
        for r in rows:
            parties[r["party"]] = parties.get(r["party"], 0) + r["amount"]
        print(f"  Years: {', '.join(years)}")
        print(f"  Total disclosed: ${total:,.0f}")
        print(f"  By party:")
        for party, amt in sorted(parties.items(), key=lambda x: -x[1]):
            print(f"    {party:8s}  ${amt:>12,.0f}")

        if args.dry_run:
            print(f"\n  DRY RUN — first 5 rows:")
            for r in rows[:5]:
                print(f"    {r['donor_name'][:40]:40s} → {r['party']:6s}  ${r['amount']:>10,.0f}  {r['financial_year']}")
            print(f"\n  DRY RUN complete — {len(rows)} rows parsed, nothing written to Supabase.")
            return

    if args.clear:
        print("\n  Clearing existing donations…")
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/donations",
            headers={**SB_HEADERS, "Prefer": "return=minimal"},
            params={"id": "gte.0"},
            timeout=30,
        )

    upsert_donations(rows)
    print("\n✅ AEC sync complete.")


if __name__ == "__main__":
    main()
