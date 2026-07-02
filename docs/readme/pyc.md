# Python Bytecode

> Python bytecode viewer — magic number, approximate Python version, timestamp/size header fields where available, and bytecode file size.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pyc`, `.pyo` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | CPython compiled bytecode cache files (`__pycache__/`) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Python version | ✅ | Derived from magic number (Python 2.0 through 3.13+) |
| Magic number | ✅ | Numeric value and hex shown |
| Validation method | ⚠️ Partial | Hash/timestamp mode is inferred only for the supported modern magic range |
| Source timestamp | ⚠️ Partial | Shown for supported timestamp-based Python 3 headers |
| Source file size | ⚠️ Partial | Shown for supported Python 3.3+ timestamp-based headers |
| Bytecode size | ✅ | Total `.pyc` file size |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ Partial | Format and approximate Python version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Bytecode instructions (opcodes, constants, names) are not disassembled
- Python version mapping is approximate and may lag newer CPython magic numbers
- Hash-based `.pyc` header details are not fully decoded for every supported version
- Nested code objects are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Opcode disassembly | Low | Hard | Parse marshal code objects and decode opcodes |
| Constant pool | Low | Med | Extract string/int constants from marshal stream |
