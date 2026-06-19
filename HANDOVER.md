# File Viewer Autonomous Handover

Generated: 2026-06-19

This handover is self-contained for the next agent. It summarizes the repository rules, current state, recent completed increments, open backlog, and a suggested autonomous execution order. Use the current worktree as authoritative before acting.

## Repository And Workflow

- Repo: `/home/jens/repos/file-viewer`
- Branch: `dev`
- App root: `docs/`
- Deployment model: static GitHub Pages, client-only, native ES modules, no bundler, no build step.
- Runtime third-party code must be vendored in `docs/vendor/`.
- Primary source queues:
  - `TASKS.md`
  - `RUN_REQUIREMENTS.md`
  - This file, `HANDOVER.md`
- Local incoming examples folder:
  - `.example-files-internet/` is untracked and user/local. Do not stage it or delete it.
  - It may contain real-world files to triage later, including GLB/glTF samples.

Per increment, always:

1. Implement exactly one coherent slice.
2. Run `./scripts/check.sh`.
3. If files under `docs/` were added or removed, ensure `docs/asset-manifest.json` is regenerated. `check.sh` runs `node scripts/gen-asset-manifest.mjs` and leaves the manifest modified when needed.
4. Stage only intended files.
5. Commit and push to `dev`:

```bash
git add <specific files>
git commit -m "<description>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```

Never commit `.example-files-internet/` unless the user explicitly asks for a specific promoted file and it has been validated.

## Hard Security Rules

- Zero off-origin runtime by default. Smoke test enforces this.
- Optional internet-backed actions must be explicit user actions with a warning that says exactly what is sent.
- `.pem`/cert/key files: never display private key material; show a warning if a private key header is present.
- `.env`: redact sensitive values whose keys match `/(SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE)/i`; reveal toggle only; no copy button for secrets.
- JWT: decode header and payload only; never show raw signature.
- Companion saves: save only the changed file, never the whole folder.
- Companion file operations must validate paths are inside watched folders.
- Download button must remain; Save button is additive.

## Current Worktree Baseline

At handover time:

- Latest commit: `feb5c78 Fix Java class type info mapping`
- `git status --short` showed only:

```text
?? .example-files-internet/
```

If the next agent sees additional changes, inspect them first and assume they are user or generated work. Do not revert unrelated changes without explicit instruction.

Recent pushed commits:

- `feb5c78` - Fixed `java-class` type-info mapping and added `tests/type-info.test.mjs`.
- `804a8d8` - Added `docs/examples/compatibility.json` plus `tests/example-compatibility.test.mjs`, wired into `scripts/check.sh`.
- `3f65976` - Added metadata security section, filename risk rows, and suspicious ZIP-entry filename metadata.
- `62b2065` - Hardened 2048 merge animation with smoke coverage.
- `cb86a45` - Marked new-file autofocus and readable text preview task done.
- `ebc9b92` - Bridged Stage 1 economy messages into v3 bell log.
- `ba26386` - Added canonical metadata row helpers.
- `cbbf84b` - Captured performance and safety backlog gaps.

## Validation Status

The most recent completed increments each passed:

```bash
./scripts/check.sh
```

Current `check.sh` includes:

- settings defaults generation check
- runtime registry generation check
- asset manifest generation
- LOC advisory
- movediff/parser unit tests
- Markdown edit action tests
- settings defaults test
- registry runtime test
- example compatibility test
- type info test
- metadata normalize and owned metadata tests
- full Playwright smoke test with zero off-origin assertion

## Important Current Implementations

### Sample Catalog And Compatibility

- Catalog: `docs/examples/index.json`
- Initial machine-readable matrix: `docs/examples/compatibility.json`
- Contract test: `tests/example-compatibility.test.mjs`
- Browser sample sweep: `tests/areas/examples-catalog.mjs`

Current known facts from the last audit:

- Registered types: 79
- Indexed samples: 170
- Registered types with at least one indexed sample: 79/79
- Known/enhanced renderers: 16, all represented
- Explicit catalog `type`: 74/170 before latest matrix work
- Provenance (`source`, `license`, `attribution`): sparse, about 27/170 before latest matrix work
- Many samples are still synthetic or thin even though they technically open.

The compatibility matrix is currently a scaffold. It records:

- one row per registry type
- one row per known-file enhancer
- sample files
- extensions seen in the catalog
- type capabilities
- partial samples
- basic provenance counts
- rough `realWorldQuality`
- notes

It does not yet fully encode FileExamples coverage, preview depth, metadata depth, edit/export capability, security limits, parser gaps, or test coverage per FileExamples format.

### Metadata

