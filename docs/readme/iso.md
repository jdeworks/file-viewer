# ISO 9660 Disc Image

> ISO disc image viewer — volume name, system identifier, sector size, file count, and directory listing.

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
| File count | ✅ | Files in root directory listing |
| Directory listing | ✅ | Root directory entries with sizes |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Screenshot | ✅ | Available |
| Metadata | ✅ | Volume name, size, system, file count |

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
- Cannot extract files from inside the ISO
- Joliet / Rock Ridge extensions shown if present in PVD

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full recursive directory listing | Med | Med | Walk all directories, not just root |
| File extraction | Low | Hard | Read sectors and download individual files |
| UDF support | Low | Hard | Parse UDF Volume Recognition Area |
