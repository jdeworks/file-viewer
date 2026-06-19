# Apache Arrow / Feather

> Apache Arrow IPC and Feather v1/v2 viewer — schema with column names and types, row count, and record batch summary.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.arrow`, `.feather` |
| MIME type | `application/vnd.apache.arrow.file` |
| Binary / Text | Binary |
| Common use | Columnar data exchange between Pandas, Spark, DuckDB, Polars |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Schema | ✅ | Column names and Arrow data types |
| Row count | ✅ | Total rows across all record batches |
| Column count | ✅ | Number of columns |
| Record batches | ✅ | Batch count and metadata |
| Feather v1/v2 detection | ✅ | Magic bytes distinguish Feather from Arrow IPC |
| Nullable flags | ✅ | Per-column nullability |
| Dictionary types | ✅ | Dictionary-encoded columns identified |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Schema, row count, column count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary columnar format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Column data is not shown — schema and statistics only
- Compressed record batches (LZ4/Zstd) may not be decompressed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| First N rows preview | Med | Med | Decode first batch values for tabular preview |
| Export schema as JSON | Low | Easy | Column names/types to JSON |
