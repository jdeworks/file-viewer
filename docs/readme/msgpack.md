# MessagePack

> MessagePack binary serialisation viewer — decoded first value tree, root type summary, and truncation notices.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.msgpack`, `.mpk` |
| MIME type | `application/x-msgpack` |
| Binary / Text | Binary |
| Common use | Compact binary serialisation for APIs, caches, and inter-process communication |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Decode | ✅ | First MessagePack value decoded with item/depth/string limits |
| Type display | ✅ | Integer / float / string / bool / nil / map / array |
| Pretty-printed tree | ✅ | JSON-like nested map/array view |
| Size info | ✅ | Binary byte size and root type shown |
| Multi-value stream notice | ✅ | Remaining bytes are reported when data follows the first decoded value |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, root type from first byte, and file size |

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

- Ext types (application-defined types) shown as raw bytes
- Output is limited to 500 decoded items, 12 levels of nesting, and 200 characters per string
- Multi-value streams are not expanded beyond the first value

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Copy decoded value as JSON | Med | Easy | `JSON.stringify` the decoded object to clipboard |
| Stream expansion | Med | Med | Decode all top-level values in concatenated streams |
| Ext type registry | Low | Med | Allow registering ext type decoders |
