# Repository Guidelines

## Project Structure & Module Organization

This is a static, client-only file viewer served from `docs/`. The app shell lives in `docs/index.html`; core orchestration, layout, diffing, persistence, and intake code live in `docs/core/`. File-type support is modular under `docs/types/<id>/`, usually with `index.js`, `detect.js`, `renderer.js`, `metadata.js`, and `settings.default.json`. Add a new type by creating its folder and registering it in `docs/core/registry.js`. Runtime third-party libraries are vendored in `docs/vendor/`; sample files used by the UI and tests are in `docs/examples/`. Tests and harnesses live in `tests/`, with helper scripts in `scripts/`.

## Build, Test, and Development Commands

- `cd docs && python3 -m http.server 8000`: serve the app locally at `http://localhost:8000`.
- `./scripts/check.sh --fast`: routine pre-push validation; regenerates `docs/asset-manifest.json`, runs LOC housekeeping, and scoped unit + core smoke. Three modes exist — `--fast` (per-push), bare `check.sh` (RELEASE gate, ~7 min: core smoke + representative samples of the heavy suites), `--exhaustive` (open-everything sweep, on command). Add `--dry-run` to print a mode's selection.
- `node tests/movediff.test.mjs`: run move-aware diff and parser unit coverage.
- `node tests/smoke.mjs`: serve `docs/`, drive headless Chromium, and assert zero off-origin requests.
- `cd tests && npm test`: run the test package script after installing test dependencies.
- `./scripts/vendor.sh`: refresh `docs/vendor/` after changing root `package.json` dev dependency pins.

## Coding Style & Naming Conventions

Use modern ES modules and browser-native APIs. Keep modules focused and colocate type-specific logic inside the relevant `docs/types/<id>/` folder. Use two-space indentation in JSON and follow the existing JavaScript style: semicolons, `const`/`let`, named exports for shared helpers, and concise comments for non-obvious behavior. File-type IDs and folders should be lowercase and descriptive, such as `docs/types/text/json/` or `docs/types/office/xlsx/`.

## Testing Guidelines

Run `./scripts/check.sh --fast` before commits that affect app behavior, assets, vendored files, or tests; run the bare `./scripts/check.sh` (release gate) before a release/tag, and `--exhaustive` when you need the full open-everything sweep. The smoke test depends on Playwright; if it is unavailable, run `cd tests && npm install && npx playwright install chromium`. Preserve the trust guarantee: runtime code should not introduce CDN, analytics, telemetry, or other off-origin requests.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects, for example `Add mobile-web-app-capable meta tag alongside apple variant` and `Fix smoke test: seed all non-cursor sub-stages for boss button check`. Keep the first line specific and outcome-oriented. Pull requests should describe the user-visible change, list validation run, link related issues, and include screenshots or short recordings for UI changes.

## Security & Configuration Tips

Rendered previews run in sandboxed iframes and untrusted HTML is sanitized. Keep new renderers compatible with that model, avoid executing source files, and update `docs/asset-manifest.json` when assets change so offline caching remains accurate.
