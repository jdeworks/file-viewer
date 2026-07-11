# Enhanced-view release fidelity implementation handoff

## Goal

Ship the remaining enhanced-view release-fidelity fixes on `dev`: asynchronous previews must be latest-request-wins; capped summaries and catalog claims must be truthful; Office and duplicate-JSON views must expose fidelity-relevant data; enhanced summaries must retain an obvious exact-source path. Finish with adversarial desktop/mobile/offline coverage, the complete repository gate, a clean push to `origin/dev`, and no release, tag, or deployment.

## Requirements

- Guard every main preview request across asynchronous module loading and renderer execution. A superseded request may neither mutate UI/state through its context callbacks nor commit success/error output; any stale renderer-owned resources must be disposed.
- Deterministically cover the confirmed package.json enhancement-toggle to Dockerfile race plus multiple delayed success/error orderings, settings rerenders, and disposal.
- Audit every renderer surfaced by the cap/truncation scan. Any collection cap must retain the source total and visibly report `Showing N of total` or `+N more`; character shortening must remain visibly ellipsized. Repair the confirmed Tauri, Hadolint, Heroku app.json, EditorConfig, Hydra, Brewfile, and ragged-CSV defects and any additional silent caps found during classification.
- In XLSX preview, expose formulas versus cached values, comments, safe hyperlink targets, and hidden/very-hidden sheet state before edit mode; preserve untouched workbook structures on export where SheetJS permits and warn about formula replacement and lossy/unsupported workbook features.
- In DOCX preview, show the conversion warning in read mode, keep the original file available and unmistakable, and permit a clearly labelled rebuilt DOCX only after a real edit.
- In PPTX preview, extract and expose speaker-note content and count with existing local ZIP/XML tooling; never silently omit notes.
- Detect duplicate object keys in exact JSON/JSONC source without rewriting it. Report duplicate key, object path, and source line in generic JSON and enhanced package.json views; distinguish repeated keys in separate scopes and remain safe on malformed input.
- Describe applicable known text views as enhanced summaries, preserve `Show default view`, and prove exact source equality across enhanced/default toggles on desktop and through the mobile Raw tab.
- Mark the twelve named constrained examples partial unless their essential payload is now rendered. Each corresponding viewer must contain a visible capability/omission statement; NetCDF must explicitly say variable payload values are not shown.
- Generate adversarial fixtures in tests rather than checking in test clutter where practical. Keep screenshots, downloads, profiles, and scratch output outside the repository and remove them.
- Commit small outcome-focused increments, update this handoff after each milestone, regenerate derived assets, record durable decisions in YAMS, remove this completed handoff at the end, fetch and non-force-push, and prove all repository worktrees clean with `HEAD == origin/dev`.

## Assumptions

- The detailed goal is implementation authorization; no additional sign-off is required after this mandatory plan review.
- “Fidelity-aware” does not require a full Microsoft Office editing engine. The selected contract is honest inspection plus loss warnings: an XLSX cell inspector, distinct original/rebuilt DOCX downloads, and extracted PPTX notes. Raw OOXML ZIP/XML assertions supplement same-library round trips so SheetJS/Mammoth/PPTXViewer cannot validate their own omissions.
- Hyperlink inspection will display the exact target safely as text and only create a clickable link for explicitly allowed `http:`/`https:` schemes with safe link attributes; no preview will fetch a hyperlink target.
- Generated Office and race fixtures stay in test memory or temporary directories. No new binary catalog sample is needed unless browser/library limitations make an in-memory fixture impossible.
- The global known-view switch label becomes `Enhanced summary: <type>`; individual renderers may add more specific omission text where they summarize.
- The side-by-side controller is confirmed vulnerable to overlapping `ensurePreview()` calls and destruction during a pending render. It receives its own request/disposal guard; this is no longer conditional.
- All twelve named examples are locked to `partial: true`; none of their renderers currently covers the format's essential payload sufficiently to justify a full-support claim.
- `/home/jens/.codex/YAMS.md` is the canonical memory instruction file because this checkout has no repository-local `YAMS.md`. `MODEL_ROUTING.md` is absent; the available independent plan reviewer will be used without a model override.
- Existing unrelated tracked work, if any appears, remains untouched. There is no authorization to tag, publish, release, or deploy.

