# XLSX — Excel Spreadsheet

> Full spreadsheet rendering with multi-sheet tabs and cell formatting — formulas shown as computed values.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xlsx`, `.xlsm`, `.xltx` |
| MIME type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Binary / Text | Binary (ZIP + XML) |
| Created by | Microsoft |
| Common use | Spreadsheets, data tables, financial models, business reports |
| Spec / Docs | [OOXML ECMA-376](https://www.ecma-international.org/publications-and-standards/standards/ecma-376/) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Full spreadsheet render | ✅ | Column/row headers, all cell values |
| Multi-sheet tab navigation | ✅ | Click tabs to switch sheets |
| Cell formatting | ✅ | Bold, background color, text color, alignment |
| Formulas | ⚠️ | Shown as pre-computed values; formula text not displayed |
| Charts | ⚠️ | Shown as placeholders; no chart rendering |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Cell-level visual editing | ❌ | No spreadsheet editor |
| Raw XML editing | ✅ | Internal XML parts editable via archive tree |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all XLSX files use the same spreadsheet renderer.

## Real-World Examples

- [`sample.xlsx`](../examples/sample.xlsx) — multi-sheet spreadsheet demonstrating tab navigation and cell formatting

## Known Limitations

- Formula text is not shown; only the cached computed value from the file is displayed
- Charts and pivot tables are not rendered; shown as placeholders
- Very wide or tall sheets may be slow to render in the browser
- Conditional formatting rules are partially applied

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Formula text display | High | Med | Parse `<f>` elements alongside `<v>` cached values |
| CSV export of active sheet | High | Easy | Convert current sheet's cell array to CSV string |
| Chart rendering | Med | Hard | OOXML chart spec is complex; partial support only |
| Pivot table display | Med | Hard | Pivot cache requires re-aggregation logic |
