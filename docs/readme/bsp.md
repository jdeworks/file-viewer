# BSP Game Map

> BSP map viewer — engine/game detection, version, entity count, worldspawn properties (map name, sky, gravity, fog).

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.bsp` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Quake, Half-Life, Counter-Strike, Doom 3, and Source Engine levels |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Engine detection | ✅ | Quake/GoldSrc (v29/v30), IBSP (Quake II/III/Doom 3), VBSP (Source Engine) |
| Game identification | ✅ | Quake, Half-Life, Quake II, Quake III, TF2, Portal, CS:S, Doom 3, etc. |
| BSP version | ✅ | Version number from header |
| Entity count | ✅ | Total entities in the entity lump |
| Worldspawn | ✅ | Map name, sky, gravity, ambient, sun direction, fog, music |
| Entity class breakdown | ✅ | Count per classname (info_player_start, weapon_*, monster_*, etc.) |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Format/game and map name when available; entity counts are in the preview |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Geometry (faces, vertices, brushes) is not decoded
- Lightmap and texture data are not shown
- Entity lump parsing is capped to simple key/value entity blocks

## Real-World Examples

- [`sample.bsp`](../examples/sample.bsp) — compact Quake-style BSP sample

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Brush / face count | Low | Med | Parse geometry lump for level complexity stats |
| Embedded texture list | Low | Med | Extract texture names from BSP texture lump |
