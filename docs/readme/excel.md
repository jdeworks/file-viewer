# Excel Spreadsheets

> XLSX and XLS spreadsheets rendered as multi-sheet tabular HTML, with CSV and JSON export via SheetJS — all client-side.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods` |
| MIME type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX), `application/vnd.ms-excel` (XLS) |
| Binary / Text | Binary |
| Created by | Microsoft |
| Common use | Financial data, data analysis, reporting, tabular data exchange |
| Spec / Docs | [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/) |

> **Note:** For general Office document formats (DOCX, PPTX, ODF), see [office.md](office.md).

## Capabilities

### View

| Feature | Status | Details |
|---------|--------|---------|
| Sheet rendering | ✅ | Each sheet rendered as a scrollable HTML `<table>` |
| Multi-sheet tabs | ✅ | Tab navigation between named sheets |
| First-row header | ✅ | `firstRowHeader` setting (default on) renders top row as `<th>` |
| Formatted cell values | ✅ | SheetJS `raw: false` — dates, numbers, and booleans rendered as formatted strings |
| Empty cell handling | ✅ | `defval: ''` fills missing cells with empty strings to preserve column alignment |
| Formulas | ⚠️ Partial | Pre-calculated results from the saved file are shown; formulas are not recalculated |
| Cell formatting (colors/fonts) | ❌ | Data only — no background colors, font weights, or borders |
| Charts | ❌ | Chart objects are not rendered |
| Pivot tables | ❌ | Rendered as plain data only |
| Merged cells | ⚠️ Partial | SheetJS may flatten merges depending on the sheet structure |
| Metadata | ✅ | Sheet count, sheet names |

### Edit

| Feature | Status | Details |
|---------|--------|---------|
| Cell editing | ❌ | Read-only table view; no in-browser cell editing |
| Source view | ❌ | Binary format — no raw XML view |

### Export

| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| First sheet → CSV | ✅ | SheetJS `sheet_to_csv`; comma-separated |
| First sheet → JSON | ✅ | SheetJS `sheet_to_json` as array-of-objects |
| All sheets → JSON | ✅ | Object keyed by sheet name; available when workbook has more than one sheet |
| Export as XLSX | ❌ | Roundtrip write not implemented |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `firstRowHeader` | `true` | Treat first row as column headers (`<th>` instead of `<td>`) |

## Real-World Examples

- [`sample.xlsx`](../examples/sample.xlsx) — multi-sheet Excel workbook

## Known Limitations

- Formulas are not recalculated — values shown are those saved by the last application to write the file
- Cell colors, borders, and font styling are stripped; rendering is data-only
- Very large sheets (100k+ rows) may be slow to render as a DOM table
- Macro-enabled workbooks (`.xlsm`) are treated as regular XLSX (macros never execute)
- Password-protected workbooks cannot be opened (no decryption support)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Cell formatting (colors, bold) | Medium | Hard | SheetJS exposes style info with `cellStyles: true`; needs CSS mapping |
| All-sheets CSV export | Medium | Easy | Zip per-sheet CSVs or export as TSV bundle |
| Virtual scroll for large sheets | Medium | Medium | DOM table is the bottleneck; use a virtual list for rows |
| Formula recalculation | Low | Hard | Would require embedding a formula engine (e.g. HyperFormula) |
| Chart rendering | Low | Hard | Charts are stored as binary DrawingML; need a parser + canvas renderer |
| Column resize / sort | Low | Medium | Interactive column sort and drag-to-resize headers |
