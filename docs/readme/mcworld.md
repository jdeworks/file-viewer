# Minecraft World (.mcworld / .mcpack)

> Minecraft world and pack viewer — level name, game mode, seed, player position, world version, and pack manifest.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mcworld`, `.mcpack`, `.mcaddon` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP archive) |
| Common use | Minecraft Bedrock Edition world exports and add-on packages |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Level name | ✅ | From `level.dat` (LevelName tag) |
| Game mode | ✅ | Survival / Creative / Adventure / Spectator |
| Seed | ✅ | World generation seed |
| Player position | ✅ | Spawn and player coordinates |
| World version | ✅ | StorageVersion and lastOpenedWithVersion |
| Weather | ✅ | Rain level and lightning |
| Pack manifest | ✅ | For `.mcpack`: name, description, UUID, version |
| File listing | ✅ | Key files inside the ZIP |
| Source view | ❌ | Binary NBT / ZIP format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Level name, game mode, seed, version |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary NBT/ZIP format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Chunk data (blocks, entities) is not parsed
- Java Edition world formats (.zip of region files) are not supported

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Level stats | Low | Med | Player inventory item count, biome, dimension |
| Pack content listing | Low | Easy | List behaviours/textures/scripts inside pack |
