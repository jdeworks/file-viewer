# Android Package / Bundle (APK / AAB / XAPK)

> APK/AAB/XAPK inventory viewer — format-aware manifests, DEX files, native ABIs, assets, resources, embedded APKs, and unverified signature-artifact evidence.

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
| Signature artifacts | ⚠️ Partial | Coordinated v1/JAR files and structurally placed APK Signing Blocks are reported as evidence only; signatures and trust are not verified |
| Resources | ✅ | APK `resources.arsc` and AAB module `resources.pb` paths |
| AndroidManifest.xml | ✅ | APK root and AAB module manifest presence (binary XML — not parsed) |
| AAB module layout | ✅ | Module manifests, `dex/`, `lib/`, `assets/`, and `resources.pb` inventory |
| XAPK outer layout | ⚠️ Partial | Lists embedded APKs and `manifest.json`; embedded APK contents/signatures are not recursively inspected |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Screenshot | ✅ | Preview screenshot available |
| Metadata | ✅ | Format surfaced in metadata; detailed package counts are in the preview |

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
- Signature artifacts are not cryptographically verified and no platform trust chain is evaluated
- XAPK embedded APKs are listed but not recursively opened
- No in-browser APK decompiler or smali viewer

## Real-World Examples

- [`sample.apk`](../examples/sample.apk) — deterministic unsigned package containing structurally framed binary AXML and a checksum-valid minimal DEX, covered by fixture tests; it demonstrates inventory parsing, not Android installability

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Binary AndroidManifest parse | Med | Hard | Requires AXMLParser or AXML library |
| Icon extraction | Med | Med | Extract and display launcher icons |
| Permission list | Med | Hard | Parse permissions from binary manifest |
