# Enhanced View Cleanup Tasklist

This document prepares a long cleanup cycle for the known/enhanced viewers in the general lane.

## Goal

An enhanced view should help a user answer:

- What is this file?
- What are the important parts?
- What is connected to what?
- What is risky, invalid, surprising, deprecated, or secret?
- Where in the source did this summary item come from?
- What does this flag, function, parameter, section, dependency, or rule mean?

Counts and static lists are not enough. A view is meaningfully enhanced when it adds navigation, explanation, validation, source correlation, grouping by domain concepts, and warnings that reduce user effort.

## Enhancement Principles

- Preserve source location for extracted items whenever possible: `{ line, col, path, span }`.
- Summary rows should be actionable: click jumps to source, hover explains meaning, badges show role/risk/type.
- Source copied into the enhanced pane should be collapsed by default when Monaco/raw source is already visible, numbered, wrapped, and linkable.
- Prefer structured parsers over regex when a parser exists locally.
- Detect issues, not only inventory: duplicates, missing required keys, unresolved references, broad permissions, secret leakage, malformed blocks.
- Mask sensitive values consistently and explain why they were masked.
- Group by domain model, not syntax: services/jobs/dependencies/routes/symbols/sections/rules.
- Keep migration incremental and opt-in. Do not force every renderer into one visual style in a single pass.

## Shared Work First

- [x] Add a shared known-view UI helper, likely `docs/core/known-ui.js`.
- [x] Reuse or re-export canonical escaping from `docs/core/template.js`.
- [x] Add shared CSS with a stable prefix such as `kf-`.
- [x] Add DOM-first helpers, plus minimal HTML-string helpers for renderers that currently return strings.
- [x] Add `sourcePreview(text, { collapsed, numbered, highlighter, maxLines })`.
- [x] Add `wireSourceLinks(root, selector, lineGetter, previewSelector)`.
- [ ] Add `symbolRow({ kind, name, signature, docs, line, tags, title })`.
- [x] Add `issueList(items)` for warnings/errors/findings.
- [ ] Add `severityChip(level, vocabulary)` for risk/severity/status chips.
- [x] Add `maskedValue(value, reason)` and a shared secret classifier.
- [x] Add focused unit coverage for escaping, truncation, source IDs, severity mapping, and secret masking.

## Wave 1: Prove The Pattern

Use a few representative viewers to validate helpers before broad migration.

- [x] Keep PowerShell as the reference for collapsed numbered source and click-to-source.
- [x] Migrate `gdscript-lang`: symbol line numbers, docs from `##`, `@tool/@rpc/@export` hover help, source jumps.
- [x] Migrate one template viewer, preferably `handlebars-template`: block matching, partial/include inventory, broken section diagnostics, source jumps.
- [x] Migrate one config-risk viewer, preferably `docker-compose`: secret masking, risky option warnings, dependency graph, source jumps.
- [x] Migrate one document outline viewer, preferably `asciidoc` or `restructuredtext`: heading/source links, duplicate anchors, unresolved refs/includes.
- [x] Add smoke assertions that verify real UX behavior, not only that the renderer loaded.

## Wave 2: High-Value Code And Script Views

These already extract symbols but leave too much user value on the table.

- [x] `gdscript-lang`: full symbol index, docs, export metadata, line-linked source.
- [x] `ballerina-lang`: full service/resource/function signatures, endpoint detail, qualifier explanations.
- [x] `gleam-lang`: public API signatures, `///` docs, arity, module dependency grouping.
- [x] `mojo-lang`: clickable signatures, struct field counts, `@value`/alias/let-var explanations.
- [x] `fortran-lang`: procedure signatures, missing `IMPLICIT NONE` warning, `COMMON` explanation, procedure length.
- [ ] `groovy-lang`: method signatures, annotation explanations, Groovydoc, source links.
- [ ] `haxe-lang`: method signatures, metadata explanations, inheritance/implements, docs.
- [ ] `julia-lang`: full signatures, docstrings, multiple-dispatch grouping, source spans.
- [ ] `odin-lang`: proc signatures, calling convention hover help, compile-time `when` locations.
- [ ] `pony-lang`: receiver/capability metadata, actor/behaviour explanations, type-owned API grouping.
- [ ] `solidity-lang`: ABI-like signatures, NatSpec docs, payable/external/selfdestruct explanations, event/error params.
- [ ] `kotlin-lang`: KDoc, params/returns, annotation hover help, line-linked outline.
- [ ] `dart-lang`: methods/functions, Dartdoc, Flutter/package import explanations, folded classes.
- [ ] `php-lang`: PHPDoc, params/return types, class/member nesting, include/namespace explanations.

## Wave 3: Template And Markup Views

These should help users find broken structure and dependency/reference problems.

- [ ] `handlebars-template`: unclosed/mismatched sections, custom helper inventory, partial dependencies.
- [ ] `mustache-template`: section stack validation, unresolved partial hints, variable grouping.
- [ ] `jinja2-template`: extends/includes/imports graph, duplicate blocks/macros, external context variables.
- [ ] `nunjucks`: same template diagnostics as Jinja-style files.
- [ ] `asciidoc`: anchors, xrefs, includes, images, admonitions, duplicate/missing references.
- [ ] `restructuredtext`: labels, refs, substitutions, toctree/include/image directives, malformed directive options.
- [ ] `org-mode`: TODO distribution, tags, deadlines/scheduled timestamps, source block names/results, broken links.
- [ ] `mediawiki-markup`: parser functions, duplicate categories, citation/ref health, file alt/caption extraction.
- [ ] `textile-markup`: malformed image/link syntax, heading source links.
- [ ] `bbcode-text`: unmatched tags, repeated links/images, quote/code block navigation.
- [ ] `xslt-stylesheet`: call graph, modes, callers/callees, duplicate template names, unused params/vars.
- [ ] `kdl-doc`: brace imbalance, disabled nodes, duplicate sibling names, expandable tree with line numbers.
- [ ] `tex-doc`: labels/refs/cites/includes/packages, full outline, duplicate/unresolved refs.