- Metadata helpers: `docs/core/metadata-helpers.js`
- Generic rows: `docs/core/generic-metadata.js`
- Drawer grouping: `docs/core/meta-drawer.js`
- Type information and FileExamples links: `docs/core/type-info.js`

Current grouping model:

- Always visible: Used for, Format info, Name, Type, Size
- Default-open: Type-specific details
- Default-open when present: Security and privacy
- Default-closed: Text structure
- Default-closed: Advanced file facts

Filename security metadata exists for:

- Unicode direction controls
- high-risk active double extensions like `invoice.pdf.exe`
- cautionary multi-extension chains like `document.pdf.zip`
- legitimate compound names like `jquery.min.js` are exempt
- suspicious ZIP entry names are summarized in ZIP metadata without extraction

Code metadata already includes concrete language, lines of code, comments/blanks, functions, imports/dependencies, and complexity summaries for supported language heuristics.

### Compare/Diff

Already implemented:

- In-app compare target can open before picker.
- Sidebar file can be dragged onto compare target.
- Raw Monaco diff mode works with at most two panes.
- Split divider drag coverage exists for preview iframe and Monaco diff cases.
- Move-aware diff has broader tests than before.

Still open:

- Richer compare mode choices: raw diff, self diff, two previews.
- Do not show raw+preview for both files at once.
- Audit custom diff renderers that do not highlight useful changes.

### Folder/Git Loading

Already implemented:

- Folder load progress feedback exists.
- File tree opens first level by default.
- Expand-all and collapse-all buttons exist.
- Large virtual tree smoke coverage exists.
- Git commit details include author/message, changed files, line delta counts, and links to existing files.

Still open:

- Cache expensive git analysis across branch/file/view switches.
- Add load-more/infinite-scroll for capped commit history.
- Make ordinary large folder loading more lazy/background-indexed where feasible.
- Avoid `.git` auto-activation after a full repo finishes loading if user has already navigated elsewhere.

### Editing

Already implemented:

- New file autofocus.
- Plain text readable preview.
- Markdown edit tools: heading, bold, italic, paste URL selection handling, table insertion, selected table sort.
- Image text edit and export is covered by smoke.
- PDF edit operations currently smoke-covered: delete pages, rotate, insert image page, merge another PDF, spread/book mode.
- Unsaved session/sidebar markers are covered.

Still open:

- Restore/extend full PDF image editing workflows where still missing: add blank pages, cut ranges, richer page manipulation, Companion overwrite warning.
- Broader common edit tools for non-code editable text.
- WYSIWYG/rendered editing research and implementation, starting with Markdown table cell mapping/highlighting, then HTML, `.env`, INI, CSV/XLSX, JSON/YAML/TOML/XML, notebooks, and documents.
- Working-document local cache for serializable text files, about every five minutes, with compression/size warnings.

### Games And Easter Eggs

Already implemented or partly implemented:

- Arcade lazy unlock via easter eggs.
- 2048 overlay layering and merge animation smoke coverage.
- Bit Foundry v3 shell hides locked stages on fresh save.
- Bell exists in v3 header and Stage 1 messages bridge into it.
- Current-bits unlock behavior is partly covered.

Still open:

- Bit Foundry stage navigation should feel like stage progression, not ordinary always-visible button rows.
- Stage name should be the primary heading.
- Add deeper clickability coverage for switching to another unlocked stage/tab and returning.
- Audit long-session responsiveness: click/update loops, save writes, timers, render frequency.
- Recheck 2048 win/end screen manual polish if QA still reports issues.
- Add Flappy Bird-style easter egg.
- Promote image-to-ASCII converter into a dedicated easter egg with controls and webcam "see live" mode after user permission.

## Highest-Priority Open Tracks

### 1. FileExamples And Sample Quality

Goal from user: finish only when all filetypes from `https://www.fileexamples.com/` are tested and unavailable ones are otherwise created, with a good breadth of examples and a matrix showing what each type/special file can do and which extensions are included.

Next useful increments:

1. Enrich `docs/examples/compatibility.json` schema.
   - Add fields such as `fileExamplesSlug`, `previewDepth`, `metadataDepth`, `editCapability`, `exportCapability`, `securityLimitations`, `knownParserGaps`, `testCoverage`, `sampleSource`, `needsRealWorldSample`.
   - Keep JSON compact or add a generator if the file becomes hard to edit.
   - Update `tests/example-compatibility.test.mjs` to enforce required fields.
2. Create a generation/update script for the compatibility matrix.
   - Suggested path: `scripts/gen-example-compatibility.mjs`
   - Inputs: `docs/core/registry.js`, `docs/known/registry.js`, `docs/examples/index.json`
   - Output: `docs/examples/compatibility.json`
   - Preserve manually curated fields where possible.
