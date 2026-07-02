# ISO 9660 Disc Image

> ISO disc image viewer — Primary Volume Descriptor summary with volume name, system identifier, sector size, and volume descriptor list.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.iso`, `.img` |
| MIME type | `application/x-iso9660-image` |
| Binary / Text | Binary |
| Common use | CD/DVD/Blu-ray disc images, OS installation media, software archives |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Volume identifier | ✅ | From Primary Volume Descriptor |
| System identifier | ✅ | OS target (e.g. `WIN32`, `LINUX`) |
| Volume size | ✅ | Logical block count × logical block size |
| Logical block size | ✅ | Typically 2048 bytes |
| Publisher / preparer | ✅ | From PVD fields |
| File count | ❌ | Directory records are not walked yet |
| Directory listing | ❌ | Directory records are not walked yet |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Screenshot | ✅ | Available |
| Metadata | ✅ | Side panel reports format, volume ID, publisher, sector size, total size, and root date |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary disc image |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- UDF (Universal Disk Format) filesystem is not parsed — ISO 9660 only
- Cannot list or extract files from inside the ISO
- Joliet / Rock Ridge directory extensions are not parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full recursive directory listing | Med | Med | Walk all directories, not just root |
| File extraction | Low | Hard | Read sectors and download individual files |
| UDF support | Low | Hard | Parse UDF Volume Recognition Area |
