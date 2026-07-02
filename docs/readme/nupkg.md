# Package (NuGet / VSIX / Python Wheel / JAR)

> Package viewer — package ID, version, authors, description, license, tags, and dependency list. Supports NuGet, VS Extensions, Python Wheels, and Java JARs.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nupkg`, `.vsix`, `.whl`, `.jar` |
| MIME type | `application/zip` |
| Binary / Text | Binary (ZIP archive) |
| Common use | .NET/NuGet packages, Visual Studio extensions, Python distributions, Java libraries |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Package kind | ✅ | NuGet / VS Extension / Python Wheel / JAR auto-detected |
| Package ID / name | ✅ | From `.nuspec`, `.vsixmanifest`, `METADATA`, or `MANIFEST.MF` |
| Version | ✅ | Semantic version string |
| Authors | ✅ | Author or publisher from manifest |
| Description | ✅ | Package summary/description |
| Project URL | ✅ | Homepage or repository URL |
| License | ✅ | SPDX expression or URL |
| Tags / keywords | ✅ | Comma-separated tag list |
| Dependencies | ✅ | Up to 15 listed with version ranges |
| File listing | ✅ | ZIP entries from archive |
| Source view | ❌ | Binary ZIP format |
| Diff | ❌ | Binary format |
| Metadata | ⚠️ Partial | Side-panel metadata exposes package format; rich package fields are shown in the preview |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- JAR manifest reading is limited to `MANIFEST.MF` — no POM.xml parsing
- Dependency resolution / transitive deps are not shown
- File listing is capped to the first 20 ZIP entries in the preview

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full dependency tree | Low | Hard | Requires package registry API |
| JAR POM.xml parsing | Low | Med | Parse Maven POM inside JAR for richer metadata |
| Rich side-panel metadata | Low | Easy | Promote parsed ID/version/author fields from preview into metadata extraction |