## Plan

1. **Commit the reviewed handoff and frozen audit denominator.** Action: incorporate both independent read-only reviews; retain the exact 47-candidate scan command and classification table below; add a permanent test ledger whose reproduction of that scan must match the frozen candidate keys or fail on additions/removals; then commit this plan before product edits. Purpose: make every contract and remaining item restart-safe and make cap-audit completeness mechanically checkable. Expected result: a reviewed, committed implementation map plus a test-owned denominator, with each candidate classified as repair, already truthful, or non-collection character truncation.

2. **Make intake activation and preview rendering transactional and latest-request-wins.** Action: create the generation at accepted file/type-selection intent, before detection, `getModel`, `activateType`, module loading, or rendering. Each immutable request snapshot owns intake, type, known/default choice, settings values, layout/mobile mode, folder identity, HTML-script state, an `AbortController`, and an idempotent cleanup registry. `ctx.onCleanup(fn)` registers allocations immediately; invalidation aborts and drains them exactly once, late registrations drain immediately, and a successful atomic commit transfers committed cleanup to the mounted preview lifecycle. Gate every mutation and callback: detection/activation state, errors/offline cards, HTML confirmation flags, `onBinaryEdit`, `openIntake`, toast, archive tree/open-entry, iframe messages, `lastBodyHtml`, export state, and layout. Gate lazy event-driven work after commit with the same signal/destroyed state. Remove PPTX's module-global viewer ownership and make every main/side-by-side instance independent. Give side-by-side its own generation, abort, atomic commit, and destruction guard. Purpose: prevent both old loads and old renderers from contaminating newer intent while reclaiming resources allocated before a result exists. Expected result: only the current request can mutate or commit, and stale/formerly-current resources are disposed exactly once.

3. **Add deterministic preview-concurrency coverage and commit the race fix.** Action: provide controllable promise checkpoints and synthetic renderers in the browser harness; exercise old-success/new-success, old-error/new-success, newer-success/older-success, overlapping detection/activation, settings and theme rerenders, enhancement toggles, layout/mobile capture, file replacement, clear/no-preview, renderer allocation-then-rejection, late cleanup registration, late context callback, iframe callback, live-node disposal, side-by-side rerender/destruction, and the actual package.json-to-Dockerfile reproduction. Assert atomic DOM commits and exactly-once cleanup, not only final text. Purpose: avoid timing-flaky sleeps and prove all completion orderings and lifecycle phases. Expected result: Dockerfile never receives JSON content/error, every stale disposer is observed once, focused core/mobile tests pass, and the first behavior commit is durable.

4. **Centralize truthful collection-cap presentation and complete the frozen renderer audit.** Action: add a small pure helper that receives the unsliced collection and cap and returns shown items/count, source total, and an accessible `+N more`/`Showing N of total` message. Repair every `repair` row in the ledger plus confirmed out-of-pattern Tauri caps and the supplemental inline caps found in the same files. Renderer-imposed caps must fully count parsed source; only globally truncated intake may say the full-file total is unknown. Add below-cap, exactly-at-cap, and above-cap adversarial assertions for every distinct repaired cap; the frozen scanner test fails if any candidate is unclassified or changes unexpectedly. Purpose: eliminate misleading completeness without removing performance bounds. Expected result: all 47 original candidates are durably classified, every omitted source item has a truthful remainder, and no displayed total comes from sliced data.

5. **Repair ragged CSV semantics and commit summary-fidelity fixes.** Action: compute the table width from the maximum row length, generate stable fallback column labels beyond a short header, preserve every ragged cell, and test short-first/wide-later plus wide-first/short-later data. Run renderer-focused tests and inspect representative desktop/mobile summary output before committing. Purpose: report and render the actual table shape. Expected result: column count and cells agree for adversarial CSV while capped text summaries remain explicit.

