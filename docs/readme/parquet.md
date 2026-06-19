# Apache Parquet

> Columnar binary data format used in big-data pipelines — schema, row group stats, and column encoding shown without server-side processing.

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
| Schema | ✅ | Column names, data types, repetition/definition levels |
| Row group info | ✅ | Count, byte size, row count per group |
| Column encoding | ✅ | Encoding type (PLAIN, RLE, DELTA, etc.) per column chunk |
| Compression codec | ✅ | SNAPPY, GZIP, ZSTD, etc. per column |
| File metadata | ✅ | Row count, created-by app/version, key-value metadata |
| Data preview (rows) | ❌ | Actual row data not decoded (requires Thrift + codec decoding) |
| Statistics | ✅ | Min/max/null count per column chunk where available |
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
| Export to CSV/JSON | High | Full decode + re-serialize; large files need streaming |
| Arrow IPC / Feather support | Medium | Related columnar formats |
| Column statistics visualization | Low | Min/max as mini-chart per column |
