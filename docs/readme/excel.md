# Excel Spreadsheets

> XLSX, XLS, XLSM, XLSB, and ODS spreadsheets rendered as editable multi-sheet grids, with CSV/JSON export and edited-XLSX download via SheetJS — all client-side.

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
| Sheet rendering | ✅ | Each sheet rendered as an editable grid table |
| Multi-sheet tabs | ✅ | Tab navigation between named sheets |
| Row/column headers | ✅ | Spreadsheet-style row numbers and column letters |
| Cell values | ✅ | SheetJS parses the workbook; cell text is rendered via `textContent` |
| Empty cell handling | ✅ | Blank cells are editable and preserved in the displayed used range |
| Formulas | ⚠️ Partial | Saved values are displayed; edited cells replace stale formula/format data on export |
| Cell formatting (colors/fonts) | ❌ | Data only — no background colors, font weights, or borders |
| Charts | ❌ | Chart objects are not rendered |
| Pivot tables | ❌ | Rendered as plain data only |
| Merged cells | ⚠️ Partial | SheetJS may flatten merges depending on the sheet structure |
| Metadata | ✅ | Sheet count, sheet names, per-sheet dimensions, defined names, and workbook properties when available |

### Edit

| Feature | Status | Details |
|---------|--------|---------|
| Cell editing | ✅ | Inline editable cells with dirty-state tracking |
| Download edited workbook | ✅ | Applies cell deltas back to the parsed workbook and downloads a fresh `.xlsx` |
| Source view | ❌ | Binary format — no raw XML view |

### Export

| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| First sheet → CSV | ✅ | SheetJS `sheet_to_csv`; comma-separated |
| First sheet → JSON | ✅ | SheetJS `sheet_to_json` as array-of-objects |
| All sheets → JSON | ✅ | Object keyed by sheet name; available when workbook has more than one sheet |
| Export edited XLSX | ✅ | Edited grid can be downloaded as `.xlsx`; original workbook download remains available |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `firstRowHeader` | `true` | Legacy setting retained; current editable grid uses spreadsheet row/column headers |

## Real-World Examples

- [`sample.xlsx`](../examples/sample.xlsx) — multi-sheet Excel workbook

## Known Limitations

- Formulas are not recalculated — values shown are those saved by the last application to write the file
- Cell colors, borders, and font styling are stripped; rendering is data-only
- Very large sheets are truncated in the editor grid to keep the UI responsive
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
