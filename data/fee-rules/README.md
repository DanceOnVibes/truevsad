# Fee rules — research template

This is how real-world costs (bags, seats, tourist taxes, ETIAS…) get into TrueVsAd.
Research fills `fee-rules.csv`; `pnpm import-rules` checks every row and turns it into SQL.

**Every row must have a `source_url` and the date it was checked.** No source, no rule.
A rule that can't be backed up is worse than no rule: it breaks the whole promise of the site.

## Columns

| Column | Required | What to put | Example |
| --- | --- | --- | --- |
| `category` | yes | `party_extra`, `levy`, `entry_doc`, `door_to_door` or `payment_fx` | `levy` |
| `label` | yes | What the family sees on the Receipt (max 160 chars) | `Canary Islands tourist tax` |
| `unit` | yes | `per_party`, `per_person`, `per_adult`, `per_child`, `per_person_per_night`, `per_adult_per_night` | `per_adult_per_night` |
| `amount_gbp` | one of these two | Fixed amount in **pounds** (converted to pence on import) | `2.50` |
| `percent` | one of these two | Percentage of the flight + stay price | `2.99` |
| `min_age` | no | Youngest age the rule applies to | `16` |
| `max_age` | no | Oldest age it applies to (leave blank for adults) | |
| `supplier_name` | no | Only for one airline/operator, e.g. `easyJet`. Blank = everyone | |
| `region` | no | Where it applies, plain words for now, e.g. `Tenerife`. Blank = everywhere | `Canary Islands` |
| `confidence` | yes | 0–1. `0.9` = official published figure; `0.6` = typical price that varies; `0.3` = rough guess | `0.9` |
| `source_url` | yes | Where the figure comes from — official pages first | `https://…` |
| `source_note` | yes | One line: what the page says, and the date you checked it | `Gov page, checked 30 Oct 2026` |
| `valid_from` | yes | `YYYY-MM-DD` when the figure starts | `2026-11-01` |
| `valid_to` | no | `YYYY-MM-DD` when it ends, if known | |

## Rules of thumb

- Foreign-currency amounts: convert to GBP and say the rate and date in `source_note`.
- Prices that vary (e.g. a hold bag costs £25–£60): use a typical figure, lower the `confidence`, explain in `source_note`.
- One row per rule. If an airline charges different bag prices by route, start with the most common one.
- Don't invent `region` boundaries yet — map areas come in Phase 3.
