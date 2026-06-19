# CSV / TSV

> Tabular data rendered as a sortable table — auto-detects delimiter, handles quoted fields, exports to JSON or Excel.

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
| Rendered table | ✅ | Header row highlighted; values HTML-escaped |
| Auto delimiter detection | ✅ | Comma, semicolon, tab, pipe auto-detected via PapaParse |
| First-row header | ✅ | Configurable via setting (on by default) |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Row count, column count, delimiter, line endings, ragged rows, empty cells |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Cell / grid editing | ❌ | Planned |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
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

- No in-browser row sorting (sort by downloading as JSON/Excel)
- Large files (>100k rows) may be slow to render; source view handles any size

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Interactive column sort | High | Med | Click header to sort in-browser |
| Cell grid editing | Med | Hard | Edit individual cells; write back as CSV |
| Column statistics | Med | Med | Min/max/mean/null-count per column |
| Convert to Parquet | Low | Hard | Requires full columnar encoding in-browser |
