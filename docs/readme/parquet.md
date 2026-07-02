# Apache Parquet

> Columnar binary data format used in big-data pipelines — validates PAR1 framing and shows heuristic footer metadata without server-side processing.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.parquet` |
| MIME type | `application/vnd.apache.parquet` |
| Binary/Text | Binary (columnar) |
| Common use | Big data analytics, data lakes, Spark/Hadoop pipelines, pandas DataFrames |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| PAR1 framing | ✅ | Magic bytes checked at file start and end |
| Footer metadata | ✅ | Footer size, file size, optional format version/row count when recoverable |
| Field names | ⚠️ Partial | Printable field names extracted heuristically from the Thrift footer |
| Schema | ⚠️ Partial | Full type/repetition/definition metadata is not decoded |
| Row group info | ❌ | Row-group counts, byte sizes, and per-group row counts are not decoded |
| Column encoding | ❌ | Encoding type per column chunk is not decoded |
| Compression codec | ❌ | Compression codec per column is not decoded |
| File metadata | ⚠️ Partial | Basic footer facts only; key-value metadata is not fully decoded |
| Data preview (rows) | ❌ | Actual row data not decoded (requires Thrift + codec decoding) |
| Statistics | ❌ | Min/max/null count per column chunk is not decoded |
| Diff/compare | ❌ | Binary format; schema diff not supported |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Data editing | ❌ | Columnar binary encoding makes in-browser editing impractical |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Convert to CSV | ❌ | Would require full decoding; not yet implemented |
| Convert to JSON | ❌ | Not yet implemented |

## Example Files
- [`sample.parquet`](../examples/sample.parquet) — small Parquet file with schema

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Row data preview | High | Decode first N rows of PLAIN-encoded columns for display |
| Full Thrift footer decoding | High | Replace heuristic footer string scan with a real Parquet metadata parser |
| Export to CSV/JSON | High | Full decode + re-serialize; large files need streaming |
| Arrow IPC / Feather support | Medium | Related columnar formats |
| Column statistics visualization | Low | Min/max as mini-chart per column |
