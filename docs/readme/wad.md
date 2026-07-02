# Doom WAD Game Archive

> WAD viewer — IWAD/PWAD type, lump count, and categorized lump summaries for maps, textures, sprites, audio, flats, and other entries.

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
| Map list | ✅ | E1M1-E4M9 and MAP01-MAP32 markers detected; first 20 shown |
| Map lump detection | ✅ | Standard map sublumps are recognized while categorizing the directory |
| Texture lumps | ✅ | TEXTURE1/2, PNAMES, PLAYPAL, COLORMAP |
| Sprite count | ✅ | Lumps between S_START/S_END markers counted |
| Flat count | ✅ | Lumps between F_START/F_END markers counted |
| Audio lumps | ✅ | MUSIC/SFX entries listed with a capped summary |
| Other lumps | ✅ | Remaining lump names shown with a capped summary |
| Source view | ❌ | Binary format |
| Diff | ❌ | Binary format |
| Metadata | ✅ | WAD format and lump count |

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
- Lump offsets/sizes are parsed internally but not shown per row yet
- PWAD lumps are shown without diffing against the base IWAD

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Palette preview | Low | Med | Decode PLAYPAL (256-colour Doom palette) |
| Lump table details | Low | Easy | Show offset and byte size for each listed lump |
| Flat / sprite thumbnail | Low | Hard | Doom picture format decoder required |