3. Add UI visibility for matrix-backed quality without overwhelming users.
   - Candidate: sample hover title or small badge showing `needs review`, `partial`, `sourced`, or `enhanced`.
   - Candidate: examples footer link to FileExamples already exists; add a note that the shipped examples are tested local fixtures and the external library offers more examples.
4. Triage weak samples first:
   - `sample.nes` 24 B
   - `sample.swf` 25 B
   - `Sample.7z` 33 B
   - `sample.wasm` 36 B
   - `sample.class` 41 B
   - `sample.lrf` 58 B
   - `Sample.avi` 88 B
   - `sample.mid` 96 B
   - `sample.procreate` 194 B
   - `sample.pages` 454 B
5. Expand FileExamples format guide links in `docs/core/type-info.js`.
   - Current map only covers a small subset.
   - Add slugs conservatively after confirming FileExamples format pages exist.
   - This requires web access because FileExamples page contents may change.

Important: FileExamples files are not all valid. Treat the site as:

- extension catalogue
- edge-case checklist
- compatibility matrix source
- possible source of examples only after validation and licensing review

### 2. Metadata Coverage

Open goal: audit and improve metadata for every registered type and every known/enhanced view.

Next useful increments:

1. Add stronger metadata grouping tests.
   - Extend `tests/metadata-normalize.test.mjs`.
   - Assert generic rows carry `Advanced file facts`, `Text structure`, and `Security and privacy` sections plus dedupe keys.
   - Assert archive entry risk rows normalize into `Security and privacy`.
2. Improve high-value metadata modules one family at a time:
   - ZIP/archive: top-level layout, suspicious entries, encrypted entries, compression summary.
   - JSON/YAML/TOML/XML/INI: top-level keys/sections, depth, duplicate/suspicious keys, recovery mode.
   - Image/media: dimensions, alpha/animation, EXIF/ICC, duration/codecs/bitrate where local parsing allows.
   - Office/ebooks: pages/slides/sheets/chapters, title/author, embedded media/fonts, chapter lengths.
   - Known files: requirements, package manifests, docker-compose, Dockerfile, OpenAPI.
3. Add optional safe online checks only behind explicit warnings:
   - requirements/package issue checks
   - Docker image references
   - Make offline/no-internet state clear and non-noisy.

### 3. Security And Privacy

Already started:

- filename risk and ZIP entry risk.

Still needed:

- MIME/magic mismatch warnings.
- Unicode spoofing display in UI warnings where relevant.
- Suspicious executable content metadata for PE/ELF/Mach-O planned formats.
- CSV formula injection warning/safe export behavior.
- Scriptable SVG warnings.
- EXIF privacy warnings.
- Archive-contained suspicious name warnings beyond ZIP where central directory/listing is available.
- Password-protected samples and flows for PDF, SQLite, ZIP, and similar.

### 4. Performance And Loading

Open tasks:

- Cache git analysis per folder/session.
- Reuse commit summaries/file maps/root detection/stats across branch clicks and view switches.
- Add load-more for commit history.
- Improve large folder lazy loading and background indexing.
- Investigate startup request count again later; earlier request-count optimization was deferred until file type hardening and examples settle.

### 5. HTML Preview Dependencies

Open tasks:

- Rewire relative local CSS/JS/assets from loaded folder into HTML preview where safe.
- Add explicit opt-in external head presets for common libraries like Tailwind browser CDN.
- Preserve zero off-origin default.
- Detect class-heavy pages with missing styles and suggest opt-in configuration.
- Add optional caching for user-approved external resources if implemented.

### 6. Archive Sidebar

Open tasks:

- ZIP/archive files should become lazy sidebar folders when explicitly opened or clicked.
- Ask for password when needed.
- Show spinner/progress while reading.
- Expand only next level.
- Avoid main-thread stalls and avoid eagerly loading full archive contents.

### 7. Light/Dark And Preview Polish

Open tasks:

- Full renderer-by-renderer light/dark audit.
- Known targets: MSG/email, SSH, env, archive, code-like previews, media controls, iframe previews.
- Suppress avoidable sandbox console noise from inert previews.
- Fix/verify Markdown preview refresh does not flash white in dark mode.
- Keep preview width modes polished: A4/default, available, unrestricted, phone, custom.

### 8. Companion

Open tasks:

- Add safe file/folder delete actions.
- Confirmation must name exact target path.
- Server must reject unwatched paths, traversal, and broad delete requests.
- Keep save behavior single-file only.

### 9. Conversation-History Audit

Task 22 remains open.

Goal:

