# Apache Thrift

> Apache Thrift IDL viewer — namespaces, includes, typedefs, enums, structs, exceptions, and services rendered as structured sections with field and method tables.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.thrift` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Cross-language RPC service definitions, generated client/server schemas, shared data contracts |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Namespace list | ✅ | Per-language namespace declarations are extracted |
| Includes | ✅ | Included `.thrift` files are listed |
| Typedefs | ✅ | Type aliases are shown with original and alias names |
| Enums | ✅ | Enum names and numeric values are rendered |
| Structs | ✅ | Field id, required/optional marker, type, name, and default value are shown |
| Exceptions | ✅ | Exception fields use the same table as structs |
| Services | ✅ | Service methods, return types, parameters, and thrown exceptions are shown |
| Source view | ✅ | Monaco editor with `thrift` language id |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Namespace list and counts for structs, services, enums, and exceptions |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.thrift`](../examples/sample.thrift) — demo Thrift IDL with namespace, typedef, enum, struct, exception, and service sections

## Known Limitations

- Includes are listed but not resolved across files
- The parser is structural and does not validate the full Thrift grammar
- No service diagram or generated-language preview yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Include resolution | Med | Med | Load sibling `.thrift` files through folder/companion context |
| Service diagram | Low | Med | Reuse a normalized schema graph shared with Proto |
| Custom Monaco tokenizer | Low | Easy | Register basic keyword/comment/string highlighting if Monaco has no native Thrift grammar |
