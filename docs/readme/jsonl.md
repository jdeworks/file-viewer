# JSON Lines (JSONL)

> Tabular or raw record view for newline-delimited JSON — auto-detects schema, renders as a table when records share keys.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.jsonl`, `.ndjson`, `.ldjson` |
| MIME type | `application/x-ndjson` |
| Binary / Text | Text |
| Common use | Log streams, ML training datasets, large JSON exports, streaming APIs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Schema detection | ✅ | Keys present in ≥50% of records become columns |
| Table view | ✅ | Rows with consistent keys rendered as a grid (up to 500 rows) |
| Raw record view | ✅ | Non-table records shown as JSON snippets |
| Parse error per line | ✅ | Invalid lines shown with line number and error |
| Truncation notice | ✅ | "Showing first 500 of N rows" when file is large |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Line count, record count, error count, schema keys |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as CSV | ❌ | Not yet implemented |
| Export as JSON array | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.jsonl`](../examples/sample.jsonl) — example JSONL log file

## Known Limitations

- Records beyond line 500 are not shown in the preview (all lines are in source view)
- Nested objects in table cells are JSON-serialized inline

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Export as CSV | High | Easy | Flatten schema columns to CSV rows |
| Export as JSON array | Med | Easy | Wrap all records in `[...]` |
| Column sort / filter | Med | Med | Click column header to sort |
| Virtual scroll for large files | Low | Hard | Render only visible rows for 100k+ record files |
