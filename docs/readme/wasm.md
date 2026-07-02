# WebAssembly Binary

> WebAssembly module inspector showing section layout, imports, exports, memory declarations, and section counts decoded from the binary format.

## Format Details
| Field | Value |
|-------|-------|
| Extensions | `.wasm` |
| MIME type | `application/wasm` |
| Binary/Text | Binary |
| Common use | Portable compiled code for browsers and WASI runtimes |

## Capabilities

### View
| Feature | Status | Details |
|---------|--------|---------|
| Section layout | ✅ | All standard sections (Type, Import, Function, Table, Memory, Global, Export, Element, Code, Data) |
| Import list | ✅ | Module + field name + kind (function/table/memory/global) |
| Export list | ✅ | Exported name + kind + index |
| Type/code/data counts | ✅ | Type, code, and data section item counts summarized |
| Memory/table info | ✅ | Minimum/maximum size limits |
| Global declarations | ⚠️ | Global sections are identified in layout; individual global initializers are not expanded |
| Custom sections | ✅ | Name, size of non-standard sections |
| Source maps | ❌ | DWARF debug info not parsed |
| Metadata | ✅ | Format, version, size, section/import/export/function counts, memory flag, custom section names |
| Diff/compare | ❌ | Binary diff only (not semantic) |

### Edit
| Feature | Status | Details |
|---------|--------|---------|
| Text/binary edit | ❌ | WASM is binary; no in-app edit supported |

### Export
| Feature | Status | Details |
|---------|--------|---------|
| Download original | ✅ | Always available |
| Decompile to WAT | ❌ | Text format conversion not yet implemented |

## Example Files
- [`sample.wasm`](../examples/sample.wasm) — minimal WebAssembly module

## Gaps / Planned Improvements
| Feature | Priority | Notes |
|---------|----------|-------|
| Disassemble to WAT text format | High | Use wasm-tools or Binaryen WASM to do WAT conversion client-side |
| Function signatures | Medium | Decode function type indices into parameter/result signatures |
| Code section size per function | Medium | Show byte size per function body |
| Global initializer decoding | Low | Show global value types, mutability, and init expressions |
| DWARF debug section parsing | Low | Extract source file/line info from debug sections |
| Validate module | Low | WebAssembly.validate() result shown in UI |
