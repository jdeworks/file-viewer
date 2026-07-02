# File Viewer General Lane

This file is the durable backlog and execution guide for the general file-viewer lane. It is intended to be referenced by a short Codex `/goal` prompt so the active goal can work one coherent slice at a time without losing the broader context.

## Operating Contract

- Work research-first: inspect and reproduce current behavior before changing code.
- Complete one coherent slice at a time; avoid mixing unrelated UI, game, detection, and performance work in the same increment.
- Keep the runtime trust guarantee: no CDN, telemetry, analytics, or other off-origin runtime requests.
- Prefer focused validation while iterating, then run `./scripts/check.sh --fast` or a stronger relevant gate before marking a slice done.
- If generated artifacts change because a slice touches generated inputs, regenerate and include the generated outputs intentionally.
- Update this file after each completed slice with status, notes, likely files touched, and validation run.
- Do not mark the overall lane complete until every checklist item is done or explicitly marked out of scope by the user.

## Codex Goal Prompt

Use this prompt with `/goal`:

```text
Work through @GENERAL_LANE.md for the file-viewer general lane. Start research-first, then complete one coherent slice at a time. For each slice: inspect/reproduce current behavior, make the smallest appropriate implementation, run focused validation plus the repo's relevant check command, update GENERAL_LANE.md with status and notes, and stop for user input only if the next decision cannot be derived from the repo or the file. Preserve the zero off-origin runtime guarantee and do not mark the goal complete until every checklist item in GENERAL_LANE.md is done or explicitly marked out of scope by the user.
```

## Research Notes

- Codex `/goal` works best for persistent multi-step objectives with measurable completion criteria. Goal objectives are limited to 4,000 characters, so detailed instructions should live in a file and the goal should point at it.
- Breakout/Arkanoid research baseline: common improvements include laser/shooting, catch/sticky paddle, expand paddle, slow ball, multiball, extra life, break/level skip, wider or varied levels, and richer SFX.
- Minesweeper solvable/no-guess baseline: the generated board should have a deterministic logical path from first tap to completion, not just a safe first click.
- Current repo observations before implementation:
  - Markdown WYSIWYG is TipTap, but some comments and offline-modal grouping still reflect older EasyMDE-era assumptions.
  - `docs/core/app.js` has many static imports and an idle Monaco warmup, so startup work should begin with measurement and import-graph analysis.
  - `.txt` currently gets a weak raw score, while content sniffers such as YAML can outrank it; plain text should remain available as a common fallback.
  - The type help modal currently renders `docs/readme/<type>.md` but internal links are treated as external targets instead of opening docs inside the viewer/help flow.

## Checklist

### 1. Startup And Lazy-Load Structure Audit

- Status: done
- Goal: analyze initial request/load structure and identify concrete bundling or lazy-load changes before editing.
- Notes:
  - Inspect static imports from `docs/core/app.js`, generated registry chunks, service worker/cache behavior, Monaco warmup, and game preload paths.
  - Include Sokoban level/solution request behavior in the audit; decide whether loading level and solution data can be combined or staged better.
  - 2026-07-02: Cold-load Playwright trace showed 97 requests over 5s on the empty screen, including `vendor/monaco/vs/loader.js`, `vendor/monaco/vs/editor/editor.main.js`, and `vendor/monaco/vs/editor/editor.main.css` from the idle Monaco warmup. Removed the startup Monaco warmup and moved code-metrics CodeLens registration into the raw editor path. Follow-up trace showed 92 requests over 5s and zero `vendor/monaco` requests before opening a file; opening a JS file still loaded Monaco, `codelens.js`, and `metrics.js` on demand and rendered CodeLens badges.
  - 2026-07-02: The first broad `./scripts/check.sh --fast` exposed an archive sidebar race where a zip entry filename updated before the sidebar active row was reaffirmed. Fixed `docs/core/archive-tree.js` to set the active archive entry and root current path as soon as extraction succeeds, then reaffirm after `loadIntake()`.
  - Remaining broader optimization opportunities from the audit: app shell still has many static core imports, examples and offline bundles are large, and Sokoban level/solution data can be bundled or staged more deliberately. These should be handled under the offline-modal/cache-preset work or a later dedicated performance slice rather than mixed into this startup Monaco fix.
