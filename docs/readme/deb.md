# Debian Package

> Debian .deb package viewer — validates the AR container, shows package archive members, and surfaces control fields when they are directly readable.

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
| AR container validation | ✅ | Checks `!<arch>\n` magic and `debian-binary` member |
| Format version | ✅ | Reads the `debian-binary` member |
| Archive members | ✅ | Lists member names and compressed member sizes |
| Package name | ⚠️ | Shown only when readable control text is directly present |
| Version / architecture | ⚠️ | Same direct-control-text limitation |
| Maintainer / homepage | ⚠️ | Same direct-control-text limitation |
| Installed size | ⚠️ | Same direct-control-text limitation |
| Description | ⚠️ | Same direct-control-text limitation |
| Dependencies | ⚠️ | Same direct-control-text limitation |
| Source view | ❌ | Binary AR archive |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Identifies valid Debian package files |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `control.tar.*` is not decompressed yet, so most modern packages show archive members without package fields
- File list (from `data.tar.*`) is not extracted
- Preinst / postinst scripts are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Control archive extraction | High | Med | Decompress `control.tar.*` and parse `control`, scripts, md5sums |
| File list extraction | Med | Med | Parse data.tar.gz to list installed paths |
| Script viewer | Low | Easy | Show maintainer scripts (preinst, postinst, etc.) |
