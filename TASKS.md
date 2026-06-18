# File Viewer — Remaining Task List

All tasks are browser-only unless stated otherwise. The app lives in `docs/`, deployed to GitHub Pages.

## Per-Increment Contract (MUST follow for every task)

1. Implement the task
2. Run `./scripts/check.sh` — must be GREEN (ZERO off-origin requests, movediff passes, smoke passes)
3. Run `node scripts/gen-asset-manifest.mjs` if any file under `docs/` was added or removed
4. Commit and push to `dev` with trailer `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

**LOC hard cap: 500 lines per file** (advisory at 300, hard at 500 — split into sibling files if exceeded).

## Security Rules (never break)

- Zero off-origin at runtime — vendor every lib into `docs/vendor/`; runtime never fetches from CDN
- `.pem`/certs → NEVER display private key material; show warning if file contains `PRIVATE KEY` header
- `.env` → redact values whose keys contain SECRET/PASSWORD/TOKEN/KEY/API/PRIVATE (reveal toggle only, no copy)
- JWT → decode header+payload only, never verify; never show raw signature
- Companion saves → ONLY the single changed file, never the whole folder tree
- Companion CORS locked to `localhost:*` + Pages origin; all file endpoints validate path is within watched folder
- `diff: false` for `.env` files — intentional
- Download button is NEVER removed; Save button is additive alongside it

## Plugin Registry Pattern

Every new file type needs exactly 5 files in `docs/types/<group>/<id>/`:
- `detect.js` — `export function detect(intake)` returning 0..1 confidence. Use `intake.isBinary` (not imported function).
- `renderer.js` — `export async function render(intake, ctx)` returning `{ bodyHtml, hadUnsafe: false }` for iframe types or `{ parentNode, revoke() {} }` for canvas/media types.
- `metadata.js` — `export async function extractMetadata(intake)` returning `{ fields: [{label, value}] }`.
- `index.js` — type descriptor. **CRITICAL**: `settingsUrl: new URL('./settings.default.json', import.meta.url)` MUST be present.
- `settings.default.json` — `{}` if no settings needed.

Then add ONE import + ONE entry to `docs/core/registry.js`.

---

## TASK 1 — Companion Release Build CI

**Status:** Already implemented — release workflow and companion download panel are present.
**Effort:** M (~2h)  
**Files:**
- Create `.github/workflows/companion-build.yml`
- Create download panel in `docs/core/app.js` (or a separate `companion-download.js`)

### What to build

A GitHub Actions workflow that triggers ONLY on `v*` tags and builds the companion binary for 3 platforms.

```yaml
# .github/workflows/companion-build.yml
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-14
            target: aarch64-apple-darwin
            ext: ''
          - os: macos-13
            target: x86_64-apple-darwin
            ext: ''
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            ext: '.exe'
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            ext: ''
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: ${{ matrix.target }} }
      - uses: Swatinem/rust-cache@v2
        with: { workspaces: companion/server }
      - run: cargo build --release --target ${{ matrix.target }}
        working-directory: companion/server
      - name: Compute SHA-256
        run: shasum -a 256 target/${{ matrix.target }}/release/file-viewer-companion${{ matrix.ext }}
        working-directory: companion/server
      - uses: actions/upload-artifact@v4
        with:
          name: companion-${{ matrix.target }}
          path: companion/server/target/${{ matrix.target }}/release/file-viewer-companion${{ matrix.ext }}
  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - # download all artifacts, create GitHub Release with binaries + SHA-256 checksums
```

### Download panel in viewer

Add a "Download Companion" section to the companion settings panel in `docs/core/app.js` inside `renderCompanionSettings()`. It must show:

1. What the companion does (one sentence)
2. Link to `companion/` source code at `https://github.com/jdeworks/file-viewer/tree/dev/companion`
3. SHA-256 checksum of the binary (link to the GitHub Release page, not inline — user looks it up before downloading)
4. The download link to the GitHub Releases page AFTER the source link and checksum note

**The source link and checksum note must appear BEFORE the download link — this is a hard requirement.**

### Verification
- CI workflow file exists at `.github/workflows/companion-build.yml`
- Workflow triggers on `v*` tags only (NOT on every push)
- Download panel shows source → checksum note → download in that order

---

## TASK 2 — LOC Cap Violations (split 4 over-limit files)

