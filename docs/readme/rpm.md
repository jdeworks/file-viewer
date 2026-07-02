# RPM Package

> RPM package viewer — package name, version, architecture, summary, license, vendor, URL, packager, and dependency overview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.rpm`, `.srpm` |
| MIME type | `application/x-rpm` |
| Binary / Text | Binary |
| Common use | Red Hat, Fedora, RHEL, CentOS, openSUSE package management |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Package name | ✅ | From RPM header `NAME` tag |
| Version + release | ✅ | `VERSION` and `RELEASE` tags |
| Architecture | ✅ | `ARCH` tag |
| Summary | ✅ | One-line description |
| Description | ✅ | Full package description |
| License | ✅ | `LICENSE` tag |
| Build host | ❌ | Tag is not displayed in the preview |
| Build time | ❌ | Tag is not displayed in the preview |
| Installed size | ❌ | Not displayed |
| File count | ❌ | Payload file list is not extracted |
| Requirements | ✅ | First 15 `REQUIRENAME` entries displayed |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ Partial | Format and lead name only in the side panel; richer header fields are preview-only |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.rpm`](../examples/sample.rpm) — compact RPM fixture for header parsing

## Known Limitations

- File list (from CPIO payload) is not extracted
- Pre/post install scriptlets are not shown
- Build host/time and installed size tags are parsed opportunistically but not displayed yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| File list extraction | Med | Hard | Decompress CPIO payload to list paths |
| Build metadata rows | Low | Easy | Surface parsed build host, build time, and installed size when present |
| Scriptlet viewer | Low | Med | Parse PREIN/POSTIN/PREUN/POSTUN tags |
