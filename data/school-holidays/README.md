# School holidays — research template

Council school holiday dates for **School Window**. Research fills `school-holidays.csv`;
`pnpm import-holidays` checks every row and turns it into SQL.

**Every row must come from the council's own term dates page.** No source, no row.

## Columns

| Column | What to put | Example |
| --- | --- | --- |
| `nation` | `england`, `scotland`, `wales` or `northern_ireland` | `england` |
| `authority` | Council name as families know it (no "Council", "London Borough of") | `Lambeth` |
| `school_year` | Academic year | `2026-27` |
| `name` | Holiday name | `October half term` |
| `starts_on` | **First day off school**, YYYY-MM-DD (usually a Saturday) | `2026-10-24` |
| `ends_on` | **Last day off school**, YYYY-MM-DD (usually a Sunday) | `2026-11-01` |
| `source_url` | The council's term dates page | `https://www.lambeth.gov.uk/…` |
| `source_note` | One line: what the page says + date checked | `Council page, checked 31 Oct 2026` |

## Rules of thumb

- Include the weekends either side: the holiday runs from the first day off to the last day off.
- One row per holiday: October half term, Christmas, February half term, Easter, May half term, Summer.
- Bank holidays inside term (e.g. early May) and INSET days are NOT holidays here; leave them out.
- Academies, free schools and faith schools can set their own dates; we show the council's dates
  and the page tells families to check with their school.
- Holidays in the same council and year must not overlap (the importer checks).
