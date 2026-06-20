# Editor Roadmap — JSONL

## Current state

- Parser (renderer.js): splits on `\n`, skips blank lines and `#` comments, `JSON.parse` per line; collects per-line errors; up to 500 rows shown (MAX_ROWS)
- Schema detection: if ≥50% of records are plain objects and a key appears in ≥50% of those objects, that key is included in the auto-schema (up to 20 columns)
- Table view (schema path): `<table>` with typed cell rendering — null/bool/number/object displayed with CSS class badges; cell values truncated to 120 chars
- Fallback view (non-uniform records): formatted `<pre>` blocks with `JSON.stringify(r, null, 2)`
- Summary bar: line count, record count, error count, shared-key count
- No exports.js yet; raw download through core

## Viewer enhancements (no write-back needed)

- **Column filter** — text input above each column header in table view; filters the visible rows to those where the column value contains the substring (or matches a regex when prefixed `/`); no source mutation — S
- **Global search** — single search bar that matches across all columns of all records; highlights matching cells — S
- **Sort by column** — click column header to sort rows ascending/descending by that column's value; sort is client-side only — S
- **Row detail panel** — click any table row to open a side panel showing the full record as a pretty-printed JSON tree (re-uses the JSON renderer's `valueNode` logic); useful when many columns are truncated — M
- **Schema coverage report** — for each key in the detected schema, show what percentage of records have that key and what types appear (string/number/null/bool); helps understand sparse or heterogeneous JSONL — M
- **Increase row limit** — current MAX_ROWS is 500; add a "Load more" button that extends the visible window in 500-row increments without re-parsing — S

## In-browser editing (download-on-save)

- **Append new record** — a form at the bottom of the table: one input per schema column (typed based on the detected column type), "+ Add row" button appends a new JSON line to the source text; `getValue()` returns the original text with the new line appended — M
- **Edit existing cell** — click a table cell to make it editable in-place (contenteditable or a popover input); on blur, serialize the modified value back into the source line via `JSON.stringify`; full-line replacement to preserve any extra keys not in the schema — M
- **Delete row** — row index gutter with right-click context menu (delete this line); removes the line from the backing text — S
- **Export to CSV** — "Download as CSV" button: uses the detected schema columns as headers, serializes each record's values for those columns; cells with nested objects are JSON-stringified — M
- **Export to XLSX** — same as CSV but via SheetJS — M — lib: `SheetJS/xlsx` (lazy-loaded)
- **Filter by property expression** — a query bar accepting `key op value` mini-expressions (e.g. `status == "active"`, `count > 10`); filters rows and shows result count — M

## Full write-back editing (companion required)

- **Large-file streaming** — companion streams JSONL in pages; the table editor renders a virtual viewport so multi-GB log files don't have to fit in memory
- **Append-only write** — for log / event files, companion opens the file in append mode and writes only the new record lines, never rewriting existing content
- **Live tail** — companion watches the file with `notify` and pushes new lines to the browser via SSE; new rows appear at the bottom of the table in real time

## Shared toolbar / modular note

JSONL toolbar: Table | Raw blocks | Search | Filter | Export (CSV / XLSX).
The table view cell rendering (`cellVal` function) handles null/bool/number/object with CSS badges — the same pattern as the CSV table editor. Consider a shared `cell-renderer.js` that handles typed cell display so both JSONL and future TSV editors share the same badge styles.
The filter-by-property-expression feature overlaps with the JSONPath panel planned for JSON. If a shared `query-panel.js` is built, JSONL can plug in a simple property-path evaluator as its engine.
