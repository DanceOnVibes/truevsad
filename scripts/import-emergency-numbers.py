#!/usr/bin/env python3
"""Build apps/web/lib/emergency-verified.json from data/emergency-numbers/emergency-numbers.csv.

Each row must have two different official sources and a date, or the script stops: a number that
isn't double-checked never gets the ✓.
"""
import csv, json, re, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/emergency-numbers/emergency-numbers.csv"
OUT = ROOT / "apps/web/lib/emergency-verified.json"

countries = {}
for i, row in enumerate(csv.DictReader(SRC.open(encoding="utf-8")), start=2):
    slug = row["fcdo_slug"].strip()
    num = re.sub(r"\D", "", row["number"])
    s1, s2 = row["source_1_url"].strip(), row["source_2_url"].strip()
    if not re.fullmatch(r"[a-z0-9-]{2,60}", slug):
        sys.exit(f"line {i}: bad fcdo_slug {slug!r}")
    if not 2 <= len(num) <= 6:
        sys.exit(f"line {i}: bad number {row['number']!r}")
    if not (s1.startswith("https://") and s2.startswith("https://")) or urlparse(s1).hostname == urlparse(s2).hostname:
        sys.exit(f"line {i}: needs two https sources on different sites")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row["checked_on"].strip()):
        sys.exit(f"line {i}: checked_on must be YYYY-MM-DD")
    c = countries.setdefault(slug, {"slug": slug, "numbers": [], "sources": [], "checkedOn": row["checked_on"].strip()})
    c["numbers"].append({"service": row["service"].strip(), "number": num})
    for name, url in ((row["source_1_name"].strip(), s1), (row["source_2_name"].strip(), s2)):
        if url not in [s["url"] for s in c["sources"]]:
            c["sources"].append({"name": name, "url": url})
    c["checkedOn"] = min(c["checkedOn"], row["checked_on"].strip())

data = json.loads(OUT.read_text(encoding="utf-8"))
data["countries"] = sorted(countries.values(), key=lambda c: c["slug"])
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(countries)} countries, {sum(len(c['numbers']) for c in countries.values())} numbers → {OUT.relative_to(ROOT)}")
