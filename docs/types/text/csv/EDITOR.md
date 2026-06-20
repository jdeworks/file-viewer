# Editor Roadmap — CSV

## Current state

- Read-only table preview via PapaParse + shared `core/tabular.js` renderer (renderer.js); delimiter auto-detection (comma/semicolon/tab/pipe) with settings override; first-row-header toggle
- Chart.js quick chart (renderer.js): auto-detects numeric columns, renders a line chart (filled if single series); Table / Chart tab bar; up to 100 rows; 8 series cap
- Table editor (table-editor.js, ~6 KB): RFC-4180 quoted field parser, contenteditable cells, Tab/Enter navigation, +Row/+Col toolbar, right-click row/column delete, `getValue()` → CSV text, save → blob download
- Exports: not yet a dedicated exports.js (raw download through core)

## Viewer enhancements (no write-back needed)

- **Column statistics panel** — for each numeric column show: count, min, max, mean, median, std-dev, and a tiny inline sparkline histogram (20-bucket, SVG or canvas); purely computed from parsed rows — M
- **Sort by column** — click column header to toggle ascending/descending sort; sorts a client-side copy of the rows, does not mutate source; reset button restores original order — S
- **Filter / search** — text input that filters visible rows by substring match across all columns, or a per-column filter row (like a mini WHERE clause) — S
- **Type inference badges** — analyze each column and label it: integer / float / date / boolean / text; show badge in header; use inferred type to right-align numbers and format dates — M
- **Chart type selector** — expand the existing Chart.js integration to offer bar, scatter, and pie in addition to line; let user pick X-axis column and up to 4 Y-axis columns — M — lib: `Chart.js` (already vendored)
- **Row count / column count summary bar** — sticky bar showing total rows, columns, selected cell range, and any parse errors — S

## In-browser editing (download-on-save)

- **Spreadsheet editor** — the existing TableEditor is functional; enhancements: freeze header row on scroll, resize column widths by dragging the header border, fill-down (Ctrl+D), undo/redo via a small command stack — M
- **Export to XLSX** — "Download as XLSX" button using SheetJS (`xlsx` npm package, pre-bundle `xlsx.mini.min.js`); converts the 2-D array from TableEditor.getValue() via `XLSX.utils.aoa_to_sheet` → `XLSX.writeFile` — M — lib: `SheetJS/xlsx` (~700 KB minified; lazy-load)
- **Find & replace** — Ctrl+H opens a modal; replaces cell values matching a string or regex across all cells; previews matches before commit — M
- **Paste from clipboard** — detect TSV or CSV clipboard content on Ctrl+V and insert rows/columns at the active cell rather than replacing the entire cell text — M
- **Column reorder** — drag column headers to reorder; rearranges both header and all data rows in the backing array — M

## Full write-back editing (companion required)

- **Large-file streaming** — companion streams the CSV in 1 MB chunks so files over 10 MB don't have to be held entirely in memory; the table editor works on a viewport window with virtual scroll
- **Auto-save on cell blur** — debounced PATCH to companion; companion appends to or rewrites the file atomically
- **Schema locking** — companion stores a `.csvschema.json` sidecar specifying column names, types, and nullable flags; the editor enforces types on input and rejects out-of-type values with inline error styling

## Shared toolbar / modular note

CSV toolbar: Table | Chart (type picker) | Stats | Sort | Filter | Export (CSV / TSV / XLSX).
The chart integration (Chart.js) is also used by other numeric file types. Consider a shared `chart-panel.js` that accepts `{ labels, datasets }` and handles the canvas lifecycle, so the CSV and future TSV/JSONL chart overlays share one implementation.
SheetJS should be lazy-loaded (only on "Download XLSX" click) — it is large and most users won't need it.
