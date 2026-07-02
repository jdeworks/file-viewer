# Protocol Buffer

> Protocol Buffer schema viewer for `.proto` interface definition files.

## Format Details

| Property | Value |
|----------|-------|
| Extension(s) | `.proto` |
| MIME Type(s) | `text/plain`, `text/x-protobuf` |
| Binary / Text | Text |
| Common use | gRPC service contracts, typed message schemas, API definitions |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Syntax badge | ✅ | Shows declared `proto2` / `proto3` syntax when present |
| Package summary | ✅ | Extracts the `package` declaration |
| Options | ✅ | Lists top-level `option` declarations |
| Messages | ✅ | Shows message names and parsed fields |
| Field table | ✅ | Field number, name, type, and rule where present |
| Services / RPCs | ✅ | Lists services, RPC names, request/response types, and stream markers |
| Enums | ✅ | Lists enum values and numbers |
| Source view | ✅ | Monaco editor with protobuf syntax highlighting |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | Package, syntax, message count, and service count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.proto`](../examples/sample.proto) — message and service definition fixture.

## Known Limitations

- Parser is intentionally lightweight and does not build a full protobuf AST
- Nested declarations and complex option expressions may be summarized imperfectly
- No generated client/server code preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full AST parser | Medium | Medium | Preserve nested messages, comments, and option scopes |
| Stub code preview | Medium | Medium | Generate illustrative stubs for common languages |
| Descriptor export | Low | Hard | Would require a local protobuf compiler or compatible parser |
