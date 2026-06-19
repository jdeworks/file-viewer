# WebAssembly Binary

> WebAssembly module inspector showing section layout, imports, exports, and function signatures — all decoded from the binary format.

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
| Function types | ✅ | Parameter/result types for all type entries |
| Memory/table info | ✅ | Minimum/maximum size limits |
| Global declarations | ✅ | Type + mutability |
| Custom sections | ✅ | Name, size of non-standard sections |
| Source maps | ❌ | DWARF debug info not parsed |
| Metadata | ✅ | Module size, magic/version, section count by type |
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
| Code section size per function | Medium | Show byte size per function body |
| DWARF debug section parsing | Low | Extract source file/line info from debug sections |
| Validate module | Low | WebAssembly.validate() result shown in UI |
