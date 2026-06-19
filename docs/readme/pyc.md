# Python Bytecode

> Python bytecode viewer — magic number, Python version, source timestamp, source file size, and validation method.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.pyc` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | CPython compiled bytecode cache files (`__pycache__/`) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Python version | ✅ | Derived from magic number (Python 2.0 through 3.13+) |
| Magic number | ✅ | Numeric value and hex shown |
| Validation method | ✅ | Timestamp-based vs hash-based (Python 3.8+) |
| Source timestamp | ✅ | UTC datetime of source `.py` file at compile time |
| Source file size | ✅ | Size of original `.py` file at compile time |
| Bytecode size | ✅ | Total `.pyc` file size |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Python version, magic, source timestamp |

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
- Nested code objects are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Opcode disassembly | Low | Hard | Parse marshal code objects and decode opcodes |
| Constant pool | Low | Med | Extract string/int constants from marshal stream |
