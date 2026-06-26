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
- [x] Add `symbolRow({ kind, name, signature, docs, line, tags, title })`.
- [x] Add `issueList(items)` for warnings/errors/findings.
- [x] Add `severityChip(level, vocabulary)` for risk/severity/status chips.
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
- [x] `groovy-lang`: method signatures, annotation explanations, Groovydoc, source links.
- [x] `haxe-lang`: method signatures, metadata explanations, inheritance/implements, docs.
- [x] `julia-lang`: full signatures, docstrings, multiple-dispatch grouping, source spans.
- [x] `odin-lang`: proc signatures, calling convention hover help, compile-time `when` locations.
- [x] `pony-lang`: receiver/capability metadata, actor/behaviour explanations, type-owned API grouping.
- [x] `solidity-lang`: ABI-like signatures, NatSpec docs, payable/external/selfdestruct explanations, event/error params.
- [x] `kotlin-lang`: KDoc, params/returns, annotation hover help, line-linked outline.
- [x] `dart-lang`: methods/functions, Dartdoc, Flutter/package import explanations, folded classes.
- [x] `php-lang`: PHPDoc, params/return types, class/member nesting, include/namespace explanations.

## Wave 3: Template And Markup Views

These should help users find broken structure and dependency/reference problems.

- [x] `handlebars-template`: unclosed/mismatched sections, custom helper inventory, partial dependencies.
- [x] `mustache-template`: section stack validation, unresolved partial hints, variable grouping.
- [x] `jinja2-template`: extends/includes/imports graph, duplicate blocks/macros, external context variables.
- [x] `nunjucks`: same template diagnostics as Jinja-style files.
- [x] `asciidoc`: anchors, xrefs, includes, images, admonitions, duplicate/missing references.
- [x] `restructuredtext`: labels, refs, substitutions, toctree/include/image directives, malformed directive options.
- [x] `org-mode`: TODO distribution, tags, deadlines/scheduled timestamps, source block names/results, broken links.
- [x] `mediawiki-markup`: parser functions, duplicate categories, citation/ref health, file alt/caption extraction.
- [x] `textile-markup`: malformed image/link syntax, heading source links.
- [x] `bbcode-text`: unmatched tags, repeated links/images, quote/code block navigation.
- [x] `xslt-stylesheet`: call graph, modes, callers/callees, duplicate template names, unused params/vars.
- [x] `kdl-doc`: brace imbalance, disabled nodes, duplicate sibling names, expandable tree with line numbers.
- [x] `tex-doc`: labels/refs/cites/includes/packages, full outline, duplicate/unresolved refs.

## Wave 4: Config, Security, And Operations Views

These should prioritize risk, masking, source traceability, and relationship maps.

