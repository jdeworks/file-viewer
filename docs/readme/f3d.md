# Fusion 360

> Fusion 360 design viewer — design name, creator, revision, dates, file count, and embedded thumbnail preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.f3d`, `.f3z` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP archive) |
| Common use | Autodesk Fusion 360 3D CAD designs and assemblies |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format variant | ✅ | `.f3d` (design) vs `.f3z` (assembly) |
| Design name | ✅ | From manifest/rootcomp JSON inside ZIP |
| Description | ✅ | From manifest JSON |
| Created by | ✅ | Owner/creator ID or name |
| Revision | ✅ | Version/revision ID |
| Created / modified dates | ✅ | ISO 8601 timestamps from manifest |
| Files in archive | ✅ | Count of entries in ZIP |
| Embedded thumbnail | ✅ | PNG/JPEG preview image shown |
| Source view | ❌ | Binary ZIP format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Design name, revision, dates, file count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- 3D geometry data is not decoded — manifest metadata and thumbnail only
- Assembly sub-component relationships are not shown

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Component tree | Low | Hard | Requires parsing Fusion internal JSON schema |
| File listing | Low | Easy | List all entries in the ZIP archive |
