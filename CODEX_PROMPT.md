# Codex Prompt — File Viewer Task Runner

Paste this entire block as your Codex prompt to work through `TASKS.md` step by step.

---

## System Context

You are working on a browser-based file viewer at `/home/jens/repos/file-viewer`. The app lives entirely in `docs/`, deployed to GitHub Pages. Everything is client-side — no server, no build step, no bundler. Modules are native ES modules served directly.

**Read these files before starting:**
1. `TASKS.md` — the authoritative task list (work top to bottom)
2. `docs/core/registry.js` — the plugin registry (understand the pattern)
3. `docs/types/text/gitignore/` — a clean recent example plugin (5 files)

## Working Rules

### Per-increment contract (apply after EVERY task, no exceptions)
1. Implement the task completely
2. Run `./scripts/check.sh` — must exit GREEN (zero off-origin, movediff passes, smoke passes)
3. If any file under `docs/` was added or removed: `node scripts/gen-asset-manifest.mjs`
4. Commit and push to `dev`:
   ```
   git add <specific files>
   git commit -m "<description>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
   git push
   ```

### Security (hard rules, never break)
- Zero off-origin at runtime — every lib vendored in `docs/vendor/`
- `.pem`/cert files → NEVER display private key material; show warning if file has `PRIVATE KEY` header
- `.env` → redact values whose keys match `/(SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE)/i` — reveal toggle only, no copy button
- JWT → decode header+payload base64url only; never off-origin; never show raw signature
- Companion saves → ONLY the single changed file, never the whole folder
- Download button is NEVER removed; Save button is always additive

### Code style
- No comments unless WHY is non-obvious
- No trailing summaries, no docs files unless asked
- LOC hard cap: 500 lines per file (split into sibling files if over)
- Tests must be self-contained — no local-only fixtures

### Plugin pattern (for any new file type)
Every type needs exactly 5 files in `docs/types/<group>/<id>/`:
- `detect.js` — `export function detect(intake)` returning 0..1. Use `intake.isBinary` (never import isBinary from detect.js — that export does not exist).
- `renderer.js` — `export async function render(intake, ctx)` → `{ bodyHtml, hadUnsafe: false }` (iframe) or `{ parentNode, revoke() {} }` (canvas/media)
- `metadata.js` — `export async function extractMetadata(intake)` → `{ fields: [{label, value}] }`
- `index.js` — type descriptor with `settingsUrl: new URL('./settings.default.json', import.meta.url)` (**CRITICAL** — missing this causes GET /undefined 404 on every page load)
- `settings.default.json` — `{}` if no settings

Then add ONE import + ONE entry to `docs/core/registry.js`.

## How to Work Through the Tasks

Pick up `TASKS.md`. Start at TASK 1. For each task:

1. Read the task description fully
2. Check if any part is already implemented (grep/read existing files before writing)
3. Implement exactly what's described — no more, no less
4. Run the per-increment contract (check.sh → regen manifest → commit+push)
5. Move to the next task

**If check.sh fails:** fix the failure before committing. The most common issues:
- Asset manifest stale → `node scripts/gen-asset-manifest.mjs`
- Off-origin request → a `fetch()` call outside the same-origin gate; wrap in `isEnabled()` check or remove
- Smoke timeout → likely a module import error crashing app startup; check browser console errors

**If a task says "check if already done":** Read the relevant files. If the feature is there and working, write a one-line commit "Mark Task N as already implemented" and move on.

**Do not skip the per-increment contract.** Every task gets its own commit. Never batch multiple tasks into one commit.

## Starting Point

Current branch: `dev`  
Latest commit: `9d1c360` (fix broken isBinary import + editorconfig smoke test)

Begin with TASK 1 (Companion Release Build CI).
