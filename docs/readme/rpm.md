# RPM Package

> RPM package viewer — name, version, architecture, summary, description, build host, and file count.

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
| Build host | ✅ | Host that built the package |
| Build time | ✅ | POSIX timestamp decoded |
| Size | ✅ | Installed size |
| File count | ✅ | Number of files in the package |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Name, version, arch, summary, build info |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- File list (from CPIO payload) is not extracted
- Pre/post install scriptlets are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| File list extraction | Med | Hard | Decompress CPIO payload to list paths |
| Scriptlet viewer | Low | Med | Parse PREIN/POSTIN/PREUN/POSTUN tags |
