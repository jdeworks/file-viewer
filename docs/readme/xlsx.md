# XLSX — Excel Spreadsheet

> SheetJS-backed spreadsheet viewer/editor with multi-sheet tabs, editable cells, edited `.xlsx` download, and CSV/JSON exports.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods` |
| MIME type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Binary / Text | Binary (ZIP + XML) |
| Created by | Microsoft |
| Common use | Spreadsheets, data tables, financial models, business reports |
| Spec / Docs | [OOXML ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Editable spreadsheet grid | ✅ | One editable table per sheet with column/row headers |
| Multi-sheet tab navigation | ✅ | Click tabs to switch sheets while preserving edit state |
| Cell values | ✅ | SheetJS renders cached values into editable cells |
| Edit tracking | ✅ | Per-sheet delta buffer marks dirty cells and enables download only after edits |
| Large-sheet cap | ⚠️ | Grid is capped for responsiveness and reports truncation in the toolbar |
| Formulas | ⚠️ | Edited cells replace stale formula/format data; existing formulas show cached values |
| Charts | ❌ | OOXML chart rendering is not implemented |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Cell-level editing | ✅ | Content-editable cells with dirty-state tracking |
| Raw XML editing | ❌ | XLSX opens through the spreadsheet editor, not the archive tree |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Download edited `.xlsx` | ✅ | Applies cell deltas back to the workbook and downloads `*-edited.xlsx` |
| Download first sheet as CSV | ✅ | Export menu action |
| Download first sheet as JSON | ✅ | Export menu action |
| Download all sheets as JSON | ✅ | Export menu action for multi-sheet workbooks |

## Known-File Enhancement

No known-file plugin — all XLSX files use the same spreadsheet renderer.

## Real-World Examples

- [`sample.xlsx`](../examples/sample.xlsx) — multi-sheet spreadsheet demonstrating tab navigation and cell formatting

## Known Limitations

- Formula text is not shown; only cached values are displayed, and editing a formula cell writes a plain value
- Charts, images, pivot tables, comments, and conditional formatting are not rendered
- Very wide or tall sheets are capped in the editable grid for browser responsiveness
- Edited export relies on SheetJS round-tripping; untouched sheets are preserved, but rich formatting fidelity is not guaranteed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Formula text display | High | Med | Parse `<f>` elements alongside `<v>` cached values |
| Chart rendering | Med | Hard | OOXML chart spec is complex; partial support only |
| Pivot table display | Med | Hard | Pivot cache requires re-aggregation logic |
| Rich formatting preservation | Med | Hard | Preserve styles/comments/images through edited export |