- Files likely involved: `docs/core/app.js`, `docs/core/boot.js`, `docs/core/offline.js`, `scripts/gen-asset-manifest.mjs`, `docs/games/sokoban/`
- Validation: Playwright request trace on cold load; compare request count/timing before and after any optimization; run relevant smoke area. Latest focused validation: `node tests/smoke-area.mjs core-ui` and `node tests/smoke-area.mjs email-archives` passed on 2026-07-02. Latest broader gate: `./scripts/check.sh --fast` passed on 2026-07-02.

### 2. Markdown WYSIWYG Round Trip

- Status: done
- Goal: switching Markdown WYSIWYG to raw and back must preserve edits and the preview must reliably return.
- Notes:
  - Reproduce the failure with a Markdown sample, including edit in WYSIWYG, switch to raw, edit raw, switch back to WYSIWYG, and preview recovery.
  - Ensure session/folder edit state, dirty state, download text, autosave, and preview render all use the same latest markdown value.
  - 2026-07-02: Reproduced that raw edits made after leaving WYSIWYG were present when re-entering WYSIWYG, but switching back to Monaco left the layout in the WYSIWYG-forced raw view and did not refresh the preview. Fixed `toggleWysiwyg()` to rebuild Monaco, re-render the Markdown preview, and re-apply layout when leaving WYSIWYG.
  - Added a regression path to `tests/areas/interactions.mjs`: WYSIWYG -> raw -> raw edit -> WYSIWYG -> raw, asserting latest raw edits reach TipTap and the split preview returns with fresh rendered Markdown.
- Files likely involved: `docs/core/rawpane.js`, `docs/types/markdown/wysiwyg.js`, `tests/markdown-edit-actions.test.mjs` or a Playwright area test
- Validation: `node tests/smoke-area.mjs interactions` passed on 2026-07-02. `./scripts/check.sh --fast` passed on 2026-07-02.

### 3. Offline Save Modal Update

- Status: done
- Goal: make the Save offline modal reflect current lazy-load behavior and useful presets.
- Notes:
  - Remove stale EasyMDE assumptions if EasyMDE is no longer used.
  - Add presets next to Select all and Deselect all:
    - Common V: common viewing capability.
    - Common E: Common V plus common editing dependencies.
    - Office V: office/document viewing, including Markdown, PDF, XLSX, PPTX, DOCX/ODF where supported.
    - Office E: Office V plus editing/export dependencies where supported.
  - Split example files into multiple cache chunks instead of one broad examples bundle, and verify each chunk works with lazy loading.
  - Add a dedicated easteregg checkbox/bundle for the accumulated hidden/game content.
  - 2026-07-02: Added Common V, Common E, Office V, and Office E preset buttons to the cache modal. The modal now defaults to Common V instead of all small/uncommon libraries, while Select all still supports full offline caching.
  - 2026-07-02: Split the former monolithic `examples` bundle into catalog, text/config, data, office/document, image, media, and archive/binary example bundles. Added a dedicated `easteregg` bundle covering `.bts`, metagame assets, and the easteregg sample. EasyMDE is labeled as a legacy editor bundle and left unchecked by default.
  - Type renderer splitting is still a separate performance concern: the current runtime still ships a single heavy `types` bundle in the offline picker, so the presets select that bundle for broad viewing coverage. Deeper per-type bundle splitting belongs with a later registry/runtime performance slice.
- Files likely involved: `docs/core/offline.js`, `scripts/gen-asset-manifest.mjs`, `docs/asset-manifest.json`, `tests/areas/core-ui.mjs`
- Validation: `node tests/smoke-area.mjs core-ui` passed on 2026-07-02; `node tests/smoke-area.mjs interactions` passed on 2026-07-02; `./scripts/check.sh --fast` passed on 2026-07-02.

### 4. Type Detection And Fallback Audit

