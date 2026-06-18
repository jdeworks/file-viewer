# File Viewer Long-Run Requirements

## Operating Rules

- Work in small, committed increments on `dev`.
- After each increment, run `./scripts/check.sh`; it must pass before commit.
- If files under `docs/` are added or removed, keep `docs/asset-manifest.json` current.
- Push every completed increment.
- Use subagents for research/audit work where useful.

## Sample Library

- Every registered file type needs a meaningful dedicated sample.
- Every enhanced or known-file renderer needs a dedicated sample.
- Samples should contain realistic, useful data rather than mechanical placeholders.
- Prefer CC0, public-domain, or clearly free examples when importing from the internet.
- Track provenance for externally sourced samples where practical.
- Add more programming samples using Monaco language support as the guide, including Python, JavaScript, TypeScript, JSX/TSX, Ruby, Go, Rust, Java, C, C++, C#, shell, SQL, HTML, CSS, and other available languages.
- Replace placeholder-like Flash, ROM, image, and binary samples with valid examples that exercise the renderer meaningfully.
- Metagame samples must not be visible before the metagame is unlocked.
- Keep sample browsing useful: folder/category browsing and "show all" stay; text filtering stays; duplicate category chip filtering should be removed.
- Add tests that open every indexed sample and catch preview crashes, bad detections, off-origin requests, and dark-mode readability regressions where feasible.
- Build a real-world sample corpus from public/free sources, using `https://www.fileexamples.com/` extensively where licensing permits, plus other CC0/public-domain/free sources. Keep collected-but-unvetted files outside the shipped examples until they are validated, then promote useful files into `docs/examples/` with provenance metadata.
- Treat `.example-files-internet/` as a local incoming triage folder for user-found examples. Analyze failures from that folder, including real-world GLB/glTF files that report errors such as "GLB has no JSON chunk", and convert parser gaps into focused tests before fixing them.
- Show a small link below the built-in examples that points users to `https://www.fileexamples.com/` for more samples, while clearly explaining that executable, VM, and other active formats are inspected or emulated only where supported and never run directly.
- Create and maintain a File Examples compatibility matrix covering every format/category they offer. Track support level, preview depth, metadata depth, edit capability, export capability, security limitations, sample source, known parser gaps, and test coverage. Use this matrix as a primary source for prioritizing parser and renderer improvements.
- Where possible, file-type metadata should link to the specific File Examples format guide, such as `https://www.fileexamples.com/formats/json`, alongside the existing Wikipedia/spec/project reference link rather than replacing it.
- Use the File Examples tools and edge-case libraries as an implementation checklist. Relevant tool parity includes validators/formatters for JSON/XML/CSV/YAML, sample generation, MIME/encoding/magic-byte inspection, checksums, Base64/data URI handling, image conversion, JSON<->CSV conversion, text encoding repair, Markdown preview/export, color/regex helpers, and file diffing. Non-viewer workflows such as upload simulation should be skipped unless they map to local-only diagnostics.
- Use the File Examples security demos as an internal security checklist rather than a public link target. Implement local defenses and warnings for MIME spoofing, double extensions, Unicode direction-control filename tricks, scriptable SVG, CSV formula injection, privacy-sensitive EXIF metadata, magic-byte mismatches, and suspicious active/executable content. These should improve detection, metadata warnings, sanitization, and safe export behavior without linking users away for security guidance.
- Add edge-case fixtures and recovery paths for common malformed files. Start with JSON comments/trailing commas/single quotes/unquoted keys/NaN/Infinity by detecting JSONC/JSON5-like input, warning that the parser switched modes, and rendering with the best local reader; also cover mixed or inconsistent CSV delimiters, bad XML encodings/tags, broken PDF xrefs, truncated PNG/JPEG/ZIP files, BOM issues, and encoding mismatch/mojibake cases.

## Preview And Interaction UX

