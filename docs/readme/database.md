# Database & Tabular Data

> SQLite databases open with a live query runner, table browser, exports, and modified-database download; CSV/TSV files use the dedicated editable table viewer.

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
| Query runner | ✅ | Run SQL queries; results shown inline |
| Query history | ✅ | Recent queries are saved locally and available from the input/history controls |
| Explain plan | ✅ | `EXPLAIN QUERY PLAN` button shows query planner output |
| Row count per table | ✅ | Shown alongside each table name |
| Result export | ✅ | Current query/table result can be exported as CSV or JSON |
| Write queries | ✅ | DDL/DML execute against the in-memory DB; modified DB can be downloaded |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| SQL autocomplete | ❌ | Not implemented |
| Schema diagram | ❌ | Not implemented |

### View — CSV / TSV (`.csv`, `.tsv`)
| Capability | Status | Notes |
|------------|--------|-------|
| Table view | ✅ | Parsed and rendered by the CSV / TSV type |
| Inline editing | ✅ | CSV / TSV table cells are editable in the preview |
| Column sort | ❌ | Not implemented yet |
| Chart tab | ✅ | Chart.js bar/line chart for numeric columns |
| Source view | ✅ | Raw text view of the file |
| Diff | ✅ | Line-level text diff |
| Large file warning | ⚠️ | Files over ~5 MB may be slow to parse in-browser |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| SQL writes (INSERT/UPDATE/DELETE) | ✅ | Runs in-memory and enables modified DB download |
| CSV cell editing | ✅ | Dedicated CSV / TSV preview supports inline cell editing |

### Export — SQLite
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export all tables as JSON | ✅ | Each table exported as a JSON array |
| Export all tables as CSV ZIP | ✅ | One CSV file per table, bundled as a ZIP |
| Download modified DB | ✅ | Appears after write queries mutate the in-memory database |

### Export — CSV / TSV
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as JSON | ✅ | CSV / TSV export menu provides JSON |
| Export as Excel (.xlsx) | ✅ | CSV / TSV export menu provides Excel |

## Tips
- In the SQLite query runner, `SELECT * FROM sqlite_master WHERE type='table'` lists tables including hidden/system tables.
- Numeric columns in CSV/TSV files are auto-detected — switch to the Chart tab to visualise distributions instantly.
- For large SQLite databases, query specific columns rather than `SELECT *` to keep result sets manageable.

## Real-World Examples

- [`sample.sqlite`](../examples/sample.sqlite) — example SQLite database
- [`sample.csv`](../examples/sample.csv) — example CSV data file

## Known Limitations

- SQLite edits are in-memory until the modified DB is downloaded
- Very large SQLite databases (>50 MB) may load slowly; sql.js loads the full file into memory
- CSV/TSV files with more than ~10,000 rows can cause noticeable rendering lag
- No detection of CSV encoding — assumes UTF-8; Latin-1 files may show garbled characters

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| SQL editor with autocomplete | High | Med | Monaco + sql.js schema introspection for table/column hints |
| Large file pagination | High | Med | Virtual scrolling for tables; chunked query with `LIMIT`/`OFFSET` |
| Database schema diagram | Med | Hard | Parse `sqlite_master` DDL → ER diagram via Mermaid or D3 |
| CSV encoding detection | Med | Med | `chardet` or BOM sniffing for Latin-1 / Windows-1252 |
| Companion write-back for SQLite | Low | Hard | Save the modified DB back to the original file through Companion |
| Multiple chart types | Low | Easy | Expose Chart.js `type` selector (bar, line, scatter, pie) |