- Status: done
- Goal: make common fallback choices available and reduce false enhanced-view triggers.
- Notes:
  - `.txt` must always make plain text/text viewer available even when a stronger content detector wins.
  - `log_sqlmap_errors.txt` should not become a dead-end YAML selection; YAML may still be a candidate if content matches, but text must be an obvious option.
  - Markdown plans with code fences should not trigger enhanced Dafny incorrectly.
  - Review SQL/SPARQL detection confusion and decide whether SQL needs a dedicated text type or known-file enhancer.
  - 2026-07-02: Confirmed the sqlmap error log was selected as YAML because YAML content sniffing scored above the explicit `.txt` raw detector. Lowered YAML content-sniff score for `.txt`/`.text` files so Plain text wins while YAML remains an available candidate; `.yaml` extension detection still wins for actual YAML files.
  - 2026-07-02: Tightened enhanced Dafny matching so Markdown base files are excluded from content-only Dafny detection, while `.dfy` files still match directly. Content-only Dafny now needs both declaration and specification signals instead of a loose keyword count.
  - 2026-07-02: Tightened SPARQL content-only matching so ordinary SQL `SELECT` text no longer triggers the SPARQL known-file enhancer. Extension-based `.sparql`/`.rq` detection remains direct, and content-only matching now requires SPARQL/RDF structure.
- Files likely involved: `docs/core/detect.js`, `docs/core/type-select.js`, `docs/types/text/raw/detect.js`, relevant known-file detectors
- Validation: `node tests/registry-runtime.test.mjs` passed on 2026-07-02; direct runtime check confirmed `.example-files-internet/log_sqlmap_errors.txt` ranks `raw` 0.2 over `yaml` 0.18; `node tests/smoke-area.mjs simple-types` passed on 2026-07-02; `./scripts/check.sh --fast` passed on 2026-07-02.

### 5. Big-File Loading Feedback

- Status: done
- Goal: loading a big file around 500 KB and above should show visible progress/spinner instead of appearing stuck.
- Notes:
  - Cover file picker, drag/drop, and folder tree opens where practical.
  - Keep the existing very-large-file warning/truncation behavior intact.
  - 2026-07-02: Added a 500 KB read-feedback threshold for single-file intake. File picker and drop share the same `wireIntake()` file path, so both now show a compact top-of-screen loading indicator before bytes are read and clear it after the file opens or errors.
  - 2026-07-02: Folder-tree file opens now show the existing sidebar loading notice for large unread edited files before reading from disk, then clear it when the selected file is open. Existing 8 MB large-editor confirmation and 64 MB truncation behavior are unchanged.
- Files likely involved: `docs/core/intake.js`, `docs/core/app.js`, `docs/core/folder.js`
- Validation: `node tests/smoke-area.mjs core-ui` passed on 2026-07-02 with a delayed 500 KB+ picker file; `node tests/smoke-area.mjs ebook-git` passed on 2026-07-02 with a delayed 500 KB+ folder-tree file; `./scripts/check.sh --fast` passed on 2026-07-02.

### 6. JSON Enhanced View Context Actions

- Status: done
- Goal: make JSON preview easier to inspect, find, and copy from.
- Notes:
  - Add right-click or equivalent context actions for copying JSONPath, key/path, and value.
  - Keep redaction behavior for sensitive values; do not add a secret-copy bypass.
  - Preserve query panel and screenshot/static HTML behavior.
  - 2026-07-02: Added a live-only right-click context menu to the generic JSON tree. It copies JSONPath, key/path, and value for the selected row or object summary without changing the static `bodyHtml` used by screenshots and exports.
  - 2026-07-02: Value copy respects existing secret redaction: secret-like fields copy `[configured]` instead of the raw parsed value, while the JSON Structure Review and redacted source remain unchanged.
- Files likely involved: `docs/types/text/json/renderer.js`, `docs/core/query-panel.js`
- Validation: `node tests/smoke-area.mjs structured-types` passed on 2026-07-02 with JSONPath/key/value context-copy coverage and redacted value-copy coverage; `./scripts/check.sh --fast` passed on 2026-07-02.

### 7. SQL Enhanced View

