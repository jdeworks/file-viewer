# File Viewer

A **mobile-first, client-only file viewer** that runs entirely in your browser. Drop in a file (or a whole folder) and read it — source, rendered, or side-by-side — with a real code editor and a move-aware diff.

**▶ Live: https://jdeworks.github.io/file-viewer/**

No install. No PWA. No account. Nothing to run.

## Why

The point is trust. **Zero off-origin requests at runtime** — there is no server, no CDN, no analytics, no telemetry. Every library is vendored into this repo and served from the same origin as the page. Your files never leave the tab. The smoke test asserts "zero off-origin requests" on every run, so this stays true.

> **Don't take our word for it — verify it yourself.** Open your browser's **DevTools → Network tab**, then load a file and click around. You'll see requests only to this site's own origin (and `data:`/`blob:` URLs, which never leave your machine) — nothing to any third party. Want to be certain? **Turn off your network / go offline and reload** — once the page has loaded, everything still works, because there's no server to talk to.

- 📱 **Mobile is a first-class target** — on phones the raw/preview views become tabs instead of cramped side-by-side panes.
- 🔒 **Secure preview** — rendered output lives in a `sandbox="allow-scripts"` iframe (opaque origin, never `allow-same-origin`). Untrusted HTML is DOMPurify-sanitized. If a file contains scripts or inline JS, you're asked before anything runs. Program source (Python, JS, …) is shown, never executed.
- 🧩 **Modular** — adding a file type is one folder plus one line.

## Features

- **Open anything** — file picker, folder picker (tree sidebar with detected type + size), drag-and-drop, or paste.
- **Three ways to look at a file** — raw source in [Monaco](https://microsoft.github.io/monaco-editor/), rendered preview in a sandboxed iframe, or both at once (tabs on mobile).
- **Move-aware diff** — a 4-way switch: original / current / standard diff / move-aware diff. The move-aware mode detects relocated lines and paragraphs (≥80% similarity = "same, moved") and draws arrows instead of flagging a delete + an add.
- **Magic selector** — click a rendered element to jump to its source, with live scroll sync between panes.
- **Screenshot** the rendered preview to PNG.
- **Settings** — surfaced Monaco options plus per-type viewer settings, with presets, revert, and localStorage persistence.
- **Metadata** — name, size, type, and any embedded timestamps.
- Dark / light, zoom, fullscreen, download.

## Supported types

Markdown · PDF · CSV · Excel/ODS (`.xlsx`/`.ods`) · Word (`.docx`) · PowerPoint (`.pptx`) · HTML · JSON · images (incl. SVG) · source code (~50 languages) · plain text. More are added over time.

## Run it locally

It's static files — serve `docs/` with anything:

```bash
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

## Develop

```
docs/
  index.html          # app shell
  core/               # orchestrator, intake, raw view, secure iframe, settings, diff, file tree
  types/<id>/         # one folder per file type (index.js, detect.js, renderer.js, settings.default.json)
  vendor/             # all third-party libs, served at runtime (no CDN)
  examples/           # sample files for the picker
scripts/vendor.sh     # re-vendor libs from node_modules into docs/vendor/
tests/                # smoke.mjs (headless Chromium) + movediff.test.mjs (unit)
```

### Adding a file type

1. Create `docs/types/<id>/` (see the descriptor contract documented at the top of `docs/core/registry.js`).
2. Add one line to the `REGISTRY` array in `docs/core/registry.js`.

Everything else about a type stays inside its own folder — single source of truth, no drift.

### Vendoring libraries

Runtime serves `docs/vendor/` only. To add or bump a lib: edit `package.json` devDependencies → `npm install` → `./scripts/vendor.sh`. Pinned versions are recorded in `docs/vendor/VERSIONS.json`.

### Tests

```bash
node tests/smoke.mjs        # serves docs/, drives headless Chromium, asserts ZERO off-origin requests
node tests/movediff.test.mjs
```

The smoke harness uses the Playwright install from a sibling `make-it-look-good` checkout.

## License

See repository.
