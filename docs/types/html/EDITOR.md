# Editor Roadmap — HTML

## Current state

renderer.js sanitizes HTML via DOMPurify and returns `bodyHtml` for the sandboxed iframe.
`FORBID_TAGS`/`FORBID_ATTR` strip every DOMPurify-default-allowed tag/attribute that can trigger
an eager off-origin network request we don't control (`<script>`/`<iframe>`/`<object>`/`<embed>`/
`<video>`/`<audio>`/`<source>`/`<track>`/`<form>`/`<meta>`/`<base>`/`<link>`, `background=`/
`poster=`). `<style>`/`style=""`/`<img src>` stay allowed (DOMPurify doesn't parse CSS, so it
can't strip a `url()` itself) but `blankOffOriginImgSrc()`/`stripOffOriginCssUrls()` post-process
the sanitized string to neutralize any remaining off-origin `src`/`url()`/`@import` reference —
only same-origin-relative or `data:` images/backgrounds render. An opt-in `allowScripts` mode
passes the raw document as `srcdoc` with `sandbox="allow-scripts"` (no allow-same-origin), so
scripts run and off-origin references are no longer blocked — that mode is an explicit,
user-confirmed trust decision (WP07). `htmlInjectHead` setting lets users inject extra `<script>`
/ `<link>` tags before `</head>` (this is the local user's own setting, not attacker-controlled
file content, so it is out of scope for the sanitizer).

wysiwyg-html.js provides a `contenteditable` div editor (`HtmlWysiwygEditor`): extracts `<body>`
content, puts it in a `contenteditable`, reconstructs the full document on `getValue()`. Supports
bold/italic/underline/undo/redo via `document.execCommand` and keyboard shortcuts. The shell wires
the WYSIWYG toggle and download-on-save.

htmldiff.js provides a structural DOM diff view as an alternative to raw text diff.

## Viewer enhancements (no write-back needed)

- **Source / preview split view** — Side-by-side pane with Monaco (source) on left, sandboxed
  iframe (preview) on right; source edits debounce-update the preview. Currently the raw/preview
  toggle is global; a dedicated split layout without leaving the viewer would be a quality-of-life
  win. — M — Monaco (already used project-wide)
- **CSS inspector: hover highlight** — In the preview iframe (script-enabled mode only, since
  allow-same-origin is off in safe mode), inject a `<script>` via `htmlInjectHead` that adds a
  mousemove listener coloring hovered elements; display tag + class in a fixed HUD. — M — injected
  script trick (works in allowScripts mode)
- **Computed styles panel** — In allowScripts mode, intercept a right-click in the iframe via a
  postMessage bridge; display `getComputedStyle()` results for the clicked element in a sidebar. — L
  — postMessage bridge (parent ↔ iframe sandboxed with allow-scripts)
- **Live CSS editor pane** — A Monaco or textarea pane emitting CSS; injected as a `<style>` tag
  into the preview iframe via `htmlInjectHead` (static) or via iframe contentDocument (allowScripts
  mode only). — M
- **Responsive preview breakpoints** — Toolbar buttons to resize the preview iframe to common
  breakpoints (375 / 768 / 1280 px); wraps iframe in a scrollable container and sets explicit
  width. — S
- **Script execution console** — In allowScripts mode, relay `console.log/warn/error` from the
  iframe to a collapsible pane in the parent via a `<script>` injected through `htmlInjectHead`. — M
- **Print / PDF export** — Trigger `window.print()` inside the iframe (allowScripts mode) or open
  the sanitized HTML in a new tab for native browser print-to-PDF. — S

## In-browser editing (download-on-save)

- **WYSIWYG toolbar** — The existing `HtmlWysiwygEditor` uses `execCommand`; add a visible toolbar
  row (bold, italic, underline, strikethrough, headings H1–H3, lists, link, image insert, table
  insert). `execCommand` is deprecated but universally supported; keep as-is until replaced. — S
  — document.execCommand (already used)
- **Replace execCommand with TipTap** — TipTap (ProseMirror-based) is the modern drop-in for
  `contenteditable` rich editing: proper schema, undo stack, extensions for tables/code blocks.
  Replaces wysiwyg-html.js. 100 KB min+gz bundled; can be self-hosted. — L — TipTap 2.x (MIT)
- **Source / WYSIWYG sync** — Two-pane with Monaco on the source side and the WYSIWYG on the other;
  edits in either pane sync to the other via a debounced serializer (innerHTML → source for WYSIWYG
  → source; source → innerHTML for source → WYSIWYG). Desync on invalid HTML is acceptable — show
  a warning badge. — L
- **Image insert / drag-drop** — In WYSIWYG mode, accept image drops; read via FileReader as
  data: URL and insert an `<img>` at caret. No upload needed. — M — FileReader API
- **Inline link editor** — Click an `<a>` in WYSIWYG mode to pop a small inline editor with URL +
  open-in-new-tab checkbox; confirm replaces the href. — S
- **Table insert / resize** — Insert a configurable-size table via a grid picker in the toolbar;
  click-drag column edges to resize (CSS `col` widths). — M — TipTap TableExtension (if TipTap
  adopted) or custom execCommand insertHTML
- **Find & replace** — Ctrl+H modal searching the raw HTML source (Monaco's built-in); or a custom
  overlay doing regex replace on the raw text with live preview. — S — Monaco built-in
- **Format / prettify** — Run Prettier (WASM build) or js-beautify on the source and replace
  Monaco content. Button in the toolbar. — M — js-beautify (~45 KB) or prettier/standalone

## Full write-back editing (companion required)

- **Auto-save on edit** — Debounced write-back to the original file path via companion endpoint
  whenever the editor value changes (or on explicit save). — M
- **Template variables** — Pre-process HTML with a simple `{{key}}` substitution driven by a YAML
  sidebar form; companion writes the filled template to a separate output file. — L

## Shared toolbar / modular note

`HtmlWysiwygEditor` in wysiwyg-html.js is already a class; keep it that way. If TipTap is adopted,
swap the implementation inside that class without touching the shell or renderer. The CSS inspector
and live-CSS pane are independent of the edit path and can land before WYSIWYG improvements. The
postMessage bridge for computed styles should be a tiny shared utility (`core/iframe-bridge.js`) so
the HTML and Markdown renderers can both use it for script-enabled iframes.
