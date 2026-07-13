# File Viewer — Open Work

This is the single source of truth for unfinished repository work. Completed work belongs in Git history and tests, not in parallel task, goal, roadmap, or editor-planning documents. Technical specifications and user-facing documentation may remain, but they must point here instead of carrying a second backlog.

## Working contract

- Preserve the static, client-only architecture, sandboxed previews, sanitization boundaries, and zero off-origin default.
- Runtime dependencies stay vendored. Internet-backed actions require an explicit user gesture, a clear disclosure, and graceful offline handling.
- Keep secret/private-key/JWT protections, exact-target Companion writes/deletes, watched-root validation, and safe archive handling intact.
- Keep modules focused and below the repository LOC limits. Regenerate committed bundles and the offline asset manifest after relevant source or asset changes.
- Run focused tests while iterating and ./scripts/check.sh --fast before handoff. Use the release gate before a tag and the memory-capped exhaustive sweep only when explicitly needed.

## Priority queue

### Sample library and reader completion

- Finish the File Examples compatibility matrix and promote only validated, license-compatible fixtures with provenance.
- Decide whether a local generator for simple structured samples adds enough value to justify its UI and fixture maintenance.
- Expand realistic programming, binary, 3D, malformed-file, password-protected, and dark/light-theme samples; keep unvetted downloads outside the shipped catalog.
- Ensure every registered base type and enhanced known-file view has a meaningful sample and useful detection/render coverage.
- Persist FB2/MOBI reader preferences through the sandbox-safe parent bridge; decide and implement the remaining comic reader settings.
- Continue opening every indexed sample in automation and turn parser failures into focused fixtures before fixes.

### Diff, compare, and workspace interactions

- Audit non-Monaco/custom diff renderers so visible changes are highlighted meaningfully.
- Recheck move-aware diff classification for mixed moves plus edits/insertions and retain focused unit cases.
- Finish the compare-mode language and behavior audit so raw diff, self-diff, and two-preview choices are understandable without ever showing four competing panes.
- Keep split-pane resizing reliable across Monaco, diff editors, and iframe previews.

### Metadata audit

- Audit every registered type and enhanced known-file view for useful, non-duplicated metadata.
- Group metadata into visible basics, collapsed technical/text facts, and open type-specific facts.
- Show concrete language/format names, safe local fingerprints, structural counts, and format-specific risk findings.
- Add explicit disclosure and offline/error UI for optional internet-backed checks.

### Known regressions and product follow-ups

- Recheck the 2048 win/end-screen layering and mobile layout; retain merge-motion coverage.
- Complete the conversation-history backlog audit and add only still-actionable user requirements here.
- Keep PWA install suppression quiet without weakening the no-install promise.
- Eliminate avoidable sandbox console noise and white flashes during iframe/Markdown rerenders.

### Bit Foundry

- Finish internal stage/tab presentation so future Bit Foundry steps are hidden or passive until unlocked and the current step reads as progression, not a row of arbitrary buttons.
- Verify unlocks use current bits at the threshold, survive spending/returning, and do not unlock from lifetime totals alone.
- Cover earning-surface clickability after switching to an unlocked step and returning.
- Audit long-session and low-power responsiveness: render cadence, timers, click loops, and save frequency.
- Reassess the historical Research tab, offline catch-up, timed bonus events, and extended suffix ideas before promoting any of them into the active game.

## Cross-cutting backlog

### Intake, sidebar, folders, and Companion

- Retain in-memory edits while navigating within the current sidebar/session, with clear unsaved markers and warnings only when leaving that retained context.
- Add a browser-local autosave cache for serializable text documents, with bounded/compressed storage and clear size/disabled warnings.
- Keep Companion delete/write actions exact-target, confirmed, atomic, watched-root bounded, and rollback-safe.
- Make large folder/repository intake progressive and responsive; pursue lazy child construction with background search indexing.
- Cache git analysis per loaded repository/session and add file links, line counts, and paginated history.
- Let supported archives expand lazily into the sidebar, including password prompts, progress, and bounded first-level expansion.