**Status:** Already implemented — listed hard-cap files are now under 500 LOC and split helpers exist.
**Effort:** M (~3h)  
**Files over hard cap (500 lines):**
- `docs/core/app.js` — 1126 lines (split off companion UI + session tree logic)
- `docs/types/text/pem/renderer.js` — 694 lines (split ASN.1 parser into `asn1.js`)
- `docs/types/text/kubeconfig/renderer.js` — 597 lines (split table renderers into `kubeconfig-tables.js`)
- `docs/assets/app.css` — 556 lines (split companion styles into `companion.css`)

### How to split

For each file:
1. Identify a logical chunk (one cohesive concern, usually the longest section)
2. Move it to a sibling file in the same directory
3. Import it back from the original file
4. Verify the app still works (check.sh GREEN)
5. Commit each split separately

For `app.js` specifically — good split candidates:
- Companion UI code (lines ~520–938, everything in the `/* Companion */` block) → `docs/core/companion-ui.js`
- Session tree logic (`updateSessionTree`, `createNewFile`, `onTreeFileDrop`) → `docs/core/session-tree.js`

---

## TASK 3 — Feature A: Help Icon Easter Egg

**Status:** Already implemented — verified in `docs/core/app.js`.
**Effort:** XS (~30 min)

Looking at `docs/core/app.js` around line 507 and 1011 — the easter egg IS already built:
```js
let metaBtnClicks = 0;
const META_BTN_MSGS = ['Stop it.', 'That hurts!', 'Why are you doing this?', 'Leave me alone!'];
// and in init():
$('metaBtn').addEventListener('click', () => {
  metaBtnClicks++;
  if (metaBtnClicks <= 4) openDrawer('metaDrawer', buildMetadata);
  else if (metaBtnClicks <= 8) showMetaBtnEgg(META_BTN_MSGS[metaBtnClicks - 5]);
  else showMetaBtnEgg('Ok, FINE. Take this and leave me alone.', () => { state.games?.unlock(); $('gamesBtn').hidden = false; state.games?.open(); });
});
```

**Verify this is working** by reading the current `app.js` around those lines. If it's already there, this task is DONE — just mark it off. If the `showMetaBtnEgg` function or the counter logic is missing, implement it per the spec.

---

## TASK 4 — Feature B: Easter Egg Sample Files

**Status:** Already implemented — `docs/examples/secret.txt` exists and is indexed.
**Effort:** XS (~30 min)  
**Files to create:**
- `docs/examples/secret.txt` — in-character note from "The Archivist" (metagame lore)
- Update `docs/examples/index.json` to include the new file

### What to write in secret.txt

A short note (200-300 words) from "The Archivist" — a fictional entity from the metagame lore. Tone: cryptic, slightly bureaucratic, as if filing a report about the viewer itself. Reference "Stage 10" and "the awakening protocol" subtly. Must feel like a found document, not a readme.

### After adding files
- Run `node scripts/gen-asset-manifest.mjs`
- Verify smoke still passes

---

## TASK 5 — Feature E: Virtual Folder Drag-to-Reorder

**Status:** Already implemented — virtual folder moves, indicators, export, and smoke coverage are present.
**Effort:** M (~2h)  
**Files to modify:**
- `docs/core/folder.js` — add `state.folderMoves: Map<originalPath, newPath>`, expose `recordMove(src, dest)`
- `docs/core/filetree.js` — add `dragover`/`drop` handlers on folder rows; highlight drop target; moved indicator
- `docs/core/folder-export.js` — apply `folderMoves` when building zip; append `_moves.sh`

### Design

- `state.folderMoves` maps `originalPath → newPath` (in-memory only, like `state.folderEdits`)
- Dragging a file row over another folder row highlights it as a drop target (CSS class)
- On drop: call `recordMove(src, destFolder)`. If the file also has an in-memory edit in `state.folderEdits`, update the edit's key to follow the new path.
- No circular moves (folder into itself or subtree) — validate before accepting drop
- No clobbering (destination path already exists) — show a toast instead
- One-time dismissible banner after first move: "Moves are in-memory only. Download the folder to save changes or run `_moves.sh`." (Same pattern as the existing in-memory edit disclaimer.)
- Tree rows get a small `→ dest` indicator when moved
- `folder-export.js` places files at their resolved paths in the zip; appends `_moves.sh` with `mv "orig" "dest"` per move

---

## TASK 6 — Feature C: ASCII Art / ANSI Viewer