- Switching between files that remain available in the sidebar should retain in-memory edits instead of warning that they will be lost. The sidebar row should show an unsaved marker such as an asterisk plus a distinct filename color until the file is downloaded or saved.
- Unsaved-work warnings should still appear when closing the page, opening an unrelated top-level file/folder, or otherwise leaving the retained edit context.
- Add a local working-document cache for easily serialized editable text files, independent of the Companion, saving automatically about every five minutes. It should use browser-local storage only, consider compression so large text files can fit, target roughly 20 MB text where feasible, and warn clearly when a file is too large or caching is disabled.
- Fix split-view drag locking, including with `sample.ans` and iframe previews.
- Continue redesigning compare/diff interactions so users can compare with files already in the folder/sidebar without being forced into a file picker.
- Improve move-aware diff so moves plus unrelated insertions are reported correctly.
- Review each file type for useful interactions such as sorting, filtering, folding, toggling, zooming, searching, exporting, or safe online checks.
- JSON preview should render clean disclosure controls, avoid broken escaped glyphs, and support useful key sorting.
- Sorting should be considered for structured/table-like types such as JSON, CSV, XLSX, text lines, and similar formats.
- Preview re-renders, especially Markdown edits in dark mode, should not briefly flash white during iframe refresh.
- Preview width should be configurable in settings, default to an A4-page-like reading width, and constrain wide Markdown/table content instead of letting it expand indefinitely.
- Preview sizing should offer quick modes in addition to numeric width: available width, unrestricted/no width restriction, A4/page width, and phone width.
- Investigate and restore previously available PDF/image editing workflows where they regressed. PDF editing should support additive and destructive page operations such as adding blank pages, importing/merging other PDFs, importing images as pages, deleting or cutting pages, rotating pages, and saving/exporting the edited PDF. Image/media editing should likewise regain the dedicated edit view where applicable, including drawing text or annotations onto images and saving through the Companion with an overwrite warning.
- PWA install suppression should avoid noisy `beforeinstallprompt.preventDefault()` console messages where possible while preserving the no-install promise.
- Metadata should include a file-type description/link explaining what the format is used for.
- Sample tiles should expose a short hover description of what the sample demonstrates.
- Password-protected formats such as PDF, SQLite, ZIP, and similar containers should have password-protected samples and unlock flows where the user can provide the password to view contents.
- Sensitive file types that may contain protected data, such as `.env` and SSH config, should open in rendered-view mode by default and hide or blur values until explicitly revealed.
- `.env` preview needs a dark/light theme pass and should be visually centered in the preview area. Metadata should include useful redaction-safe counts such as total variables and sensitive variables.
- Perform a full light/dark theme audit across every renderer and enhanced view. MSG/email, SSH, env, archive, code-like previews, media controls, and iframe previews should all remain readable in both modes; add regression tests where feasible.
- Investigate and suppress avoidable sandbox console noise such as `Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.` Renderers that intentionally need scripts should use the parent-node path or a trusted script-enabled opt-in; inert previews should not emit scripts.
- Archives such as ZIP should be able to become a lazy folder in the sidebar when explicitly opened or clicked. Opening should happen off the main thread where possible, ask for a password when needed, show a spinner while reading, and expand only the next level by default instead of eagerly rendering the full tree.

## Metadata

- Perform a thorough metadata audit for every registered type and every enhanced known-file view.
- Organize metadata into digestible sections instead of one long flat list:
  - always-visible basics: what the file type is used for, format info link, name, detected type, and size;
  - collapsed advanced file facts: MIME, modified time, extension, content kind, loaded bytes, BOM, and similar technical facts;
  - collapsed generic text facts: line endings, line break count, logical lines, blank lines, longest line, trailing newline, and similar text-shape facts;
  - open type-specific facts: the most useful facts for the detected format, with deeper details nested or collapsible where needed.
- Deduplicate metadata across generic and type-specific extractors so repeated fields such as `Lines` are shown only once in the best section.
- Code files should show the concrete language or format, such as Python, JavaScript, TypeScript, C, C++, C#, Go, Rust, Ruby, Shell, SQL, HTML, or CSS, instead of only the generic `Code` label.
- Include generic metadata candidates: size, extension, MIME, detected type/confidence, binary/text status, encoding, BOM, line endings, line count, trailing newline, and local hashes/fingerprints where useful.
- Add content-specific metadata where useful:
  - Text/code: lines, words, characters, blank/comment lines, language, functions/classes, imports/dependencies, complexity.
  - CSV/XLSX: delimiter, quote style, line breaks, rows/columns/sheets, header presence, inconsistent rows, sortable columns.
  - JSON/YAML/TOML/XML/INI: keys, depth, node counts, schema-ish hints, duplicate or suspicious keys.
  - SSH config: host count, distinct host patterns, identity files, users, ports, proxy/jump settings, forwarded keys, security-relevant options.
  - Requirements/package files: package counts, pinned/unpinned versions, extras, markers, index URLs, and safe optional online issue/update checks with explicit warning.
  - Docker Compose: services, images, builds, ports, networks, volumes, relative bind mounts versus Docker-managed volumes, environment/secrets, and potential issue hints.
  - Images/media/documents/ebooks/archives/binaries: dimensions, pages, duration, codecs, EXIF/ICC, compression, encryption, headers, architecture/version fields, and safety-relevant flags.