### Preview and interaction UX

- Add local-folder HTML dependency rewiring where safe; keep missing external CSS/script presets explicit, opt-in, cache-aware, and diagnosable.
- Complete preview width modes and renderer-wide responsive/light/dark audits.
- Restore or finish PDF page editing, image annotation/edit-save flows, password unlock paths, and safe sensitive-file defaults.
- Review structured views for sorting, filtering, folding, search, zoom, export, and source navigation where those actions materially help.
- Keep sample descriptions, format explanations, and documentation links useful without duplicating metadata.

### Editor and settings

- Expose and persist concrete Monaco language selection where appropriate; respect detected indentation and explain temporary overrides.
- Remember settings disclosure state and support both overlay and docked settings.
- Finish selection-aware Markdown editing, table operations, and safe rendered/WYSIWYG round trips before expanding direct manipulation to other formats.
- Preserve common paste semantics: a URL remains plain text without a selection and wraps selected Markdown text as a link.

### Loading, offline, and packaging

- Move folder/repository/Companion, compare/side-by-side, and advanced raw editors behind action/type-specific lazy boundaries where practical.
- Consolidate detector chunks and define a production minified bundle graph without sacrificing readable source modules.
- Verify deployed compression behavior; do not rely on precompressed files without correct hosting headers.
- Extend network capture to file-open, examples, and offline-modal flows; add stable CI request budgets once measurements settle.
- Add deeper exact offline bundle counts only if the modal needs them; keep startup cache status cheap.

### Security and malformed input

- Expand filename risk scoring for active double extensions, Unicode direction controls, MIME/magic mismatches, archive-contained names, and suspicious executable content.
- Add recovery/diagnostics for JSONC/JSON5-like syntax, inconsistent CSV, malformed XML/PDF, truncated image/archive inputs, BOMs, and encoding mismatch.
- Keep remote document resources disabled by default and explain precisely what an explicit opt-in can request.

## Creative and media lanes

### Advanced image editing

- Phase 3 composition: local image/sticker overlays with editable crop/frame controls.
- Add gradient/pattern fills from local assets, per-object filters with correct cache invalidation, export pixel-ratio controls, and true object-vs-base blending.
- Replace raw Konva JSON as the durable overlay contract with a small versioned document model and migration input.
- Defer full path/Bezier editing, vector animation/timeline work, and remote assets until explicitly prioritized.

### Media studio

- Re-audit inherited audio/video candidates against the completed modular mixer before implementation; remove items already covered by current Listen/Mix/Compare/Timeline/QC/Export surfaces.
- Preserve cheap playback and lazy heavy analysis/export while finishing any verified gaps in chapters, alignment, editing, export, and Companion write-back.
- Validate Protocol/ACX-style QC and export semantics with real fixtures rather than status documents.

## Metagame follow-ups

- Glyph Dungeon: evaluate the retained darkness/hazard-chain/Kernel expansion, onboarding, session length, and biome communication against the current game before selecting increments.
- Memory Grid: evaluate pressure, volatile cells, aliases, color puzzles, three-way boss depth, and replay length against the current implementation.
- Fractal Bastion: verify path reshaping, tower progression/sell controls, wave previews, campaign duration, and the boss-as-wave behavior.
- Protocol Codex: fix the pre-existing hyphenated shop dataset action bug; playtest late-run balance; decide the deferred bonus-handshake/card-offer prestige multipliers; split soft-cap modules when next touched.
- Keep each retained game deterministic, preserve its file-viewer un-cheat gate, and add focused tests for any selected expansion.

## Per-format candidate backlog

The old per-type EDITOR files were planning snapshots and frequently lagged shipped code. Their unclosed candidate titles are consolidated below so ideas are not lost. Before implementing a row, verify current behavior, delete candidates already shipped, and turn the selected work into acceptance criteria in the priority queue.

