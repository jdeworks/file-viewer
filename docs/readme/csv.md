# CSV / TSV

> Tabular data rendered as an editable table with charting — auto-detects delimiter, handles quoted fields, and exports to JSON or Excel.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.csv`, `.tsv`, `.tab` |
| MIME type | `text/csv`, `text/tab-separated-values` |
| Binary / Text | Text |
| Common use | Spreadsheet data, data exports, machine learning datasets, log reports |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Rendered table | ✅ | Editable table cells rendered in the parent pane |
| Auto delimiter detection | ✅ | Comma, semicolon, tab, pipe auto-detected via PapaParse |
| First-row header | ✅ | Configurable via setting (on by default) |
| Inline table editing | ✅ | Contenteditable cells with Tab/Enter navigation |
| Add/delete rows and columns | ✅ | Toolbar adds rows/columns; context menus delete rows/columns |
| Chart tab | ✅ | Lazy-loads Chart.js for numeric columns |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Row count, column count, delimiter, line endings, ragged rows, empty cells |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Cell / grid editing | ✅ | Inline table editor updates exported CSV state |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export edited table as CSV | ✅ | Preview toolbar downloads the current table state |
| Download as JSON | ✅ | Array-of-objects (with header) or array-of-arrays |
| Download as Excel (.xlsx) | ✅ | Via vendored SheetJS |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| First row is header | On | Treat row 1 as column names |
| Delimiter | Auto | Comma / semicolon / tab / pipe — auto-detects when set to Auto |

## Real-World Examples

- [`sample.csv`](../examples/sample.csv) — example CSV table

## Known Limitations

- No in-browser column sorting yet
- Large files (>100k rows) may be slow to render; source view handles any size

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Interactive column sort | High | Med | Click header to sort in-browser |
| Richer grid editing | Med | Hard | Undo/redo, selection ranges, paste ranges, and type-aware edits |
| Column statistics | Med | Med | Min/max/mean/null-count per column |
| Convert to Parquet | Low | Hard | Requires full columnar encoding in-browser |
