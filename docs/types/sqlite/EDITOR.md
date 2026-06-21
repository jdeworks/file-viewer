# Editor Roadmap — SQLite

## Current state

Browser backed by sql.js (SQLite compiled to WebAssembly). Features:
- Table list sidebar with row counts (via `sqlitelib.js` `listTables`)
- Data grid: `SELECT * FROM table LIMIT 200` with NULL/BLOB display
- Free-form SQL query panel (single-line input, Enter or Run button)
- Header parsing (`parseHeader`) exposes page size, encoding, version, schema format
- **Query history** — last 50 queries persisted (`localStorage` `sq-query-history`), recalled via a datalist on the input
- **EXPLAIN QUERY PLAN** — "Explain" button runs the plan and shows index hit/scan detail
- **CSV / JSON export** — export the current result set (all rows) via Blob download
- **Write-back** — CREATE/INSERT/UPDATE/DELETE/ALTER/DROP… execute against the in-memory DB; a "⬇ Save DB" button appears after any write to download the modified `.sqlite` file

No on-disk write-back yet (companion required); no visual schema/ER editor yet.

---

## Viewer enhancements (no write-back needed)

- **ER diagram** — Parse `sqlite_master` for `REFERENCES` clauses (or PRAGMA foreign_key_list per table) and render a force-directed graph of table nodes and FK edges. Clicking a node selects the table; clicking an edge highlights both sides. Lib: **vis-network.js** (self-contained, ~1 MB pre-bundled) or **d3-force** (lighter, already candidate for other types). Toggle button in the sidebar header. — **M**

- ✅ SHIPPED — **Query history** — Persist the last 50 SQL strings keyed by `localStorage['sq:history:' + filename]`. Show a dropdown below the input (arrow-up/down to navigate, click to recall). Clear button. Zero deps. — **S**

- ✅ SHIPPED — **EXPLAIN QUERY PLAN** — Button next to Run that prepends `EXPLAIN QUERY PLAN` to the current SQL, runs it via `db.exec`, and renders the result in a secondary panel with the `detail` column highlighted for index hit/scan indicators. No deps. — **S**

- ✅ SHIPPED — **Export table as CSV** — "Export CSV" button in the table row; streams all rows (no 200-row limit) through a `query(db, 'SELECT * FROM ...')` call, encodes as RFC 4180 CSV via a Blob URL download. No deps. — **S**

- ✅ SHIPPED — **Export table as JSON** — Same path as CSV; serialises rows as `[{col: val, ...}]`. BLOB columns become `"<N bytes>"` strings. No deps. — **S**

- **Export table as Excel** — Builds a workbook from the current table's columns and all rows using **SheetJS** (`xlsx.full.min.js`; pre-bundle under `docs/vendor/sheetjs/`). Download as `.xlsx`. — **M**

- **Full-text search** — Search box above the grid; on submit, runs `SELECT * FROM table WHERE CAST(col1 AS TEXT) LIKE ? OR ...` across all text/numeric columns (schema-aware, skip BLOBs). Highlights matching cells. No deps beyond existing `query()`. — **M**

- **Database stats panel** — Tab or collapsible section in the sidebar: table name, row count, estimated size (row count × avg row size from `dbstat` virtual table if available, else page count heuristic), index count from `sqlite_master`. Rendered as a compact stat table. No deps. — **S**

- **Schema browser** — Expand a table in the sidebar to show columns (name, type, NOT NULL, default, PK) from `PRAGMA table_info(name)` and indices from `PRAGMA index_list`. Currently the sidebar only shows table names. — **S**

---

## In-browser editing (download-on-save)

sql.js holds the DB in WASM memory and can export the full byte array via `db.export()`. All edits stay in-memory; "Save" triggers a Blob URL download of the modified `.sqlite` file.

- **Inline row editor** — Click a row in the grid to enter edit mode: cells become `<input>` or `<textarea>` (type-aware: integer/real get `type="number"`). Confirm runs a parameterised `UPDATE "table" SET col=? WHERE rowid=?`. Cancel discards. Delete button runs `DELETE FROM "table" WHERE rowid=?`. No extra deps; rowid must be fetched alongside data. — **M**