- Status: done
- Goal: make SQL-like text more useful than a generic code view.
- Notes:
  - Collapse raw source/code by default in the enhanced preview.
  - Extract and summarize tables, joins, aliases, CTEs, and referenced schemas where practical with a lightweight parser/heuristic.
  - Investigate SQL files being identified as SPARQL and fix detection or ranking if confirmed.
  - 2026-07-02: Added a `sql-query` known-file enhancer for `.sql` files and SQL-like Code files. The underlying base type remains Code for raw editing/diff, while the enhanced preview summarizes statement types, table references, schemas, aliases, joins, CTEs, and query modifiers.
  - 2026-07-02: SQL source is shown through the standard source preview collapsed by default. `query.sql` is now tagged as the sample for the SQL enhancer in the examples catalog and compatibility matrix.
  - 2026-07-02: Confirmed `query.sql` no longer renders as SPARQL, while `sample.sparql` still uses the SPARQL enhancer and `postgresql.conf` still uses the PostgreSQL config enhancer.
- Files likely involved: likely new or existing text/known SQL enhancer, `docs/core/examples-known.js`, code detection maps
- Validation: `node tests/registry-runtime.test.mjs`, `node tests/example-compatibility.test.mjs`, and `node tests/smoke-area.mjs structured-types` passed on 2026-07-02 with `query.sql`, `postgresql.conf`, and `sample.sparql` coverage; `./scripts/check.sh --fast` passed on 2026-07-02.

### 8. Help And Docs Modal Audit

- Status: done
- Goal: update the question-mark help/docs experience so it matches current capabilities.
- Notes:
  - Audit `docs/readme/*.md` for stale capability descriptions and missing current features.
  - Fix internal links such as `welcome.md` or readme-relative links so they open in the app/help context instead of a broken external tab.
  - Keep this behavior scoped to the question-mark docs modal, not general Markdown file rendering.
  - Track remaining documentation gaps explicitly.
  - 2026-07-02: Added a help-doc alias so the `raw` Plain text type opens `docs/readme/text.md` instead of missing docs.
  - 2026-07-02: Scoped readme-relative links to navigate inside the help modal and scoped example links to open same-origin sample files through the viewer. General Markdown rendering still uses normal Markdown link behavior.
  - 2026-07-02: Updated JSON, Markdown, Source Code/SQL, and stale sample-link docs so current features are represented and broken example references are removed or corrected.
  - 2026-07-02: Docs audit checked 152 actual help pages with zero missing internal readme/example links and zero placeholder `/` links.
- Files likely involved: `docs/core/type-help.js`, `docs/readme/`
- Validation: `node tests/smoke-area.mjs interactions` passed on 2026-07-02 with help-modal coverage for the Plain text alias, readme-relative navigation, example-link metadata, and in-app `welcome.md` opening without file-not-found; `node tests/smoke-area.mjs core-ui` passed on 2026-07-02 after manifest regeneration; docs-link audit passed on 2026-07-02 with 152 pages checked and 0 missing links; `./scripts/check.sh --fast` passed on 2026-07-02.

### 9. Breakout Improvements

- Status: done
- Goal: make Breakout more fun and configurable using proven Arkanoid-style patterns.
- Notes:
  - Add more and wider levels; consider canvas/layout changes that remain mobile-friendly.
  - Add option to skip a level.
  - Add speed option.
  - Add SFX with mute/respect-user-gesture behavior.
  - Add powerups such as laser/shooting and sticky/catch paddle; keep current multiball, expand, slow, and life behavior.
  - 2026-07-02: Research pass confirmed Arkanoid-style staples: enlarge, catch/sticky, slow, laser, disruption/multiball, extra life, and level-skip/break behavior.
  - 2026-07-02: Expanded Breakout from six 8-column maps to twelve 12-column maps while keeping the canvas responsive with `max-width:100%`.
  - 2026-07-02: Added Calm/Normal/Fast speed selector with persistence, a Skip level button, and a mute toggle for small Web Audio SFX created only after player/game interaction.
  - 2026-07-02: Added Sticky/Catch capsules that catch a paddle hit and release via Space/tap/Tab, plus Laser capsules that fire twin shots into bricks. Existing multiball, expand, slow, and life capsules remain.
  - 2026-07-02: Updated the arcade registry blurb and regenerated the offline asset manifest/service worker stamp.
