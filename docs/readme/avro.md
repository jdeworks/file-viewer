# Apache Avro

> Apache Avro object-container viewer — reads the header schema and codec without decoding data records.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.avro` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Kafka message serialisation, Hadoop data files, event streaming |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Schema | ✅ | JSON schema from Avro file header |
| Record type | ✅ | Top-level record name and namespace |
| Fields | ✅ | First 30 schema fields with names, types, and field docs when present |
| Codec | ✅ | `avro.codec` metadata decoded when present; defaults to `null` |
| Raw schema fallback | ✅ | Shows truncated raw schema text when field extraction is not possible |
| Sync marker | ❌ | Header parser stops before surfacing the 16-byte sync marker |
| Custom metadata | ❌ | Header keys beyond schema/codec are not listed yet |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Schema name, field count, codec |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Records are not decoded — schema inspection only
- Compressed blocks (snappy/deflate) are not decompressed for data preview

## Real-World Examples

- [`sample.avro`](../examples/sample.avro) — compact Avro object-container sample
- [`sample.avsc`](../examples/sample.avsc) — plain Avro schema sample handled as text/JSON

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| First N records preview | Med | Hard | Decompress and decode data blocks |
| Sync marker and custom header metadata | Low | Easy | Continue header parse after the metadata map |
| Export schema as JSON | Low | Easy | Pretty-print embedded JSON schema |
