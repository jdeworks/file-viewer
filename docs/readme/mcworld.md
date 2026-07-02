# Minecraft World (.mcworld / .mcpack)

> Minecraft world and pack viewer — Bedrock ZIP structure, level name, game mode, difficulty, spawn point, version, dimensions, and pack contents.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.mcworld`, `.mctemplate`, `.mcpack` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary (ZIP archive) |
| Common use | Minecraft Bedrock Edition world exports, templates, and add-on packages |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Level name | ✅ | From `levelname.txt` or `level.dat` (`LevelName`) |
| Game mode | ✅ | Survival / Creative / Adventure / Spectator when present |
| Difficulty | ✅ | Peaceful / Easy / Normal / Hard when present |
| Spawn point | ✅ | `SpawnX`, `SpawnY`, and `SpawnZ` from `level.dat` |
| World version | ✅ | Storage version and `lastOpenedWithVersion` when present |
| Dimensions / structure | ✅ | Overworld/Nether/End hints plus LevelDB directory presence |
| Pack classification | ✅ | World, template, behavior/resource pack, or add-on pack |
| File listing | ✅ | First 40 archive entries with sizes |
| Source view | ❌ | Binary NBT / ZIP format |
| Diff | ❌ | Binary format |
| Metadata | ❌ | Side-panel metadata extractor is not populated yet |

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
- `manifest.json` is detected for package classification but not decoded into name/UUID/version fields yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Manifest details | Med | Easy | Parse `manifest.json` for pack name, description, UUID, and version |
| Metadata extractor | Med | Easy | Surface level name, package type, and file counts in the side panel |
| Level stats | Low | Med | Player inventory item count, biome, dimension |
| Pack content listing | Low | Easy | List behaviours/textures/scripts inside pack |