- Files likely involved: `docs/games/breakout/breakout.js`, `docs/games/breakout/maps.js`, `tests/areas/games.mjs`
- Validation: `node --input-type=module` map sanity check passed on 2026-07-02 for 12 maps with 12 columns; `node tests/smoke-area.mjs games` passed on 2026-07-02 with hooks for wider level set, speed option, skip level, sticky catch/release, and laser brick collision; `./scripts/check.sh --fast` passed on 2026-07-02.

### 10. Minesweeper Difficulty And Solvable Mode

- Status: done
- Goal: add explicit difficulty choices, including deterministic no-guess solvable mode.
- Notes:
  - Add Easy, Medium, Hard, and Solvable modes.
  - Solvable mode must ensure a logic-only path from first click to completion, using a generator plus solver/checker rather than only safe-first-click placement.
  - Keep touch-friendly flag mode and right-click behavior.
  - 2026-07-02: Research pass confirmed the standard no-guess approach: generate candidates, run a deterministic solver, and accept only boards completed without guessing. Solver patterns used here are single-cell rules, subset constraints, and global mine-count constraints.
  - 2026-07-02: Added Easy (9x9/10), Medium (12x12/22), Hard (16x16/45), and Solvable (9x9/10) modes with mode persistence.
  - 2026-07-02: Solvable mode now generates after the first click and only accepts boards the deterministic solver can complete from that click. First-click safe area, touch Flag mode, and desktop right-click flagging remain intact.
  - 2026-07-02: Added smoke hooks to prove Solvable boards across multiple first-click starts and updated the arcade registry blurb. Regenerated the offline asset manifest/service worker stamp.
- Files likely involved: `docs/games/minesweeper/minesweeper.js`, `tests/areas/games.mjs`
- Validation: `node --input-type=module` Minesweeper import sanity check passed on 2026-07-02; `node tests/smoke-area.mjs games` passed on 2026-07-02 with Easy/Medium/Hard/Solvable mode coverage, touch flag mode coverage, and deterministic no-guess proofs across multiple first-click starts; `./scripts/check.sh --fast` passed on 2026-07-02.

### 11. Sample-File And Tool Links

- Status: done
- Goal: connect relevant sample files with useful tools where it improves discovery.
- Notes:
  - Add links from sample files or sample metadata to tools such as ASCII art where appropriate.
  - Keep links same-origin and compatible with offline caching.
  - 2026-07-02: Local research found the existing standalone tool surface is `docs/tools/ascii-studio`, and the most relevant samples are common browser-decodable raster images.
  - 2026-07-02: Added `tools` metadata for PNG, JPG/JPEG, GIF, WebP, and BMP image samples pointing to same-origin ASCII Studio URLs with the sample encoded as a query parameter.
  - 2026-07-02: The examples gallery now renders optional tool links beside sample buttons without changing the primary sample-open behavior, and search includes tool labels/descriptions.
  - 2026-07-02: ASCII Studio now accepts `?sample=...` and loads normalized same-origin files from `docs/examples`, falling back to its generated sample if loading fails.
  - 2026-07-02: Regenerated the offline asset manifest/service worker stamp so the updated metadata and tool app remain cacheable.
- Files likely involved: `docs/examples/index.json`, `docs/tools/`, `docs/core/examples.js`
- Validation: JSON metadata sanity check and direct ASCII Studio sample-load probe passed on 2026-07-02; `node tests/smoke-area.mjs examples-catalog` passed on 2026-07-02 with same-origin tool metadata, rendered gallery link, linked sample loading in ASCII Studio, and zero off-origin coverage; `./scripts/check.sh --fast` passed on 2026-07-02.

## Completion Criteria

- Every checklist item is `done` or explicitly marked `out of scope` with the user's approval.
- Each completed item records validation run.
- The final state passes the relevant focused tests and the agreed repo gate.
- No new runtime off-origin requests are introduced.
