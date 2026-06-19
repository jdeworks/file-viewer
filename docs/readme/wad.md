# Doom WAD Game Archive

> WAD viewer — IWAD/PWAD type, lump count, categorised lump listing (maps, textures, sprites, audio, flats).

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.wad` |
| MIME type | `application/octet-stream` |
| Binary / Text | Binary |
| Common use | Doom, Doom II, Heretic, Hexen, Quake game data and mods |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| WAD type | ✅ | IWAD (official game data) vs PWAD (mod/patch) |
| Lump count | ✅ | Total number of lumps in the directory |
| Map list | ✅ | E1M1–E4M9, MAP01–MAP32 markers detected |
| Map lump detail | ✅ | THINGS, LINEDEFS, SIDEDEFS, VERTEXES, SECTORS, etc. |
| Texture lumps | ✅ | TEXTURE1/2, PNAMES, PLAYPAL, COLORMAP |
| Sprite list | ✅ | Lumps between S_START/S_END markers |
| Flat list | ✅ | Lumps between F_START/F_END markers |
| Audio lumps | ✅ | MUSIC/SFX entries |
| Other lumps | ✅ | Remaining lumps with sizes |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | WAD type, map count, lump count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Lump pixel data (graphics, textures) is not decoded
- PWAD lumps are shown without diffing against the base IWAD

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Palette preview | Low | Med | Decode PLAYPAL (256-colour Doom palette) |
| Flat / sprite thumbnail | Low | Hard | Doom picture format decoder required |
