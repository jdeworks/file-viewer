# Apache Avro

> Apache Avro viewer — schema (JSON), codec, sync marker, and record count estimate.

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
| Fields | ✅ | Field names and types from schema |
| Codec | ✅ | `null` / `deflate` / `snappy` / `bzip2` |
| Sync marker | ✅ | 16-byte marker shown as hex |
| Custom metadata | ✅ | Extra header metadata key-value pairs |
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

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| First N records preview | Med | Hard | Decompress and decode data blocks |
| Export schema as JSON | Low | Easy | Pretty-print embedded JSON schema |
