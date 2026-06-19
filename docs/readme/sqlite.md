# SQLite Database

> In-browser SQLite table browser — table list, paginated data grid, and a read-only SQL query box powered by sql.js (WASM).

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.sqlite`, `.sqlite3`, `.db`, `.db3`, `.s3db`, `.sl3` |
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
| SQL query box | ✅ | Read-only ad-hoc queries; results shown as grid |
| Row count in title | ✅ | "Showing first 200 of N rows" when truncated |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ✅ | File size, SQLite page size, page count, table count, total rows |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Data editing | ❌ | Read-only WASM SQLite — writes not committed back |
| SQL DML via query box | ❌ | Query box enforces read-only mode |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export table as CSV | ❌ | Not yet implemented |
| Export query result as CSV | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.sqlite`](../examples/sample.sqlite) — example SQLite database with sample tables

## Known Limitations

- In-browser sql.js loads the entire file into WASM memory — very large databases (>50 MB) may OOM
- WAL-mode databases need both the `.db` and `.db-wal` files; WAL is not supported in-browser
- Encrypted SQLCipher databases cannot be opened

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export table as CSV | High | Easy | Run `SELECT *` and stream rows to CSV |
| Schema / DDL view | Med | Easy | `sqlite_master` table → show CREATE statements |
| View support | Med | Easy | List views alongside tables in sidebar |
| Full-text search tables | Low | Med | Detect FTS virtual tables and offer search box |