6. **Add loss-aware XLSX inspection and commit it independently.** Action: retain workbook cell metadata alongside displayed values; add keyboard-accessible selection/inspection that shows address, formula and cached/display value separately, comments, and safe/unsafe hyperlink targets. Label hidden state `1` and very-hidden state `2` on ordered sheet tabs. Editing a formula cell opens an explicit replace-formula confirmation: cancel restores the original cell; accept records a deliberate value replacement. Deltas update only value/formula fields while retaining SheetJS-exposed comment, link, style, and number-format metadata on the edited cell; untouched cells/sheets remain unmodified in memory. Show a persistent export-fidelity warning. Generate a multi-sheet fixture and assert formulas plus cached values, comments, HTTP and unsafe links, hidden states, order, formatted untouched cells, accepted/cancelled formula edits, and export using both SheetJS re-open and raw OOXML ZIP/XML relationships/properties. Purpose: make critical workbook semantics visible without edit mode and make loss deliberate. Expected result: formula loss cannot happen without acceptance, untouched structures survive as far as the library exposes them, focused Office tests pass, and XLSX lands in its own commit.

7. **Separate original and rebuilt DOCX behavior and commit it independently.** Action: make the read-mode conversion notice persistent; add an always-available original-byte download with original name/MIME; label reconstructed output `Download rebuilt .docx`; and compare the current normalized editor document against the baseline after every update so entering/exiting unchanged or reverting all edits keeps rebuilt export disabled. Guard lazy TipTap import/initialization with request destruction/abort state. Add a generated sentinel DOCX and tests for read/edit/unchanged/reverted/edited states; assert original download SHA-256, bytes, name, MIME, and rebuilt raw ZIP/XML structure/content. Purpose: prevent a lossy conversion from masquerading as the source document. Expected result: unchanged users can recover the exact original, only a net edit enables a distinguished rebuilt copy, and DOCX lands in its own focused commit.

8. **Expose PPTX speaker notes and commit it independently.** Action: add a shared bounded local ZIP/XML extractor that maps presentation order through presentation, slide, and slide-relationship files to notes-slide relationships; deliberately decouple fixture filenames/order. Include non-empty `p:ph type="body"` placeholder paragraphs because those are speaker notes; exclude slide-image, header/footer, date, and slide-number placeholders. Define headline count as notes-bearing slides and additionally expose paragraph count. Cap ZIP entry count and XML bytes, continue to report truthful known totals, and render extracted strings only through `textContent`. Replace module-global `activeViewer` with instance ownership and abort/destroy checks. Validate fixture relationships independently, then assert exact sentinel/count/mapping in preview and metadata plus raw XML oracles and desktop/mobile visuals. Purpose: stop silent note omission without adding unsafe ZIP/XML work. Expected result: note-bearing decks visibly expose correctly mapped notes with zero off-origin access, and PPTX lands in its own focused commit.

9. **Implement bounded, scope-aware duplicate JSON diagnostics.** Action: add a linear non-mutating lexer/parser companion over exact source that handles BOM, CRLF, strings/escapes, objects, arrays, JSONC comments/trailing commas, and malformed/incomplete tails. Compare decoded keys (`"a"` equals `"\u0061"`), store per-object keys in `Map` (safe for `__proto__`), use escaped JSON Pointer paths including array indices, and report 1-based first and duplicate line/column. Keep the existing parse error primary on malformed input while retaining any certain diagnostics found before the malformed tail. Cap stored diagnostics but continue counting all duplicates and visibly report omitted diagnostics. Integrate identically into generic JSON and package.json issue UI without changing parse/source. Test nested/separate scopes, objects in arrays, escaped keys, strings containing comment/bracket text, JSONC, BOM/CRLF, malformed/truncated input, diagnostic cap boundaries, desktop, mobile, and toggles. Purpose: prevent last-value-wins parsing from hiding ambiguity without creating a replacement parser. Expected result: only same-object decoded-key duplicates warn, all warning text is escaped, locations/paths are unambiguous, and exact source remains unchanged.

