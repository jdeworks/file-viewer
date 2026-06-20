# Editor Roadmap — MT940 (SWIFT Bank Statement)

## Current state
Viewer parses the MT940 field structure (`:20:` reference, `:25:` account, `:28C:` statement number, `:60F:`/`:60M:` opening balance, `:62F:`/`:62M:` closing balance, `:61:` statement lines). Handles FIN envelope stripping and multi-statement files. Renders a summary card and a 20-row transaction table (date / signed amount / reference). Currency is shown in the section title.

## Viewer enhancements (no write-back needed)
- Running balance chart — compute daily running balance starting from opening balance, plot with Chart.js (pre-bundled) — S
- Full transaction table — paginate or virtualise all `:61:` lines beyond 20; add column sorting — M
- Field `:86:` narrative display — the current parser skips `:86:` (purpose/remittance text); parse and show it as a memo column or expandable sub-row — S
- Date range filter — date inputs to narrow rows and update chart/totals; MT940 dates are YYMMDD so normalize to ISO first — S
- IBAN validator — for the `:25:` account field, apply the ISO 13616 MOD-97 check and show a valid/invalid badge; pure JS, no lib — S
- SWIFT/BIC lookup — offline reference table (JSON, pre-bundled, ~500 KB for the major BICs) mapping the institution prefix of `:20:` or a separate `:52A:` field to institution name and country — M
- Multi-statement tab strip — when a file contains multiple `:20:` blocks, show a tab per statement rather than concatenating all transactions — M
- Currency badge — parse currency from `:60F:` and show it prominently next to the balance; flag if opening and closing currencies differ — S

## In-browser editing (download-on-save)
- Edit `:86:` narrative — inline textarea per transaction row; regenerate MT940 on save; editing `:61:` amounts is intentionally excluded (audit risk) — M — no lib
- Export as CSV — date, debit/credit indicator, amount, currency, reference, narrative — S — no lib
- Export as OFX — map `:61:` lines to `<STMTTRN>` blocks and balance fields to `<LEDGERBAL>`; download as `.ofx` — L — custom serializer

## Full write-back editing (companion required)
- Save annotated MT940 to original path via companion `/write-back`
- Persist user-added narrative annotations separately (companion SQLite keyed on statement ref + date + amount)

## Shared toolbar / modular note
IBAN validation is entirely self-contained (MOD-97 arithmetic). The SWIFT BIC table should be fetched once and cached in `localStorage` or bundled as a static JSON under `docs/vendor/`. Chart.js pre-bundle required.