| Type | Candidate work to verify |
| --- | --- |
| 3d | Select-mode toggle (Region / Face / Group); and; Colored OBJ export; Wireframe overlay toggle; Face normals visualisation; Model stats panel; Measurement tool (two-click distance); Zoom with scroll wheel / pinch; Bounding-box axes indicator; GLTF animation playback; UV / texture preview (GLTF); 3MF interactive 3D render; 3MF print settings panel; Section plane / cross-section; Mesh simplification; Export format conversion; GLTF → GLB packaging; OBJ → GLB conversion; Material property editor (GLTF PBR); Texture swap (GLTF); Save colored mesh in-place; Vertex editing; Non-destructive section-plane export; Watch for external edits |
| archive | Recursive tree view; File search / filter; Size treemap; Entry preview on click; Compression ratio column; Sort by column; Delete entries + repack as ZIP; Add files via drag-and-drop; Rename entries; TAR repack; Write repacked archive back to original path; Extract all to directory |
| binary | Virtual-scroll hex editor (read-only baseline); Jump to offset; Hex pattern search; Byte frequency histogram; Entropy heatmap; ASCII string extraction panel; Structure annotation; Toggle edit mode; Modify bytes; Undo / redo; Export modified file; Find & replace bytes; Write patched bytes to original file; Patch file as diff |
| ebook | TTS read-aloud (browser speech synthesis); Highlight & bookmark; Font size / spacing persistence; Search within book; Inline image zoom; Cover page display; Two-column reading improvement; Page counter + direct jump; Keyboard navigation; Zoom / fit modes; Double-page detection; Export current page as PNG; Reading progress persistence; Chapter content edit; Chapter metadata edit (OPF); NCX / TOC edit; Add / remove chapters; Cover image replace; Reorder pages; Delete pages; Add pages; Rename / renumber pages; Convert to CBZ; Metadata edit form; EPUB auto-save; MOBI → EPUB conversion; DJVU → PDF export; TTS export (audiobook) |
| eml | Inline attachment preview; Full header inspector; Authentication header parser; Received-chain timeline; HTML / plain-text toggle; Reply / forward template composer; Edit subject / To / Cc; Remove attachments and re-export stripped .eml; Save edited .eml in place; Flag / label management |
| emulator | emulatorjs/; ruffle/; v86/; Save state / load state; Controller remapping UI; Cheat code entry (Game Genie / GameShark format); Volume / mute control; FPS counter overlay; ROM hex editor; IPS / BPS patch apply; SRAM export / import; Auto-save SRAM to original directory; Save state library |
| font | Glyph table browser; OpenType feature preview; Kerning pair explorer; Variable font axis sliders; Italic / oblique specimen row; Line-height & letter-spacing controls; Subsetting (remove unused glyphs); Format conversion; Name Table metadata editor; Glyph outline export; Save converted/subsetted font back to original path; Batch rename font files from Name Table |
| geo | Feature hover tooltip; Attribute table panel; Style by property; Layer toggle (multi-geometry); Measurement tool; GPX pace/speed chart; GPX waypoint labels; Minimap / overview; KML parser; CRS / projection info panel; Draw new features (points/lines/polygons); Edit vertices; Delete features; Style editor (fill / stroke / opacity); Export as KML; WGS84 ↔ UTM coordinate toggle; Shapefile reader; Save edited GeoJSON in-place; Watch for external edits; Split track at point (GPX) |
| html | Source / preview split view; CSS inspector: hover highlight; Computed styles panel; Live CSS editor pane; Responsive preview breakpoints; Script execution console; Print / PDF export; WYSIWYG toolbar; Replace execCommand with TipTap; Source / WYSIWYG sync; Image insert / drag-drop; Inline link editor; Table insert / resize; Find & replace; Format / prettify; Auto-save on edit; Template variables |
| ics | Monthly / weekly calendar grid; Recurrence expansion; Timezone conversion UI; Event detail modal; VTODO and VJOURNAL support; Add / edit / delete events; Timezone convert and export; Export as CSV; In-place event save; Watch for external changes |
| image | Fill bucket; Ctrl+Z / Ctrl+Y; Crop; Resize; hue; Background removal; Compare; HEIF EXIF panel; ICO multi-size download; ICO animated cursor preview; Procreate layer count + artboard metadata; Sketch artboard thumbnail extraction; SVG element tree panel; Layers panel (Konva.js); Brush / paint engine upgrade; Blend modes on composited layers; Perspective crop; SVG path node editor; SVG attribute inspector; ICO editor / composer; ORA layer visibility re-composite; ORA re-export; Auto-save on edit; TIFF round-trip save; SVG save-in-place; Sketch live annotation export; PSD layer save |
| ipynb | Syntax highlighting for code cells; Cell collapse / expand; Output image lightbox; Table of contents sidebar; Kernel / metadata badge; Cell source editing; Add / delete / reorder cells; Execute cells via Pyodide; Clear outputs; Export as .ipynb; Export as HTML; Save edited notebook back to disk; Run all cells and save outputs; Kernel selection |
| markdown | Mermaid diagram rendering; Math rendering (KaTeX); Syntax highlighting in fenced blocks; Reading time / word count; Heading outline / TOC panel; Anchor links on headings; Footnote support; Task-list checkboxes; Table editor UI; Frontmatter YAML form; Mermaid live edit; Image drag-and-drop; Paste URL → link; Slash commands; Slash commands / bubble menu (TipTap); Task-list checkbox editing; Find & replace; Auto-save on edit; Wiki-link / internal link resolution; Git blame per line |
| mbox | Click-to-expand message detail; Search / filter bar; Date range filter; Thread view (group by References / In-Reply-To); Attachment manifest across all messages; Per-column sort; Delete messages and export reduced .mbox; Extract all attachments as ZIP; Mark messages read / flag; In-place delete without full re-export; Append new message |
| media | Full waveform; Waveform zoom; Multi-track mixer; Pink noise + test tones; Trim; Fade in / Fade out; Loudness normalize; 9-band EQ with presets; A/B comparison mode; Export WAV; Export MP3 / OGG; Region loop; Save mixed project; Overwrite with mixed-down export; Moving tracks between lanes; Overlapping region detection; Timeline with chapter markers; Trim video clip; Add music / audio track; Subtitle burn-in; Video trim + audio replace; Mute segments; Downscale presets; Screenshot sequence; Multi-lane video editor session; Overwrite source file; Chapter edit |
| office | Lazy conversion; Shared editor surface; Delta list; Serializer isolation; Style passthrough; Inline comment display; Track-changes overlay; Page break markers; Footnote / endnote panel; Rich text editor; Bold / italic / underline / strikethrough; Headings (H1–H6); Ordered and unordered lists; Table insert / edit; Image insert; Find & replace; Spell-check; Auto-save on change; Live co-cursor; Column resize; Freeze panes; Merged cell display; Cell type indicators; Conditional formatting preview; Chart thumbnails; Cell editing; Formula bar; Formula evaluation; Add / delete rows and columns; Sheet tab management; Basic cell formatting; CSV / XLSX export choice; Auto-save workbook; Large file streaming; Slide thumbnail strip; Speaker notes panel; Slide counter / progress bar; Keyboard navigation; Full-screen mode; Annotation layer; Text-only search; Slide-to-PNG export; Deck-to-PDF export; Slide reorder; Annotation persistence; Slide delete / duplicate; Text style passthrough; Footnote / endnote rendering; Table cell borders and alignment; Tracked changes; Bold / italic / underline; Headings and lists; ODP slide annotation; Auto-save; Improved text extraction; Table detection; Numbers cell extraction; Better thumbnail fallback; PDF export via print; Text-only TXT export |
| pdf | Thumbnail strip; Text search; Text layer / copy; Annotation overlay display; Two-page spread improvements; Page zoom controls; Outline / TOC sidebar; Reading progress persistence; Annotation layer — text boxes; Annotation layer — highlights; Annotation layer — freehand draw / shapes; Sticky note / comment pins; Form filling; Signature pad; Redaction (black-out); Page background color / white-out; Crop page; Insert blank page; Header / footer stamp; Auto-save edited PDF; OCR + searchable PDF; True redaction |
| sqlite | Query history; EXPLAIN QUERY PLAN; CSV / JSON export; Write-back; ER diagram; Export table as Excel; Full-text search; Database stats panel; Schema browser; Inline row editor; Add-row form; INSERT/UPDATE/DELETE form builder; CSV import into table; Schema editor: CREATE TABLE dialog; Schema editor: ALTER TABLE (add column); Full SQL editor (Monaco); Transaction wrapping with rollback; Export modified database; Save in place; Live file watch; Connection to live MySQL / PostgreSQL; SheetJS; Papa Parse; vis-network.js; Monaco |
| text/abc | Score rendering via abcjs; MIDI playback; Transpose; Tempo slider; Monaco editor with ABC syntax highlighting; Live preview split-pane; Export MIDI; Export PDF (print); Auto-format / normalize; Multi-tune reorder; Tune split / merge |
| text/acf | Full depot table; DLC inventory; User config section; Mounted depots list; State flag inspector; Deep raw tree; Edit install directory; Edit user launch options; Add/remove DLC entry; KV serializer |
| text/als | Clip timeline grid; Scene / Session view; Plugin details panel; Automation lane count; Sample reference list; Send/return routing map; Live version badge; Export extracted XML; Edit BPM; Edit time signature; Rename tracks; Toggle track mute/solo |
| text/asciiart | Grid overlay; Column width readout; Font selector; Zoom controls; Color scheme toggle; Export as PNG; Monaco editor with monospace enforcement; Character palette; ANSI color insertion; ascii-converter.js integration; Download as .ans / .txt; Save edited art back to source file; Auto-save on idle |
| text/cif | Color by chain / residue / B-factor; Unit cell wireframe overlay; Loop_ table browser; Space group info card; CIF vs mmCIF badge; Key-value field editor; Loop_ cell editor; Add / remove data block; Atom coordinate editor; Reflection data editor |
| text/code | Symbol outline panel; Go-to-definition stub; Inline TODO highlighting; Heatmap gutter; Full Monaco editor mode; Prettier in-browser format; Multi-cursor find/replace; Language mode switcher; Tab/space/indent toggle; Auto-save on change; Live reload on external change; Multi-file project view |
| text/crash | Stack trace highlighting by library category; Symbol resolution hints; Thread grouping summary; Binary image lookup; Demangler for C++ / Swift symbols; Crash address overlay in binary image; Export as Markdown; Redact personal fields; Annotation layer; Symbol paste-in; Local dSYM symbolication; Crash database logging |
| text/csv | Download as JSON; Column statistics panel; Sort by column; Filter / search; Type inference badges; Chart type selector; Row count / column count summary bar; Spreadsheet editor; Find & replace; Paste from clipboard; Column reorder; Large-file streaming; Auto-save on cell blur; Schema locking |
| text/docker-compose | Service dependency graph; Port conflict detector; Volume cross-reference; Health-check status column; Image tag freshness hint; extends and merge resolution; JSON Schema validation; Service scaffold snippets; Depends-on cycle detector; Secret/env value redaction; Round-trip save; Live docker-compose ps status overlay |
| text/dockerfile | Service dependency graph; Hadolint-subset lint; Best practice hints; Layer count and size estimate; Base image CVE badge; Monaco editor mode; Inline lint decorations; Snippet library; Stage rename refactor; Round-trip save; Live build log |
| text/dxf | Layer toggle; 2D measurement tool; Entity detail on hover; Block reference exploder; Monaco DXF editor; Layer property editor; Add entity form; Unit conversion; Round-trip save; ODA/LibreCAD export |
| text/fits | Image rendering (grayscale); Stretch modes; Colormap selector; WCS coordinate overlay; Pixel value inspector; Multi-HDU browser; Header search; Export as PNG; Header card editor; Keyword add / delete; Live header edit round-trip |
| text/gcode | 3D toolpath visualisation; Layer scrubbing; Print time estimate from moves; Temperature graph; Full-file G/M code highlight; Layer statistics table; Monaco GCode editor; Find and replace temperatures; Speed multiplier; Strip travel moves; Insert filament change; Round-trip save; Send to printer |
| text/gff | Genome browser track (IGV-lite); Chromosomal ruler with base-pair scale; Feature track layers; Filter by feature type; Search by gene / attribute; Attribute tooltip; Export visible region as BED; Attribute editor; Add feature row; Coordinate liftover helper; Feature drag-to-resize; Live multi-file overlay |
| text/guitar-pro | Score rendering via alphaTab; MIDI playback; Tempo control; Loop region; Track mute / solo; Part zoom / scroll; Tuning change (GPX only); Export MIDI; Export MusicXML; Print / export PDF; Note-level editing; Add / remove measures; Lyrics editor; Track reorder / rename |
| text/har | Stacked waterfall with timing breakdown; Filter by status code range; Filter by domain; Performance budget indicators; Summary statistics panel; Timeline ruler with real timestamps; Export filtered subset; Request URL redactor; Header redactor; Entry annotator; Live re-capture diff |
| text/hl7 | Human-readable structured view; Full field name dictionaries; OBX value rendering; Segment type filter / search; FHIR JSON view; Encoding characters display; Message flow diagram; Form-based field editor; OBX value editor; Add / delete segment; Message template library; Round-trip file save |
| text/ini | Value type inference badges; Section jump list; Duplicate key detection; Env-var interpolation preview; Search across all sections; Typed value inputs; Comment preservation; Add / remove sections; Reorder sections by drag; Export to TOML; Merge / diff two INI files; Live save; System config editing |
| text/json | JSONPath filter; jq-style filter preview; Schema validation overlay; Key-path breadcrumb; Collapse-all / expand-all toolbar; Value search / highlight; Form editing from JSON Schema; Pretty-print / minify / sort-keys toggle; Add / edit / delete nodes; Diff two JSON files; Live auto-save on keypress; Conflict detection; Schema-pinning |
| text/jsonl | Column filter; Global search; Sort by column; Row detail panel; Schema coverage report; Increase row limit; Append new record; Edit existing cell; Delete row; Export to CSV; Export to XLSX; Filter by property expression; Large-file streaming; Append-only write; Live tail |
| text/kicad | PCB layer toggle canvas; Schematic symbol preview; Component list / BOM export; Ratsnest viewer; 3D body extents; Monaco KiCad S-expression editor; Property editor for footprints; Net rename; Layer colour customiser; Round-trip save; KiCad CLI integration |
| text/kubeconfig | Set active context highlight; kubectl command palette; Redact credentials; Server URL reachability indicator; Merge kubeconfig; Set active context (edit); Add / edit / delete context; Add / edit / delete cluster; Add / edit / delete user; Download modified kubeconfig; Credential redaction for sharing; Write modified kubeconfig back to ~/.kube/config; Merge and write |
| text/log | ANSI escape code rendering; Filter / grep with highlight; Severity filter checkboxes; Relative time display; Timestamp jump; Line count / line number gutter; Tail mode; Log stats summary bar; Redact / mask rows; Annotate lines; Live tail from file; Log rotation viewer |
| text/mcp-config | Tool list preview; Transport badge for SSE; Duplicate env var detection; Copy full server entry; Secret count summary; Add server; Edit server; Delete server; Reorder servers; Add / remove env vars; Validation; Download modified config; Write config back to original file; Auto-detect config location |
| text/mt940 | Running balance chart; Full transaction table; Field :86: narrative display; Date range filter; IBAN validator; SWIFT/BIC lookup; Multi-statement tab strip; Currency badge; Edit :86: narrative; Export as CSV; Export as OFX |
| text/musicxml | Score rendering via OpenSheetMusicDisplay (OSMD); MIDI playback; Transpose view; Part mute / solo; Version diff — changed measures; Dynamics editor; Add / remove measures; Tempo change; Export MIDI; Re-export as .mxl; Note-level editing on OSMD canvas; Lyrics editing; Layout / formatting; Part add / remove |
| text/ofx | Running balance chart; Category pie chart; Date range filter; Full transaction search; Stats bar; Multi-statement support; Add/edit memo; Tag/categorize transactions; Export categorized CSV; Merge multiple OFX files |
| text/patch | Split diff view; Hunk navigation; Include/exclude hunks UI; Stat summary bar; File jump list; Apply-patch simulation; Hunk editor; Fuzz tolerance control; Monaco raw edit mode; Apply to working tree; Reverse patch |
| text/pdb | 3D structure viewer via 3Dmol.js; Color by chain; Color by B-factor; Surface representation; Measurement tool; Ligand highlight; Sequence strip; Export as PNG; B-factor editor; Remark editor; Chain selector / subset export; Coordinate nudge; Ligand swap |
| text/pem | Certificate chain validation; Chain trust anchor check; Fingerprint display; Public key extraction; CRL / OCSP endpoint display; Name constraints display; CT log SCT display; DER hex dump; Generate self-signed certificate; Generate CSR; Convert DER ↔ PEM; Reorder PEM blocks |
| text/plist | Collapse-to-depth control; Key search / highlight; Date formatting toggle; Data node hex viewer; Root type / schema summary; Scalar value editing; XML plist pretty-print download; Export to JSON; Export to YAML; Binary plist write-back; Live save |
| text/postscript | Ruffle/Ghostscript WASM render; Page thumbnail strip; Font list enrichment; BoundingBox visualiser; DSC comment explorer; Monaco syntax highlight; Monaco editor mode; DSC header editor; EPS bounding box recalculator; Round-trip save; Convert to PDF |
| text/proto | Schema diagram; Field number validation; Dependency graph for imports; Stub code preview; Monaco editor mode; Field number auto-assign; Inline type completion; Format on save; Round-trip save; Cross-file import resolution |
| text/prproj | Sequence list; Bin / folder tree; Asset path list; Effect inventory; Colour space / profile; Premiere version badge; Export extracted XML; Edit project name; Rename sequences; Edit sequence frame rate; Strip unused media |
| text/qif | Running balance chart; Category breakdown chart; Full transaction table; Date range filter; Search bar; Cleared/uncleared toggle; Split transaction expansion; Edit payee and memo; Categorize transactions; Export as OFX; Add new transaction |
| text/rdp | Resolution visual indicator; Authentication level explainer; Connection type decoder; Screen mode badge; Local resource summary; RDP URI generator; Add custom key; Delete key; Export modified .rdp; Preset templates |
| text/reg | Key search / filter; Security risk scanner; Hive summary panel; Value type distribution; Diff view; Export as JSON; Edit REG_SZ / REG_EXPAND_SZ values; Edit REG_DWORD values; Add new value; Delete value; Add new key; Mark key for deletion; Export as .reg; Flag dangerous keys before export |
| text/sarif | Full findings table with pagination; Filter by rule ID; Filter by severity; Group by file; Rule detail panel; Related locations; Mark as suppressed toggle; CodeFlow graph; Findings chart; Bulk suppress; Justification editor; Result level override; Add partial result; Live re-scan trigger |
| text/sdf | 2D structure depiction; Molecule grid view; 3D conformer via 3Dmol.js; Property histogram; SMILES display; Substructure search; Export as PNG; SD data field editor; Add / remove SD fields; Molecule record manager; Atom coordinate editor; Property batch write |
| text/ssh-config | Search / filter hosts; Connectivity test; IdentityFile path validation; ProxyJump chain visualisation; Directive documentation tooltips; Export host as .ssh/config snippet; Form-based host editor; Add new host; Delete host; Reorder host blocks; Download modified config; Validation on save; Write config back to ~/.ssh/config; Atomic write with backup |
| text/step | 3D viewer; Feature tree; Bounding box and mass estimate; AP schema identifier; CAD system cross-reference; Entity type search; Monaco STEP editor; Header field editor; Entity reference renumbering; Strip specific entity types; Round-trip save; Convert to other formats |
| text/strings | Missing key detector; Format specifier summary; Duplicate key warning; Android strings.xml import preview; Value length statistics; Comment density indicator; Edit translation values; Edit keys; Add new entry; Delete entry; Export as .strings; Import from JSON; Export as JSON; Import Android strings.xml; Export as Android strings.xml |
| text/subtitle | Video sync overlay; Waveform alignment view; Active cue highlight + auto-scroll; ASS/SSA basic parse; Inline cue text editor; Timing adjustment — global shift; Timing adjustment — per-cue nudge; Merge adjacent cues; Split a cue; Format conversion; Delete cue / add blank cue; Drag cue boundaries on waveform; Auto-sync to speech; Project save (.json sidecar) |
| text/thrift | Schema diagram; Field ID gap and duplicate check; Stub code preview; Namespace pills as copy buttons; Monaco syntax highlight; Monaco editor mode; Field ID auto-complete; Format on save; Namespace generator; Round-trip save; Multi-file include resolution |
| text/toml | Syntax check panel; TOML → JSON toggle; Section jump list; Type annotation badges; Array-of-tables row editing; Add new key to section; Rename / reorder sections; TOML → YAML save; Inline table editor; Live save; Comment preservation |
| text/url | QR code; UTM / tracking parameter decoder; URL shortener note; Punycode / IDN display; Data URI preview; JWT expiry check; Credential leak warning; URL builder / editor; Edit .url file fields; Add/remove query parameters; Export query params as JSON; Export as cURL command |
| text/xml | XPath query panel; Namespace map; Attribute inspector; Collapse to depth; Pretty-print source; XSD schema stats; XSLT transform; Pretty-print / minify; XML → JSON export; Inline attribute editing; XSD validation; Live DOM editing; Large-document virtual tree |
| text/xyz | 3D structure viewer via 3Dmol.js; Color by element (CPK); Multi-frame animation; Frame timeline; Energy / property parser; Bounding box overlay; Export as PNG; Comment line editor; Add / delete frame; Coordinate offset / rotation; Atom property table editor; Trajectory frame save; Append frame from clipboard |
| text/yaml | YAML-to-JSON toggle; Multi-document navigator; Anchor / alias visualization; Schema validation; Key-path breadcrumb + clipboard; Schema-driven form; Nested object editing; Array-of-objects table; YAML to JSON save; Lint / syntax check; Live save; Multi-document write-back; Comment preservation |
| vcard | Static OpenStreetMap embed; Photo display; Batch list view; Social profile links; Inline field editing; Add / remove fields; Export subset of contacts; Merge duplicate cards; Export as CSV / vCard 3.0; Save edited .vcf in place; Add new contact to existing .vcf |
| zip | Recursive folder tree view; File search / filter; Size treemap; Sort by column; Inline preview pane; Delete files + repack; Add files via drag-and-drop; Rename entries; Change compression level; Save modified ZIP back to original file; Watch for external changes |

## Future format and research candidates

- Re-audit the old extension catalogue against the live registry before adding formats; prefer shared parser/export infrastructure over one-off viewers.
- Remaining candidate clusters include deeper AZW3/KF8, M4B/MP4 chapter atoms, bioinformatics, financial interchange, chat exports, game-map/entity formats, advanced CAD/design containers, and richer scientific/medical/geospatial workflows.
- New formats need realistic fixtures, detection, metadata, safe rendering, offline vendoring, documentation, and focused smoke coverage before being considered shipped.

## Tracker hygiene

- Add new unfinished work only here.
- Remove completed entries in the same change that finishes them.
- Keep implementation details near the code or in durable technical specifications; do not create another roadmap, tasklist, tracker, goal, or build-log Markdown file.
