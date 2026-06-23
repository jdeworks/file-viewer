// End-to-end test of the companion loop: spawns the REAL Axum companion binary against an
// isolated temp config + watched folder, loads the viewer, and drives the browser's companion
// client (docs/core/companion.js) over real HTTP through detect → find-file → save → delete,
// asserting the on-disk effects. This is the ONE test that exercises the browser↔companion
// integration as a whole (the Rust tests cover the server alone; the zero-off-origin smokes
// deliberately keep the companion DISABLED). It is therefore NOT part of smoke.mjs — run it via
// `node tests/companion-e2e.mjs` (or `npm run test:companion`), which builds the binary first.
//
// Isolation: COMPANION_CONFIG points the server at a temp config; COMPANION_TOKEN fixes the token.
// The server binds 127.0.0.1:7700 (hardcoded) — the test refuses to run if something else already
// holds that port, so it can't accidentally talk to a developer's live companion.
import { createHarness, finish, pass, fail } from './harness.mjs';
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const companionDir = join(repoRoot, 'companion');
const BIN = join(companionDir, 'target', 'debug', 'companion');
const PORT = 7700;
const TOKEN = 'fvtest-e2e';

const portFree = () => new Promise((res) => {
  const sock = net.connect(PORT, '127.0.0.1');
  sock.once('connect', () => { sock.destroy(); res(false); });
  sock.once('error', () => res(true));
});

const ping = () => new Promise((res) => {
  const req = net.connect(PORT, '127.0.0.1');
  req.once('connect', () => { req.destroy(); res(true); });
  req.once('error', () => res(false));
});

