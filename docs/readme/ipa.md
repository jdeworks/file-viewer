# iOS App Package (IPA)

> iOS IPA viewer — bundle ID, app name, version, minimum iOS version, supported architectures, and entitlements.

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
| Supported platforms | ✅ | iPhone / iPad flags |
| Architectures | ✅ | From Mach-O binary slices in main executable |
| File count | ✅ | Total files in the ZIP |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Bundle ID, version, min iOS, architectures |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- `Info.plist` is parsed from binary plist format — some fields may be missing
- Entitlements (`embedded.mobileprovision`) are not fully parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| App icon extraction | Med | Med | Extract AppIcon from Assets.car |
| Provisioning profile details | Low | Med | Parse embedded.mobileprovision XML |
