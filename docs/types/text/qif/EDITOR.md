# Editor Roadmap — QIF (Quicken Interchange Format)

## Current state
Viewer parses QIF account type header (`!Type:`), splits records on `^`, and surfaces date, payee, amount, memo, cleared flag, category, and cheque number. Shows an account summary card (income total, expense total, date range) and a transaction table limited to 20 rows with an overflow notice. Category tallies are computed but not yet displayed visually.

## Viewer enhancements (no write-back needed)
- Running balance chart — line chart (Chart.js, pre-bundled) of cumulative balance over time; QIF amounts use comma-formatted strings so parse with `.replace(/,/g,'')` — S
- Category breakdown chart — doughnut chart of expense totals by `L` (category) field; hide transfer categories `[AccountName]` — S
- Full transaction table — replace the 20-row cap with a virtual/paginated table showing all transactions with sortable columns — M
- Date range filter — two date inputs to narrow the visible rows and update chart and summary stats live — S
- Search bar — filter across payee, memo, and category fields — S
- Cleared/uncleared toggle — filter by the `C` field (cleared `*`/`X` vs. blank) — S
- Split transaction expansion — QIF supports `S`/`E`/$` split lines; parse and show them in an expandable sub-row — M

## In-browser editing (download-on-save)
- Edit payee and memo — inline text inputs per row; regenerate QIF on save using the existing record structure — M — no lib
- Categorize transactions — dropdown or text field on each row for the `L` field; serialize back to QIF — M — no lib
- Export as OFX — convert QIF records to OFX 1.x SGML (reuse the OFX type's `parseOfx` for reference structure); download as `.ofx` — L — no lib, custom serializer
- Export as CSV — flat export of all fields (date, payee, amount, memo, category, cleared, number) as RFC 4180 CSV — S — no lib
- Add new transaction — form at the bottom of the table; appends a new `^`-terminated record block — M

## Full write-back editing (companion required)
- Save edited QIF to original path — POST patched text to companion `/write-back` endpoint
- Bulk re-categorize — rule engine (keyword → category) persisted in companion SQLite, applied on load

## Shared toolbar / modular note
Chart.js pre-bundle required (`docs/vendor/chart.umd.min.js`). The QIF-to-OFX export should share the OFX type's serialization helper once it is extracted to a shared module.
