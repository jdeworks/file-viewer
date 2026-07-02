# Apache Arrow / Feather

> Apache Arrow IPC and Feather viewer — lightweight file identification plus heuristic field-name extraction for Arrow IPC footers.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.arrow`, `.feather`, `.ipc` |
| MIME type | `application/vnd.apache.arrow.file` |
| Binary / Text | Binary |
| Common use | Columnar data exchange between Pandas, Spark, DuckDB, Polars |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format detection | ✅ | Detects Arrow IPC and Feather v1 magic bytes |
| File info | ✅ | Format, file size, and Arrow footer size when readable |
| Feather v1 counts | ✅ | Reads v1 row and column counts from the header |
| Field-name hints | ✅ | Heuristically extracts printable field-name strings from Arrow IPC footer bytes |
| Schema types | ❌ | Full FlatBuffers schema decoding is not implemented |
| Record batches | ❌ | Batch metadata is not decoded |
| Nullable flags | ❌ | Per-column nullability is not decoded |
| Dictionary types | ❌ | Dictionary-encoded column details are not decoded |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format and file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary columnar format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Arrow IPC field names are heuristic and can include false positives from FlatBuffers strings
- Column data is not shown — current output is limited to file info and heuristic field-name hints
- Compressed record batches (LZ4/Zstd) may not be decompressed

## Real-World Examples

- [`sample.arrow`](../examples/sample.arrow) — compact Arrow IPC demo file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full FlatBuffers schema parser | High | Hard | Decode real column types, nullability, dictionaries, and batches |
| First N rows preview | Med | Med | Decode first batch values for tabular preview |
| Export schema as JSON | Low | Easy | Column names/types to JSON |
