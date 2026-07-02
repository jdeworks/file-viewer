# Executable (ELF / PE / Mach-O)

> Executable binary viewer — lightweight header inspection for ELF, PE/COFF, and Mach-O files.

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
| ELF header counts | ✅ | Program-header and section-header counts, not section names |
| ELF dynamic libs | ❌ | Dynamic sections are not parsed |
| PE summary | ✅ | Machine, section count, timestamp, subsystem, EXE/DLL, and selected DLL-characteristic hardening flags |
| PE imported DLLs | ❌ | Import directory table is not parsed |
| Mach-O summary | ✅ | CPU type, file type, load-command count, endian; fat binaries are identified only |
| Mach-O dylibs | ❌ | Load commands are counted but not decoded into dylib names |
| Raw view | ✅ | Binary raw/hex view is available |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format, architecture, and bit width |

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
- Section names, segment names, imported libraries, and string tables are not decoded
- Mach-O fat binaries are identified but individual slices are not inspected
- ELF 64-bit entry point display uses the low 32 bits only

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Section / segment tables | Med | Med | Decode ELF section names, PE section table, and Mach-O segment load commands |
| Imported libraries | Med | Med | Parse ELF dynamic section, PE import directory, and Mach-O dylib load commands |
| String table extraction | Med | Easy | Scan for printable string runs |
| Export section list as JSON | Low | Easy | Name/offset/size to JSON |
| Disassembly via WASM | Low | Hard | Requires Capstone.js or similar |
