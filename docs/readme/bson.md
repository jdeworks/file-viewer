# BSON (Binary JSON)

> BSON viewer — decoded document tree with BSON type annotations (ObjectId, Date, Binary, Decimal128, etc.).

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
| Full document decode | ✅ | Complete BSON document tree |
| ObjectId | ✅ | Shown as hex string with timestamp |
| Date | ✅ | UTC milliseconds decoded to ISO 8601 |
| Binary | ✅ | Subtype shown (UUID, MD5, generic, etc.) |
| Decimal128 | ✅ | High-precision decimal shown |
| Int32 / Int64 | ✅ | Both integer types distinguished |
| Double | ✅ | IEEE 754 double shown |
| Regex | ✅ | Pattern and options shown |
| Timestamp | ✅ | BSON internal timestamp decoded |
| Document / Array nesting | ✅ | Recursive collapsible tree |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Root type, key count, document size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Copy as JSON | ❌ | Not yet wired |

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Copy decoded value as JSON | Med | Easy | `JSON.stringify` relaxed to JSON to clipboard |
| Multi-document BSON stream | Low | Med | BSON files with sequential documents |