10. **Make summary semantics and exact-source escape paths explicit.** Action: rename the known-view control to `Enhanced summary`, preserve the default-view action, and add representative browser assertions for JSON, YAML, TOML, Dockerfile, Compose, Makefile, and code views. Use original intake bytes/SHA-256 as the immutable oracle and separately assert the live raw-editor model/default display. Fixtures include BOM, CRLF, Unicode, trailing newline, unknown fields, and unsaved raw edits. Repeated settings/theme/enhanced/default toggles must neither normalize nor reset current content. Desktop must show source and summary simultaneously; mobile Raw must be one explicit tab action away and contain the same current source before/after toggles. Purpose: describe the enhanced pane honestly without sacrificing exact source or edits. Expected result: summaries improve navigation while source bytes and current editor text have distinct, definitive equality proofs.

11. **Correct all twelve partial-support claims and in-view notices.** Action: set `partial: true` for every named example now. Add/sharpen a format-specific, always-visible (no expansion required) capability notice in normal and parse-error/unsupported-variant paths for Blend, DICOM, DWG, EXR, FBX, FITS, NetCDF, NIfTI, Pages, RTF, Sketch, and EPS. NetCDF must say verbatim in substance that metadata/dimensions are shown and variable payload values are omitted. Regenerate examples summary and open each real sample in desktop and mobile browser tests, asserting the notice is computed-visible rather than merely present in source. Purpose: align discovery claims with actual capability. Expected result: all twelve are partial in catalog and every path explains the omitted essential content.

12. **Perform layered online, hard-offline, visual, and fixed-point validation.** Action: run focused new fidelity tests throughout; then structured-types, tabular-office, binary-types, examples-catalog, mobile renderer layout, and zero-off-origin smoke. Prime the production service-worker cache, disable network, hard-reload, and open generated/local-intake XLSX, DOCX (including lazy Edit), PPTX notes, duplicate JSON, and capped summaries; assert no missing cached asset or request escape. Serve locally for desktop/mobile visual checks, write screenshots only to an owned `/tmp` directory, inspect, then delete it. Record durable decisions/residual limitations in YAMS (superseding memory `mem_62b1ed92e68e`) and update this file with exact results. Remove this temporary plan, regenerate to a fixed point, and commit. Fetch `origin/dev` immediately before the final gate; if it advanced, integrate by non-force merge when cleanly safe (otherwise stop for direction), then rerun all affected focused tests and the complete gate. Run full `./scripts/check.sh` on a clean committed HEAD; if it or any later fix changes files, commit and rerun the full gate until fixed. Push explicitly without force, fetch again, compare remote SHA/divergence, and inspect every worktree. Unknown changes in any worktree block completion and are never deleted. Purpose: prove the exact remote commit, not a pre-integration tree. Expected result: every adversarial fidelity case and the full project gate pass on the clean commit at `origin/dev`.

## Validation

- Unit/static: frozen 47-row cap-ledger reproduction, helper boundaries, every repaired cap below/equal/above threshold, duplicate-key scanner cases, CSV shape cases, bounded PPTX notes extraction, and catalog claims.
- Deterministic browser concurrency: controllable renderer promises and disposal spies covering multiple resolution/rejection orderings, including package.json enhanced render superseded by Dockerfile.
- Office browser fixtures: generated XLSX formula/cached-value/comment/http-and-unsafe-link/hidden/very-hidden/multi-sheet/formatted workbook; generated sentinel DOCX with exact-original/reverted/rebuilt flows; generated PPTX whose slide/notes filenames are deliberately out of order. Raw OOXML ZIP/XML provides an independent oracle.
- Enhanced source fidelity: intake-byte SHA-256 plus separate current-editor/default-display assertions over BOM/CRLF/Unicode/trailing-newline JSON, YAML, TOML, Dockerfile, Compose, Makefile, and representative code on desktop and mobile, including unsaved edits.
- Area suites: `structured-types`, `tabular-office`, `binary-types`, `examples-catalog`, and `mobile-renderer-layout`, using the repository's shared zero-off-origin harness.
- Offline/security: smoke tests report no off-origin requests; hyperlink targets are never fetched; ZIP/XML processing is bounded and local; a primed production cache survives network-disabled hard reload through lazy Office and new-fidelity paths.
- Visual: desktop and narrow/mobile checks for stale-preview recovery, cap notices, JSON diagnostics, XLSX inspector/sheet labels, DOCX download distinction, PPTX notes, and each real partial sample notice. Screenshots live only in an owned `/tmp` directory which is deleted.
- Final: plan removed; regenerated outputs committed and fixed-point; complete `./scripts/check.sh` passes on a clean final `HEAD` after the last fetch/integration; `git diff --check`; post-push fetch proves local `HEAD == origin/dev`; every worktree has empty stage, no tracked modifications, and no untracked files.