- Review user-authored File Viewer requests from this chat and accessible prior File Viewer/Claude conversations.
- Produce chronological actionable requirements.
- Deduplicate against `TASKS.md` and `RUN_REQUIREMENTS.md`.
- Focus especially on sample coverage, metadata grouping, editing, FileExamples compatibility, Bit Foundry, security, and performance/loading.

Do not dump transcripts. Convert only actionable product requirements and decisions into backlog items.

## Known Inconsistencies To Fix In Tracking

- `TASKS.md` currently says Task 18 status is implemented but the text under it is still a broad metadata audit goal. The concrete new-file autofocus/plain-text preview work belongs to Task 19 and is already implemented. The next agent should correct Task 18 status to reflect metadata audit ongoing if doing a backlog cleanup increment.
- Task 19 status still says "Not started" in the inspected section, but recent commit `cb86a45` reportedly marked it done. Re-read current `TASKS.md` before editing; if it still says Not started, fix the task status with evidence from smoke tests:
  - new file editor focused for immediate typing
  - plain text preview renders readable wrapped text
  - session sidebar retains edited files with an unsaved marker

## Suggested Next Autonomous Execution Order

1. Backlog cleanup increment.
   - Fix any stale statuses in `TASKS.md` for Tasks 18 and 19 after verifying current tests.
   - Run full check, commit, push.
2. Matrix schema enrichment increment.
   - Add required fields to `docs/examples/compatibility.json`.
   - Update `tests/example-compatibility.test.mjs`.
   - Optionally add `scripts/gen-example-compatibility.mjs` if manual JSON editing becomes brittle.
   - Run full check, commit, push.
3. Matrix UI increment.
   - Make matrix quality/provenance/partial status visible in the examples UI in a small way.
   - Update `tests/areas/examples-catalog.mjs`.
   - Run full check, commit, push.
4. Metadata grouping contract increment.
   - Strengthen normalization/grouping tests.
   - Possibly export a pure grouping helper from `docs/core/meta-drawer.js` if needed.
   - Run full check, commit, push.
5. Sample quality triage increment.
   - Pick one weak sample family.
   - Use local `.example-files-internet/` only for analysis; promote only validated and license-safe files.
   - Add provenance to `docs/examples/index.json`.
   - Update matrix.
   - Run full check, commit, push.
6. Git/cache or archive-sidebar performance increment.
   - Choose one bounded performance task with smoke/unit coverage.
   - Run full check, commit, push.

## Subagent Guidance

Use subagents when available. Good subagent tasks:

- FileExamples matrix research: compare FileExamples format catalogue to current registry/matrix. Use web because catalogue can change.
- Sample quality audit: identify thin/synthetic samples and propose replacements with licensing/provenance.
- Metadata audit per family: inspect current metadata modules and propose the next narrow implementation.
- UI audit: examples browser matrix visibility and smoke coverage.
- Performance audit: git/folder loading hotspots and caching boundaries.

Tell subagents:

- Do not edit files unless assigned a worker implementation with clear ownership.
- Do not stage or modify `.example-files-internet/`.
- Report exact file paths and tests.
- For coding workers, assign disjoint file ownership to avoid conflicts.

Recent attempted subagent:

- A UI examples matrix explorer was spawned but failed due usage limit. No file changes came from it.

## Helpful Commands

```bash
git status --short
git log --oneline -8
./scripts/check.sh
node tests/example-compatibility.test.mjs
node tests/type-info.test.mjs
node tests/metadata-normalize.test.mjs
node tests/archive-metadata.test.mjs
node tests/smoke.mjs
python3 -m http.server 8000 --directory docs
```

Use `rg` for repository search:

```bash
rg -n "compatibility|File Examples|metadata|TODO|Status:" TASKS.md RUN_REQUIREMENTS.md docs tests
```

## Completion Criteria For The Long-Run Goal

Do not mark the active goal complete until all of this is proven against current state:

- Every FileExamples format/category has a matrix row, current support classification, extension coverage, and notes.
- Every registered type has meaningful sample coverage and validated renderer behavior.
- Every known/enhanced file has a dedicated sample and metadata coverage.
- Missing FileExamples formats that are in scope have either support added, a planned row, or an explicit unsupported/partial reason.
- Samples are real-world meaningful where feasible, with provenance for sourced examples.
- Broken/edge-case files are represented as intentional error-handling fixtures only when useful.
- Metadata coverage has been audited and improved across all file families.
- Editing/interactions backlog is implemented or explicitly scoped with tests.
- Performance/loading/security/light-dark/archive/companion/game open items are addressed.
- `./scripts/check.sh` passes.
- The work is committed and pushed to `dev`.
