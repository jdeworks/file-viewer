# Font

> Live font specimen rendered using the browser's FontFace API — editable preview text, size/color/background controls, alphabet, digits, weight ramp, size ladder, and parsed font metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ttf`, `.otf`, `.woff`, `.woff2` |
| MIME type | `font/ttf`, `font/otf`, `font/woff`, `font/woff2` |
| Binary / Text | Binary |
| Common use | Typography, web fonts, design assets, icon fonts |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Live font specimen | ✅ | Rendered using `FontFace` API — actual typeface, not a simulation |
| Custom preview text | ✅ | Editable specimen textarea updates live |
| Size control | ✅ | Slider from 12px to 200px |
| Color / background controls | ✅ | Text color picker plus white/black/transparent background toggle |
| Uppercase / lowercase alphabet | ✅ | Full Latin alphabet specimen |
| Digit and punctuation ramp | ✅ | `0-9` and common symbols |
| Size ramp | ✅ | Sentences from 12px to 80px |
| Weight ramp | ✅ | 100 through 900 weight samples |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ✅ | Format, size, table count, name-table fields, units per em, glyph count, OS/2 weight/width, vendor/license fields when available |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Font editing | ❌ | Binary format — no in-app editing |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert WOFF → TTF | ❌ | Not yet implemented |

## Real-World Examples

- [`sample.ttf`](../examples/sample.ttf) — Ubuntu Mono TrueType specimen
- [`sample.otf`](../examples/sample.otf) — Source Serif 4 OpenType/CFF specimen
- [`sample.woff`](../examples/sample.woff) — WOFF webfont (zlib-compressed tables)
- [`sample.woff2`](../examples/sample.woff2) — WOFF2 webfont (Brotli-compressed)

## Known Limitations

- Icon fonts can still show empty boxes for Latin text; use the custom preview text when you know the glyph mapping
- Variable fonts are displayed at default axis values only
- CJK fonts with thousands of glyphs can take a moment to load
- WOFF2 metadata is limited to Format, Size, and Table count — the name-table/head/maxp/OS2 fields (family, version, units-per-em, glyph count, weight/width class, vendor/license) aren't shown because WOFF2 packs all tables into a single Brotli-compressed blob and no Brotli decompressor is vendored; WOFF (zlib-compressed tables) and raw TTF/OTF get the full field set

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Variable font axis sliders | Med | Med | Expose weight/width/slant axes interactively |
| Glyph grid view | Low | Med | Show all glyphs in a scrollable grid |
| Convert WOFF2 → TTF | Low | Med | Would require vendoring a WOFF2 decoder |