- [ ] CI/CD configs: GitHub Actions, GitLab CI, CircleCI, Travis, CodeBuild, Woodpecker, Azure Pipelines.
- [x] Azure Pipelines: source-linked triggers/pool/stages/jobs/variables, hosted image/dependency/deploy-step review findings, secret-like variable redaction, and collapsed redacted source.
- [x] CircleCI: source-linked orbs/workflows/jobs, orb pinning and workflow requires review findings, secret-like environment redaction, and collapsed redacted source.
- [x] AWS CodeBuild buildspec: source-linked phases/commands/runtime/artifacts/cache, runtime/deploy-command review findings, secret-like env redaction support, and collapsed redacted source.
- [x] GitHub Actions: source-linked job graph, unpinned actions, broad permissions, risky triggers, shell download pipes, and secret-like env masking.
- [x] GitHub Actions dependency edges: dedicated source-linked `needs` edges and unresolved dependency review findings.
- [x] GitLab CI: source-linked stages/jobs/variables/includes, mutable image and needs graph review findings, secret-like variable redaction, and collapsed redacted source.
- [x] Travis CI: source-linked runtime/services/env/script/branch filters, runtime/branch/secret review findings, secret-like env redaction, and collapsed redacted source.
- [x] Woodpecker CI: source-linked steps/services/when/matrix/secrets/clone config, image/secret/deploy review findings, secret-like env redaction, and collapsed redacted source.
- [ ] Add warnings for `pull_request_target`, broad permissions, unpinned actions, secret-like env values, shell download pipes.
- [ ] Render CI job dependency graphs from `needs`/workflow equivalents.
- [ ] Container/orchestration: Docker Compose, Kubernetes, Helm, Flux, Nomad, Systemd, Quadlet.
- [x] Kubernetes generic manifest: source-linked container/resource review, mutable images, privileged containers, host namespace/hostPort exposure, missing healthchecks, and secret-like env masking.
- [x] Nomad job: source-linked jobs/groups/tasks/services, mutable image/health-check/exec-driver review findings, secret-like env redaction, and collapsed redacted source.
- [x] Podman Quadlet: source-linked image/env/volume/network/port/service settings, image/published-port/restart/secret review findings, secret-like env redaction, and collapsed redacted source.
- [x] Flux Kustomization: source-linked source/path/sync/health/dependency settings, prune/force/wait/health/dependency review findings, hover explanations, and collapsed source.
- [x] systemd unit: source-linked sections/directives, ordering/restart/env-file/hardening review findings, directive hover explanations, and collapsed source.
- [x] Helmfile: source-linked repositories/releases/defaults/environments, stable-repo/latest/local-chart/secret/defaults review findings, secret-like source redaction, and collapsed redacted source.
- [x] Helm Chart.yaml: source-linked identity/maintainers/dependencies/annotations, SemVer/dependency-range/repository/condition review findings, hover explanations, and collapsed source.
- [x] Helm values.yaml: source-linked image/service/ingress/resources/autoscaling/env/config values, exposure/autoscaling/reference/secret review findings, masking reasons, and collapsed redacted source.
- [ ] Add warnings for privileged mode, host network/PID, Docker socket mounts, `:latest`, public binds, missing healthchecks.
- [ ] Credentials/env: `.env`, AWS credentials, GCP service account, kubeconfig, appsettings, INI self-hosted configs.
- [x] Generic `.env`: shared secret classifier, masking reasons, line-linked table rows, and collapsed wrapped redacted source.
- [x] AWS credentials: static key review warnings, masking reasons, source-linked profiles/fields, and collapsed redacted source.
- [x] GCP service account: private-key/key-id review warnings, masking reasons, source-linked fields, and collapsed redacted source.
- [x] Generic kubeconfig: current-context, TLS skip, embedded credential review warnings, source-linked tables, and collapsed redacted source.
- [x] ASP.NET appsettings: public host/JWT/connection-string review warnings, shared masking reasons, source-linked rows, and collapsed redacted source.
- [x] Grafana INI: public bind/domain/secret review warnings, masking reasons, source-linked rows, and collapsed redacted source.
- [x] Apply shared secret classifier and masked-value hover reasons across env/JSON/YAML/TOML/INI renderers.
- [x] Generic JSON: shared secret classifier, redacted tree values, review warnings, and collapsed redacted source for secret-like keys.
- [x] Generic INI: shared secret classifier, masked key/value rows, review warnings, source-linked keys, and collapsed redacted source.
- [x] Generic TOML masking: shared secret classifier, redacted tree values, review warnings, and collapsed redacted source for secret-like keys.
- [ ] Package/manifests: package.json, Cargo, Composer, Poetry, lockfiles, SBOMs.
- [x] package.json: source-linked scripts/dependencies, lifecycle scripts, shell download commands, broad version ranges, and duplicate dependency groups.
- [ ] Add warnings for lifecycle scripts, shell/network install commands, broad ranges, duplicate dependency categories, manifest/lock mismatches.
- [ ] Server/service configs: Apache, Nginx, Caddy, HAProxy, PostgreSQL, MySQL, Redis, MongoDB, SSHD.
- [x] Apache HTTPD config: source-linked globals/vhosts/access blocks, directive hover explanations, HTTP/TLS/proxy/directory review findings, and collapsed numbered source.
- [x] Caddyfile: source-linked sites/directives, directive hover explanations, TLS/proxy/HSTS/directory-listing review findings, and collapsed numbered source.
- [x] HAProxy config: source-linked globals/defaults/frontends/backends/listens, bind/backend/stats review findings, stats auth redaction, and collapsed redacted source.
- [x] MongoDB config: source-linked storage/network/replication/security settings, bind/auth/keyFile/TLS review findings, masking reasons, and collapsed redacted source.
- [x] MySQL config: source-linked server/client/dump settings, directive hover explanations, bind/slow-log/dump-packet review findings, masking reasons, and collapsed redacted source.
- [x] Nginx config: source-linked servers/listens/locations/upstreams, directive hover explanations, HTTP/default/upstream review findings, and collapsed numbered source.
- [x] PostgreSQL config: source-linked settings, masking reasons/redacted source for sensitive key-like values, bind/SSL/WAL review findings, and collapsed redacted source.
- [x] Redis config: source-linked network/persistence/security directives, repeated save/rename-command handling, bind/password/persistence review findings, and collapsed redacted source.
- [x] SSHD config: source-linked directives, hover explanations, public bind/auth review findings, and collapsed numbered source.
- [ ] Add rule packs for weak TLS/proxy headers, open bind addresses, directory listing, permissive auth, debug logging.
- [x] Deployment configs: Vercel, Netlify, Wrangler, Railway, Firebase.
- [x] Vercel config: source-linked build/routes/headers/functions/env settings, broad rewrite/security-header/public-env/function-limit review findings, masking reasons, and collapsed redacted source.
- [x] Netlify config: source-linked build/redirect/header/context/env/dev settings, broad rewrite/security-header review findings, masking reasons, and collapsed redacted source.
- [x] Wrangler config: source-linked worker identity/routes/KV/durable-object/env settings, stale compatibility-date/wildcard-route/binding/secret review findings, masking support, and collapsed redacted source.
- [x] Railway config: source-linked services/source/build/deploy/env/mount/network settings, healthcheck/restart/reference/volume/secret review findings, masking reasons, and collapsed redacted source.
- [x] Firebase config: source-linked hosting/rewrites/redirects/headers/functions/emulators/services settings, broad rewrite/security-header/runtime/emulator review findings, and collapsed source.
- [x] Render.com config: source-linked services/build/start/schedule/env/database settings, healthcheck/reference/secret review findings, managed-secret notes, and collapsed redacted source.
- [ ] Add schema/key validation, public env warnings, broad rewrites, missing security headers, stale compatibility dates.
- [ ] Generic YAML/TOML: add JSONPath-style query parity, path breadcrumbs, duplicate key detection where possible, source-line mapping.
- [x] Generic TOML: live fallback tree with path breadcrumbs, duplicate-key/table diagnostics, click-to-source rows, and collapsed numbered source.
- [x] Generic YAML: live fallback tree with path breadcrumbs, secret-like scalar warnings/redaction, click-to-source rows, and collapsed redacted source.

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
