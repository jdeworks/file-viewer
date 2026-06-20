# Editor Roadmap — GCode (3D Printer / CNC Toolpath)

## Current state

Structured viewer: parses slicer signature, estimated print time, filament usage, layer count, layer height, nozzle/bed temperatures, and bounding box from comments and move commands. Renders a metadata card and a syntax-coloured preview of the first 200 lines (G-codes in blue, M-codes in orange, comments in grey). Returns `{ bodyHtml }`.

## Viewer enhancements (no write-back needed)

- **3D toolpath visualisation** — parse all `G0`/`G1` moves into a typed array of XYZ coordinates per layer; render on a Three.js `<canvas>` with an orbit camera; colour lines by layer or by extrusion vs travel — L (Three.js ~600 KB min, needs vendoring; or use a lighter `@three/core` subset)
- **Layer scrubbing** — once the 3D canvas is live, add a range slider that shows layers 0–N; dragging reveals the build layer by layer; combine with a "play" animation — M (depends on 3D canvas above)
- **Print time estimate from moves** — when no slicer comment gives a time estimate, compute one client-side: sum all move distances, divide by feed rate, add acceleration approximations; display as a range — M
- **Temperature graph** — parse all `M104`/`M109` (nozzle) and `M140`/`M190` (bed) set-point lines; plot a step chart of temperature over line number using Chart.js (already vendored) — S
- **Full-file G/M code highlight** — current renderer only shows 200 lines; extend to virtualised scroll (use a fixed-height `<div>` with `transform: translateY` trick) so all lines are coloured without DOM cost — M
- **Layer statistics table** — per-layer: start line, end line, Z height, move count, estimated extrusion; shown in a sortable table — M

## In-browser editing (download-on-save)

- **Monaco GCode editor** — register a Monaco token provider for G-codes, M-codes, parameter letters (X/Y/Z/E/F/S), comments (`;`), and line numbers (`N`); mount in editor mode; Ctrl+S downloads — M (Monaco already vendored; custom token provider ~1 KB)
- **Find and replace temperatures** — toolbar form: "Replace all nozzle set-points with ___°C" and "Replace bed set-point with ___°C"; scans M104/M109/M140/M190 lines — S
- **Speed multiplier** — toolbar: apply a percentage multiplier to all `F` (feed rate) parameters across the file; useful for test prints — S
- **Strip travel moves** — checkbox option: remove all `G0` (non-extrusion) moves from the downloaded file (for analysing extrusion-only paths) — S
- **Insert filament change** — inject `M600` (filament change) at the nearest layer boundary to a user-specified Z height — M

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and 3D canvas refresh — S
- **Send to printer** — companion connects to OctoPrint/Klipper REST API; uploads the GCode file and optionally starts the print — L

## Shared toolbar / modular note

Three.js is the critical dependency for the toolpath canvas — at ~600 KB it needs to be lazy-loaded behind the "Show 3D" button. Chart.js is already vendored and needs no additional setup for the temperature graph. The Monaco GCode token provider and the parser that extracts move coordinates can share the same `gcode-parse.js` module used by the current renderer to avoid duplicating the line-by-line scan logic.
