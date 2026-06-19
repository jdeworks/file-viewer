# MessagePack

> MessagePack binary serialisation viewer — decoded value tree, type summary, and size comparison vs. JSON.

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
| Full decode | ✅ | Complete msgpack value tree rendered |
| Type display | ✅ | Integer / float / string / bool / nil / map / array |
| Pretty-printed tree | ✅ | Collapsible JSON-like view |
| Size info | ✅ | Binary size vs. equivalent JSON estimate |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Root type, key count (if map), element count |

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
- Very large nested structures may be truncated

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Copy decoded value as JSON | Med | Easy | `JSON.stringify` the decoded object to clipboard |
| Ext type registry | Low | Med | Allow registering ext type decoders |
