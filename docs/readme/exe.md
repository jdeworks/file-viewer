# Executable (ELF / PE / Mach-O)

> Executable binary viewer — format detection (ELF/PE/Mach-O), architecture, sections/segments, imported libraries.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.exe`, `.dll`, `.so`, `.dylib`, `.elf`, `.out` |
| MIME type | `application/x-executable` |
| Binary / Text | Binary |
| Common use | Native executables and shared libraries for Windows, Linux, macOS |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format detection | ✅ | ELF, PE (MZ), Mach-O magic bytes |
| Architecture | ✅ | x86, x86-64, ARM, ARM64, MIPS, etc. |
| ELF type | ✅ | ET_EXEC / ET_DYN / ET_REL / ET_CORE |
| ELF sections | ✅ | `.text`, `.data`, `.bss`, `.rodata`, etc. |
| ELF dynamic libs | ✅ | `DT_NEEDED` entries from dynamic section |
| PE sections | ✅ | `.text`, `.rdata`, `.data`, etc. with sizes |
| PE imported DLLs | ✅ | Import directory table |
| PE characteristics | ✅ | DLL / GUI / console flags |
| Mach-O segments | ✅ | `__TEXT`, `__DATA`, `__LINKEDIT` |
| Mach-O dylibs | ✅ | `LC_LOAD_DYLIB` commands |
| Source view | ✅ | Monaco (hex preview for binary portions) |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, arch, section count, linked libs |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- No disassembly — static header inspection only
- Mach-O fat binaries show first arch slice only
- PE imports are parsed from the standard import directory

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| String table extraction | Med | Easy | Scan for printable string runs |
| Export section list as JSON | Low | Easy | Name/offset/size to JSON |
| Disassembly via WASM | Low | Hard | Requires Capstone.js or similar |
