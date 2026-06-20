# Editor Roadmap — docker-compose

## Current state

Structured YAML viewer: minimal YAML parser extracts `services` with `image`, `build`, `ports`, `volumes`, and `depends_on`. Shows overview (service count, Compose version, host ports) and per-service cards with image/port/dependency badges. Returns `{ bodyHtml }`. Monaco `yaml` grammar not yet wired.

## Viewer enhancements (no write-back needed)

- **Service dependency graph** — render an SVG DAG of `depends_on` edges between services; for large stacks this is the most useful view; use a simple topological-sort layout (no external lib) — M
- **Port conflict detector** — scan all host-side port bindings across services; highlight duplicate host ports with a warning badge — S
- **Volume cross-reference** — list named volumes with which services mount them; show as a small table below the service cards — S
- **Health-check status column** — detect `healthcheck` blocks in each service and show a green/grey indicator in the service card header — S
- **Image tag freshness hint** — flag services using `latest` tag with a static warning (no network call); suggest pinning to a digest — S
- **`extends` and `merge` resolution** — parse `extends.file` and `extends.service` references; show a banner explaining unresolved external file references — M

## In-browser editing (download-on-save)

- **Monaco YAML editor mode** — mount Monaco with `language: 'yaml'`; Ctrl+S triggers Blob download; live re-parse drives the service graph in a split pane — S (Monaco already vendored; js-yaml already vendored for parsing)
- **JSON Schema validation** — wire the Docker Compose JSON Schema (download once, vendor as a small JSON file) to Monaco's `yaml` language service for inline validation squiggles on unknown keys and wrong types — M
- **Service scaffold snippets** — `CompletionItemProvider` for common service patterns: PostgreSQL, Redis, Nginx reverse proxy, Node app with hot-reload — M
- **Depends-on cycle detector** — on each edit, run a DFS cycle check over `depends_on` edges; highlight cyclic services with Monaco error markers — M
- **Secret/env value redaction** — detect `environment` values that look like secrets (all-caps keys, `PASSWORD`/`SECRET`/`TOKEN` patterns) and offer a one-click replace with `${VAR_NAME}` env-var reference — M

## Full write-back editing (companion required)

- **Round-trip save** — POST to companion `/write`; refresh parse and graph — S
- **Live `docker-compose ps` status overlay** — companion calls `docker compose ps --format json`; viewer overlays running/stopped/healthy status on each service card — L

## Shared toolbar / modular note

js-yaml is already vendored — use it for accurate YAML parsing in editor mode instead of the current minimal hand-rolled parser. The Docker Compose JSON Schema is ~80 KB minified; worth vendoring to enable zero-network validation. The dependency graph SVG shares the DAG layout approach with the Dockerfile multi-stage graph.
