# SQLite Database

> In-browser SQLite table browser — table list, paginated data grid, SQL query panel, exports, and modified database download powered by sql.js (WASM).

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.sqlite`, `.sqlite3`, `.db`, `.db3`, `.s3db`, `.sl3`, `.gpkg` |
| MIME type | `application/vnd.sqlite3` |
| Binary / Text | Binary |
| Common use | Mobile app databases, local application storage, embedded analytics, prototyping |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Table list | ✅ | All tables listed with row counts in sidebar |
| Data grid | ✅ | First 200 rows per table in a scrollable grid |
| NULL display | ✅ | NULL values shown as a distinct `NULL` chip |
| BLOB display | ✅ | BLOB values shown as `[blob N bytes]` |
| SQL query box | ✅ | SELECT plus DDL/DML against the in-memory database; results shown as grid |
| Query history | ✅ | Recent SQL queries stored locally and exposed through datalist/arrow navigation |
| Explain query plan | ✅ | Runs `EXPLAIN QUERY PLAN` for the current query |
| Result export | ✅ | Current result can be exported as CSV or JSON |
| Row count in title | ✅ | "Showing first 200 of N rows" when truncated |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ✅ | File size, SQLite page size, page count, table count, total rows |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Data editing | ⚠️ Partial | No cell editor, but SQL DDL/DML can mutate the in-memory database |
| SQL DML via query box | ✅ | Write queries run in WASM memory; schema changes refresh table list |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export all tables as JSON | ✅ | Global export action dumps all tables |
| Export tables as CSV | ✅ | Global export action downloads one CSV or a ZIP for multiple tables |
| Export query result as CSV/JSON | ✅ | Preview toolbar exports the current grid |
| Download modified DB | ✅ | Appears after in-memory writes and downloads `_modified.db` |

## Real-World Examples

- [`sample.sqlite`](../examples/sample.sqlite) — example SQLite database with sample tables

## Known Limitations

- In-browser sql.js loads the entire file into WASM memory — very large databases may OOM
- WAL-mode databases need both the `.db` and `.db-wal` files; WAL is not supported in-browser
- Encrypted SQLCipher databases cannot be opened
- Write queries mutate only the in-memory copy until the modified DB is downloaded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Schema / DDL view | Med | Easy | `sqlite_master` table → show CREATE statements |
| View support | Med | Easy | List views alongside tables in sidebar |
| Full-text search tables | Low | Med | Detect FTS virtual tables and offer search box |
