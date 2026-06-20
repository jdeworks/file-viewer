# Editor Roadmap — ASCII Art

## Current state
ANSI/ASCII art renderer with a full SGR escape-sequence parser (16 standard colors, 256-color palette, 24-bit RGB, bold, dim). Handles SAUCE metadata (title, author, group). Truncates at 500 KB. Dark background by default (respects `.fv-dark`). Includes a Copy button. Renders as `bodyHtml` in the sandboxed iframe.

## Viewer enhancements (no write-back needed)
- **Grid overlay** — a toggle button that draws a faint 1px CSS grid over the `<pre>` at character-cell boundaries (ch × line-height units). Helps with alignment when inspecting art. — S
- **Column width readout** — detect the longest line and display the column count in the header alongside author/title from SAUCE. — S
- **Font selector** — `<select>` with classic CP437 / Topaz / VGA bitmap fonts (woff2, vendorable <50 KB each) so ANSI art renders with the intended glyph shapes instead of Courier New. — M
- **Zoom controls** — `+` / `-` buttons (or Ctrl+scroll) that scale the `<pre>` font-size; keeps proportions without layout reflow. — S
- **Color scheme toggle** — switch between the renderer's dark default, a light mode, and a "true CP437" palette (match classic DOS ANSI colors exactly). — S
- **Export as PNG** — use `html2canvas` (already vendored at `docs/vendor/html2canvas/`) to rasterise the `<pre>` and download as PNG. — M — html2canvas

## In-browser editing (download-on-save)
- **Monaco editor with monospace enforcement** — switch to `parentNode` mode; mount Monaco (docs/vendor/monaco/) configured with `fontFamily: "Courier New"`, `fontLigatures: false`, `lineNumbers: "on"`. Monaco's proportional-font check should be suppressed (set `editor.detectIndentation: false`). — M — Monaco (docs/vendor/monaco/)
- **Character palette** — a sidebar grid of frequently used box-drawing characters (U+2500–U+257F), block elements (U+2580–U+259F), and Braille patterns; clicking inserts at the cursor position via Monaco's `executeEdits` API. — M
- **ANSI color insertion** — a color toolbar that inserts `\x1b[<n>m` codes at the cursor; preview swatches show the 16 standard and 256-color palette. — M
- **ascii-converter.js integration** — link to `docs/types/image/ascii-converter.js` (the image-to-ASCII converter already present in the image type); allow dropping an image to convert it and load the result into the Monaco editor for further tweaking. — M — ascii-converter.js
- **Download as .ans / .txt** — serialize the Monaco model value and offer as both `.ans` (with SAUCE record appended) and plain `.txt`. — S

## Full write-back editing (companion required)
- **Save edited art back to source file** — write the modified text (with ANSI escapes) to the original `.ans` / `.txt` path via the companion write-back API.
- **Auto-save on idle** — companion-backed debounced save so edits persist without an explicit download step.

## Shared toolbar / modular note
The renderer currently runs in `bodyHtml` (iframe) mode. Monaco editing requires `parentNode` mode — this is the primary architectural change. The ANSI SGR parser (`parseAnsi`) already lives in `renderer.js`; for the editor it can be reused as a live preview renderer below the Monaco instance (split-pane: editor top, rendered preview bottom). The ascii-converter.js link should use a dynamic import rather than a bundler import, keeping the module optional.