## Risks

- **Resources can be allocated before a renderer returns or rejects.** Mitigation: request-owned immediate cleanup registration, abort signaling, ownership transfer only at atomic commit, immediate draining for late registrations, and exactly-once tests.
- **Guarding only final DOM commit leaves old activation/callback work active.** Mitigation: generation begins at accepted intent before detection and gates activation, renderer context, iframe/archive callbacks, lazy editors, errors, export state, and layout.
- **A generic static truncation scan has many false positives.** Mitigation: retain a reviewed classification ledger and distinguish collection omission from parser sampling, formatting, identifiers, dates, byte headers, and visibly ellipsized strings.
- **SheetJS and HTML-to-DOCX round trips are inherently lossy for unsupported features.** Mitigation: explicit formula replacement confirmation, narrow field updates, baseline dirty comparison, exact originals, persistent limitations, and independent raw OOXML assertions.
- **PPTX note-to-slide mapping can differ from numeric filenames.** Mitigation: prefer presentation/slide relationship XML over filename assumptions and include reordered/missing-note fixtures.
- **A hand-written JSON diagnostic scanner could mis-handle escapes/comments or consume excessive memory.** Mitigation: keep it linear, bounded, diagnostic-only; never substitute its parse result; use decoded keys plus `Map`; and cover BOM/CRLF/escapes/JSONC/arrays/malformed tails/diagnostic limits.
- **Generated bundles/manifests can hide unstaged changes.** Mitigation: regenerate at milestones, commit derived files with their sources, check fixed-point, and run the final full gate only after the temporary plan is removed.
- **Parallel worktree debris could be mistaken for owned scratch.** Mitigation: inspect provenance/status before deletion and stop rather than discard unrelated changes.
- **A subsystem regression may need rollback late.** Mitigation: preview concurrency, summary caps/CSV, XLSX, DOCX, PPTX, duplicate JSON/source semantics, and partial catalog each land as independently revertible commits; no push occurs while any new fidelity gate fails.

## Open Questions

None. The implementation choices above resolve the non-blocking fidelity tradeoffs while preserving exact originals and source escape paths.

## Frozen cap audit ledger

The original audit's exact scanner walks `renderer.js`/`render.js` files under `docs/types/text/known`, JSON/YAML/TOML/XML known renderers, finds a single-line numeric `slice(0, N)` assignment, and includes it only when the sliced variable's `.length` is used elsewhere. It produced exactly 47 rows at baseline `503d6243`. The permanent test will reproduce this logic from a checked-in ledger and fail on an unclassified addition/removal; line numbers below are baseline evidence and stable identity is `path + variable + cap`.

```text
roots = docs/types/text/known, docs/types/text/{json,yaml,toml,xml}/known
files = recursive renderer.js or render.js
assignment = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=.*?\.slice\(0\s*,\s*([0-9]+)\)/
candidate = assignment variable has a distinct later/earlier `variable.length` use
baseline count = 47
```

Classification: **repair** means the current output is false/silent/ambiguous and receives below/equal/above-cap coverage; **truthful** means it already uses the unsliced source total or exact remainder and stays regression-covered by the ledger; **character** is not a collection cap and is visibly ellipsized.

