# Android Package (APK / AAB)

> APK/AAB viewer — DEX file count, native ABI list, asset count, resource presence, signing status, and file inventory.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.apk`, `.aab`, `.xapk` |
| MIME type | `application/vnd.android.package-archive` |
| Binary / Text | Binary (ZIP-based) |
| Common use | Android application distribution packages |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| DEX files | ✅ | `classes.dex`, `classes2.dex`, etc. listed |
| Native ABIs | ✅ | `armeabi-v7a`, `arm64-v8a`, `x86_64`, etc. |
| Asset count | ✅ | Files under `assets/` |
| Total file count | ✅ | All files inside the ZIP |
| Signing (META-INF) | ✅ | META-INF/ presence detected; manifest shown |
| Resources | ✅ | `resources.arsc` presence detected |
| AndroidManifest.xml | ✅ | Presence check (binary XML — not parsed) |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Screenshot | ✅ | Preview screenshot available |
| Metadata | ✅ | DEX count, ABIs, asset count, file count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary package — not editable |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `AndroidManifest.xml` is binary-encoded XML — package name / version not parsed
- No in-browser APK decompiler or smali viewer

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Binary AndroidManifest parse | Med | Hard | Requires AXMLParser or AXML library |
| Icon extraction | Med | Med | Extract and display launcher icons |
| Permission list | Med | Hard | Parse permissions from binary manifest |
