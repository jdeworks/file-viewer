# Database & Tabular Data

> SQLite databases open with a live query runner and per-table export; CSV and TSV files render as sortable tables with a Chart.js chart tab for numeric columns.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.db`, `.sqlite`, `.sqlite3`, `.csv`, `.tsv` |
| MIME type | `application/x-sqlite3`, `text/csv`, `text/tab-separated-values` |
| Binary / Text | Binary (SQLite), Text (CSV/TSV) |
| Common use | Local app databases, data exports, spreadsheet interchange, analytics |
| Spec / Docs | [SQLite file format](https://www.sqlite.org/fileformat.html), [RFC 4180 (CSV)](https://www.rfc-editor.org/rfc/rfc4180) |

## Capabilities Matrix

### View — SQLite (`.db`, `.sqlite`, `.sqlite3`)
| Capability | Status | Notes |
|------------|--------|-------|
| Table list | ✅ | All user tables shown in a sidebar |
| Table data browser | ✅ | Click a table to browse rows |
| Query runner | ✅ | Run arbitrary `SELECT` queries; results shown inline |
| Row count per table | ✅ | Shown alongside each table name |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| SQL autocomplete | ❌ | Not implemented |
| Schema diagram | ❌ | Not implemented |

### View — CSV / TSV (`.csv`, `.tsv`)
| Capability | Status | Notes |
|------------|--------|-------|
| Table view | ✅ | Parsed and rendered as a sortable HTML table |
| Column sort | ✅ | Click any header to sort ascending / descending |
| Chart tab | ✅ | Chart.js bar/line chart for numeric columns |
| Source view | ✅ | Raw text view of the file |
| Diff | ✅ | Line-level text diff |
| Large file warning | ⚠️ | Files over ~5 MB may be slow to parse in-browser |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| SQL writes (INSERT/UPDATE/DELETE) | ❌ | Query runner is read-only |
| CSV cell editing | ❌ | Not implemented |

### Export — SQLite
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export all tables as JSON | ✅ | Each table exported as a JSON array |
| Export all tables as CSV ZIP | ✅ | One CSV file per table, bundled as a ZIP |

### Export — CSV / TSV
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as JSON | ❌ | Not implemented |

## Tips
- In the SQLite query runner, `SELECT * FROM sqlite_master WHERE type='table'` lists all tables including hidden system tables.
- Numeric columns in CSV/TSV files are auto-detected — switch to the Chart tab to visualise distributions instantly.
- For large SQLite databases, query specific columns rather than `SELECT *` to keep result sets manageable.

## Real-World Examples

- [`sample.sqlite`](../examples/sample.sqlite) — example SQLite database
- [`sample.csv`](../examples/sample.csv) — example CSV data file
- [`sample.tsv`](../examples/sample.tsv) — example TSV data file

## Known Limitations

- SQLite query runner is read-only — no `INSERT`, `UPDATE`, `DELETE`, or DDL
- Very large SQLite databases (>50 MB) may load slowly; sql.js loads the full file into memory
- CSV/TSV files with more than ~10,000 rows can cause noticeable rendering lag
- No detection of CSV encoding — assumes UTF-8; Latin-1 files may show garbled characters

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| SQL editor with autocomplete | High | Med | Monaco + sql.js schema introspection for table/column hints |
| Large file pagination | High | Med | Virtual scrolling for tables; chunked query with `LIMIT`/`OFFSET` |
| CSV → JSON export | Med | Easy | `JSON.stringify` the parsed rows array |
| Database schema diagram | Med | Hard | Parse `sqlite_master` DDL → ER diagram via Mermaid or D3 |
| CSV encoding detection | Med | Med | `chardet` or BOM sniffing for Latin-1 / Windows-1252 |
| Write-back SQL (via Companion) | Low | Hard | Needs Companion server for safe file write |
| Multiple chart types | Low | Easy | Expose Chart.js `type` selector (bar, line, scatter, pie) |