- For optional internet checks, clearly show what data would be sent, require explicit action, and handle offline mode.
- Metadata must respect existing security rules for secrets, PEM/private keys, JWT signatures, `.env`, archives, email, and companion saves.

## Enhanced Views

- Review each enhanced renderer one by one for better summaries, explanations, sorting, links, warnings, and optional safe interactions.
- `requirements.txt` metadata should include package counts and dependency facts in addition to the existing easter egg.
- Docker Compose enhanced view should link image references where appropriate, explain `build: .`, distinguish bind mounts from named volumes, and surface potential issues.
- Claude Desktop config should be treated as more than generic MCP config when it contains additional Claude-specific configuration.
- SSH config dark-mode readability must be fixed.

## Editor And Formatting

- Monaco should use the concrete detected language for highlighting, and the UI should make that language visible and adjustable for code-like files.
- Add editor controls for switching the Monaco language mode for the current file and saving that preference for the type when appropriate.
- Formatting should use the best available local formatter for the language or a safe built-in fallback. Python should align with Black-style formatting where feasible, and other languages should use Monaco/browser-local formatting where available.
- When a file clearly uses formatting that differs from the current editor settings, such as Python using four-space indents while the type default is two spaces, respect the file formatting automatically and show a toast explaining the temporary override.
- Settings group open/closed state should be remembered within the session when switching file types and returning, without requiring persistence across reloads.
- Settings should support both overlay and docked modes so users can tune editor/preview settings while seeing the file.
- Raw/split editor views should offer common edit tools for editable text formats, especially non-code text, with specialized actions per format. Markdown should get an insert/format menu with selection-aware bold/italic/heading actions, table insertion with configurable rows and columns, selection-target transforms, and context/right-click extensions such as sorting a selected Markdown table by a chosen column.
- Research preview-side or WYSIWYG editing for formats where rendered editing can safely map back to source. Start with Markdown (`.md`, `.markdown`, `.mdown`, `.mkd`) for table cell highlighting/editing that maps to the raw side, then evaluate HTML (`.html`, `.htm`), rich text/document formats (`.rtf`, `.docx`, `.odt` where export is feasible), configuration/key-value text (`.env`, `.ini`, `.properties`, `.ssh/config`, `kubeconfig`, `.rdp`, `.reg`), notebook/structured text (`.ipynb`, `.json`, `.yaml`, `.yml`, `.toml`, `.xml`), and table formats (`.csv`, `.tsv`, `.xlsx`) for direct manipulation patterns.
- Markdown paste handling should match common editor behavior: when pasting a URL into `.md`/`.markdown` with no selection, paste the URL as plain text; when text is selected, insert `[selected text](pasted-url)` and preserve undo/selection behavior.

## Ebooks And Long Reading

- E-book readers should align with common reader behavior: font, size, line height, margins, theme, phone-friendly fullscreen, and settings access.
- MOBI samples should be long enough to exercise reading behavior and should not start with accidental selected/highlighted-looking text.

## Easter Eggs And Experimental Tools

- Promote the image-to-ASCII converter into a dedicated easter egg with controls for color mode, character set, font/text size, contrast, and resolution. It should apply to image formats such as `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.ico`, `.heic`, `.avif`, `.svg`, layered/design samples such as `.psd`/`.xcf`/`.ora`/`.kra`/`.procreate` where supported, and eventually playable video/media formats such as `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.mp3` album art, and `.wav` visualizations where useful.
- Add an opt-in "See live" webcam mode to the ASCII converter easter egg. It must request camera permission only after a user click, convert frames locally per animation frame, expose the same color/text-size controls, and never send camera frames off-origin.

## Research Backlog

- Maintain a concrete implementation backlog from the sample, metadata, and interaction audits.
- Use the backlog to drive follow-up implementation increments until all items above are addressed.
- As the final queue item, perform another thorough file-type check and produce an enhancement plan for more file types.