| # | Baseline candidate | Cap | Classification | Source-total / required behavior |
|---:|---|---:|---|---|
| 1 | `known/brewfile/renderer.js:72 displayTaps` | 8 | repair | `taps.length`; show exact remainder |
| 2 | `known/brewfile/renderer.js:73 displayFormulas` | 30 | truthful | already says shown count `of formulas.length` |
| 3 | `known/brewfile/renderer.js:74 displayCasks` | 20 | truthful | already says shown count `of casks.length` |
| 4 | `known/brewfile/renderer.js:75 displayMas` | 10 | repair | `mas.length`; show exact remainder |
| 5 | `known/brewfile/renderer.js:76 displayVscode` | 10 | repair | `vscode.length`; show exact remainder |
| 6 | `known/claude-md/renderer.js:35 firstContent` | 6 | repair | label as first 6 of all eligible content lines; retain character ellipsis |
| 7 | `known/editorconfig/renderer.js:78 globSections` | 10 | repair | preserve unsliced glob-section total; never report sliced length as total |
| 8 | `known/isabelle-thy/renderer.js:72 sortedMethods` | 8 | repair | retain all distinct method count; label top 8 of total |
| 9 | `known/mailmap/renderer.js:62 entries` | 30 | repair | header total is correct, but table must say showing 30 of parsed total |
| 10 | `known/nftables-rules/renderer.js:184 samples` | 3 | truthful | already says exact `+N more` from `chain.rules.length` |
| 11 | `known/org-mode/renderer.js:295 outlineHeadings` | 30 | truthful | already says exact remaining heading count |
| 12 | `known/podfile/renderer.js:95 shown` | 20 | truthful | exact `pods.length - shown.length` |
| 13 | `known/podfile-lock/renderer.js:80 shownPods` | 25 | truthful | exact pod remainder |
| 14 | `known/podfile-lock/renderer.js:82 shownDeps` | 15 | truthful | exact dependency remainder |
| 15 | `known/polybar-conf/renderer.js:130 colorEntries` | 8 | repair | `Object.keys(colors).length`; show exact remainder |
| 16 | `known/proguard-rules/renderer.js:92 keepSlice` | 50 | truthful | heading has full count and row says exact remainder |
| 17 | `known/steam-acf/renderer.js:140 shown` | 5 | truthful | exact ID remainder |
| 18 | `json/known/app-json/renderer.js:45 buildpacks` | 8 | repair | retain `cfg.buildpacks.length`; do not report sliced length |
| 19 | `json/known/app-json/renderer.js:51 addons` | 10 | repair | retain `cfg.addons.length`; do not report sliced length |
| 20 | `json/known/commitlint/renderer.js:52 shownRules` | 20 | truthful | says top 20 of unsliced rule count |
| 21 | `json/known/eslint/renderer.js:53 shownRules` | 20 | truthful | says top 20 of unsliced rule count |
| 22 | `json/known/rush/renderer.js:35 displayProjects` | 15 | truthful | exact project remainder |
| 23 | `json/known/stylelint/renderer.js:51 shownRules` | 20 | truthful | says top 20 of unsliced rule count |
| 24 | `json/known/turbo/renderer.js:49 taskNames` | 10 | truthful | says showing N of `totalTasks` |
| 25 | `yaml/known/citation-cff/renderer.js:72 shownAuthors` | 3 | truthful | says showing 3 of `authors.length` |
| 26 | `yaml/known/clang-tidy/renderer.js:49 categories` | 10 | repair | retain full category count and exact remainder |
| 27 | `yaml/known/dashy-config/renderer.js:65 shownSections` | 10 | truthful | heading has total and exact remaining sections |
| 28 | `yaml/known/filebeat/renderer.js:78 displayPaths` | 4 | truthful | exact path remainder (hosts use the same truthful pattern) |
| 29 | `yaml/known/hadolint/renderer.js:28 ignored` | 15 | repair | retain `cfg.ignore.length` for heading/subtitle/remainder |
| 30 | `yaml/known/hadolint/renderer.js:30 trustedRegistries` | 8 | repair | retain full registry count and exact remainder |
| 31 | `yaml/known/heartbeat/renderer.js:53 displayTargets` | 4 | truthful | exact target remainder (hosts likewise) |
| 32 | `yaml/known/hydra-config/renderer.js:93 configEntries` | 30 | repair | flatten first, retain total, then slice |
| 33 | `yaml/known/moon/renderer.js:51 taskEntries` | 15 | truthful | says showing N of `totalTasks` |
| 34 | `yaml/known/moonrepo/renderer.js:53 projectGlobs` | 8 | repair | array branch is truthful; object-entry branch needs the same exact remainder |
| 35 | `yaml/known/pubspec/renderer.js:95 shown20` | 20 | truthful | exact dependency remainder |
| 36 | `yaml/known/pubspec/renderer.js:100 shown10dev` | 10 | truthful | exact dev-dependency remainder |
| 37 | `yaml/known/pubspec/renderer.js:105 shown10assets` | 10 | truthful | exact asset remainder |
| 38 | `yaml/known/scrutiny-config/renderer.js:86 urls` | 6 | truthful | exact notification URL remainder |
| 39 | `yaml/known/semaphore-ci/renderer.js:49 blocks` | 8 | repair | replace ambiguous `8+` with showing 8 of full block count or exact remainder |
| 40 | `yaml/known/semaphore-ci/renderer.js:85 jobs` | 3 | truthful | exact job remainder |
| 41 | `yaml/known/yamllint/renderer.js:119 displayRules` | 15 | truthful | heading retains `ruleKeys.length` and says showing 15 |
| 42 | `toml/known/pyproject/renderer.js:180 ruffKeys` | 6 | repair | full `Object.keys(ruff).length` and exact remainder |
| 43 | `toml/known/pyproject/renderer.js:188 blackKeys` | 4 | repair | full `Object.keys(black).length` and exact remainder |
| 44 | `toml/known/pyproject/renderer.js:193 isortKeys` | 4 | repair | full `Object.keys(isort).length` and exact remainder |
| 45 | `xml/known/log4j2/renderer.js:71 pattern` | 60 | character | visibly appends ellipsis; not a collection/count claim |
| 46 | `xml/known/logback/renderer.js:81 pattern` | 60 | character | visibly appends ellipsis; not a collection/count claim |
| 47 | `xml/known/nuspec/renderer.js:106 shownDeps` | 8 | truthful | exact dependency remainder |

