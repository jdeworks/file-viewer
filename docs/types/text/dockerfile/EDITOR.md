# Editor Roadmap — Dockerfile

## Current state

Structured viewer: parses `FROM` (multi-stage with `AS` aliases), `EXPOSE`, `ENV`, `LABEL`, `RUN` (first 8), and `USER`; detects `root` user and emits a security warning. Shows overview stats, stage list, env vars, labels, and run commands. Returns `{ bodyHtml }`. Monaco has a built-in `dockerfile` language grammar but is not yet wired.

## Viewer enhancements (no write-back needed)

- **Service dependency graph** — for multi-stage builds, render an SVG DAG showing `FROM ... AS name` → `COPY --from=name` edges; makes the stage pipeline visually obvious — M
- **Hadolint-subset lint** — implement a client-side rule engine covering the most common hadolint rules: `DL3008` (no version pinning on `apt-get`), `DL3009` (delete apt cache), `DL3020` (use `COPY` not `ADD` for local files), `DL4006` (set `SHELL` for pipefail), `DL3025` (use JSON array in `CMD`); surface as inline warning cards — M
- **Best practice hints** — pattern-match against known anti-patterns (chaining `apt-get update` without `install` in the same `RUN`, `ADD` with a URL, `COPY` before `RUN` of package installs) and show contextual tips — M
- **Layer count and size estimate** — count unique `RUN`/`COPY`/`ADD` instructions per stage (each is a layer); display the count with a note about merge-run optimisation if > 5 layers — S
- **Base image CVE badge** — if base image is a well-known public image (ubuntu, debian, alpine, node, python), show a static link to its Docker Hub page; no live fetch — S

## In-browser editing (download-on-save)

- **Monaco editor mode** — mount Monaco with `language: 'dockerfile'` (built-in grammar, no extra setup); Ctrl+S triggers Blob download; live re-parse drives the structured panel in a split view — S (Monaco already vendored)
- **Inline lint decorations** — wire the hadolint-subset rules as Monaco `IMarkerData` decorations so squiggles appear on the offending lines — M
- **Snippet library** — Monaco `CompletionItemProvider` offering common Dockerfile patterns: multi-stage build template, `HEALTHCHECK`, `ARG`/`ENV` pairs, non-root user setup, `apt-get install` best-practice block — M
- **Stage rename refactor** — toolbar action: rename an `AS` alias and automatically update all `COPY --from=` references in the file — M

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; re-trigger parse and graph refresh — S
- **Live build log** — companion proxies `docker build` output as a streaming log pane next to the editor — L

## Shared toolbar / modular note

The lint rules belong in a standalone `lint.js` module (no external dep) that both the viewer info cards and the Monaco decoration provider import. Monaco's `dockerfile` grammar covers syntax highlighting fully — no custom token provider needed. The dependency graph SVG can reuse the same layout approach planned for Thrift/Proto schema diagrams.
