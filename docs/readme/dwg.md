# AutoCAD DWG Drawing

> AutoCAD DWG viewer — version string, AutoCAD release name, maintenance release, and embedded thumbnail preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.dwg` |
| MIME type | `image/vnd.dwg` |
| Binary / Text | Binary |
| Common use | AutoCAD drawings, architectural/engineering plans, mechanical designs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Format version | ✅ | AC-code (AC1015, AC1032, etc.) shown |
| AutoCAD release | ✅ | Mapped to release name: R10, R12, R14, 2000, 2004, 2007, 2010, 2013, 2018, 2023 |
| Maintenance release | ✅ | Sub-release byte from header |
| Embedded thumbnail | ✅ | JPEG thumbnail extracted if present in header |
| File size | ✅ | Shown in bytes |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Version string, release, file size |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Drawing entities (lines, arcs, blocks, layers) are not decoded — header info only
- Full parsing requires OpenDesign DWGdirect or libdxfrw

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Layer list | Low | Hard | Requires deep DWG binary parsing per version |
| Convert to DXF preview | Low | Hard | Requires full geometry decoder |
