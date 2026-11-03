# Emergency numbers: the double-check

Plan B shows every country's emergency numbers as the FCDO lists them on GOV.UK. This file is the
second check: one row per number, confirmed on **two** official sources.

- `source_1`: the country's own government (emergency service, interior ministry, police or tourism authority). Not Wikipedia, blogs or travel sites. `source_1_quote`: the exact words on that page that show the number, in its own language.
- `source_2`: GOV.UK's travel advice for that country ("Getting help" → "Emergency services").
- `fcdo_slug`: the last part of the GOV.UK address, e.g. `thailand` for gov.uk/foreign-travel-advice/thailand.
- `number`: digits only, exactly as dialled locally (e.g. `1669`).
- `checked_on`: the date you opened both pages (YYYY-MM-DD). `checked_by`: Grok, GLM or a person's initials.

Then run `python3 scripts/import-emergency-numbers.py` to rebuild `apps/web/lib/emergency-verified.json`.
A country shows "✓ double-checked" only when every number the FCDO lists is in this file.