Supplemental user-visible caps missed by the narrow denominator but already found during manual classification are also mandatory: Tauri permissions/windows; Claude header list; Org links; clang-tidy CheckOptions; Moonrepo object projects; Pubspec fonts; Semaphore global secrets; Pyproject authors/maintainers/pytest markers; and ragged CSV maximum width. Each collection receives the same source-total rule and its own over-cap assertion. The permanent scanner/ledger test records why the original 47 denominator is stable while a broader user-visible-cap allowlist prevents these known heuristic misses from disappearing.

## Progress ledger

- 2026-07-11: Retrieved the YAMS memory “Enhanced-view release fidelity audit”; confirmed clean `dev` at `503d62432cf2d60775e6e206e32f0640a8780547`, matching `origin/dev`, with all four worktrees clean.
- 2026-07-11: Reconfirmed the stale main `renderPreview` mutable-state race, duplicate-JSON omission, Office visibility gaps, twelve false full-support catalog claims, confirmed truncation defects, ragged-CSV first-row width bug, and side-by-side pending-render race.
- 2026-07-11: Independent reviewers required intent-time invalidation/cleanup registration, a frozen cap denominator, independent OOXML oracles, exact duplicate/source semantics, hard-offline reload, and fixed-point post-fetch validation. All decisions are incorporated above; review is complete.
- Current step: 1 — commit this reviewed handoff and implement the permanent frozen cap-ledger test.
- Next resume action: commit this plan, then implement request lifecycle plus deterministic concurrency tests before touching renderer fidelity.
