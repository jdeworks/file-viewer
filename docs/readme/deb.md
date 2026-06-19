# Debian Package

> Debian .deb package viewer — package name, version, architecture, maintainer, installed size, dependencies, and description.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.deb`, `.udeb` |
| MIME type | `application/vnd.debian.binary-package` |
| Binary / Text | Binary (AR archive containing tarballs) |
| Common use | Debian, Ubuntu, and derivative Linux package management |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Package name | ✅ | From `control` file `Package:` field |
| Version | ✅ | `Version:` field |
| Architecture | ✅ | `Architecture:` field |
| Maintainer | ✅ | `Maintainer:` field |
| Installed size | ✅ | `Installed-Size:` in KB |
| Description | ✅ | Short and extended description |
| Dependencies | ✅ | `Depends:`, `Pre-Depends:` parsed |
| Recommends / Suggests | ✅ | Optional dependency fields |
| Section / Priority | ✅ | Package category and priority |
| Source view | ❌ | Binary AR archive |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Name, version, arch, maintainer, depends |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- File list (from `data.tar.*`) is not extracted
- Preinst / postinst scripts are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| File list extraction | Med | Med | Parse data.tar.gz to list installed paths |
| Script viewer | Low | Easy | Show maintainer scripts (preinst, postinst, etc.) |