## Wave 4: Config, Security, And Operations Views

These should prioritize risk, masking, source traceability, and relationship maps.

- [ ] CI/CD configs: GitHub Actions, GitLab CI, CircleCI, Travis, CodeBuild, Woodpecker, Azure Pipelines.
- [ ] Add warnings for `pull_request_target`, broad permissions, unpinned actions, secret-like env values, shell download pipes.
- [ ] Render CI job dependency graphs from `needs`/workflow equivalents.
- [ ] Container/orchestration: Docker Compose, Kubernetes, Helm, Flux, Nomad, Systemd, Quadlet.
- [ ] Add warnings for privileged mode, host network/PID, Docker socket mounts, `:latest`, public binds, missing healthchecks.
- [ ] Credentials/env: `.env`, AWS credentials, GCP service account, kubeconfig, appsettings, INI self-hosted configs.
- [ ] Apply shared secret classifier and masked-value hover reasons across env/JSON/YAML/TOML/INI renderers.
- [ ] Package/manifests: package.json, Cargo, Composer, Poetry, lockfiles, SBOMs.
- [ ] Add warnings for lifecycle scripts, shell/network install commands, broad ranges, duplicate dependency categories, manifest/lock mismatches.
- [ ] Server/service configs: Apache, Nginx, Caddy, HAProxy, PostgreSQL, MySQL, Redis, MongoDB, SSHD.
- [ ] Add rule packs for weak TLS/proxy headers, open bind addresses, directory listing, permissive auth, debug logging.
- [ ] Deployment configs: Vercel, Netlify, Wrangler, Railway, Firebase.
- [ ] Add schema/key validation, public env warnings, broad rewrites, missing security headers, stale compatibility dates.
- [ ] Generic YAML/TOML: add JSONPath-style query parity, path breadcrumbs, duplicate key detection where possible, source-line mapping.

## View Audit Checklist

For each enhanced renderer:

- [ ] Identify what it extracts today.
- [ ] Identify the user question it should answer.
- [ ] Preserve line/source metadata for every extracted item where feasible.
- [ ] Add click-to-source for summary rows.
- [ ] Add hover/help text for non-obvious flags, modifiers, directives, severities, or config options.
- [ ] Add signatures/types/params/docs for code symbols where applicable.
- [ ] Add diagnostics for malformed, duplicate, unresolved, risky, deprecated, or secret content.
- [ ] Add masking for sensitive values and verify they do not leak in text content.
- [ ] Collapse duplicated source by default when raw/Monaco source is already available.
- [ ] Add or update a focused smoke assertion for the new user-facing behavior.
- [ ] Regenerate `docs/asset-manifest.json` and `docs/sw.js` after runtime asset changes.

## Validation Expectations

Use focused validation while iterating:

- `node --check <changed-renderer.js>`
- targeted known-file smoke slices where available
- custom one-off harness checks for click-to-source, collapsed source, secret masking, and warning presence
- relevant unit tests for helper modules

Run broader checks before final commits that touch shared helpers:

- `node tests/settings-defaults.test.mjs`
- `node tests/archive-metadata.test.mjs` only if archive behavior changed
- `node tests/smoke-area.mjs known-files` when broad renderer behavior changes and time allows
- `./scripts/check.sh` before larger pushes if feasible

## Long-Running Goal Prompt

Use this prompt to start a fresh long cleanup cycle:

```text
We are in /home/jens/repos/file-viewer on branch dev. Follow AGENTS.md. Work only in the general lane. Start by checking git status and latest remote state. Do not revert unrelated work.

Objective: run the enhanced-view cleanup cycle described in ENHANCED_VIEW_CLEANUP_TASKLIST.md. Treat “enhanced” as user value, not visual decoration: each enhanced renderer should help users understand important parts, risks, references/dependencies, source locations, signatures/params/docs where applicable, and non-obvious domain semantics.

Process:
1. Read ENHANCED_VIEW_CLEANUP_TASKLIST.md completely.
2. Inspect the current state of the changed PowerShell renderer as the reference for collapsed numbered source and click-to-source.
3. Build shared helpers only when they reduce real duplication and support incremental adoption. Keep helpers dependency-free, DOM-first, and prefixed to avoid CSS collisions.
4. Work in small vertical slices. For each selected renderer, improve extraction quality and user-facing meaning, not only layout.
5. For code/script views, prioritize signatures, params, docs/comments, symbol grouping, line/source mapping, click-to-source, and complexity/size/risk hints.
6. For config views, prioritize masking, validation, risky setting warnings, dependency/reference maps, source mapping, and explain-on-hover.
7. For markup/template/document views, prioritize outlines, reference/include health, duplicate/malformed structure diagnostics, and source navigation.
8. Add focused tests/smoke checks for each behavior that matters: source starts collapsed, clicking a row opens/highlights source, secret values do not leak, risk warnings appear, signatures/docs render.
9. Regenerate the asset manifest after runtime asset changes.
10. Commit and push completed slices with short imperative messages.

First implementation target:
- Create the shared known-view helper foundation if it is still missing.
- Then complete one representative vertical slice from Wave 1:
  a. one code/script renderer,
  b. one template or document renderer,
  c. one config-risk renderer.

Keep a running checklist in ENHANCED_VIEW_CLEANUP_TASKLIST.md as work completes. Prefer focused validation after each slice and broader validation before push.
```
