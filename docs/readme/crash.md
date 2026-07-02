# Crash Report

> macOS/iOS crash log viewer — extracts app info, exception details, stack traces, and binary image list from Crash Reporter output.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.crash`, `.ips`, `.diagnostic` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | App Store crash reports, Xcode organizer exports, TestFlight diagnostics |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| App info card | ✅ | Process name, bundle ID, version, OS, device shown |
| Exception card | ✅ | Exception type, signal, crash reason displayed |
| Thread backtrace | ✅ | Crashed thread stack frames shown with frame numbers |
| Binary images | ✅ | Loaded binary images listed with addresses |
| Classic and JSON-IPS formats | ✅ | Both legacy `.crash` text and newer `.ips` JSON formats parsed |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Process, version, exception type, OS version, date, and triggered thread when present |

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

- [`sample.crash`](../examples/sample.crash) — example macOS crash report

## Known Limitations

- Symbol demangling (C++ / Swift) is not performed — raw mangled names shown
- Symbolicating frames against dSYM files is not supported (requires build artifacts)

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Swift demangling | Med | Med | Client-side demangling library |
| Android logcat crash support | Low | Med | Different format; `at` frames and `FATAL EXCEPTION` |
| dSYM symbolication | Low | Hard | Would need the matching dSYM uploaded alongside |
