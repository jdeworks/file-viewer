# CBOR Binary Data

> CBOR (Concise Binary Object Representation) viewer — capped nested value preview with top-level metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.cbor`, `.cbor2` |
| MIME type | `application/cbor` |
| Binary / Text | Binary |
| Common use | IoT device data, COSE/CWT security tokens, WebAuthn attestations, IETF protocols |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Value decode | ✅ | Decodes one CBOR item with depth and item-count limits |
| Major types | ✅ | uint, int, bytes, text, array, map, tag, simple/float |
| Tagged values | ⚠️ | Tagged values are decoded to the inner value; tag numbers are not displayed yet |
| Indefinite length | ✅ | Streaming arrays/maps/strings decoded when well-formed |
| Simple values | ✅ | true/false/null/undefined/float |
| Byte strings | ✅ | Displayed as byte-string length |
| Nested structures | ✅ | Recursive nested display, capped for readability |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | File size and top-level major type |

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

- Output is capped at 500 decoded items and 12 decode levels
- Preview renders only the first 20 array/map children at each visible level
- CBOR tag numbers are not preserved in the rendered value tree
- Non-string map keys are stringified for display

## Real-World Examples

- [`sample.cbor`](../examples/sample.cbor) — compact CBOR API response sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Preserve CBOR tags in output | Med | Med | Keep `{ tag, value }` wrappers instead of unwrapping tags during decode |
| Copy as JSON | Low | Easy | Convert decoded tree to JSON string |
| COSE / CWT decoding | Low | Hard | Security token structure display |
