#!/usr/bin/env python3
"""
Spain's general hospitals for Plan B, from two official files (both in data/hospitals/):

  CNH_2025.xlsx  Ministerio de Sanidad, Catálogo Nacional de Hospitales 2025 (hospitals at 31 Dec 2024):
                 https://www.sanidad.gob.es/estadEstudios/estadisticas/sisInfSanSNS/ofertaRecursos/hospitales/docs/CNH_2025.xlsx
  eurostat-gisco-healthcare-ES-2026.csv
                 Eurostat GISCO healthcare services, Spain, built from the same catalogue, adds map positions:
                 https://gisco-services.ec.europa.eu/pub/healthcare/2026/csv/ES.csv

Keeps only "Hospitales Generales" (class C11): no long-stay, mental-health or specialist hospitals.
Neither file says which hospitals have a 24-hour emergency department, so we don't claim it.

Run once a year when the Ministry publishes a new catalogue:
    python3 scripts/import-hospitals-es.py
Writes apps/web/lib/hospitals-es.json.
"""
import csv, json, re, sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("Needs openpyxl: pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
CNH = ROOT / "data/hospitals/CNH_2025.xlsx"
GISCO = ROOT / "data/hospitals/eurostat-gisco-healthcare-ES-2026.csv"
OUT = ROOT / "apps/web/lib/hospitals-es.json"

wb = openpyxl.load_workbook(CNH, read_only=True, data_only=True)
rows = list(wb["DIRECTORIO DE HOSPITALES"].iter_rows(values_only=True))
head = rows[0]
cnh = [dict(zip(head, r)) for r in rows[1:] if r and r[0]]
geo = {r["id"]: r for r in csv.DictReader(GISCO.open(encoding="utf-8"))}

def tidy(s):
    return re.sub(r"\s*-\s*$", "", re.sub(r"\s+", " ", str(s or ""))).strip()

out, missing = [], []
for h in cnh:
    if h["Cód. Clase de Centro"] != "C11":
        continue
    g = geo.get("ES_" + str(int(h["CCN"])))
    if not g or not g["lat"] or not g["lon"]:
        missing.append(h["Nombre Centro"])
        continue
    out.append({
        "ccn": str(h["CCN"]),
        "name": tidy(h["Nombre Centro"]),
        "address": tidy(h["Dirección"]),
        "postcode": str(h["Código Postal"] or "").zfill(5),
        "town": tidy(h["Municipio"]),
        "public": h["Dependencia Funcional"] != "Privados",
        "runBy": tidy(h["Dependencia Funcional"]),
        "beds": int(h["CAMAS"] or 0),
        "lat": round(float(g["lat"]), 6),
        "lon": round(float(g["lon"]), 6),
    })

out.sort(key=lambda h: h["ccn"])
OUT.write_text(json.dumps({
    "source": "Ministerio de Sanidad, Catálogo Nacional de Hospitales 2025 (hospitals at 31 Dec 2024); map positions: Eurostat GISCO healthcare services (2026)",
    "sourceUrl": "https://www.sanidad.gob.es/estadEstudios/estadisticas/sisInfSanSNS/ofertaRecursos/hospitales/home.htm",
    "positionsUrl": "https://ec.europa.eu/eurostat/web/gisco/geodata/basic-services",
    "asOf": "2024-12-31",
    "hospitals": out,
}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"✓ {len(out)} general hospitals written to {OUT.relative_to(ROOT)}" + (f"; {len(missing)} without a map position: {missing}" if missing else ""))
