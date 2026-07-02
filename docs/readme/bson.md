# BSON (Binary JSON)

> BSON viewer — nested document dump with BSON type annotations for common scalar and container values.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.bson` |
| MIME type | `application/bson` |
| Binary / Text | Binary |
| Common use | MongoDB data export, BSON wire protocol documents |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Document decode | ✅ | Parses one root document up to depth/item limits |
| ObjectId | ✅ | Shown as hex string |
| Date | ✅ | Shown as raw BSON DateTime milliseconds |
| Binary | ✅ | Length and numeric subtype shown |
| Decimal128 | ⚠️ | Type recognized, value shown as placeholder |
| Int32 / Int64 | ✅ | Both integer types distinguished |
| Double | ✅ | IEEE 754 double shown |
| Regex | ✅ | Pattern and options shown |
| Timestamp | ✅ | BSON internal timestamp decoded |
| Document / Array nesting | ✅ | Recursive nested display, capped at 10 levels / 200 items |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Document size and top-level field count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Copy as JSON | ❌ | Not yet wired |

## Known Limitations

- Only the first root document is rendered; extra bytes are flagged as a possible multi-document stream
- Decimal128 is identified but not converted to a decimal string
- DateTime and Timestamp values are shown as raw numeric values, not formatted dates

## Real-World Examples

- [`sample.bson`](../examples/sample.bson) — compact BSON document sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Proper Decimal128 / Date formatting | Med | Med | Decode Decimal128 and render date/time values as readable ISO strings |
| Copy decoded value as JSON | Med | Easy | `JSON.stringify` relaxed to JSON to clipboard |
| Multi-document BSON stream | Low | Med | BSON files with sequential documents |
