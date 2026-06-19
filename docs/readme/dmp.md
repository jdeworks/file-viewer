# Windows Minidump

> Windows Minidump viewer — exception code, crash address, OS info, architecture, thread and module counts.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.dmp`, `.mdmp` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Windows crash reports, Dr. Watson dumps, WER (Windows Error Reporting) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Dump type | ✅ | Mini / partial / full — decoded from flags |
| Exception code | ✅ | Access Violation, Stack Overflow, C++ Exception, etc. |
| Exception address | ✅ | Crash instruction pointer |
| Architecture | ✅ | x86, x64, ARM, ARM64, IA-64 |
| OS version | ✅ | Windows major.minor.build, product type |
| Process ID | ✅ | From MiscInfo stream |
| Process times | ✅ | Create, user, and kernel time |
| Stream list | ✅ | Named streams: ThreadList, ModuleList, SystemInfo, etc. |
| Module list | ✅ | Loaded DLLs / EXEs with version and base address |
| Thread count | ✅ | From ThreadList stream |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Exception code, architecture, OS version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Stack traces are not decoded (require symbol files)
- Memory regions are not decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Stack frame list | Low | Hard | Requires PDB symbol resolution |
| Memory region map | Low | Med | Parse MemoryInfoList stream |