**Status:** Already implemented — ASCII/ANSI plugin, registry entry, sample, and smoke coverage are present.
**Effort:** M (~3h)  
**Files to create:**
- `docs/types/text/asciiart/detect.js`
- `docs/types/text/asciiart/renderer.js`
- `docs/types/text/asciiart/index.js`
- `docs/types/text/asciiart/settings.default.json`
- `docs/types/text/asciiart/metadata.js`

**Files to modify:**
- `docs/core/registry.js` — add `asciiartType` (before `codeType`)

### Detection
- `.ans`/`.asc` extension → 0.90
- `SAUCE00` magic (last bytes of file) → 0.95
- >30% lines wider than 80 chars AND density of block/box chars (`█▓▒░═╔╗║`) → up to 0.75
- `intake.isBinary` → return 0 immediately

### Renderer (iframe, `bodyHtml`)
- Render in a `<pre>` tag with monospace font, dark background (terminal feel)
- Parse ANSI escape sequences (`\x1b[...m`): SGR codes for colors (8-color, 256-color, truecolor), bold, reset
  - 256-color: codes 16–231 = 6×6×6 RGB cube, 232–255 = grayscale ramp (derive algorithmically)
  - Emit `<span style="color:...; background-color:...; font-weight:...">` per run
- Size guard: truncate at 500K chars with a notice
- Include a "Copy" button for the raw text
- If `SAUCE00` record present: show title/author/group in a header above the pre

### Metadata
- Dimensions (cols × rows) from max line length + line count
- SAUCE record fields if present (title, author, group, date, width/height)
- ANSI color sequences present (boolean + count of `\x1b[` sequences)
- Line count, character count

---

## TASK 7 — Feature D: Audio Waveform

**Status:** Already implemented — waveform module, renderer integration, and smoke coverage are present.
**Effort:** M (~2h)  
**Files to create:**
- `docs/types/media/waveform.js`

**Files to modify:**
- `docs/types/media/renderer.js` — add waveform panel + expand toggle

### Waveform module (`waveform.js`)

```js
// mountWaveform(container, file) → { destroy }
// - AudioContext.decodeAudioData() on first 60s (slice the File to avoid OOM)
// - Extract channel data → downsample to N points matching container clientWidth
// - Draw amplitude bars on a <canvas> (bar per point, centered at midline)
// - Playback position line: rAF loop reading audioEl.currentTime, vertical line at (t/duration)*width
// - Returns destroy() to cancel rAF and close AudioContext
```

### Integration in renderer.js

