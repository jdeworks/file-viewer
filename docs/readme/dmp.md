# Windows Minidump

> Windows Minidump viewer — dump flags, exception code, OS info, architecture, process info, and stream directory.

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
| Exception thread | ✅ | Thread ID from the Exception stream when present |
| Exception address | ⚠️ | Parsed internally as a low-word approximation but not surfaced in the UI |
| Architecture | ✅ | x86, x64, ARM, ARM64, IA-64 |
| OS version | ✅ | Windows major.minor.build, product type |
| Process ID | ✅ | From MiscInfo stream |
| Process times | ✅ | Create, user, and kernel time |
| Stream list | ✅ | Named streams: ThreadList, ModuleList, SystemInfo, etc. |
| Module list | ❌ | ModuleList stream is named but not decoded |
| Thread count | ❌ | ThreadList stream is named but not decoded |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Created time, stream count, architecture, OS version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Stack traces, thread lists, and module lists are not decoded
- Memory regions are not decoded
- Exception address is not displayed as a trustworthy pointer yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Thread and module stream decoding | High | Med | Parse ThreadList and ModuleList streams before claiming counts/details |
| Stack frame list | Low | Hard | Requires PDB symbol resolution |
| Memory region map | Low | Med | Parse MemoryInfoList stream |