- **Add-row form** — "+" button above the grid opens a form with one field per column (schema from `PRAGMA table_info`; NOT NULL columns marked required; PK auto-increment columns omitted). Submit runs a parameterised `INSERT INTO "table" (cols) VALUES (?)`. No deps. — **M**

- **INSERT/UPDATE/DELETE form builder** — Panel accessible from a "Write" tab: pick table from dropdown, pick operation. For UPDATE/DELETE, a WHERE builder (column, operator, value). Executes the generated SQL inside a transaction; rolls back and shows the error on failure. No deps. — **L**

- **CSV import into table** — File-picker accepting `.csv`; parse with a lightweight CSV parser (hand-rolled or **Papa Parse** pre-bundled). Show column-mapping UI (CSV header → table column, or "skip"). Run batched `INSERT` statements inside a single transaction. Progress bar via row count. Lib: **Papa Parse** (`papaparse.min.js`) or hand-rolled RFC 4180. — **L**

- **Schema editor: CREATE TABLE dialog** — Form to define a new table: table name, rows of (column name, affinity, NOT NULL, PRIMARY KEY). Generates and runs a `CREATE TABLE` statement. No deps. — **M**

- **Schema editor: ALTER TABLE (add column)** — Select a table, type new column name + affinity + optional default. Runs `ALTER TABLE "t" ADD COLUMN col TYPE DEFAULT val`. SQLite only supports ADD COLUMN; DROP/RENAME column handled by table recreation (harder — L). — **S** for add-only; **L** for full alter

- **Full SQL editor (Monaco)** — Replace the single-line `<input>` with a Monaco editor instance (already used elsewhere in the project). Syntax highlighting, multi-statement support. DDL and DML both accepted. Run executes all statements in sequence; errors shown per-statement. Transaction-wraps DML; DDL auto-committed by SQLite. Lib: **Monaco** (already vendored). — **M**

- **Transaction wrapping with rollback** — Wrap all edit operations (inline row edits, form builder, CSV import) in explicit `BEGIN`/`COMMIT` with `ROLLBACK` on error. Surface transaction status (in transaction / committed / rolled back) in a status bar. No deps; enforced at the `sqlitelib.js` layer. — **M**

- **Export modified database** — "Save .sqlite" button (always visible once any write has occurred) calls `db.export()` → `Uint8Array` → Blob URL download. Also offer "Export as SQL dump" (iterate `sqlite_master` + `SELECT *` per table, emit `CREATE TABLE` + `INSERT` statements). No deps. — **S** for blob download; **M** for SQL dump

---

## Full write-back editing (companion required)

These require the planned Tauri + Axum local companion server (see `companion-plan.md`).

- **Save in place** — POST the `db.export()` blob to the companion's write-back endpoint for the original file path. No download prompt; file on disk is updated atomically (write to `.tmp`, rename). — **S** (companion side is the work)

- **Live file watch** — Companion watches the `.sqlite` file via `notify`; pushes a SSE event when it changes on disk. Renderer reloads the DB in WASM and re-renders the active view, preserving the selected table and scroll position. — **M**

- **Connection to live MySQL / PostgreSQL** — Out of scope for the in-browser sql.js path. Would require companion to proxy queries and return result sets as JSON. MySQL `.sql` dump files (CREATE + INSERT) can be loaded into sql.js in-memory without companion — handled under "MySQL dump" detect path. — **L** (companion-only)

---

## Shared toolbar / modular note

The row editor (inline edit, add row, delete row) should be extracted as a standalone `RowEditor` widget that accepts a `{db, tableName, columns, rowid}` interface. The same widget can back:
- CSV table editor (currently in `rawpane.js`) — already has an edit mode; converge on the same UI patterns
- OFX/QIF transaction tables — plain columnar data with an editable amount/memo column
- Any future tabular type where rows map cleanly to objects

Key libs to pre-bundle under `docs/vendor/` before use:
- **SheetJS** (`xlsx.full.min.js`) — Excel export; ~1 MB
- **Papa Parse** (`papaparse.min.js`) — CSV import; ~50 KB
- **vis-network.js** — ER diagram; ~1 MB (evaluate against d3-force ~250 KB)
- **Monaco** — already vendored; reuse for full SQL editor panel
