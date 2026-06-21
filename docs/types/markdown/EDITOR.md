# Editor Roadmap — Markdown

## Current state

renderer.js uses markdown-it (html:true, linkify, typographer) with source-map injection
(`data-fv-src` attributes for magic-selector support) and DOMPurify sanitization. Output is wrapped
in `<article class="markdown-body">` and returned as `bodyHtml` for the sandboxed iframe.

wysiwyg.js mounts **TipTap v3** (ProseMirror engine, MIT) as a true rich-text WYSIWYG with a
faithful markdown round-trip: the source markdown is parsed into a ProseMirror document
(`setContent(text, { contentType: 'markdown' })`), edited visually, and serialized back to
CommonMark on every change (`editor.getMarkdown()`). The bundle is vendored at build time into
`docs/vendor/tiptap/tiptap.esm.js` (zero runtime CDN); rebuild with
`cd build/tiptap && npm install && node build.mjs`. Extensions: StarterKit (paragraph, heading,
bold, italic, strike, code, codeBlock, blockquote, bullet/ordered lists, link, hr, hard-break) +
TableKit (GFM tables) + the `@tiptap/markdown` parse/serialize extension.

Our own toolbar (wired in the shell, `core/rawpane-markdown.js`) dispatches **native TipTap
commands** in WYSIWYG mode (`runWysiwygCommand(action)` → `toggleBold/Italic/Strike/Code/
CodeBlock/Blockquote/BulletList/OrderedList/Heading`) and inserts generated markdown for tables
(`insertWysiwygMarkdown(md)`). In Monaco mode the same toolbar uses the pure text helpers in
edit-actions.js: heading, bold/italic/code/blockquote/lists/strikethrough/table insert, table
sort (numeric-aware), and URL-paste-to-link conversion. The `markdownEditor` setting controls
whether the file opens in Monaco or the TipTap WYSIWYG by default.

## Viewer enhancements (no write-back needed)

- **Mermaid diagram rendering** — Add mermaid.min.js as a vendor lib; after each render, find
  `<code class="language-mermaid">` blocks in the iframe and replace with rendered SVGs via a
  postMessage or pre-render step before sanitization. — M — mermaid.js (~500 KB; lazy-load on
  demand)
- **Math rendering (KaTeX)** — Run KaTeX on `$…$` / `$$…$$` spans before DOMPurify; inject
  KaTeX CSS. Alternatively use markdown-it-katex plugin. — M — KaTeX (~300 KB; lazy)
- **Syntax highlighting in fenced blocks** — Integrate highlight.js or Shiki with markdown-it
  (markdown-it-highlighter plugin); run server-side-style highlighting before sanitization so
  colour spans survive DOMPurify. — M — highlight.js (~100 KB; lazy)
- **Reading time / word count** — Parse plain text from the rendered HTML and display word count,
  estimated reading time, and heading outline in a collapsible info panel. — S
- **Heading outline / TOC panel** — Extract headings (h1–h6) from the rendered DOM, display as a
  clickable tree in a sidebar; clicking scrolls the preview iframe (postMessage). — M
- **Anchor links on headings** — Post-process rendered headings to add `id` attributes and a
  copy-link button (clipboard API). — S
- **Footnote support** — Add markdown-it-footnote plugin; footnotes render at the bottom of the
  article with back-links. — S — markdown-it-footnote
- **Task-list checkboxes** — Add markdown-it-task-lists plugin; `- [ ] item` renders a checkbox.
  Checkbox state is read-only in viewer mode. — S — markdown-it-task-lists

## In-browser editing (download-on-save)

> NOTE (2026-06-21): the WYSIWYG editor is now **TipTap v3 (ProseMirror)** — EasyMDE/CodeMirror has
> been removed. The feature ideas below are still valid, but any "EasyMDE"/"CodeMirror addon"
> implementation hints are superseded: implement these as TipTap extensions / ProseMirror plugins
> (or against Monaco for the source-mode path) instead.

- **Table editor UI** — When the cursor is inside a Markdown table (detected via CodeMirror token),
  open a spreadsheet-style grid overlay (editable cells); on dismiss, serialize back to pipe-table
  syntax via the existing `markdownTable` / `formatRow` helpers. — M — custom grid widget
- **Frontmatter YAML form** — Detect a leading `---…---` block; parse with js-yaml (already
  vendored for YAML type); render as a collapsible key-value form above the editor; changes write
  back into the YAML block on the fly. — M — js-yaml (already in vendor if YAML type is present)
- **Mermaid live edit** — When the cursor is inside a ` ```mermaid ``` ` fence, show a side pane
  with the live diagram; editing the source in CodeMirror updates the diagram in real time. — M —
  mermaid.js
- **Image drag-and-drop** — Accept image drops on the editor; convert to data: URL or base64 and
  insert `![alt](data:…)` at caret. For large images show a size warning. — S
- **Paste URL → link** — Already implemented in `markdownLinkForPastedUrl`; needs to be wired in
  the EasyMDE keydown/paste handler in wysiwyg.js. — S — (logic exists, needs wiring)
- **Slash commands** — Type `/` at the start of a line in EasyMDE to pop an autocomplete menu of
  block inserts (heading, code block, table, blockquote, mermaid, etc.); select with arrows/Enter.
  Implemented as a CodeMirror hint addon. — M
- **Slash commands / bubble menu (TipTap)** — Now that the WYSIWYG is ProseMirror-based, add a
  TipTap slash-command and selection bubble-menu extension for block inserts and inline formatting
  without the toolbar. — M — TipTap extensions (already vendored engine)
- **Task-list checkbox editing** — In EasyMDE (CodeMirror), toggle `[ ]` ↔ `[x]` on the source
  line corresponding to a clicked checkbox in the preview pane (via EasyMDE's preview click
  passthrough). — S
- **Find & replace** — Already available in Monaco mode; add CodeMirror's built-in search addon
  for EasyMDE mode (Ctrl+H). — S — CodeMirror Search addon

## Full write-back editing (companion required)

- **Auto-save on edit** — Debounced write-back via companion endpoint on every change; show a
  "saved" indicator. — M
- **Wiki-link / internal link resolution** — `[[PageName]]` links resolve to other files in the
  same directory; companion lists the directory and the viewer navigates to the matched file. — L
- **Git blame per line** — Companion runs `git blame` on the file; hover a line in Monaco to see
  last-commit author and message. — L

## Shared toolbar / modular note

The toolbar lives in the shell and dispatches to wysiwyg.js (`runWysiwygCommand`,
`insertWysiwygMarkdown`) in WYSIWYG mode and edit-actions.js in Monaco mode. Keep this split:
edit-actions.js stays pure (no DOM, no editor coupling) so it's fully testable and reusable. The
Mermaid and KaTeX enhancements
should be lazy-loaded and run as a post-render pass in renderer.js before returning `bodyHtml`;
they must not bloat the initial load.
