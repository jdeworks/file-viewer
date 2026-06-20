# Editor Roadmap — OFX / QFX (Open Financial Exchange)

## Current state
Full-featured viewer: parses both SGML (OFX 1.x) and XML (OFX 2.x/QFX) modes. Shows account info card, ledger balance with date, and a paginated transaction table (date / type / amount / memo, capped at 200 rows, colour-coded positive/negative). Account numbers are masked to last 4 digits.

## Viewer enhancements (no write-back needed)
- Running balance chart — draw a line chart with Chart.js (CDN-free, pre-bundle `chart.umd.min.js`) computing a cumulative running balance from oldest to newest transaction — S
- Category pie chart — tally debit/credit transaction types (DEBIT, CREDIT, POS, ATM, etc.) and render a doughnut chart alongside the balance chart — S
- Date range filter — two `<input type="date">` fields that hide/show rows client-side; no re-parse needed — S
- Full transaction search — live filter input over date, type, amount, and memo columns; reuse the filter pattern from the strings renderer — S
- Stats bar — show total income, total expenses, and net change for the visible period, updating when the date filter changes — M
- Multi-statement support — OFX files can contain multiple `<STMTTRNRS>` blocks (e.g. checking + savings); add a tab strip or accordion per account — M

## In-browser editing (download-on-save)
- Add/edit memo — inline `<input>` on each row to overwrite `<MEMO>` and regenerate the SGML/XML blob for download — M — no lib needed (string-replace on original source)
- Tag/categorize transactions — add a `<MEMO2>` or custom comment field per transaction, stored in a parallel JS Map, then serialized into OFX comments on export — M
- Export categorized CSV — serialize visible (filtered) rows as RFC 4180 CSV with columns date, type, amount, memo, category; offer blob download — S — no lib
- Merge multiple OFX files — accept a second file via drag-drop, union the transaction lists (deduplicate on FITID), and download a combined OFX — L — custom parser (already written), no extra lib

## Full write-back editing (companion required)
- Save categorized OFX back to original path — requires Tauri + Axum companion; send patched OFX text via POST /write-back
- Auto-import categorization rules — persist user-defined keyword→category rules in companion local SQLite; apply on load

## Shared toolbar / modular note
Chart.js must be pre-bundled to `docs/vendor/chart.umd.min.js` before use (zero off-origin CDN policy). The existing `parseOfx` export can be reused directly by a merge feature without copying.
