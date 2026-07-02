# Steam App Manifest (ACF)

> Valve KeyValues / Steam ACF viewer — game name, App ID, install state, installed depots, and timestamps.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.acf` |
| MIME type | `text/plain` |
| Binary / Text | Text (Valve KeyValues) |
| Common use | Steam game installation manifests, workshop item descriptors |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| App name & ID | ✅ | Extracted from `name` and `appid` fields |
| Install directory | ✅ | `installdir` field shown |
| Install state | ✅ | `StateFlags` bitmask decoded to human-readable labels |
| Size on disk | ✅ | `SizeOnDisk` formatted as KB/MB/GB |
| Build ID | ✅ | `buildid` shown |
| Platform & branch | ✅ | From `UserConfig` sub-block |
| Timestamps | ✅ | `LastUpdated` and `LastPlayed` decoded from Unix epoch |
| Installed depots | ✅ | Depot IDs shown as chips (first 10) |
| UserConfig summary | ✅ | Platform and beta branch surfaced when present |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | App ID, name, install dir, build ID |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- VDF files with non-AppState root structures may show partial info
- Nested sub-blocks beyond `InstalledDepots` and `UserConfig` are not rendered
- Generic `.vdf` files are not registered to this base type yet

## Real-World Examples

- [`sample.acf`](../examples/sample.acf) — compact sample Steam app manifest
- [`appmanifest_570.acf`](../examples/appmanifest_570.acf) — Dota 2-style Steam manifest sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full recursive KV tree view | Low | Med | Render all nested blocks as collapsible tree |
| `.vdf` extension support | Low | Easy | Add detection once generic Valve KeyValues routing is clear |
| Steam library summary | Low | Med | Aggregate multiple ACF files |