- Add a collapsed "Waveform" panel below the `<audio>` element (not above — don't push controls down)
- Expand button: "▶ Show waveform" / "▼ Hide waveform"
- On expand: call `mountWaveform(panel, intake.file || new File([intake.bytes], intake.filename))`
- On collapse: call `waveformHandle.destroy()`
- Mobile: panel hidden by default; button still shown

---

## TASK 8 — URL / Query String Inspector

**Status:** Already implemented — full URL inspector, metadata, sample, and smoke coverage are present.
**Effort:** S (~2h)

Check `docs/types/text/url/` — if the renderer is already a full URL inspector, this task is DONE. If it's just a stub, implement the full viewer:

### Detection (update `docs/types/text/url/detect.js` if needed)
- Content (trimmed) starts with `https?://` → 0.90
- Content starts with `ftp://`, `file://`, `data:`, `blob:`, `mailto:`, `tel:`, `ssh:`, `git://` → 0.85
- Bare query string `/^\?[^=\n]+=[^&\n]/` → 0.80
- Multiple URLs (≥3 lines matching `^https?://`) → 0.75
- `.url`/`.webloc` extension → 0.70
- `intake.isBinary` → return 0

### Renderer (`docs/types/text/url/renderer.js`)
Use native `URL` API (zero dep). Return `bodyHtml` for iframe.

Layout for a single URL:
- Raw URL at top in a code block
- Table: scheme, host, port (default if standard), path, path segments
- Query parameters table (param → decoded value, with "URL-decoded" note if encoded)
- Fragment if present
- Special cases:
  - `data:image/*` → render image inline
  - `data:text/*` → show decoded text
  - JWT value in query param (matches `/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/`) → decode header+payload as JSON, show inline. **Never send off-origin.**
  - OAuth params (`code`, `state`, `error`, `access_token`) → highlight row with badge
  - URL-encoded JSON value (`decodeURIComponent(v)` starts with `{`/`[`) → offer expand to pretty-print
- Multiple URLs (one per line): table listing all, click to expand each
- `mailto:` → show to/subject/cc/bcc/body as table

---

## TASK 9 — New Format: `.gpx` Track Viewer

**Status:** Already implemented — GPX detection, canvas map/profile, metadata, exports, sample, and smoke coverage are present.
**Effort:** S (~2h, zero new deps — uses existing chart.js)  
**Files to create:** `docs/types/geo/` (or add to existing `docs/types/geo/` if GPX detection is separate from GeoJSON)

Check if `docs/types/geo/` already handles GPX. If the geo type's renderer is GeoJSON-only, add GPX detection + a GPX-specific renderer section.

### Detection
- Extension `.gpx` → 0.90
- XML root element `<gpx` → 0.95
- `intake.isBinary` → 0

### Renderer (iframe, `bodyHtml`)
Parse with `DOMParser`. Extract:
- All `<trkpt lat lon>` elements → polyline on a canvas Mercator projection (simple equirectangular is fine)
- Elevation profile: `<ele>` values over `<time>` or distance → chart.js line chart
- Summary stats: total distance (Haversine between consecutive points), elevation gain/loss, duration (first/last `<time>`), point count, waypoint count

Display:
- Map canvas (equirectangular, auto-scaled to bounding box, track drawn as polyline)
- Elevation profile chart (chart.js, already vendored at `docs/vendor/chartjs/`)
- Stats table below

### Metadata
- Track name (`<name>` from `<trk>`), creator attribute
- Bounding box (min/max lat/lon)
- Total distance, elevation gain/loss, duration, point count

---

## TASK 10 — New Format: `.als` Ableton Live Set

**Status:** Already implemented — ALS detection, gzip/XML renderer, metadata, sample, and smoke coverage are present.
**Effort:** S (~1.5h, zero new deps — `DecompressionStream` is native)  
**Files to create:** `docs/types/text/als/` (treat as text sub-type since content is XML)

### Detection
- Extension `.als` → 0.90
- First 2 bytes `1F 8B` (gzip magic) AND extension `.als` → 0.97
- `intake.isBinary` is true (gzipped) but detect should still return score for this type

### Renderer (iframe, `bodyHtml`)
1. Decompress: `new DecompressionStream('gzip')` → pipe `intake.bytes` through → collect → `new TextDecoder().decode()`
2. Parse decompressed XML with `DOMParser`
3. Extract from `<Ableton>` root:
   - BPM: `<Tempo><Manual Value="120"/>`
   - Time signature: `<TimeSignature><Numerator>` + `<Denominator>`
   - Track count (audio/MIDI/return/master): count `<AudioTrack>`, `<MidiTrack>`, `<ReturnTrack>`
   - Track names: `<UserName Value="...">` on each track
   - Clip names from `<MidiClip Name="...">` and `<AudioClip Name="...">`
   - Plugin instruments: `<PluginDevice>` → `<Name Value="...">`
4. Display: BPM + time sig header, track list with type badges, clip count per track, plugin list

### Metadata
- BPM, time signature, track count by type, total clip count, plugin list

---

## TASK 11 — New Format: `.har` HTTP Archive Viewer

**Status:** Already implemented — HAR detection, waterfall/table renderer, metadata, sample, and smoke coverage are present.
**Effort:** S (~2h, uses existing chart.js)  
**Files to create:** `docs/types/text/har/`

### Detection
- JSON with top-level key `log` containing `version` and `entries` → 0.92
- Extension `.har` → 0.80

### Renderer (iframe, `bodyHtml`)
Parse as JSON. Display:
- Summary: total requests, total transferred size, total duration
- Waterfall chart (chart.js horizontal bar chart): each request is a bar at its start time, width = duration; color by status code (2xx=green, 3xx=blue, 4xx=orange, 5xx=red)
- Request table: method, URL (truncated), status, MIME type, size, duration — sortable by clicking headers (plain JS sort)
- Filter buttons: All / XHR / JS / CSS / Images / Other

### Metadata
- Total entries, date (from first `startedDateTime`), creator name+version, page count

---

## TASK 12 — New Format: Game ROM Headers (NES / SNES / GB)

**Status:** Already implemented — ROM header parsers, renderer, metadata, registry entry, and smoke coverage are present.
**Effort:** S (~2h, zero deps)  
**Files to create:**
- `docs/types/binary/gamerom/detect.js`
- `docs/types/binary/gamerom/renderer.js`
- `docs/types/binary/gamerom/index.js`
- `docs/types/binary/gamerom/metadata.js`
- `docs/types/binary/gamerom/settings.default.json`
- `docs/types/binary/gamerom/headers.js` — per-format header parsers

### Detection
- NES `.nes`: magic `4E 45 53 1A` ("NES\x1a") at offset 0 → 0.99
- SNES `.sfc`/`.smc`: extension + try to read header at `0x7FC0` (LoROM) or `0xFFC0` (HiROM) → 0.90
- Game Boy `.gb`/`.gbc`: magic `CE ED 66 66` at offset 0x104 (Nintendo logo) → 0.99; extension `.gb`/`.gbc` → 0.80
- N64 `.z64`: magic `80 37 12 40` → 0.99; `.v64` (byte-swapped) → 0.95; `.n64` (little-endian) → 0.90

### Renderer (iframe, `bodyHtml`)
Show a metadata card per format:

**NES:** PRG-ROM banks (×16KB), CHR-ROM banks (×8KB), mapper number (show name for common ones: 0=NROM, 1=MMC1, 4=MMC3), mirroring (horizontal/vertical), battery-backed SRAM

**SNES:** Title (21 chars at `$7FC0` or `$FFC0`), ROM type (LoROM/HiROM), ROM size, SRAM size, country/region code, video mode (NTSC/PAL from country byte)

**Game Boy:** Title (up to 15 chars at `0x134`), CGB flag (`0x143`: `80`=CGB compatible, `C0`=CGB only), SGB flag, cartridge type (MBC0/MBC1/MBC2/MBC3/MBC5 + RAM/Battery/Timer), ROM size, RAM size, destination (Japanese/Non-Japanese)

**N64:** Title (20 chars at `0x20`), game code (4 chars at `0x3B`), country code, CRC1/CRC2

---

## TASK 13 — New Format: `.clip` Clip Studio Paint (SQLite)

**Status:** Already implemented — Clip Studio detection, SQLite-backed structure renderer, metadata, sample, and smoke coverage are present.
**Effort:** S (~1.5h, sql.js already vendored at `docs/vendor/sql.js/`)  
**Files to create:** `docs/types/binary/clip/`

### Detection
- SQLite magic `53 51 4C 69 74 65 20 66 6F 72 6D 61 74 20 33 00` at offset 0 AND extension `.clip` → 0.97
- Extension `.clip` alone → 0.70

### Renderer (parentNode mode — needs sql.js which loads a blob worker)
1. Load sql.js: `await import('/vendor/sql.js/sql-wasm.js')` (check if already loaded)
2. `const SQL = await initSqlJs({ locateFile: f => '/vendor/sql.js/' + f })`
3. `const db = new SQL.Database(intake.bytes)`
4. Query metadata table (Clip Studio uses a proprietary schema — query `sqlite_master` first to find table names)
5. Try: `SELECT * FROM sqlite_master WHERE type='table'` → list table names
6. Common tables: `CanvasPreview` (has thumbnail BLOB), `Layer` (has layer info), `Canvas` (has dimensions)
7. Show: canvas dimensions, layer count, creation/modification date if available
8. If `CanvasPreview` table has a JPEG/PNG blob: show it as a thumbnail
9. Show a "partial support" banner: "Layer pixel data is proprietary — showing structure only."

---

## TASK 14 — New Format: `.mid`/`.midi` MIDI File Viewer

**Status:** Not started  
**Effort:** S (~2h, zero deps)  
**Files to create:** `docs/types/binary/midi/`

### Detection
- Magic `4D 54 68 64` ("MThd") at offset 0 → 0.99
- Extension `.mid`/`.midi` → 0.80

### Renderer (iframe, `bodyHtml`)
Parse the binary MIDI format (no dep — the format is simple):
1. Header chunk: format (0/1/2), track count, ticks per quarter note (PPQN)
2. For each track chunk: parse event sequence
   - Meta events: `FF 51` (tempo → BPM = 60,000,000/µs), `FF 58` (time signature), `FF 03` (track name), `FF 04` (instrument name)
   - Channel events: `9n` (note on), `8n` (note off), `Cn` (program change → GM instrument name lookup)
3. Display:
   - Format (Type 0/1/2), track count, PPQN
   - BPM (from tempo meta event; if multiple: show range)
   - Time signature
   - Duration estimate: sum note-on events × ticks, convert with PPQN + tempo
   - Track list: name, channel, GM instrument (program change → look up GM instrument name table, ~128 entries as a const array)
   - Note count, unique pitches

GM instrument table: standard 128-name array (General MIDI Level 1 spec), no dep needed.

---

## TASK 15 — New Format: `.3mf` 3D Manufacturing Format

**Status:** Not started  
**Effort:** XS (~1h, jszip already vendored)  
**Files to create:** `docs/types/3d/3mf/`

### Detection
- ZIP magic (`50 4B 03 04`) AND extension `.3mf` → 0.97
- `[Content_Types].xml` inside ZIP contains `model/3mf` → 0.99

### Renderer (iframe, `bodyHtml`)
1. Load jszip, open ZIP
2. Extract `thumbnail.png` (if present at standard location) → show as `<img>` via blob URL... wait, iframe can't use blob URLs. Instead, read the thumbnail bytes → `data:image/png;base64,` + base64 encode → inline `<img>` tag.
3. Parse `3D/3dmodel.model` XML with `DOMParser`:
   - Unit from `<model unit="...">`
   - Objects: `<object>` elements → name + type (model/support/other)
   - Materials: `<basematerials>` → color list
   - Metadata: `<metadata name="Title">`, `<metadata name="Designer">`, etc.
4. Display: thumbnail (if present), model name, designer, unit, object list with types, material swatches

---

## TASK 16 — Sample Library Audit + Reader UX Fixes

**Status:** Not started  
**Effort:** L (~1-2 days)  
**Files likely touched:**
- `docs/examples/index.json`
- `docs/examples/`
- `docs/core/examples.js`
- `docs/assets/app.css`
- `tests/smoke.mjs` and/or `tests/areas/*.mjs`
- ebook renderers under `docs/types/ebook/`
- broken sample renderers as needed (`docs/types/binary/msg/`, `docs/types/ebook/djvu/`)

### Sample library golden rule

Every registered file type must have at least one dedicated sample file, and every known/enhanced view must have a dedicated sample too. If a type is intentionally unsupported or partial, the sample must still open and show a clear friendly partial-support message.

Add smoke coverage that opens every sample in `docs/examples/index.json` and fails on preview crashes, console errors, missing renderers, or off-origin requests.

### Better sample taxonomy

Replace the single `category` model with multi-category/group metadata while preserving backward compatibility for existing UI code during the migration.

Examples:
- `sample.png` belongs to `Image` and `Media`
- office/image hybrid formats can appear in both their file family and their render surface
- secret/metagame artifacts can appear in `Secrets` plus their real type category

Add filtering in the examples browser:
- text search by label/file/type
- category chips that support multi-category membership
- filter by editable / preview-only / binary / enhanced / partial support
- keep the examples panel scroll contained inside the inner app area

### More samples

Add simple dedicated samples for common programming languages and enhanced known-file renderers, including at minimum:
- JavaScript, TypeScript, Python, Ruby, Go, Rust, Java, C, C++, C#, shell, SQL, HTML, CSS
- each known enhancer: `package.json`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, `Cargo.toml`, `requirements.txt`, `go.mod`, `composer.json`, `Gemfile`, `CODEOWNERS`, `.editorconfig`, `pom.xml`, `build.gradle`, `Pipfile`, OpenAPI

Expand image coverage:
- JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO
- modern formats already supported or planned: HEIC/HEIF, AVIF, JXL if support exists or is added
- design/layered formats: PSD/PSB, XCF, KRA, Sketch, Procreate, Clip Studio where supported or partial-supported

### Layout bug

Fix the sample file view so opening/browsing samples does not scroll the whole page and push the left sidebar away. Only the intended inner content region should scroll; the topbar and file tree should remain anchored.

### Known broken samples / required notes

Add a tracking note and smoke coverage for all file types because sample crashes have slipped through. Known failures to address:
- `sample.msg`: currently fails with `Preview failed: Failed to execute 'decode' on 'TextDecoder': parameter 1 is not of type 'ArrayBuffer'.`
- `sample.djvu`: currently fails with `Failed to load DjVu library` / `DjVu missing after load`

Fix those renderers or change them to a clear partial-support message that passes smoke.

### Ebook reader UX

Improve all ebook readers (`epub`, `fb2`, `mobi`, `lrf`, comic where relevant) toward common ebook-reader behavior:
- font family, font size, line height, margins, and theme controls
- full-screen reading mode, especially on phones
- mobile layout that uses the full viewport cleanly
- slide-in settings pane for reader options
- persistent per-book reader settings and position
- make `sample.mobi` longer and investigate why it can start with blue selected/highlighted text

---

## TASK 17 — Diff Pane + Compare Workflow Redesign

**Status:** Not started  
**Effort:** L (~1-2 days)  
**Files likely touched:**
- `docs/core/layout.js`
- `docs/core/compare.js`
- `docs/core/sidebyside.js`
- `docs/core/filetree.js`
- `docs/core/movediff.js`
- `docs/core/movediff-view.js`
- `docs/assets/app.css`
- `tests/areas/diff.mjs`
- `tests/areas/interactions.mjs`
- `tests/areas/tree-drag.mjs`

### Pane drag regression

Fix the pane resize drag interaction when the current view is a raw/preview split and the raw side is a Monaco diff editor. Monaco-to-Monaco diff resizing still works, but Monaco-to-preview resizing can stop responding to pointer movement.

Add smoke coverage for:
- normal Monaco editor + preview resize
- Monaco diff editor + preview resize
- Monaco diff editor + Monaco diff editor resize if still supported

### Move-aware diff quality

Improve move-aware diff classification for mixed edits. Current example:

Original:
```csv
name,role,city,commits
Ada Lovelace,Engineer,London,1843
Alan Turing,Researcher,Manchester,1936
Grace Hopper,Engineer,New York,1959
Katherine Johnson,Mathematician,Hampton,1961
Margaret Hamilton,Engineer,Boston,1969
```

Current:
```csv
name,role,city,commits
Ada Lovelace,Engineer,London,1843
Margaret Hamilton,Engineer,Boston,1969
Alan Turing,Researcher,Manchester,1936
Grace Hopper,Engineer,New York,1959
Katherine Johnson,Mathematician,Hampton,1961
hell
```

This should report one moved block plus one added line, not only `1 modified`.

Add unit coverage for move plus unrelated insertion, move plus edit, adjacent line moves, and low-similarity additions that should not be classified as moves.

### Compare workflow

The "Compare with another file" action should not force a file picker when comparable files are already present in the folder/session sidebar.

Design target:
- entering compare mode opens an empty compare target state
- dragging a sidebar file onto the compare target starts the diff
- a picker remains available as a fallback, not the only path
- comparing two files should show at most two panes total
- users can choose whether the two panes are raw diff, self diff, or two previews
- diff/compare mode should not show raw+preview for both files at once

---

## TASK 18 — Metadata Extraction Research + Coverage Audit

**Status:** Not started  
**Effort:** L (~1-2 days research, follow-up implementation tasks likely)  
**Files likely touched:**
- `docs/core/meta-drawer.js`
- metadata modules under `docs/types/**/metadata.js`
- `docs/examples/index.json`
- `tests/areas/*.mjs`
- `TASKS.md` follow-up tasks

### Goal

Audit every registered file type, every known/enhanced renderer, and every missing/planned type to identify useful metadata that can be extracted locally with zero off-origin requests.

This is a research/planning task first. Produce concrete follow-up implementation tasks grouped by file family and risk.

### Required scope

Include general metadata:
- file size, extension, MIME, detected type/confidence
- binary/text status, encoding, BOM, line ending style, trailing newline
- line count, blank/comment line count where applicable
- hash/fingerprint options if useful and local-only

Include content-specific metadata examples:
- CSV/TSV: delimiter, quote style, header presence, line break, row/column counts, inconsistent rows
- plain text/Markdown/logs: lines, words, characters, headings, timestamps/severity where applicable
- code: lines of code, comments, blanks, language, functions/classes, imports/dependencies, complexity metrics
- JSON/YAML/TOML/XML/INI: node counts, depth, top-level keys/sections, schema-ish hints, duplicate or suspicious keys
- images/media: dimensions, color mode, EXIF/ICC, duration/bitrate/codecs, orientation, alpha/animation
- archives/folders: entry counts, compressed/uncompressed size, encrypted entries, top-level layout
- documents/ebooks/office: pages/slides/sheets/chapters, title/author, embedded media/fonts, document dates where available
- binary/executable/game formats: magic, architecture/version/header fields, safety-relevant flags when feasible

### Coverage requirements

For each type:
- list current metadata fields
- list useful missing metadata
- note whether it requires parsing bytes, rendering, vendored libraries, or a new parser
- note privacy/security concerns, especially secrets, certs, email, archives, and companion saves
- identify samples needed to validate metadata extraction

Add smoke/unit coverage targets for metadata extraction so regressions are caught.

---

## TASK 19 — New File Autofocus + Readable Text Preview

**Status:** Not started  
**Effort:** S/M (~1-2h)  
**Files likely touched:**
- `docs/core/session-tree.js`
- `docs/core/rawpane.js`
- `docs/core/app.js`
- `docs/types/text/raw/`
- `docs/assets/preview-chrome.css`
- `tests/areas/interactions.mjs`

### New file autofocus

When creating a new file, focus the editor automatically and place the cursor inside the empty document so the user can start typing immediately after confirming the filename.

Add smoke coverage that creates a new file, types without first clicking the editor, and verifies the typed text is in the document.

### Plain text readable preview

Plain `.txt` / raw text files should have a readable preview in addition to the editable raw/code editor.

Design target:
- preserve raw editor and Download button
- render text in a preview-friendly `<pre>` or prose layout with comfortable line length, wrapping, and theme support
- keep whitespace meaningful but make long text easier to read than Monaco
- include basic metadata in the preview when useful only if it does not duplicate the metadata drawer excessively
- ensure binary/hex fallback is unchanged

Add smoke coverage for opening `sample.txt` and verifying a preview is available and readable.

---

## TASK 20 — 2048 Score Screen Layering Bug

**Status:** Not started  
**Effort:** S (~30-60m)  
**Files likely touched:**
- `docs/games/2048/g2048.js`
- `docs/assets/games.css`
- `tests/areas/games.mjs`

### Bug

The 2048 score/end screen can render behind the score board, making the result partially hidden or visually broken.

Fix the stacking/layout so modal or score-summary UI appears above the board and controls on desktop and mobile.

Add smoke coverage that launches 2048, forces or plays to a score/end state if possible, and verifies the score screen is visible above the board without overlap.

---

## TASK 21 — Bit Foundry Stage Navigation + Unlock Flow

**Status:** Not started  
**Effort:** M (~2-4h)  
**Files likely touched:**
- `docs/games/metagame/stage1.js`
- `docs/games/metagame/stages/stage1/`
- `docs/games/metagame/s1state.js`
- `docs/games/metagame/s1bell.js`
- `docs/assets/games.css`
- `tests/areas/games.mjs`
- stage 1 unit tests if present

### Stage navigation

Bit Foundry should not show all stages from the beginning, and stages should not be presented as a row of ordinary buttons.

Design target:
- only unlocked/current stages are visible
- the current stage name becomes the page/section heading
- locked future stages are hidden or shown as subtle progress, not clickable primary controls
- the interaction model should feel like progressing through stages, not manually selecting every stage upfront

### Bell placement

The Bell is currently a button at the bottom of the screen. Move it to the top chrome next to "Back to arcade" so it is visible without competing with core click/upgrade actions.

### Unlock semantics

Stage/tab unlocks should use current score/bits reaching the threshold, not bits accumulated over time. Specifically, the 150-bit unlock should trigger when the score reaches 150 bits.

Add tests for unlock threshold behavior:
- score below 150 does not unlock
- score reaches 150 unlocks the next stage/tab
- spending or time accumulation does not falsely unlock if current score has not reached the threshold, unless explicitly intended and documented

### Clickability regression

After switching to a newly unlocked tab/stage, clicks stopped working. The player must still be able to click the main earning surface to get bits after a stage transition.

Add smoke coverage that unlocks the next stage, switches/advances, clicks the earning surface again, and verifies bits increase.

---

## Future / Backlog (do not start until Tasks 1-15 are done)

These need fixtures, heavy deps, or deeper research:

- **Feature F MVP** — ORA + PSD layered viewer (needs `ag-psd` vendor bundle ~910KB)
- **Feature C full** — Image-to-ASCII converter (`ascii-converter.js`, canvas sampling) + screensaver Easter egg
- **`.msg` Outlook email** — OLE2/CFB format (cfb.js vendored but needs smoke fixture)
- **M4B audiobook chapters** — MP4 atom parser, needs fixture with `chpl` atom
- **AZW3/KF8 full decode** — large parser, detection already shipped
- **ELF/PE/Mach-O** — executable metadata + security hardening flags (M effort)
- **`.gpx` map canvas** — equirectangular canvas Mercator projection
- **`.kml`/`.kmz`** — shares geo canvas
- **Bioinformatics** — FASTA, FASTQ, VCF (chart.js vendored, zero new deps)
- **Financial formats** — OFX/QFX, MT940, camt.053 (DOMParser, zero deps)
- **Chat export viewers** — WhatsApp/Telegram/Discord (chart.js vendored)
- **MIDI piano roll** — visual canvas render (extend Task 14)
- **`.wad`/`.bsp` game maps** — entity browser
