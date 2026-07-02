# iOS App Package (IPA)

> iOS IPA viewer — bundle ID, app name, version, minimum OS, device family, URL schemes, and required capabilities from `Info.plist`.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ipa` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP containing Mach-O + plist files) |
| Common use | iOS / iPadOS application distribution packages |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Bundle ID | ✅ | `CFBundleIdentifier` from `Info.plist` |
| App name | ✅ | `CFBundleName` / `CFBundleDisplayName` |
| Version | ✅ | `CFBundleVersion` and `CFBundleShortVersionString` |
| Min iOS version | ✅ | `MinimumOSVersion` |
| Supported platforms | ✅ | `CFBundleSupportedPlatforms` and `UIDeviceFamily` |
| Required capabilities | ✅ | `UIRequiredDeviceCapabilities` chips |
| URL schemes | ✅ | First bundle URL schemes listed when present |
| Uncompressed size | ✅ | Estimated from ZIP entries |
| Architectures | ❌ | Mach-O slices are not parsed |
| File count | ❌ | File count is not shown in the current preview |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ❌ | Metadata extractor is currently empty; details are preview-only |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `Info.plist` is expected as XML in the current renderer; binary plist IPAs may not show details
- Entitlements (`embedded.mobileprovision`) are not fully parsed
- Architectures and Mach-O slices are not inspected

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| App icon extraction | Med | Med | Extract AppIcon from Assets.car |
| Binary plist support | Med | Med | Decode binary `Info.plist` before rendering fields |
| Architecture extraction | Med | Med | Parse Mach-O/fat binary slices from main executable |
| Provisioning profile details | Low | Med | Parse embedded.mobileprovision XML |
