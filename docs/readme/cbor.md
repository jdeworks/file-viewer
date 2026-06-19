# CBOR Binary Data

> CBOR (Concise Binary Object Representation) viewer — decoded value tree with type annotations.

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
| Full decode | ✅ | Complete CBOR item tree |
| Major types | ✅ | uint, int, bytes, text, array, map, tag, simple |
| Tagged values | ✅ | Tag numbers shown (e.g. 0=epoch, 1=time, 2=bignum) |
| Indefinite length | ✅ | Streaming arrays/maps decoded |
| Simple values | ✅ | true/false/null/undefined/float |
| Byte strings | ✅ | Hex encoded |
| Nested structures | ✅ | Recursive collapsible tree |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Root type, item count, byte size |

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
| Copy as JSON | Low | Easy | Convert decoded tree to JSON string |
| COSE / CWT decoding | Low | Hard | Security token structure display |
