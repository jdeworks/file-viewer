# Plan: Feature Extensions — Easter Eggs, ASCII Art, Folder Reorg, Layered Viewer

## Context

Six extension directions, spanning from 1-hour Easter egg tweaks to multi-week format decoders. All features are pure browser-side (no server), follow the existing registry-based dispatch, and vendor all new dependencies into `docs/vendor/`. The per-increment contract applies to each: implement → smoke GREEN → `asset-manifest.json` regen → commit.

---

## Feature G — URL / Query String Inspector

### Problem / Goal

Developers frequently deal with long URLs (OAuth callbacks, tracking pixels, API endpoints, webhook payloads) that are hard to read as raw text. A URL viewer breaks them apart into a structured, human-readable form. Also detects standalone query strings (no scheme) and `data:` URIs.

### Detection (`docs/types/text/url/detect.js`)

Returns a score for text files whose content is (or starts with) a URL or query string:

```
Signals → score
- Content (trimmed) matches /^https?:\/\//i  → 0.90
- Content matches /^(ftp|file|data|blob|mailto|tel|ssh|git):\/\//i → 0.85
- Content is a bare query string /^\?[^=\n]+=[^&\n]/ → 0.80
- Content contains multiple URLs (one per line) /^https?:\/\//m ≥3 lines → 0.75
- .url / .webloc extension → 0.70 (already low-prio, but this viewer is more useful)
- All signals: isBinary → return 0 immediately
```

Cap at 0.80 so it stays below specific type detectors (`.url` file already handled, but this type wins for raw pasted URLs dropped as `.txt`).

### Renderer (`docs/types/text/url/renderer.js`)

Uses the native `URL` API (no dep). Returns `bodyHtml` for the iframe renderer.

**Layout for a single URL:**

