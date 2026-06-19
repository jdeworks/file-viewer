# Font

> Live font specimen rendered using the browser's FontFace API — pangram, alphabet, digit ramp, and size ladder in the actual typeface.

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
| Pangram | ✅ | "The quick brown fox jumps over the lazy dog" at 40px and 28px |
| Uppercase / lowercase alphabet | ✅ | Full Latin alphabet at 20px |
| Digit and punctuation ramp | ✅ | `0-9` and common symbols at 20px |
| Size ramp | ✅ | Sentences at multiple sizes (40px → 15px) |
| Source view | ❌ | Binary format — no raw text view |
| Diff | ❌ | Binary format not diffable |
| Metadata | ✅ | Family name, style, version, glyph count (where available) |

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

- [`sample.ttf`](../examples/sample.ttf) — example TrueType font

## Known Limitations

- Icon fonts show empty boxes for pangram (no Latin glyphs) — custom specimen text is not configurable
- Variable fonts are displayed at default axis values only
- CJK fonts with thousands of glyphs can take a moment to load

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Custom specimen text input | Med | Easy | Let the user type text to preview |
| Variable font axis sliders | Med | Med | Expose weight/width/slant axes interactively |
| Glyph grid view | Low | Med | Show all glyphs in a scrollable grid |
| Convert WOFF2 → TTF | Low | Med | Would require vendoring a WOFF2 decoder |