async function main() {
  if (!(await portFree())) {
    fail('e2e: 127.0.0.1:7700 is already in use — stop the running companion first');
    console.log('\nSMOKE FAILED');
    process.exit(1);
  }

  // Build the binary if needed (local-only; there is no CI building this).
  if (!existsSync(BIN)) {
    console.log('building companion binary…');
    execSync('cargo build --offline', { cwd: companionDir, stdio: 'inherit' });
  }

  // Isolated watched folder + config.
  const work = mkdtempSync(join(tmpdir(), 'fv-companion-e2e-'));
  const watched = join(work, 'watched');
  execSync(`mkdir -p ${watched}`);
  const filePath = join(watched, 'note.txt');
  writeFileSync(filePath, 'hello');                       // 5 bytes
  const cfgPath = join(work, 'config.json');
  writeFileSync(cfgPath, JSON.stringify({ watched_paths: [watched] }));

  const server = spawn(BIN, [], {
    env: { ...process.env, COMPANION_TOKEN: TOKEN, COMPANION_CONFIG: cfgPath },
    stdio: 'ignore',
  });
  server.on('error', (e) => fail('e2e: failed to spawn companion: ' + e.message));

  // Wait for the server to accept connections.
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { up = await ping(); if (!up) await new Promise((r) => setTimeout(r, 250)); }
  if (!up) { fail('e2e: companion did not come up on :7700'); server.kill(); cleanup(); console.log('\nSMOKE FAILED'); process.exit(1); }
  pass('companion server is up on :7700');

  const ctx = await createHarness();   // browser + docs/ server (its offOrigin array is NOT asserted here)
  const { page, origin } = ctx;
  let dialogMsg = null;
  page.on('dialog', (d) => { dialogMsg = d.message(); d.accept(); });   // auto-accept the delete confirm

  try {
    // Enable the companion (NO token set — it must be auto-delivered from /ping) and reload so
    // startup detection runs.
    await page.goto(origin, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.setItem('fv:companion:enabled', 'true'));
    await page.goto(origin, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.classList.contains('companion-active'), { timeout: 8000 })
      .then(() => pass('viewer detects the companion (body.companion-active)'))
      .catch(() => fail('viewer did not detect the companion'));

    // The token must have been picked up from /ping automatically (no manual paste).
    const gotToken = await page.evaluate(async () => (await import('/core/companion.js')).getToken());
    if (gotToken === TOKEN) pass('session token auto-delivered from /ping (no manual paste)');
    else fail('token not auto-delivered: ' + JSON.stringify(gotToken));

    // Drive the real companion client (docs/core/companion.js) over HTTP from the page context.
    const paths = await page.evaluate(async () => (await import('/core/companion.js')).getWatchedPaths());
    if (Array.isArray(paths) && paths.some((p) => p.includes('watched'))) pass('getWatchedPaths returns the watched folder');
    else fail('getWatchedPaths wrong: ' + JSON.stringify(paths));

    const matches = await page.evaluate(async () => (await import('/core/companion.js')).findFile('note.txt', 5));
    if (Array.isArray(matches) && matches.length === 1 && matches[0].endsWith('note.txt')) pass('find-file locates note.txt by name+size');
    else fail('find-file wrong: ' + JSON.stringify(matches));

    // The standalone server has no native dialog → /path-picker 404s → pickFolder resolves to null
    // (the desktop/Tauri build implements it). Assert the graceful fallback, not a throw.
    const picked = await page.evaluate(async () => (await import('/core/companion.js')).pickFolder());
    if (picked === null) pass('pickFolder degrades to null on the standalone server (404)');
    else fail('pickFolder should be null on the bare server: ' + JSON.stringify(picked));

    const abs = matches[0];
    await page.evaluate(async (p) => {
      const m = await import('/core/companion.js');
      await m.saveFile(p, new TextEncoder().encode('EDITED VIA COMPANION'));
    }, abs);
    const onDisk = readFileSync(filePath, 'utf8');
    if (onDisk === 'EDITED VIA COMPANION') pass('saveFile writes new bytes to the real file on disk');
    else fail('save did not hit disk: ' + JSON.stringify(onDisk));

    // UI check: opening the file shows the Save button (companion-aware topbar).
    await page.setInputFiles('#fileInput', filePath);
    await page.waitForFunction(() => { const b = document.getElementById('saveBtn'); return b && !b.hidden; }, { timeout: 8000 })
      .then(() => pass('opening a watched file reveals the Save-to-disk button'))
      .catch(() => fail('Save button did not appear for an opened watched file'));

    // Auto-link: opening a file that exists in a watched folder should silently associate it (one
    // name+size match) and reveal the Delete button WITHOUT a manual save first.
    await page.waitForFunction(() => { const b = document.getElementById('deleteBtn'); return b && !b.hidden; }, { timeout: 8000 })
      .then(() => pass('opening a watched file auto-links it and reveals the Delete button'))
      .catch(() => fail('Delete button did not appear (auto-link on open failed)'));

    // UI-driven save (onSaveClick): edit in the editor, click the Save button, and assert BOTH the
    // disk write AND that the editor is marked clean afterward (rawview.markClean) — so a later
    // navigation does NOT fire a false "unsaved changes" guard. This exercises the companion-ui
    // save path that the low-level saveFile() call above bypasses.
    const dirtyBefore = await page.evaluate(async () => {
      const { state } = await import('/core/state.js');
      if (!state.rawview) return null;
      state.rawview.setValue('EDITED IN EDITOR');
      return state.rawview.isDirty();
    });
    if (dirtyBefore === true) pass('editing the opened file marks the editor dirty');
    else fail('editor not dirty after edit (rawview missing?): ' + JSON.stringify(dirtyBefore));
    await page.click('#saveBtn');                       // triggers onSaveClick; confirm auto-accepted
    let uiSaved = false;
    for (let i = 0; i < 40 && !uiSaved; i++) { uiSaved = readFileSync(filePath, 'utf8') === 'EDITED IN EDITOR'; if (!uiSaved) await new Promise((r) => setTimeout(r, 250)); }
    if (uiSaved) pass('Save button writes the editor content to disk (onSaveClick path)');
    else fail('UI save did not hit disk: ' + JSON.stringify(readFileSync(filePath, 'utf8')));
    // markClean runs after the save's HTTP 200, which can land AFTER the disk write above — so wait
    // for the clean state rather than reading it once (avoids a flaky disk-vs-response race).
    const becameClean = await page.waitForFunction(async () => {
      const { state } = await import('/core/state.js');
      return state.rawview && !state.rawview.isDirty();
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    if (becameClean) pass('editor marked clean after save (markClean) — no false unsaved-changes guard');
    else fail('markClean did not clear the dirty state after save');

    // Item 3 (create-unknown-file, backend): saveFile to a path that does NOT exist yet must create
    // it inside the watched folder (server validate_path_for_write parent-dir check).
    const createdAbs = join(watched, 'created-by-e2e.txt');
    await page.evaluate(async (p) => {
      const m = await import('/core/companion.js');
      await m.saveFile(p, new TextEncoder().encode('CREATED'));
    }, createdAbs);
    if (existsSync(createdAbs) && readFileSync(createdAbs, 'utf8') === 'CREATED') pass('saveFile creates a brand-new file in a watched folder (create-flow backend)');
    else fail('create did not produce the new file: ' + (existsSync(createdAbs) ? readFileSync(createdAbs, 'utf8') : 'missing'));

    // Item 3 (folder browser backend) + Item B: listFiles lists the watched folder's entries.
    const listed = await page.evaluate(async (p) => (await import('/core/companion.js')).listFiles(p), watched);
    if (Array.isArray(listed) && listed.some((e) => e.name === 'created-by-e2e.txt')) pass('listFiles returns watched-folder entries (folder-browser backend)');
    else fail('listFiles wrong: ' + JSON.stringify(listed));

    // Folder refresh backend: getTree lists files recursively (relative paths) for tree rebuild.
    const tree = await page.evaluate(async (p) => (await import('/core/companion.js')).getTree(p), watched);
    if (tree && Array.isArray(tree.files) && tree.files.some((f) => f.path === 'created-by-e2e.txt' && typeof f.size === 'number')) pass('getTree lists files recursively for folder refresh');
    else fail('getTree wrong: ' + JSON.stringify(tree));

    // Item B (log viewer backend): getLogs returns filtered activity, incl. our create.
    const logs = await page.evaluate(async () => (await import('/core/companion.js')).getLogs({ q: 'created-by-e2e' }));
    if (Array.isArray(logs) && logs.some((e) => (e.msg || '').includes('created-by-e2e') && e.ts && e.level)) pass('getLogs returns timestamped, filtered activity entries (log-viewer backend)');
    else fail('getLogs wrong: ' + JSON.stringify(logs));

    // Delete it on disk via the client; assert it's gone.
    await page.evaluate(async (p) => {
      const m = await import('/core/companion.js');
      await m.deleteFile(p);
    }, abs);
    if (!existsSync(filePath)) pass('deleteFile removes the real file from disk');
    else fail('delete did not remove the file');
  } catch (e) {
    fail('e2e exception: ' + e.message);
  } finally {
    server.kill();
    await finish(ctx);   // closes browser + docs server, prints SMOKE PASSED/FAILED
    cleanup();
  }

  function cleanup() { try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ } }
}

main();