```
┌─ URL Inspector ─────────────────────────────────────────────────────┐
│ Raw:  https://api.example.com/v2/users?page=2&limit=50&q=foo#bar   │
├──────────┬──────────────────────────────────────────────────────────┤
│ scheme   │ https                                                    │
│ host     │ api.example.com                                          │
│ port     │ (default 443)                                            │
│ path     │ /v2/users                                                │
│ path[0]  │ v2                                                       │
│ path[1]  │ users                                                    │
├──────────┴──────────────────────────────────────────────────────────┤
│ Query Parameters (3)                                                │
│ page    │ 2                                                         │
│ limit   │ 50                                                        │
│ q       │ foo                             [URL-decoded]             │
├─────────────────────────────────────────────────────────────────────┤
│ fragment │ bar                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Special cases:**

| Input | Extra handling |
|-------|----------------|
| `data:image/png;base64,...` | Show MIME type + size; render image inline if image/* |
| `data:text/...` | Show MIME type + decoded text content |
| JWT token in query value | Detect `/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/` → decode header+payload (base64url), show as JSON. Never send off-origin. |
| OAuth params (code, state, error, access_token) | Highlight row with a badge |
| URL-encoded JSON values | Detect `decodeURIComponent(v)` starts with `{` or `[` → offer to pretty-print |
| Multiple URLs (one per line) | Table of all URLs, click to expand each |
| Bare query string `?a=1&b=2` | Parse as `new URL('https://x?' + qs)` |
| `mailto:foo@bar.com?subject=Hello` | Show as: to, subject, cc, bcc, body |

**Copy buttons:** "Copy raw" per row value, "Copy all params as JSON" button.

### Metadata (`docs/types/text/url/metadata.js`)

| Field | Value |
|-------|-------|
| Scheme | https / http / data / etc. |
| Host | domain name |
| TLD | extracted from host |
| Path depth | count of `/`-separated segments |
| Query param count | N |
| Has fragment | yes/no |
| Detected JWT | yes/no (never show token value in metadata) |
| Detected OAuth | yes/no |
| `data:` type | MIME type if applicable |
| URL length | total char count |

### Files to create

```
docs/types/text/url/
├── detect.js
├── renderer.js         # URL() API, zero dep, bodyHtml
├── index.js
├── metadata.js
└── settings.default.json
```

**No new deps** — `URL` API, `atob()`, `JSON.parse()`, all native. XS effort (~2h).

---

## Feature A — Help Icon Multi-Click Easter Egg

**Files to touch:** `docs/core/app.js` (line 497 — the `metaBtn` click handler)

Add a session-scoped closure counter. Clicks 1–4 open the metadata drawer normally. Clicks 5–8 intercept the event and show an escalating modal instead. Click 9 triggers the games unlock.

| Click | Message |
|-------|---------|
| 5 | "Stop it." |
| 6 | "That hurts!" |
| 7 | "Why are you doing this?" |
| 8 | "Leave me alone!" |
| 9+ | "Ok, FINE. Take this and leave me alone." → calls `onKonami()` path in `docs/games/launcher.js` |

The modal is a minimal centred `<div>` overlay (reuse the in-memory-edit disclaimer toast pattern or `docs/games/metagame/dialog.js`). Counter is NOT persisted — resets on reload (funnier). The games unlock persists via `fv:games:unlocked` in localStorage (existing pattern).

**Verification:** Click metaBtn 9× in one session → games hub appears. First 4 clicks still open metadata drawer.

---

## Feature B — Easter Egg Sample Files

Add small surprising files to `docs/examples/`:
- `secret.txt` — in-character note from "The Archivist" (metagame lore, ties to Stage 10 boss)
- A tiny pixel-art `.png` named something innocuous (e.g. `sample_old.png`) — renders as a funny image in the image viewer
- Optionally: register a `viewer-actions` hook in `docs/games/metagame/viewer-actions.js` so opening `secret.txt` fires a metagame achievement

Files must stay <10KB. No code changes required unless hooking into metagame.

---

## Feature C — ASCII Art: Image-to-Text + ANSI Viewer + Animation Framework

### Modularity & extensibility seams

The ASCII feature is designed as a **toolkit of composable primitives**, not a monolithic feature. Adding future ASCII capabilities means calling existing functions, not modifying core:

| Extension point | How to add without touching core |
|----------------|----------------------------------|
| New char set (e.g. custom symbols) | Add entry to `CHARSETS` object in `ascii-converter.js`; expose via `charset` option |
| New image-to-ASCII render style (e.g. braille 4×8 sampling) | Pass a `mapper(lum, r, g, b) → char` function to `imageToAscii()` |
| New ASCII animation (Easter egg, minigame, metagame stage) | Call `mountAsciiAnim(host, frames, opts)` — zero core changes; add frames as a text sprite sheet, use `parseFrames()` |
| New ASCII minigame | Follow the game registry pattern (`docs/games/registry.js`) with a self-contained `mount()` module; optionally use `ascii-anim.js` for rendering |
| New ANSI art file extension | Add extension to `asciiart/detect.js` score table — one line |
| ASCII easter egg tied to a specific file | Call `recordStage3AsciiActivation()` or add a new action in `viewer-actions.js` — no renderer changes |

The animation framework (`ascii-anim.js`) deliberately mirrors the game contract: `mount(host, opts) → { destroy }`. Any future ASCII minigame can be dropped into `docs/games/` and registered in `registry.js` exactly like Snake or 2048.

### Metadata panel (`asciiart/metadata.js`)

Surfaces in the `ⓘ` drawer for ASCII art / ANSI files:

| Field | Source |
|-------|--------|
| Dimensions (cols × rows) | Computed from max line length + line count |
| SAUCE record | Parse `SAUCE00` block at end of file: Title, Author, Group, Date, TInfo1/2/3 (width/height/flags) |
| ANSI colors present | Boolean; count of `\x1b[` sequences |
| File encoding | UTF-8 / CP437 / Latin-1 detection |
| Character set density | % of printable chars vs whitespace |

### Files to create

| Path | Purpose |
|------|---------|
| `docs/types/image/ascii-converter.js` | Core image→ASCII algorithm (canvas sampling + char mapping) |
| `docs/types/image/ascii-screensaver.js` | 30s-idle screensaver Easter egg (retro terminal boot animation) |
| `docs/types/text/asciiart/detect.js` | ASCII art file detection |
| `docs/types/text/asciiart/renderer.js` | Plain `<pre>` + ANSI escape parser |
| `docs/types/text/asciiart/index.js` | Type descriptor |
| `docs/types/text/asciiart/settings.default.json` | Minimal settings stub |
| `docs/core/ascii-anim.js` | Frame-array animation player (`pre` + `canvas` modes) |

### Files to modify

| Path | Change |
|------|--------|
| `docs/types/image/renderer.js` | ASCII toggle, option controls, Copy button, screensaver idle timer |
| `docs/assets/preview-chrome.css` | `.imgv-sep`, `.imgv-ascii-out`, `.imgv-ss-overlay` |
| `docs/assets/preview.css` | `.aa-wrap`, `.aa-pre` for iframe renderer |
| `docs/core/registry.js` | Register `asciiartType` (before `codeType`/`rawType`) |
| `docs/games/metagame/viewer-actions.js` | Add `recordStage3AsciiActivation` hook |

### Core algorithm (`ascii-converter.js`)

```js
imageToAscii(imageBytes, mimeType, { cols, colorMode, charset }) → Promise<{ lines, palette }>
```

1. `URL.createObjectURL(new Blob([bytes]))` → `img.decode()` → draw scaled to `cols × rows` on offscreen `document.createElement('canvas')` (not OffscreenCanvas — matches established pattern in `exports.js` and `meshview.js`)
2. Aspect correction: `rows = Math.round(cols * (h/w) * 0.45)` (monospace cell ~2× taller than wide). Clamp rows to 200.
3. `ctx.getImageData(0, 0, cols, rows)` on tiny canvas → per cell: luminance = `0.299R + 0.587G + 0.114B` × `alpha/255`
4. Map luminance to char set:
   - `blocks`: `['█','▓','▒','░',' ']`
   - `classic`: `['@','#','*','+','=','-',':','.',' ']`
   - `braille`: sample at `cols×2` / `rows×4` → U+2800–U+28FF (2×4 pixel cells)
5. Color mode `ansi`: store `#rrggbb` per cell → run-length encode equal-color runs per line → `<span style="color:...">` per run (cheaper DOM and fine because equal-color runs are common in flat regions)
6. Hide ASCII toggle for SVG images (no pixel data to sample)

**Toolbar controls:** ASCII toggle button, cols select (40/80/160), color select (Mono/Color), charset select (Blocks/Classic/Braille), Copy button (clipboard)

### ASCII animation framework (`ascii-anim.js`)

```js
mountAsciiAnim(host, frames[], opts) → { play, pause, setFrame, destroy }
parseFrames(sheetText, frameSep='---') → string[]
```

- `pre` mode: `pre.textContent = frame` — selectable, accessible, for static/interactive display
- `canvas` mode: `ctx.fillText()` line by line — preferred for animations >5fps (no DOM reflow, matches `snake.js` + `meshview.js` patterns)
- Screensaver: 30s idle in ASCII image mode → overlay a "retro terminal boot" animation (built-in ~20 frames, no external file). Any click/key dismisses it.
- Stage 3 Kernel Panic boss (`stages.js:154`) can use `anim.setFrame()` for a 2-frame cursor blink.

### ANSI escape parser (in `asciiart/renderer.js`)

State machine: `NORMAL → AFTER_ESC → IN_CSI`. Emits `<span style="color:...; background:...; font-weight:...">` runs on SGR codes. 256-color table: colors 16–231 = 6×6×6 RGB cube (`r=floor((n-16)/36)*51`), colors 232–255 = grayscale 10-step ramp — derivable algorithmically, no lookup table needed. Size guard: truncate at 500K chars with notice.

### ASCII art detection (`asciiart/detect.js`)

- `.ans`/`.asc` extension → 0.90; `SAUCE00` header → 0.95
- >30% lines wider than 80 chars AND density of block/box chars (`█▓▒░═╔╗`) → up to 0.75
- Requires ≥3 signals to trigger; capped below `log`/`csv` scores

### Metagame hook

Opening ASCII mode on `entity_f_verification.png` fires `recordStage3AsciiActivation()` → connects image viewer feature to Stage 3 "ASCII Awakening" progression.

**No new vendor deps** — pure canvas + DOM.

---

## Feature D — Audio Waveform & Mixer

### Files to create/modify

| Path | Change |
|------|--------|
| `docs/types/media/waveform.js` | New module: waveform canvas renderer |
| `docs/types/media/renderer.js` | Add waveform panel + expand toggle; mixer sliders for playlist |

### Waveform

- `AudioContext.decodeAudioData()` on first 60s of file (slice from `File` handle to avoid OOM on large files)
- Extract channel data → downsample to N points matching canvas width → draw amplitude bars
- Playback position line: `requestAnimationFrame` loop reading `audio.currentTime`, draw vertical line at `(currentTime/duration)*canvasWidth`
- Panel collapsed by default, expand button in the media toolbar

### Mixer (playlist mode)

- Connect `<audio>` to `AudioContext` via `createMediaElementSource()` → `createGain()` → `destination`
- Per-track gain slider in the playlist panel; `gainNode.gain.value = sliderValue / 100`
- Persist per-file gain in `docs/core/persistence.js` (keyed by filename)

**No new deps** — Web Audio API is native.

---

## Feature E — Virtual Folder Reorganization (Drag to Reorder)

### Files to modify

| Path | Change |
|------|--------|
| `docs/core/folder.js` | Add `state.folderMoves: Map<originalPath, newPath>`; expose `recordMove(src, dest)` |
| `docs/core/filetree.js` | Add `dragover`/`drop` handlers on folder rows; highlight drop target; moved-file indicator |
| `docs/core/folder-export.js` | Apply `folderMoves` map when building zip directory structure; append `_moves.sh` |

### Design

**In-memory move tracking:** `folder.js` already has `state.folderEdits`; add parallel `state.folderMoves`. When a file is moved, if it also has an in-memory edit, update the edit's path key to follow the new path.

**Drop targets:** Folder rows in `filetree.js` get `dragover` (with drop-target highlight class) and `drop` handlers. Validation:
- No circular moves (folder into itself or its own subtree)
- No overwriting an existing file at the destination path

**Disclaimer banner:** One-time dismissible banner after first move: "Moves are in-memory only. Download the folder to save changes, or run the included `_moves.sh` script." (Same pattern as the existing in-memory edit disclaimer.)

**Export:** `folder-export.js` places each file at its `folderMoves`-resolved path in the zip. Appends a `_moves.sh` file listing `mv "originalPath" "newPath"` for each move, so users can replicate on disk.

**Moved-file display:** Small `→` indicator or muted italic in the tree row.

---

## Feature F — Universal Layered File Viewer (ORA / PSD / XCF)

### File structure

```
docs/types/layered/
├── index.js              # type descriptor
├── detect.js             # magic-byte + extension detection for all formats
├── renderer.js           # mount: layer tree sidebar + canvas preview
├── layeredlib.js         # Layer model, blend mode map, compositeDocument()
├── decoders/
│   ├── ora.js            # ORA (ZIP + stack.xml + PNG layers; uses existing jszip)
│   ├── psd.js            # PSD (via ag-psd vendor bundle)
│   └── xcf.js            # XCF (hand-rolled binary reader, MVP: RGB/RGBA + RLE)
├── exports.js            # flatten visible layers → download PNG
├── metadata.js           # light sniff for format/channel info
└── settings.default.json
```

### New vendor dep: ag-psd 30.1.1 (MIT)

`psd.js` has Node.js-only deps (no browser bundle). `ag-psd` ships `dist/bundle.js` (~910 KB UMD), returns `HTMLCanvasElement` per layer in browser mode via `readPsd(buffer, { useImageData: true })`. Matches the existing `loadGlobal(vendor(...), 'agPsd')` pattern used by other heavy deps.

```bash
# scripts/vendor.sh addition:
mkdir -p "$VENDOR/ag-psd"
cp node_modules/ag-psd/dist/bundle.js "$VENDOR/ag-psd/ag-psd.bundle.js"
```

### Unified Layer Model (shared `layeredlib.js`)

```js
// Document { width, height, layers: Layer[], metadata? }
// Layer { id, name, type, x, y, width, height, opacity, visible, blendMode, bitmap?, children? }
// type: 'raster' | 'group' | 'text' | 'vector'
// opacity: 0–255 (normalized from all source formats)
// blendMode: CSS globalCompositeOperation string
```

`compositeDocument(doc, canvas)`: iterates layers bottom-up, sets `globalAlpha = opacity/255` and `globalCompositeOperation = blendMode`, draws each visible `layer.bitmap` at `(layer.x, layer.y)`. Groups: recurse into temp canvas, then composite. Unknown blend modes → `'source-over'`.

Blend mode map (PSD key → CSS): `'norm'→'source-over'`, `'mul '→'multiply'`, `'scrn'→'screen'`, `'over'→'overlay'`, etc. Full 12-entry map with `?? 'source-over'` fallback.

### Detection (`detect.js`)

- ORA: `hasExtension(intake, 'ora')` → 0.97 (ORA is a ZIP so PK bytes aren't unique)
- PSD: bytes `38 42 50 53` ('8BPS') → 0.99; extension fallback 0.95
- XCF: bytes `67 69 6d 70 20 78 63 66 20` ('gimp xcf ') → 0.99; extension fallback 0.95

Registry position: insert `layeredType` BEFORE `imageType` and `zipType` to ensure PSD magic beats image's 0.95 and ORA extension beats zip's 0.9.

### ORA decoder (`decoders/ora.js`)

Uses already-vendored `jszip`. Parses `stack.xml` with `DOMParser`, walks `<stack>`/`<layer>` elements recursively. Layer bitmaps are **lazy**: each layer gets `_loadBitmap()` — defers PNG load from zip until the layer is first needed by the compositor. After load, result cached on `layer.bitmap`. ORA stores layers top-first; decoder reverses to bottom-first (matching compositor's bottom-up draw order).

### PSD decoder (`decoders/psd.js`)

```js
const agPsd = await loadGlobal(vendor('ag-psd/ag-psd.bundle.js'), 'agPsd');
const psd = agPsd.readPsd(intake.bytes.buffer, { skipCompositeImageData: true, useImageData: true });
```

`psd.children` is top-first; `mapLayers()` reverses to bottom-first. Each `l.canvas` (HTMLCanvasElement) becomes `layer.bitmap` directly. Smart objects: ag-psd rasterizes them; no special handling needed. CMYK: ag-psd converts to RGB internally.

### XCF decoder (`decoders/xcf.js`)

Hand-rolled binary reader (no dep). Big-endian `DataView` reads. Structure: 9-byte magic + version, width/height/basetype header, property list (PROP_OPACITY=6, PROP_VISIBLE=8, PROP_MODE=7, PROP_OFFSETS=15), layer pointer list. Tiles: 64×64 blocks, RLE-decoded (byte `n >= 128` → next byte repeated `n-127` times; `n < 128` → `n+1` literal bytes). Channels stored as separate planes → combine into `ImageData`. Graceful degradation: indexed color mode → unsupported notice layer; text layers → `type:'text'`, no bitmap, skipped in compositor.

### Renderer (`renderer.js`) — `parentNode` mode (not iframe)

Canvas operations and blob URLs require parent origin. Same pattern as EPUB, STL, media, image viewers.

**Host layout:**
```
.lv-doc (flex row)
  .lv-side (200px, layer tree)
    .lv-side-head (doc info)
    .lv-layers (scrollable tree)
  .lv-main (flex col)
    .lv-bar (toolbar: Fit / 100% / + / − / zoom label / Export PNG)
    .lv-stage (scrollable, contains .lv-canvas)
    .lv-notice (unsupported-feature warnings)
```

Layer rows: eye toggle (`👁`/`○`), name, blend mode badge (if non-normal), opacity range slider. Group rows: expand/collapse triangle. Eye toggle calls `scheduleComposite()` (debounced `requestAnimationFrame`). Opacity slider: live update, `requestAnimationFrame` recomposite.

Zoom: CSS `transform: scale()` on `.lv-canvas` (display only; native-resolution canvas stays unchanged).

Export PNG: `canvas.toBlob('image/png')` → `downloadBlob()`.

Mobile: sidebar shrinks to 140px, opacity slider hidden.

### Registry (`docs/core/registry.js`)

One import + one line in `REGISTRY` array before `imageType` and `zipType`.

### `package.json` + `vendor.sh` + `asset-manifest`

Add `"ag-psd": "30.1.1"` to `devDependencies`, add the `vendor.sh` copy step, run `node scripts/gen-asset-manifest.mjs` after.

### Layered viewer modularity

Adding a new format decoder is **one new file** in `decoders/` + two lines in `renderer.js`'s dispatch switch. The renderer, compositor, and layer tree UI are format-agnostic — they only know the unified `Layer` model.

| Extension point | What to touch |
|----------------|---------------|
| New image format (e.g. .kra/Krita, .afphoto) | New `decoders/kra.js` + 2 lines in detect.js + dispatch |
| New blend mode | Add entry to `PSD_BLEND` map in `layeredlib.js` |
| Layer thumbnail previews | `renderer.js` only — draw 32×32 scaled bitmap on `<canvas>` per row |
| Text layer rendering | `renderer.js` — draw `layer.textData` to canvas using computed font properties |
| SVG layers | New `decoders/svg.js` — parse `<g>` elements into Layer model |

### Metadata panel (`metadata.js`) — rich, not light sniff

Full decode is needed only when the metadata drawer is opened (lazy). Surface in the `ⓘ` drawer:

| Field | ORA | PSD | XCF |
|-------|-----|-----|-----|
| Format + version | stack.xml `@version` | file header version | file header version string |
| Canvas size (W × H) | stack.xml `<image>` | psd.width/height | header |
| Layer count (total / visible) | count from stack.xml | count from children | count from layer list |
| Color mode | always RGBA | psd.colorMode (RGB/CMYK/Lab/…) | basetype (RGB/Grayscale/Indexed) |
| Blend modes in use | from layer composite-op attrs | from layer blendMode fields | from PROP_MODE |
| Group count | nested `<stack>` count | nested group layers | — |
| XMP/EXIF metadata | thumbnail.png EXIF if present | PSD descriptor resources | — |
| File size on disk | intake.size | intake.size | intake.size |
| Has text layers | — | boolean | PROP_IS_TEXT_LAYER count |
| Has smart objects | — | boolean (detectable in ag-psd) | — |

### MVP vs Phase 2

**MVP:** ORA + PSD decoders + renderer + CSS + registry integration + rich metadata panel. Graceful fallback for unsupported features.

**Phase 2:** XCF decoder, SVG layer mapping, layer thumbnail previews (32×32 per row), text layer rendering, layer-click-to-solo. Also: `.kra` (Krita, ZIP-based similar to ORA), `.afphoto` (Affinity, proprietary).

---

## Future Format Candidates (Research 2026-06-17)

Research covered graphics editors, DAW/audio project files, 3D/CAD, video project files, fonts, and miscellaneous structured formats. Key finding: most HIGH-priority additions reuse already-vendored infrastructure and fall into clusters that share a utility module.

### Cluster: Gzip-compressed XML (`.als`, `.prproj`, `.fcpxml`, `.drp`)
Share a single utility `docs/core/gzip-xml.js` → `decompressGzip(bytes) → XMLDocument` using native `DecompressionStream` API (no new dep). Then each type is just an XML schema parser.

| Format | App | Metadata available | Effort |
|--------|-----|-------------------|--------|
| `.als` | Ableton Live | BPM, time sig, track count (audio/MIDI/return), clip names, plugin list | S |
| `.prproj` | Adobe Premiere | Sequence count, clip count, project name, frame rate, resolution, media paths | S |
| `.fcpxml` | Final Cut Pro | Event names, clip list, library name, frame rate, duration, markers | XS |
| `.drp` | DaVinci Resolve | JSON format — timeline list, clip names, color grade count | XS |

**Priority: HIGH** — Ableton and Premiere alone cover a massive user base; gzipped XML means zero new deps beyond `DecompressionStream`.

### Cluster: ZIP + structured document (`.kra`, `.sketch`, `.usdz`)
All parse via already-vendored jszip. Similar to ORA. `.kra` (Krita) reuses the layered renderer directly.

| Format | App | What's inside | Effort |
|--------|-----|--------------|--------|
| `.kra` | Krita | ZIP + `maindoc.xml` + layer PNGs — **identical to ORA**, same layered renderer | S |
| `.sketch` | Sketch | ZIP + `pages/<uuid>.json` + `previews/preview.png` — artboard list + preview thumbnail | S |
| `.usdz` | Apple/Pixar USD | ZIP + `.usda` text files — prim hierarchy, material names | M |

**Priority: HIGH for .kra + .sketch** — Krita is the dominant open-source Photoshop alternative (decoder is ~10 lines different from ORA); Sketch is the dominant Mac design tool.

### Cluster: Geo / Map (`.gpx`, `.kml`, `.kmz`)
Share a `docs/core/geoview.js` renderer — canvas Mercator projection + elevation profile using already-vendored chart.js.

| Format | Source | Content | Effort |
|--------|--------|---------|--------|
| `.gpx` | Garmin/Strava/hiking apps | Track points (lat/lon/ele/time), waypoints, routes | S |
| `.kml` | Google Earth/Maps | Placemarks, paths, polygons, ground overlays | S |
| `.kmz` | Google Earth/Maps | ZIP → `doc.kml` + overlays (jszip already vendored) | S |

**Metadata:** bounding box (min/max lat/lon), total distance (Haversine), elevation gain/loss, point count, duration (first/last timestamp), track name.

**Priority: HIGH** — chart.js already vendored (elevation profile is free); zero new deps for GPX/KML.

### Cluster: Font deep metadata
opentype.js (MIT, ~100KB) already recommended for the existing font viewer. If not yet used, adding it unlocks rich metadata across `.ttf`/`.otf`/`.woff`:

**Metadata from OpenType tables:** family name, designer, manufacturer, copyright, license URL, version, weight class, Unicode ranges covered, glyph count, OpenType feature tags (`liga`, `kern`, `smcp`, `onum`, etc.), creation/modification dates (from `head` table).

**Viewer additions:** glyph grid (A-Z/0-9/symbols + full Unicode page navigator), feature list, designer/license panel.

**Priority: HIGH** if not already implemented in the existing font type.

### Standalone HIGH-priority additions (zero/near-zero dep)

| Format | Magic/detect | Metadata | Viewer | Dep | Effort |
|--------|-------------|----------|--------|-----|--------|
| `.torrent` | starts with ASCII `d` | tracker URL(s), file list+sizes, total size, piece size, info hash, creation date, comment | file tree (like zip viewer) | zero (bencode ~30 lines) | XS |
| `.mid/.midi` | `4D 54 68 64` ("MThd") | track count, BPM, time sig, duration, GM instrument list per channel, note count | track list, instrument names, optional piano-roll canvas | zero or `@tonejs/midi` ~50KB | S |
| `.ico/.cur` | `00 00 01/02 00` | size variants (16/32/48/64/128/256px), color depth, type per variant | thumbnail grid of all resolutions | zero (~100 lines) | XS |
| `.clip` (Clip Studio Paint) | SQLite magic | canvas size, layer count, resolution, timestamps, color mode | layer tree (metadata only; pixel data proprietary) | **sql.js already vendored!** | S |
| `.dxf` (AutoCAD) | text `0\nSECTION` | units, extents/bounding box, layer names+count, entity type counts | layer list + basic 2D canvas render | zero or `dxf-parser` MIT | M |
| `.plist` (Apple) | XML or `62 70 6C 69 73 74` | key-value tree | tree view like JSON viewer | DOMParser (XML) or `plist` npm (binary) | S |
| `.reg` (Windows registry) | text `Windows Registry Editor` | key count, value count, root hive list | tree-style key browser | zero | S |
| `.lnk` (Windows shortcut) | `4C 00 00 00 01 14 02 00` | target path, arguments, timestamps, drive type | flat metadata panel | zero (MS-SHLLINK spec) | S |
| `.step/.stp` | text `ISO-10303-21;` | author, org, creation date, part names, schema version | metadata + part list | zero | S |
| `.iso` | `CD001` at offset 32769 | volume name, creation date, file count, total size | file tree listing | zero | M |

### MEDIUM priority (common but more effort or niche)

`.blend` (Blender) — DNA block metadata (object/material names, scene name, render resolution, frame range); binary but documented; no browser lib. `.fbx` (Autodesk FBX ASCII variant) — object/mesh/material/animation names; ASCII variant hand-parseable. `.sf2` (SoundFont 2) — RIFF-based; preset/instrument/sample names. `.mod`/`.xm`/`.it` tracker files — song title, BPM, instrument names, pattern count; niche but beloved demoscene formats. `.pcap`/`.pcapng` — packet count, duration, protocol distribution; niche but security-relevant.

### LOW priority (proprietary / no public spec)
`.afphoto`, `.afdesign`, `.afpub` (Affinity) · `.cdr` (CorelDRAW) · `.fig` (Figma) · `.aep` (After Effects) · `.ptx`/`.ptf` (Pro Tools) · `.logic` (Logic Pro) · `.c4d` (Cinema 4D) · `.ma`/`.mb` (Maya) · `.dwg` (AutoCAD binary) · `.dmg` (macOS disk image) — all proprietary/undocumented binary; skip.

### Shared infrastructure to build once

| Utility | Path | Used by |
|---------|------|---------|
| Gzip-XML decompressor | `docs/core/gzip-xml.js` | `.als`, `.prproj`, `.fcpxml` |
| Geo/map canvas renderer | `docs/core/geoview.js` | `.gpx`, `.kml`, `.kmz` |
| Bencode parser | `docs/core/bencode.js` | `.torrent` |
| RIFF chunk reader | `docs/core/riff.js` | `.sf2`, `.wav` (if needed) |

---

## Comprehensive Format Catalogue (Broad Scan 2026-06-17)

Three parallel research passes covering dev/ops/security/binary, science/medical/data/geo/financial, and creative/game/music/legacy/messaging domains. Security annotations preserved verbatim. Organized by effort + dependency cost. All are self-contained; pick any in any order.

### Domain A: Dev / Ops / Security / Binary

#### Cluster: Package managers (all ZIP or ar-based)

| Format | Magic/detect | Metadata | Dep | Effort |
|--------|-------------|----------|-----|--------|
| `.nupkg`/`.vsix`/`.whl`/`.jar` | ZIP + XML manifest | id, version, deps, author, target framework | jszip (vendored) | XS–S each |
| `.ipa` (iOS app) | ZIP + `Info.plist` | bundle ID, display name, version, min OS | jszip (vendored) + DOMParser | S |
| `.apk` (Android) | ZIP + binary `AndroidManifest.xml` | package name, version, permissions, min SDK | `axml` MIT ~15KB (decodes binary AXML) | S |
| `.deb` (Debian) | `ar` archive magic `!<arch>` | package, version, arch, depends, installed-size, maintainer | zero (ar is simple; `control` file is plain text) | S |
| `.rpm` | `ED AB EE DB` magic | name, version, arch, summary, group, deps — read Lead/Signature/Header sections | zero (RPM header is self-describing TLV) | M |

**Priority: HIGH for .nupkg/.vsix/.jar/.whl/.ipa** — all trivially ZIP+XML; zero new deps beyond jszip. `.apk` adds ~15KB.

#### Cluster: Executables & binary formats

| Format | Magic | Metadata | Security notes | Effort |
|--------|-------|----------|----------------|--------|
| ELF | `7F 45 4C 46` | arch, OS ABI, type (exec/dyn/rel), entry point, section names, needed libs (`.dynamic`), hardening flags (PIE from `e_type=ET_DYN`, RELRO from `PT_GNU_RELRO`, NX from `PT_GNU_STACK` without `PF_X`, FORTIFY from `__stack_chk_fail` in `.dynsym`) | display hardening flags as green/red | M |
| PE/MZ | `4D 5A` | arch, subsystem, imports DLL list, version resource (FileVersion/ProductName/Company/Description), Authenticode present/absent | flag unsigned executables | M |
| Mach-O | `CE FA ED FE` / `CF FA ED FE` / `CA FE BA BE` (fat) | arch slices (fat binary), min OS version, linked libs, code signature present | — | M |
| `.wasm` | `00 61 73 6D` | imports (module/name/kind), exports, custom `producers` section (language/toolchain), memory size | — | S |
| `.class` (Java) | `CA FE BA BE` | major version → Java version (49=J5, 55=J11, 61=J17, 65=J21), class name, interfaces, access flags | — | XS |
| `.pyc` (Python bytecode) | magic varies by version | Python version from magic (e.g. `0x0D0D` = 3.11), source file name, compilation timestamp | — | XS |

#### Cluster: Certificates & keys (SECURITY CRITICAL)

**Rule: NEVER display private key material. If file contains `PRIVATE KEY` header, show a warning instead of content.**

| Format | Detect | Metadata | Dep |
|--------|--------|----------|-----|
| `.pem`/`.crt` | `-----BEGIN` header | Subject, Issuer, SANs, Not Before/After, key algorithm+size, SHA-256 fingerprint via `SubtleCrypto.digest()` | zero |
| `.der` | `30 82` ASN.1 sequence | Same as PEM after DER→PEM conversion | zero |
| `.p12`/`.pfx` | `30 82` | Certificate chain present, encrypted (show info; never decrypt key material) | zero |
| SSH `.pub`/`authorized_keys` | `ssh-rsa`/`ssh-ed25519` prefix | key type, comment (usually user@host), fingerprint if needed | zero |
| `.htpasswd` | text colon-separated | list of users + hash type; **flag weak hashes**: MD5 (`$apr1$`), SHA1 (`{SHA}`), DES (short salt) as insecure | zero |

#### Cluster: Config / Infrastructure

| Format | Detect | Content | Metadata | Security | Effort |
|--------|--------|---------|----------|----------|--------|
| `.env` | starts with `#` or `KEY=` lines | Key=value pairs | key list, count | **Redact values for keys containing SECRET/PASSWORD/TOKEN/KEY/API/PRIVATE** | XS |
| `Dockerfile` | starts with `FROM` | stage list, base images, exposed ports, COPY/ADD/RUN commands, USER | base image, stage count, port list | flag `USER root` | S |
| `docker-compose.yml` | `version:` + `services:` | service list, port mappings, volume mounts, depends_on graph | service count, port list | — | S |
| Kubernetes YAML | `apiVersion:` + `kind:` | kind + name + namespace; Pod: image list, requests/limits; Deployment: replica count, selectors; Service: type+ports | kind, name, namespace | flag `privileged: true`, `hostNetwork: true` | S |
| `.tf` / `.tfstate` | HCL or JSON | `.tfstate`: resource inventory (type + name table), output values, Terraform version | resource count by type | Redact sensitive outputs | S |
| `.sarif` | JSON with `$schema` sarif | Findings table: rule ID, severity, message, file:line; chart.js bar chart by severity | finding count, tool name | — | S |

#### Cluster: Log files

| Format | Detect | Viewer | chart.js | Effort |
|--------|--------|--------|----------|--------|
| Apache/Nginx access log | CLF pattern `IP - - [date] "METHOD` | Request table (method, path, status, size, agent); status distribution pie; top paths/IPs | ✓ (already vendored) | S |
| Apache error log | `[timestamp] [level]` pattern | Level-filtered log table; errors over time | ✓ | S |
| `.evtx` (Windows Event Log) | `45 6C 66 46` magic | Complex BinXML format; surface: event count, date range, log name, top event IDs | none (BinXML is hard; note partial support) | L |
| Redis `.rdb` | `52 45 44 49 53` "REDIS" | AUX fields: save timestamp, Redis version, db count, key counts per db | zero (simple binary walk) | M |
| `.har` (HTTP Archive) | JSON `{"log":{"version":` | Waterfall chart by start time + duration per request; status distribution; total size; slowest requests | ✓ (already vendored) | S |

---

### Domain B: Science / Medical / Data / Geo / Financial

#### Cluster: Tabular / structured data

| Format | Detect | Content | Dep | Effort |
|--------|--------|---------|-----|--------|
| JSONL/NDJSON | text, each line is valid JSON | Key distribution across all lines; detected timestamps → timeline chart; sample rows table (first 1000 lines) | zero + chart.js (vendored) | S |
| `.parquet` | `50 41 52 31` magic ("PAR1") | Schema-only: column names+types from Thrift footer (~100-line VLQ parser, zero dep); row-level via `parquet-wasm` ~1.5MB | zero for schema; parquet-wasm for rows | S schema / M rows |
| Apache Arrow `.arrow`/`.ipc` | `FF FF FF FF` magic | Schema: field names+types; row preview (first N rows) | `apache-arrow` npm or zero for schema-only | S |
| `.feather` (v2 = Arrow IPC) | Arrow magic | Same as Arrow | same | S |
| `.tsv` (tab-separated) | text, tab-delimited | Reuse CSV viewer with `\t` separator | already in CSV viewer | XS |

**Shared utility:** `docs/core/tabular.js` — column/row viewer component with virtual scroll for large datasets; reused by JSONL, Parquet, Arrow, and the existing CSV viewer.

#### Cluster: Bioinformatics

**Priority: HIGH** — zero deps, chart.js already vendored. Each format is human-readable text.

| Format | Detect | Metadata | Viewer | Effort |
|--------|--------|----------|--------|--------|
| FASTA | `>` header lines | Sequence count, total length, GC% per sequence, organism/accession from header | Sequence browser, GC% bar chart | S |
| FASTQ | `@` header + 4-line records | Read count, avg quality, quality distribution histogram, sequencer from header | Quality heatmap (chart.js), read length distribution | S |
| VCF (Variant Call) | `##fileformat=VCFv4` | Sample count, variant count by type (SNP/indel/MNV), chromosome distribution | Variant table, chromosome bar chart | S |
| SAM/BAM | SAM: text `@HD`; BAM: `42 41 4D 01` | Reference sequences, flag distribution, mapq histogram | Alignment table (SAM text); BAM header only (binary) | S SAM / M BAM |
| GFF/GTF | text `##gff-version` or column-tab | Feature type distribution (gene/exon/CDS), chromosome list, source | Feature type pie chart | S |

**Shared utility:** `docs/core/sequence-viewer.js` — nucleotide coloring (A=green, T=red, G=yellow, C=blue); reused by FASTA/FASTQ/VCF.

#### Cluster: Scientific data formats

| Format | Magic/detect | Metadata | Dep | Effort |
|--------|-------------|----------|-----|--------|
| FITS (astronomical) | `53 49 4D 50 4C 45` "SIMPLE" | ASCII keyword=value header: INSTRUME, TELESCOP, DATE-OBS, NAXIS, BITPIX, OBJECT; image data decode if 2D | zero (ASCII header is trivial) | S |
| NetCDF v3 | `43 44 46 01` "CDF\001" | Dimensions, variables, global attributes (Conventions, institution, title, history) | `netcdfjs` MIT ~45KB | S |
| NetCDF v4 / HDF5 | `89 48 44 46` "\211HDF" | Group tree, dataset list with shapes+dtypes, attributes | `h5wasm` ~2MB WASM (opt-in, size gate) | M |
| `.mat` (MATLAB) | `4D 41 54 4C 41 42` text header | Variable names, types (matrix/cell/struct), MATLAB version, creation date | zero (v5 format is documented) | M |
| PDB (protein) | text `ATOM`/`HETATM` records | Chain list, residue count, compound name, source organism, resolution, method; Cα trace canvas reusing meshview.js patterns | zero | M |
| CIF/mmCIF (crystallography) | text `data_` block | Crystal data, space group, unit cell, atom site count | zero | S |

#### Cluster: Geospatial

**Shared utility:** `docs/core/geoview.js` (already planned for GPX/KML/KMZ — extend to cover all below).

| Format | Detect | Content | Dep | Effort |
|--------|--------|---------|-----|--------|
| GeoJSON | JSON with `"type":"FeatureCollection"` | Feature count by geometry type, bbox, property keys, map canvas | zero + geoview.js | S |
| Shapefile `.shp`+`.dbf` | `00 00 27 0A` magic | Shape type, record count, bounding box, DBF field names; map canvas | zero | M |
| GeoTIFF `.tif` | TIFF magic + GeoKeyDirectory tag | CRS (EPSG code), extent, pixel size, band count, nodata value | zero (read TIFF IFD + GeoKey tags) | M |
| mbtiles | SQLite magic | metadata table: name, format, center, bounds, minzoom/maxzoom, description | **sql.js already vendored!** | S |
| GeoPackage `.gpkg` | SQLite magic | gpkg_contents table: table list, geom type, bbox, srs_id | **sql.js already vendored!** | S |
| TopoJSON | JSON with `"type":"Topology"` | Object names, arc count, bbox | zero + geoview.js | S |
| WKT/WKB | text `POINT(`/`LINESTRING(`/`POLYGON(` | Geometry type, coordinate count, bbox | zero | XS |

#### Cluster: Financial

| Format | Detect | Content | Dep | Effort |
|--------|--------|---------|-----|--------|
| OFX/QFX | XML/SGML with `<OFX>` | Institution, account type, statement period, transaction table (date, amount, memo, type) | zero (SGML variant is tag-soup, DOMParser handles it loosely) | S |
| MT940/MT942 | text `:20:` field | Statement date, IBAN, opening/closing balance, transaction table | zero | S |
| camt.053 (ISO 20022) | XML `<Document xmlns=".../camt.053` | IBAN, statement date, entry count, currency, totals | zero (DOMParser) | S |
| QIF | text `!Type:` | Account type, transaction count, date range, category distribution | zero | S |
| `.iif` (QuickBooks) | text `!TRNS` | Transaction table, account list | zero | S |

#### Cluster: Medical

| Format | Magic | Metadata | Dep | Effort |
|--------|-------|----------|-----|--------|
| DICOM `.dcm` | `44 49 43 4D` at offset 128 ("DICM") | Patient ID (anonymize display), modality (CT/MR/US), study date, series description, image rows/cols, pixel spacing, window center/width | `dicom-parser` MIT ~40KB | M |
| HL7 v2 `.hl7` | text `MSH|^~\&|` | Message type, sending app/facility, datetime, patient segment summary | zero | S |
| FHIR JSON `.json` with `resourceType` | JSON `"resourceType":` | Resource type, id, status, subject reference, authored date | zero (already JSON viewer, but FHIR-aware renderer) | S |

---

### Domain C: Creative / Game / Music / Legacy / Messaging

#### Cluster: 3D / CAD / Print

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| `.gcode` | text `G0`/`G1`/`M104` commands | Print time (from `; estimated printing time` comment), filament use, layer count, nozzle/bed temp, slicer name | command count table | zero | XS |
| `.3mf` | ZIP + `[Content_Types].xml` | `thumbnail.png` in ZIP → show preview; `3D/3dmodel.model` XML: unit, object names, material list | jszip (vendored) | XS |
| `.step`/`.stp` | text `ISO-10303-21;` | Author, org, description, schema, entity type counts from DATA section | zero | S |
| KiCad `.kicad_pcb` | text `(kicad_pcb` | Board title, rev, date, copper layers, net count, footprint list | zero (S-expression text) | S |
| KiCad `.kicad_sch` | text `(kicad_sch` | Title block (title, rev, date), component list with values | zero | S |
| `.f3d` (Fusion 360) | ZIP with JSON | design name, creation date, thumbnail | jszip (vendored) | S |

#### Cluster: Games

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| `.wad` (DOOM) | `49 57 41 44`/`50 57 41 44` "IWAD"/"PWAD" | Lump count, lump directory (name+offset+size), entity text lump dump | lump browser | zero | S |
| `.bsp` (Quake/Source) | `1D 00 00 00` (Q1) / `1E 00 00 00` (Q2) / `56 42 53 50` (Source) | Entity lump (plain text key=value pairs) — map title, skybox, music; lump table | entity key-value browser | zero | S |
| Steam `.acf` | text `"AppState"` Valve KeyValues | appid, name, installdir, StateFlags, last_updated, BytesDownloaded/ToDownload | key-value viewer | zero | XS |
| `.mcworld`/`.mcpack` | ZIP + `level.dat` NBT | World name, seed, gamemode, version, last played, player position | **`nbt.js` MIT ~20KB** | S |
| `.rpgmvp`/`.rpgmvmv` | `.png`/`.ogg` with fixed-key XOR | Detect only; flag as "RPG Maker encrypted asset (key not included)" | — | XS |
| NES `.nes` | `4E 45 53 1A` ("NES\x1a") | PRG-ROM size, CHR-ROM size, mapper number, mirroring, battery, trainer | zero | XS |
| SNES `.sfc`/`.smc` | extension + header detection | Title (21 chars at $FFC0), ROM size, SRAM size, country code, checksum | zero | XS |
| Game Boy `.gb`/`.gbc` | offset 0x100 NOP+JP magic | Title (up to 15 chars at 0x134), CGB flag, cartridge type, ROM/RAM size, destination code | zero | XS |
| N64 `.z64`/`.v64`/`.n64` | `80 37 12 40` / byte-swapped variants | Game code, title, CRC1/CRC2, media format | zero | XS |
| `.sav` (various) | extension | File size → ROM guess; hex dump for unrecognized format | zero | XS |

**Shared:** `docs/types/gamerom/` directory with per-extension header decoders sharing common detection helpers.

#### Cluster: Music notation & audio projects

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| MusicXML `.musicxml`/`.xml` | XML `<score-partwise>` or `<score-timewise>` | Title, composer, arranger, parts list, measure count, time/key signatures, tempo markings | Part list + tempo/key table; optional VexFlow/OSMD render | zero (meta); VexFlow ~600KB (render) | S meta / L render |
| MuseScore `.mscz` | ZIP + `*.mscx` XML | Same metadata from embedded XML; thumbnail if present | Same as MusicXML | jszip (vendored) + zero/VexFlow | S meta |
| Guitar Pro `.gpx` (v6+) | ZIP + `score.gpif` XML | Title, artist, album, tempo, tuning, track list, measure count | Track list | jszip (vendored) | S |
| Guitar Pro `.gp` (v7+) | binary header `FICHIER GUITAR PRO v7` | Title, artist, tempo, track count | Track list | zero | S |
| ABC notation `.abc` | text `X:` + `T:` + `M:` | Title, composer, meter, key, tune count | Tune list; optional `abcjs` ~300KB MIT render | zero (meta); abcjs (render) | XS meta |
| `.sf2` (SoundFont 2) | `52 49 46 46` RIFF with `sfbk` | Preset count, instrument count, sample count, bank name; preset list (name+bank+program) | Preset browser | zero (RIFF chunk reader from `docs/core/riff.js`) | S |
| `.sf3` (compressed SoundFont) | RIFF `sfbk` with compressed samples | Same as SF2 | Same | zero | S |
| Hydrogen drumkit `.h2drumkit` | ZIP + `drumkit.xml` | Kit name, author, email, info, instrument list | Instrument list | jszip (vendored) | XS |
| LMMS `.mmp`/`.mmpz` | XML or gzip+XML | Song name, BPM, track list, plugin instrument names | Track list | zero / gzip-xml.js | S |

#### Cluster: Animation & motion graphics

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| `.tgs` (Telegram sticker) | gzip + JSON body with `nm` and `v` fields | Sticker name, version, frame rate, duration, layer count | Still frame preview via `lottie-web` or first-frame canvas render | `lottie-web` ~200KB MIT (opt-in) | S |
| Lottie `.json` | JSON with `"v":` + `"layers":` | Same as TGS (same format, different wrapper) | Same | same | S |
| `.riv` (Rive) | binary Rive format | Artboard names, animation names, state machine names | Rive WASM runtime (opt-in, ~500KB) | `@rive-app/canvas` | M |
| GIF metadata only | `47 49 46 38` (already handled) | Frame count, loop count, palette size — extend existing image type | — | already built | XS |
| `.webp` metadata only | `52 49 46 46` RIFF `WEBP` | Animated: frame count, loop count; VP8X: canvas size, ICC, EXIF present — extend existing image type | — | extend image type | XS |

#### Cluster: Design tools

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| Procreate `.procreate` | ZIP + `thumbnail.jpg`+`composite.jpg` | `document.archive` plist: canvas size, layer count, DPI, color space; thumbnail preview | thumbnail.jpg inline + metadata panel | jszip (vendored) | XS |
| Adobe XD `.xd` | ZIP + `artwork/artwork.content` JSON | Artboard list, component names, font list, canvas size | Artboard list | jszip (vendored) | S |
| Inkscape `.svg` with inkscape namespace | `xmlns:inkscape` attribute | Same as SVG viewer + inkscape-specific: document units, grid settings, guide count, named layers | extend existing SVG type | zero | XS |
| `.afphoto`/`.afdesign` (Affinity) | proprietary binary | No public spec — show format info + file size only | — | — | skip |
| `.fig` (Figma) | ZIP + binary frames | Partially reverse-engineered; show `document.json` if present | jszip (vendored) | zip attempt; flag if fails | S attempt |

#### Cluster: Document / Legacy formats

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| RTF | `7B 5C 72 74 66` "{\rtf" | Title/author/company from `\info` control group; plain text extraction by stripping control words | Plain text preview + metadata panel | zero | S |
| PostScript `.ps` | `25 21 50 53` "%!PS" | DSC comments: `%%Title`, `%%Creator`, `%%CreationDate`, `%%Pages`, `%%BoundingBox`, `%%DocumentFonts` | Comments panel + first page BBox | zero | XS |
| EPS `.eps` | `25 21 50 53 2D 41 64 6F 62 65` "%!PS-Adobe" | Same as PS + EPSF version, CMYK/spot colors from `%%DocumentColors` | Same | zero | XS |
| `.pages`/`.numbers`/`.keynote` | ZIP + `preview.jpg`/`thumbnail.jpg` | `metadata.plist` in ZIP: title, author, mod date, app version; thumbnail preview | thumbnail inline + metadata | jszip (vendored) | XS |
| `.odf`/`.ods`/`.odp`/`.odg` (LibreOffice) | ZIP + `meta.xml` | dc:title, dc:creator, meta:creation-date, meta:document-statistic (word-count, page-count, etc.) | Metadata panel | jszip (vendored) | XS |
| `.wpd` (WordPerfect) | `FF 57 50 43` magic | Version, creation date, author from document summary | format ID + metadata fields | zero | S |
| XPS/OXPS | ZIP + `[ContentTypes].xml` | Page count from `FixedDocumentSequence.fdseq`, fonts, images | Page count + metadata | jszip (vendored) | S |

#### Cluster: Messaging & communication exports

**Shared utility:** `docs/core/chat-stats.js` — message count, participant list, date range extractor; reused across all chat export formats.

| Format | Detect | Metadata | Viewer | Dep | Effort |
|--------|--------|----------|--------|-----|--------|
| WhatsApp export `.txt` | text `[MM/DD/YY, HH:MM:SS]` pattern | Participant list, message count, date range, media reference count | Participant message distribution (chart.js), timeline | zero + chart.js | S |
| Telegram export `result.json` | JSON `{"type":"personal_chat"/"group"` | Chat name, participants, message count by type, date range, media stats | Same | zero + chart.js | S |
| Discord export `messages.json` | JSON `{"meta":{"channelId":` | Guild+channel, message count, top authors, date range, attachment count | Same | zero + chart.js | S |
| Facebook `message_1.json` | JSON `{"participants":` | Thread participants, message count, date range, media count | Same | zero + chart.js | S |
| Slack export `channels.json`+`*.json` | JSON array with `ts` + `user` fields | Workspace channels, message count, date range, top users | Same | zero + chart.js | S |
| IRC log `.log` | text `[time] <nick>` pattern | Participants, message count, date range, topic changes | Same | zero | XS |
| `.eml` (email) | text `From:` + `To:` + `Subject:` + `Date:` | From, To, CC, Subject, Date, attachment count (MIME parts), priority | Header panel + plain-text body preview | zero (MIME parser ~50 lines) | S |
| `.mbox` | text `From ` (Unix mbox separator) | Message count, date range, sender distribution | Same as .eml per message | zero | M |

#### Cluster: Crash dumps & diagnostics

| Format | Detect | Metadata | Notes | Effort |
|--------|--------|----------|-------|--------|
| Windows `.dmp`/`.mdmp` | `4D 44 4D 50 93 A7` "MDMP" magic | Stream directory: exception type (NTSTATUS lookup for ~100 common codes), exception address, OS version, arch, module list (first 10), thread count | Binary format — DataView reads | M |
| Linux core dump | ELF magic + `e_type=ET_CORE` | Signal number, faulting instruction pointer, register dump summary, mapped regions | ELF reader (share with ELF type above) | S (shares ELF reader) |
| `.crash` (Apple) | text `Process:` + `OS Version:` + `Exception Type:` | Process name, exception type (EXC_BAD_ACCESS/etc.), crash thread, top stack frames | Plain text parse | XS |
| `.dmp` (Firefox/Chrome crash) | same MDMP or different format | Same as Windows minidump or JSON-based | detect by header | M |

---

### Cross-domain Shared Infrastructure

Complete list of shared utilities — build once, used by many:

| Utility | Path | Used by | Effort |
|---------|------|---------|--------|
| Gzip-XML decompressor | `docs/core/gzip-xml.js` | `.als`, `.prproj`, `.fcpxml`, `.drp`, LMMS | XS |
| Geo/map canvas renderer | `docs/core/geoview.js` | `.gpx`, `.kml`, `.kmz`, GeoJSON, TopoJSON, WKT | S |
| Bencode parser | `docs/core/bencode.js` | `.torrent` | XS |
| RIFF chunk reader | `docs/core/riff.js` | `.sf2`, `.sf3`, `.wav` extended | XS |
| Tabular column/row viewer | `docs/core/tabular.js` | JSONL, Parquet, Arrow, CSV (extend) | S |
| Nucleotide sequence viewer | `docs/core/sequence-viewer.js` | FASTA, FASTQ, VCF | S |
| Chat statistics extractor | `docs/core/chat-stats.js` | WhatsApp, Telegram, Discord, Facebook, Slack, IRC | S |
| Game ROM header helpers | `docs/types/gamerom/header.js` | NES, SNES, GB/GBC, N64, GBA | S |

---

## Build Priority & Sequencing

### Original 6 features

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| A | Help icon Easter egg | XS (1h) | Pure JS, one file touched |
| B | Easter egg sample files | XS (2h) | File creation only |
| C | ASCII image-to-text | M (2-3 days) | 7 new files, no new deps |
| D | Audio waveform | M (1-2 days) | Web Audio API, no new deps |
| E | Folder drag reorg | M (1-2 days) | 3 files modified |
| F MVP | ORA + PSD viewer | M-L (2-3 days) | Vendor ag-psd |
| F P2 | XCF + .kra | L (2-3 days) | .kra is ~10 lines different from ORA |

**Suggested order:** A → B → C → D (parallel with C) → E → F MVP → F P2

### Next-wave format additions (pick any, each is self-contained)

| Format | Effort | Dep | Synergy |
|--------|--------|-----|---------|
| `.torrent` | XS | zero | bencode.js utility reusable |
| `.ico`/`.cur` | XS | zero | — |
| `.gpx` | S | zero + chart.js (vendored) | geoview.js reusable for KML/KMZ |
| `.kml`/`.kmz` | S | zero + jszip (vendored) | shares geoview.js |
| `.sketch` | S | jszip (vendored) | — |
| `.als` | S | zero | gzip-xml.js reusable for prproj |
| `.prproj` | S | zero | shares gzip-xml.js |
| `.clip` | S | sql.js (vendored) | no new dep at all |
| `.mid`/`.midi` | S | zero or @tonejs/midi | — |
| `.plist` | S | zero (XML) / `plist` (binary) | — |
| `.dxf` | M | zero or dxf-parser | — |
| `.lnk` / `.reg` | S each | zero | — |
| Font deep metadata | S | opentype.js MIT ~100KB | extends existing font type |

---

## Verification

- `./scripts/check.sh` GREEN after each increment (movediff + smoke, ZERO off-origin)
- `node scripts/gen-asset-manifest.mjs` re-run whenever `docs/` files change
- Per-increment smoke tests added for new detectors (ASCII art detect, layered detect)
- Manual browser test: image ASCII toggle, ANSI `.ans` file, layer tree visibility toggle, folder drag-drop, PSD/ORA composite render
