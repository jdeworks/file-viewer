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
import { spawn, spawnSync, execSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, statSync,
  renameSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const companionDir = join(repoRoot, 'companion');
const BIN = join(companionDir, 'target', 'debug', 'companion');
const PORT = 7700;
const TOKEN = 'fvtest-e2e';
const captureDir = process.env.FV_COMPANION_CAPTURE_DIR || '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture(page, name) {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  // Chromium can hand a screenshot request a half-committed iframe/drawer compositing surface on
  // loaded WSL runners (large black rectangles despite a correct live page). Settle two paints and
  // take an unpersisted warm-up capture before the evidence frame.
  await page.waitForTimeout(200);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() =>
    requestAnimationFrame(resolve))));
  await page.screenshot({ animations: 'disabled' });
  await page.waitForTimeout(100);
  await page.screenshot({ path: join(captureDir, `${name}.png`), animations: 'disabled' });
}

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

function spawnCompanion(configPath, token = TOKEN) {
  const child = spawn(BIN, [], {
    env: { ...process.env, COMPANION_TOKEN: token, COMPANION_CONFIG: configPath },
    stdio: 'ignore',
  });
  child.on('error', (e) => fail('e2e: failed to spawn companion: ' + e.message));
  return child;
}

async function waitForPort(open, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    if ((await ping()) === open) return true;
    await sleep(100);
  }
  return false;
}

async function stopCompanion(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await Promise.race([once(child, 'exit'), sleep(3000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit').catch(() => {});
  }
  await waitForPort(false);
}

async function main() {
  if (!(await portFree())) {
    fail('e2e: 127.0.0.1:7700 is already in use — stop the running companion first');
    console.log('\nSMOKE FAILED');
    process.exit(1);
  }

  // Always compile current source explicitly. A stale target/debug binary must never make this
  // integration test pass without exercising the checkout under test.
  console.log('building companion binary…');
  execSync('cargo build --offline --locked', { cwd: companionDir, stdio: 'inherit' });

  // Isolated watched folder + config.
  const work = mkdtempSync(join(tmpdir(), 'fv-companion-e2e-'));
  const watched = join(work, 'watched');
  mkdirSync(watched, { recursive: true });
  const filePath = join(watched, 'note.txt');
  writeFileSync(filePath, 'hello');                       // 5 bytes
  const csvPath = join(watched, 'records.csv');
  const csvBytes = 'name,score\nAda,10\nGrace,9\n';
  writeFileSync(csvPath, csvBytes);
  const nestedFolder = join(watched, 'nested', 'remove-me');
  const nestedFile = join(nestedFolder, 'inside.txt');
  mkdirSync(nestedFolder, { recursive: true });
  writeFileSync(nestedFile, 'nested disposable file');
  writeFileSync(join(watched, 'nested', 'keep.txt'), 'keep');
  const firstShared = join(watched, 'shared', 'same.txt');
  mkdirSync(dirname(firstShared), { recursive: true });
  writeFileSync(firstShared, 'first root');
  const secondWatched = join(work, 'watched-second');
  const secondShared = join(secondWatched, 'shared', 'same.txt');
  mkdirSync(dirname(secondShared), { recursive: true });
  writeFileSync(secondShared, 'second root');

  // Adversarial browser fixtures: delayed root resolution/refresh, duplicate basenames, large-file
  // navigation cancellation, and same-name auto-link races all remain inside this disposable tree.
  const slowWatched = join(work, 'slow-root');
  const slowFile = join(slowWatched, 'slow-only.txt');
  mkdirSync(slowWatched, { recursive: true });
  writeFileSync(slowFile, 'slow root bytes');
  const fastWatched = join(work, 'fast-root');
  const fastFile = join(fastWatched, 'fast-only.txt');
  mkdirSync(fastWatched, { recursive: true });
  writeFileSync(fastFile, 'fast root bytes');
  const sameParentA = join(work, 'same-parent-a');
  const sameParentB = join(work, 'same-parent-b');
  const sameProjectA = join(sameParentA, 'project');
  const sameProjectB = join(sameParentB, 'project');
  const sameProjectAFile = join(sameProjectA, 'first-only.txt');
  const sameProjectBFile = join(sameProjectB, 'second-only.txt');
  mkdirSync(sameProjectA, { recursive: true });
  mkdirSync(sameProjectB, { recursive: true });
  writeFileSync(sameProjectAFile, 'first project');
  writeFileSync(sameProjectBFile, 'second project');
  const largeWatched = join(work, 'large-root');
  const largeSmallFile = join(largeWatched, 'a-small.txt');
  const largeCancelFile = join(largeWatched, 'z-large.bin');
  mkdirSync(largeWatched, { recursive: true });
  writeFileSync(largeSmallFile, 'small root anchor');
  writeFileSync(largeCancelFile, Buffer.alloc(9 * 1024 * 1024, 0x4c));
  const rootLevelFile = join(watched, 'root-level.txt');
  writeFileSync(rootLevelFile, 'root level original');
  const createSource = join(work, 'create-through-browser.txt');
  writeFileSync(createSource, 'CREATED THROUGH REAL BROWSER FLOW');
  const switchAwayFile = join(work, 'switch-away.txt');
  writeFileSync(switchAwayFile, 'switch away');
  const sameNameWatched = join(watched, 'race-same.txt');
  writeFileSync(sameNameWatched, 'MATCH');
  const sameNameOutsideDir = join(work, 'outside-same-name');
  mkdirSync(sameNameOutsideDir);
  const sameNameOutside = join(sameNameOutsideDir, 'race-same.txt');
  writeFileSync(sameNameOutside, 'MATCH');
  const delayedSaveTarget = join(watched, 'delayed-save.txt');
  writeFileSync(delayedSaveTarget, 'TARGET MUST STAY');
  const delayedSaveOutsideDir = join(work, 'outside-delayed-save');
  mkdirSync(delayedSaveOutsideDir);
  const delayedSaveSource = join(delayedSaveOutsideDir, 'delayed-save.txt');
  writeFileSync(delayedSaveSource, 'SOURCE IN VIEWER');
  const cfgPath = join(work, 'config.json');
  writeFileSync(cfgPath, JSON.stringify({
    watched_paths: [
      watched, secondWatched, slowWatched, fastWatched,
      sameProjectA, sameProjectB, largeWatched,
    ],
  }));

  let server = spawnCompanion(cfgPath);

  // Wait for the server to accept connections.
  const up = await waitForPort(true);
  if (!up) { fail('e2e: companion did not come up on :7700'); server.kill(); cleanup(); console.log('\nSMOKE FAILED'); process.exit(1); }
  pass('companion server is up on :7700');

  // A second launch must exit without killing or replacing the established server. This guards
  // against the old executable-name takeover, which could terminate unrelated processes and broke
  // once release binaries were renamed with a version suffix.
  const duplicate = spawnSync(BIN, [], {
    env: { ...process.env, COMPANION_TOKEN: 'duplicate', COMPANION_CONFIG: cfgPath },
    encoding: 'utf8',
    timeout: 3000,
  });
  if (!duplicate.error && duplicate.status !== null
    && /already running/.test(duplicate.stderr || '') && await ping()) {
    pass('second companion exits without replacing the first server');
  } else {
    fail('second companion takeover guard failed: ' + JSON.stringify({
      error: duplicate.error?.message, status: duplicate.status, signal: duplicate.signal,
      stderr: duplicate.stderr,
    }));
  }

  let ctx = null;
  try {

  // Server-enforced Origin boundary. This uses raw HTTP (Node fetch does not enforce browser CORS),
  // so a hostile actual request must be rejected before it can mutate the disposable config.
  for (const allowedOrigin of ['https://jdeworks.github.io', 'http://localhost:8123', 'http://127.0.0.1:8123']) {
    const response = await fetch(`http://127.0.0.1:${PORT}/ping`, { headers: { Origin: allowedOrigin } });
    if (response.status === 200 && response.headers.get('access-control-allow-origin') === allowedOrigin) {
      pass('CORS allows exact origin: ' + allowedOrigin);
    } else fail('allowed CORS origin failed: ' + allowedOrigin + ' status=' + response.status);
  }
  for (const hostileOrigin of ['https://evil.example', 'http://localhost.evil.example:8123', 'null']) {
    const response = await fetch(`http://127.0.0.1:${PORT}/ping`, { headers: { Origin: hostileOrigin } });
    if (response.status === 403 && !response.headers.get('access-control-allow-origin')) {
      pass('CORS rejects hostile origin: ' + hostileOrigin);
    } else fail('hostile CORS origin was not rejected: ' + hostileOrigin + ' status=' + response.status);
  }
  const blindCrossSite = await fetch(`http://127.0.0.1:${PORT}/find-file?name=anything&size=0`, {
    headers: { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'no-cors' },
  });
  if (blindCrossSite.status === 403) pass('blind cross-site subresource GET is rejected without a scan');
  else fail('blind cross-site subresource GET status: ' + blindCrossSite.status);
  const allowedPreflight = await fetch(`http://127.0.0.1:${PORT}/watched-paths`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8123',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-companion-token',
    },
  });
  if (allowedPreflight.status === 200
    && allowedPreflight.headers.get('access-control-allow-origin') === 'http://localhost:8123') {
    pass('allowed mutation preflight succeeds with exact CORS headers');
  } else fail('allowed mutation preflight failed: ' + allowedPreflight.status);
  const hostilePreflight = await fetch(`http://127.0.0.1:${PORT}/watched-paths`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'x-companion-token',
    },
  });
  if (hostilePreflight.status === 403) pass('hostile mutation preflight is rejected');
  else fail('hostile mutation preflight status: ' + hostilePreflight.status);

  const hostileRoot = join(work, 'hostile-root');
  mkdirSync(hostileRoot);
  const configBeforeHostile = readFileSync(cfgPath, 'utf8');
  const hostileMutation = await fetch(`http://127.0.0.1:${PORT}/watched-paths`, {
    method: 'POST',
    headers: {
      Origin: 'https://evil.example',
      'Content-Type': 'application/json',
      'X-Companion-Token': TOKEN,
    },
    body: JSON.stringify({ path: hostileRoot }),
  });
  if (hostileMutation.status === 403 && readFileSync(cfgPath, 'utf8') === configBeforeHostile) {
    pass('hostile actual request cannot mutate config even with a valid token');
  } else fail('hostile actual request mutated state or returned ' + hostileMutation.status);

  const authPath = join(watched, 'auth-check.txt');
  writeFileSync(authPath, 'ORIGINAL');
  for (const [label, token] of [['missing', null], ['wrong', 'wrong-token']]) {
    const headers = token ? { 'X-Companion-Token': token } : {};
    const response = await fetch(`http://127.0.0.1:${PORT}/file?path=${encodeURIComponent(authPath)}`, {
      method: 'POST', headers, body: 'MUTATED',
    });
    if (response.status === 401 && readFileSync(authPath, 'utf8') === 'ORIGINAL') {
      pass(label + ' token cannot mutate file bytes');
    } else fail(label + ' token mutation boundary failed: ' + response.status);
  }

  // Evidence captures favor Chromium's deterministic software compositor. Headless GPU surfaces
  // intermittently produce large black rectangles in otherwise-correct iframe/drawer screenshots
  // on WSL; the behavioral run keeps the default path, while the capture lane disables only GPU.
  ctx = await createHarness({ launchArgs: captureDir ? ['--disable-gpu'] : [] });
  const { page, origin } = ctx;
  const companionOrigin = `http://127.0.0.1:${PORT}`;
  const hasOrigin = (raw, expected) => {
    try { return new URL(raw).origin === expected; } catch { return false; }
  };
  let dialogMsg = null;
  const dialogActions = [];
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    const action = dialogActions.shift();
    if (action?.dismiss) d.dismiss();
    else d.accept(action?.text);
  });

    // Start disabled: opening a local file must still make Settings available without sending any
    // loopback traffic. Enable through the actual Settings toggle (not localStorage injection), then
    // exercise the Test connection button with a delayed real /ping so its connecting state is
    // directly observable before it reports connected.
    await page.goto(origin, { waitUntil: 'load' });
    const disabledCompanionTraffic = ctx.offOrigin.filter((url) => hasOrigin(url, companionOrigin));
    if (disabledCompanionTraffic.length === 0) pass('disabled browser mode makes no Companion requests');
    else fail('disabled browser mode contacted Companion: ' + JSON.stringify(disabledCompanionTraffic));
    await page.setInputFiles('#fileInput', filePath);
    await page.waitForFunction(() => !document.getElementById('settingsBtn')?.hidden);
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.waitForSelector('.companion-panel #companionEnabledToggle', { state: 'attached' });
    await page.evaluate(() => { document.querySelector('.companion-panel').open = true; });
    const disabledUi = await page.evaluate(() => ({
      toggle: document.getElementById('companionEnabledToggle')?.checked,
      summary: document.querySelector('.companion-panel > summary')?.textContent || '',
      indicatorHidden: document.getElementById('companionStatusBtn')?.hidden,
    }));
    if (disabledUi.toggle === false && disabledUi.indicatorHidden === true && /not found/i.test(disabledUi.summary)) {
      pass('Settings shows the disabled Companion state without loopback traffic');
    } else fail('disabled Settings state is dishonest: ' + JSON.stringify(disabledUi));
    await page.check('#companionEnabledToggle');
    await page.waitForFunction(() => document.body.classList.contains('companion-active'), { timeout: 8000 })
      .then(() => pass('Settings toggle enables and connects the Companion'))
      .catch(() => fail('Settings toggle did not connect the Companion'));

    const pingUrl = `http://127.0.0.1:${PORT}/ping`;
    await page.route(pingUrl, async (route) => {
      await sleep(250);
      await route.continue().catch(() => {});
    }, { times: 1 });
    const testButton = page.locator('.companion-panel button', { hasText: 'Test connection' });
    await testButton.click();
    const connectingUi = await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('.companion-panel button')]
        .find((candidate) => /Test connection/.test(candidate.textContent || ''));
      return button?.disabled;
    }, null, { timeout: 1000 }).then(() => true).catch(() => false);
    if (connectingUi) pass('Settings exposes a disabled in-flight control while connection testing');
    else fail('Settings connection test never exposed its connecting state');
    await page.waitForFunction(() => /Companion connected/.test(document.getElementById('toast')?.textContent || ''), null,
      { timeout: 8000 });
    await page.unroute(pingUrl);
    const connectedUi = await page.evaluate(() => ({
      summary: document.querySelector('.companion-panel > summary')?.textContent || '',
      indicator: document.getElementById('companionStatusBtn')?.textContent || '',
      up: document.getElementById('companionStatusBtn')?.classList.contains('conn-up'),
    }));
    if (/connected/i.test(connectedUi.summary) && connectedUi.indicator === '●' && connectedUi.up) {
      pass('Settings Test connection reports the connected state');
    } else fail('connected Settings state is dishonest: ' + JSON.stringify(connectedUi));
    const tokenMask = await page.evaluate(() => {
      const input = document.querySelector('.companion-token-input');
      return { type: input?.type, filter: input ? getComputedStyle(input).filter : null };
    });
    await page.click('.companion-token-input');
    const tokenRevealed = await page.locator('.companion-token-input').getAttribute('type');
    await page.click('.companion-token-input');
    if (tokenMask.type === 'password' && tokenMask.filter === 'none' && tokenRevealed === 'text') {
      pass('token uses native password masking and explicit click-to-reveal without a blur compositor');
    } else fail('token masking/reveal state is unsafe or compositor-backed: ' + JSON.stringify({
      tokenMask, tokenRevealed,
    }));
    await capture(page, 'companion-settings-connected');
    await page.click('#settingsDrawer [data-close]');

    // The token must have been picked up from /ping automatically (no manual paste).
    const gotToken = await page.evaluate(async () => (await import('/core/companion.js')).getToken());
    if (gotToken === TOKEN) pass('session token auto-delivered from /ping (no manual paste)');
    else fail('token not auto-delivered: ' + JSON.stringify(gotToken));

    // Drive the real companion client (docs/core/companion.js) over HTTP from the page context.
    const paths = await page.evaluate(async () => (await import('/core/companion.js')).getWatchedPaths());
    if (Array.isArray(paths) && paths.some((p) => p.includes('watched'))) pass('getWatchedPaths returns the watched folder');
    else fail('getWatchedPaths wrong: ' + JSON.stringify(paths));

    // Runtime add/remove must reconcile the real notify watcher, not only the HTTP-access root set.
    const runtimeRoot = join(work, 'runtime-watched');
    mkdirSync(runtimeRoot);
    await page.evaluate(() => {
      window.__companionEvents = [];
      window.__companionEventSource = new EventSource('http://127.0.0.1:7700/watch');
      window.__companionEventSource.onmessage = (event) => {
        try { window.__companionEvents.push(JSON.parse(event.data)); } catch { /* ignore keepalive */ }
      };
    });
    await page.waitForFunction(() => window.__companionEventSource?.readyState === EventSource.OPEN);
    const addResult = await page.evaluate(async (path) => (await import('/core/companion.js')).addWatchedPath(path), runtimeRoot);
    if (addResult?.ok && addResult.paths?.includes(runtimeRoot)) pass('runtime watched root is added and persisted');
    else fail('runtime watched root add failed: ' + JSON.stringify(addResult));
    await page.waitForTimeout(350);
    const runtimeEventPath = join(runtimeRoot, 'external-create.txt');
    writeFileSync(runtimeEventPath, 'created outside browser');
    const runtimeEventSeen = await page.waitForFunction((path) =>
      (window.__companionEvents || []).some((event) => event.path === path), runtimeEventPath,
    { timeout: 8000 }).then(() => true).catch(() => false);
    if (runtimeEventSeen) pass('runtime-added root emits real external file events');
    else fail('runtime-added root emitted no external file event');

    const removeResult = await page.evaluate(async (path) => (await import('/core/companion.js')).removeWatchedPath(path), runtimeRoot);
    if (removeResult?.ok && !removeResult.paths?.includes(runtimeRoot)) pass('runtime watched root is removed and persisted');
    else fail('runtime watched root remove failed: ' + JSON.stringify(removeResult));
    await page.waitForTimeout(350);
    await page.evaluate(() => { window.__companionEvents = []; });
    const removedEventPath = join(runtimeRoot, 'after-remove.txt');
    writeFileSync(removedEventPath, 'must stay private after remove');
    await page.waitForTimeout(1000);
    const removedEventLeaked = await page.evaluate((path) =>
      (window.__companionEvents || []).some((event) => event.path === path), removedEventPath);
    if (!removedEventLeaked) pass('removed root stops emitting file paths');
    else fail('removed root still emitted an SSE path');
    await page.evaluate(() => { window.__companionEventSource?.close(); delete window.__companionEventSource; });

    const matches = await page.evaluate(async () => (await import('/core/companion.js')).findFile('note.txt', 5));
    if (Array.isArray(matches) && matches.length === 1 && matches[0].endsWith('note.txt')) pass('find-file locates note.txt by name+size');
    else fail('find-file wrong: ' + JSON.stringify(matches));

    // The standalone server has no native dialog → /path-picker 404s → pickFolder resolves to null
    // (the desktop/Tauri build implements it). Assert the graceful fallback, not a throw.
    const picked = await page.evaluate(async () => (await import('/core/companion.js')).pickFolder());
    if (picked === null) pass('pickFolder degrades to null on the standalone server (404)');
    else fail('pickFolder should be null on the bare server: ' + JSON.stringify(picked));

    const abs = matches[0];

    const largePath = join(watched, 'over-two-mib.bin');
    const largePayload = Buffer.alloc(2 * 1024 * 1024 + 1, 0x5a);
    const largeResponse = await fetch(`http://127.0.0.1:${PORT}/file?path=${encodeURIComponent(largePath)}`, {
      method: 'POST', headers: { 'X-Companion-Token': TOKEN }, body: largePayload,
    });
    if (largeResponse.status === 200 && statSync(largePath).size === largePayload.length) {
      pass('save accepts and persists a payload above the old 2 MiB ceiling');
    } else fail('large save failed: status=' + largeResponse.status);

    await page.evaluate(async (p) => {
      const m = await import('/core/companion.js');
      await m.saveFile(p, new TextEncoder().encode('EDITED VIA COMPANION'));
    }, abs);
    const onDisk = readFileSync(filePath, 'utf8');
    if (onDisk === 'EDITED VIA COMPANION') pass('saveFile writes new bytes to the real file on disk');
    else fail('save did not hit disk: ' + JSON.stringify(onDisk));

    // UI check: opening the file shows the Save button (companion-aware topbar).
    await page.setInputFiles('#fileInput', []);
    await page.setInputFiles('#fileInput', filePath);
    await page.waitForFunction(() => { const b = document.getElementById('saveBtn'); return b && !b.hidden; }, { timeout: 8000 })
      .then(() => pass('opening a watched file reveals the Save-to-disk button'))
      .catch(() => fail('Save button did not appear for an opened watched file'));

    // Auto-link: opening a file that exists in a watched folder should silently associate it (one
    // name+size match) and reveal the Delete button WITHOUT a manual save first.
    await page.waitForFunction(() => { const b = document.getElementById('deleteBtn'); return b && !b.hidden; }, { timeout: 8000 })
      .then(() => pass('opening a watched file auto-links it and reveals the Delete button'))
      .catch(() => fail('Delete button did not appear (auto-link on open failed)'));
    await capture(page, 'companion-linked-save-delete');

    // Turn the injected config path into a directory to force an atomic-persistence failure. The
    // Settings UI must surface the server error honestly, retain the typed path, and leave both the
    // in-memory roots and the prior config bytes unchanged. Open this after a file has initialized
    // the type-specific Settings model, matching the point where the Settings button is available.
    const failingRoot = join(work, 'must-not-be-added');
    mkdirSync(failingRoot);
    const configBackup = cfgPath + '.before-failure';
    const configBeforeFailure = readFileSync(cfgPath, 'utf8');
    const pathsBeforeFailure = await page.evaluate(async () => (await import('/core/companion.js')).getWatchedPaths());
    renameSync(cfgPath, configBackup);
    mkdirSync(cfgPath);
    try {
      // At this harness width Settings lives in the overflow menu and the canonical button is
      // hidden; activate its real wired click handler without depending on topbar placement.
      await page.evaluate(() => document.getElementById('settingsBtn').click());
      await page.waitForSelector('.companion-panel .companion-add-input', { state: 'attached' });
      await page.evaluate(() => { document.querySelector('.companion-panel').open = true; });
      await page.waitForSelector('.companion-panel .companion-add-input', { state: 'visible' });
      await page.fill('.companion-panel .companion-add-input', failingRoot);
      await page.locator('.companion-panel .companion-add-row button', { hasText: '+ Add' }).click();
      await page.waitForFunction(() => /persist watched folders|save.*configuration/i.test(
        document.getElementById('toast')?.textContent || '',
      ));
      const failureUi = await page.evaluate(() => ({
        input: document.querySelector('.companion-panel .companion-add-input')?.value || '',
        toast: document.getElementById('toast')?.textContent || '',
      }));
      const pathsAfterFailure = await page.evaluate(async () => (await import('/core/companion.js')).getWatchedPaths());
      const noTempLeak = !readdirSync(work).some((name) => name.endsWith('.tmp'));
      if (failureUi.input === failingRoot
        && /persist watched folders|save.*configuration/i.test(failureUi.toast)
        && JSON.stringify(pathsAfterFailure) === JSON.stringify(pathsBeforeFailure)
        && readFileSync(configBackup, 'utf8') === configBeforeFailure
        && noTempLeak) {
        pass('Settings reports persistence failure without clearing input or changing roots/config');
      } else fail('Settings persistence failure was dishonest: ' + JSON.stringify({
        failureUi, pathsBeforeFailure, pathsAfterFailure, noTempLeak,
      }));
      await capture(page, 'companion-settings-persistence-failure');
      await page.click('#settingsDrawer [data-close]');
    } finally {
      rmSync(cfgPath, { recursive: true, force: true });
      renameSync(configBackup, cfgPath);
    }

    // Exercise the canonical source Settings module directly (the deployed shell loads the
    // generated bundle, which is intentionally not regenerated by this focused test change).
    // A native-picker persistence error must be visible; an ok:false response without an error is
    // an ordinary user cancellation and must remain silent.
    const pickerUrl = `http://127.0.0.1:${PORT}/path-picker`;
    const pickerResponses = [
      { ok: false, chosen: null, error: 'could not persist watched folder configuration' },
      { ok: false, chosen: null },
    ];
    await page.route(pickerUrl, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'x-companion-token',
          },
        });
        return;
      }
      const response = pickerResponses.shift() || { ok: false, chosen: null };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify(response),
      });
    });
    try {
      await page.evaluate(async () => {
        const host = document.createElement('div');
        host.id = 'companionPickerRegression';
        document.body.appendChild(host);
        const { renderCompanionSettings } = await import('/core/companion-settings.js');
        renderCompanionSettings(host);
        host.querySelector('.companion-panel').open = true;
      });
      const trustDisclosure = await page.locator(
        '#companionPickerRegression .companion-net',
      ).textContent();
      if (/machine-wide, not per account/i.test(trustDisclosure || '')
        && /CORS and the session token do not authenticate local processes/i.test(trustDisclosure || '')) {
        pass('Companion Settings discloses the machine-wide loopback trust boundary');
      } else fail('Companion Settings trust disclosure is incomplete: ' + JSON.stringify(trustDisclosure));
      const pickerButton = page.locator('#companionPickerRegression .companion-add-row button', { hasText: 'Pick' });
      await pickerButton.click();
      await page.waitForFunction(() => /Pick failed: could not persist watched folder configuration/.test(
        document.getElementById('toast')?.textContent || '',
      ));
      pass('native picker persistence failure is surfaced by the Settings UI');

      await page.evaluate(async () => {
        const { toast } = await import('/core/state.js');
        toast('picker-cancel-sentinel', 10_000);
      });
      await pickerButton.click();
      await page.waitForFunction(() => {
        const button = document.querySelector(
          '#companionPickerRegression .companion-add-row button:last-child',
        );
        return button && !button.disabled;
      });
      await page.waitForTimeout(100);
      const cancellationToast = await page.locator('#toast').textContent();
      if (cancellationToast === 'picker-cancel-sentinel') {
        pass('native picker cancellation remains silent');
      } else fail('native picker cancellation changed the toast: ' + JSON.stringify(cancellationToast));
    } finally {
      await page.unroute(pickerUrl);
      await page.evaluate(() => document.getElementById('companionPickerRegression')?.remove());
    }

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

    // Wait beyond the self-save suppression window, then prove a real external write reaches the UI
    // through notify -> SSE and reloads the new bytes.
    await page.waitForTimeout(4300);
    await page.evaluate(() => document.querySelector('.companion-reload-banner')?.remove());
    writeFileSync(filePath, 'EXTERNAL CHANGE');
    const externalBanner = await page.waitForFunction(() => {
      const banner = document.querySelector('.companion-reload-banner');
      return banner && /changed on disk/i.test(banner.textContent || '');
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    if (externalBanner) pass('external file change reaches the viewer over SSE');
    else fail('external file change did not produce the reload banner');
    if (externalBanner) {
      await page.click('.companion-reload-banner .reload-btn');
      const reloadedExternal = await page.waitForFunction(async () => {
        const { state } = await import('/core/state.js');
        return state.rawview?.getValue?.() === 'EXTERNAL CHANGE';
      }, { timeout: 8000 }).then(() => true).catch(() => false);
      if (reloadedExternal) pass('reload banner loads externally changed bytes');
      else fail('reload banner did not load external bytes');
      const controlsRetained = reloadedExternal && await page.waitForFunction(() =>
        !document.getElementById('saveBtn')?.hidden && !document.getElementById('deleteBtn')?.hidden,
      null, { timeout: 8000 }).then(() => true).catch(() => false);
      if (controlsRetained) pass('external reload retains Companion Save/Delete controls');
      else fail('external reload lost the Companion disk-link controls');
    }

    // Hold a second external reload at the byte fetch and attempt a competing intake. Reload owns
    // the navigation transaction, so B must be rejected until A commits; switching away/back after
    // commit must reopen the exact reloaded bytes from A's updated sidebar snapshot.
    const reloadedRootLabel = await page.evaluate(() => window.__fv.state.sidebarRoots.find(
      (root) => root.id === window.__fv.state.activeSidebarRootId,
    )?.label);
    await page.waitForTimeout(300); // the reload intentionally replaces the SSE source; let it open
    writeFileSync(filePath, 'EXTERNAL DELAYED RELOAD');
    const secondReloadBanner = await page.waitForFunction(() =>
      document.querySelector('.companion-reload-banner .reload-btn'), null,
    { timeout: 8000 }).then(() => true).catch(() => false);
    if (!secondReloadBanner) throw new Error('second external change produced no reload banner');
    const delayedReloadUrl = `http://127.0.0.1:${PORT}/file?path=${encodeURIComponent(filePath)}`;
    let delayedReloadStartedResolve;
    const delayedReloadStarted = new Promise((resolveStarted) => { delayedReloadStartedResolve = resolveStarted; });
    let releaseDelayedReload;
    const delayedReloadRelease = new Promise((resolveRelease) => { releaseDelayedReload = resolveRelease; });
    await page.route(delayedReloadUrl, async (route) => {
      if (route.request().method() !== 'GET') { await route.continue().catch(() => {}); return; }
      delayedReloadStartedResolve();
      await delayedReloadRelease;
      await route.continue().catch(() => {});
    });
    await page.click('.companion-reload-banner .reload-btn');
    if (!await Promise.race([delayedReloadStarted.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for delayed external reload request');
    }
    await page.setInputFiles('#fileInput', switchAwayFile);
    await page.waitForTimeout(100);
    const reloadBlockedCompetingIntake = await page.evaluate(() =>
      window.__fv?.state?.intake?.filename === 'note.txt'
        && !!window.__fv.state.companionOperationToken);
    releaseDelayedReload();
    const delayedReloadCommitted = await page.waitForFunction(() =>
      window.__fv?.state?.rawview?.getValue?.() === 'EXTERNAL DELAYED RELOAD'
        && !window.__fv.state.companionOperationToken,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!delayedReloadCommitted) {
      throw new Error('delayed external reload did not commit: ' + JSON.stringify(await page.evaluate(() => ({
        value: window.__fv?.state?.rawview?.getValue?.(),
        operation: !!window.__fv?.state?.companionOperationToken,
        intake: window.__fv?.state?.intake?.filename,
        toast: document.getElementById('toast')?.textContent || '',
      }))));
    }
    await page.unroute(delayedReloadUrl);
    await page.setInputFiles('#fileInput', []);
    await page.setInputFiles('#fileInput', switchAwayFile);
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'switch-away.txt');
    await page.locator(`.ft-row.ft-file[data-full-path="${reloadedRootLabel}"]`).click();
    const restoredReloadSnapshot = await page.waitForFunction(() =>
      !window.__fv?.state?.sidebarNavigationPending
        && window.__fv.state.rawview?.getValue?.() === 'EXTERNAL DELAYED RELOAD'
        && !document.getElementById('saveBtn')?.hidden
        && !document.getElementById('deleteBtn')?.hidden,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (reloadBlockedCompetingIntake && restoredReloadSnapshot) {
      pass('delayed reload blocks competing intake and persists exact bytes/link across root switches');
    } else fail('reload navigation/snapshot isolation failed: ' + JSON.stringify({
      reloadBlockedCompetingIntake, restoredReloadSnapshot,
    }));

    // Download the current Companion-linked bytes, then delete the disk original through the real
    // topbar confirmation flow. Keep a global SSE listener open so the watcher must also report the
    // removal event rather than only returning an HTTP success.
    const [currentDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.evaluate(() => window.__fv.downloadCurrent()),
    ]);
    const currentDownloadPath = await currentDownload.path();
    const currentDownloadBytes = currentDownloadPath ? readFileSync(currentDownloadPath, 'utf8') : null;
    if (currentDownload.suggestedFilename() === 'note.txt' && currentDownloadBytes === 'EXTERNAL DELAYED RELOAD') {
      pass('Companion-linked current file downloads with the exact latest bytes');
    } else fail('Companion-linked download mismatch: ' + JSON.stringify({
      name: currentDownload.suggestedFilename(), currentDownloadBytes,
    }));

    await page.evaluate(() => {
      window.__companionDeleteEvents = [];
      window.__companionDeleteEventSource = new EventSource('http://127.0.0.1:7700/watch');
      window.__companionDeleteEventSource.onmessage = (event) => {
        try { window.__companionDeleteEvents.push(JSON.parse(event.data)); } catch { /* keepalive */ }
      };
    });
    await page.waitForFunction(() => window.__companionDeleteEventSource?.readyState === EventSource.OPEN);
    dialogMsg = null;
    await page.click('#deleteBtn');
    for (let i = 0; i < 40 && existsSync(filePath); i++) await sleep(100);
    const removeEventSeen = await page.waitForFunction((path) =>
      (window.__companionDeleteEvents || []).some((event) => event.path === path && event.kind === 'remove'),
    filePath, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!existsSync(filePath) && /permanently deletes the file/i.test(dialogMsg || '')) {
      pass('topbar confirmation deletes the disposable Companion-linked file');
    } else fail('topbar file deletion flow failed: ' + JSON.stringify({ exists: existsSync(filePath), dialogMsg }));
    if (removeEventSeen) pass('file deletion emits a real remove SSE event');
    else fail('file deletion emitted no remove SSE event');
    await page.evaluate(() => { window.__companionDeleteEventSource?.close(); delete window.__companionDeleteEventSource; });

    // Open and auto-link a watched CSV, then exercise a type-specific export. This proves the
    // download/export workflow on bytes that came from a Companion-authorized disk path.
    await page.setInputFiles('#fileInput', csvPath);
    await page.waitForFunction(() => window.__fv?.state?.type?.id === 'csv');
    await page.waitForFunction(() => !document.getElementById('deleteBtn')?.hidden, null, { timeout: 8000 });
    await page.click('#exportBtn');
    await page.waitForSelector('#exportMenu:not([hidden]) .export-item');
    const [csvExport] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.click('#exportMenu .export-item:has-text("Download as JSON")'),
    ]);
    const csvExportPath = await csvExport.path();
    let csvExportRows = null;
    try { csvExportRows = JSON.parse(readFileSync(csvExportPath, 'utf8')); } catch { /* asserted below */ }
    if (/records\.json$/.test(csvExport.suggestedFilename())
      && Array.isArray(csvExportRows) && csvExportRows.length === 2
      && csvExportRows[0]?.name === 'Ada' && String(csvExportRows[1]?.score) === '9') {
      pass('Companion-linked CSV exports to a valid JSON download');
    } else fail('Companion-linked CSV export mismatch: ' + JSON.stringify({
      name: csvExport.suggestedFilename(), csvExportRows,
    }));

    // Drive the real unknown-file create workflow end to end: Save → confirmation → watched-root
    // browser → + New folder prompt → current bytes written to the new nested destination.
    await page.setInputFiles('#fileInput', createSource);
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'create-through-browser.txt'
      && !document.getElementById('saveBtn')?.hidden);
    dialogActions.push({}, { text: 'browser-created' });
    await page.click('#saveBtn');
    await page.waitForSelector('.companion-browse', { state: 'visible' });
    await page.getByRole('button', { name: watched, exact: true }).click();
    await page.waitForFunction((path) => document.querySelector('.companion-browse-path')?.textContent === path,
      watched);
    await page.waitForFunction(() => document.querySelector('.companion-browse-list')?.textContent !== 'Loading…');
    await capture(page, 'companion-create-browser');
    await page.locator('.companion-browse button', { hasText: '+ New folder' }).click();
    const browserCreatedPath = join(watched, 'browser-created', 'create-through-browser.txt');
    for (let i = 0; i < 40 && !existsSync(browserCreatedPath); i++) await sleep(100);
    if (existsSync(browserCreatedPath)
      && readFileSync(browserCreatedPath, 'utf8') === 'CREATED THROUGH REAL BROWSER FLOW') {
      pass('Save UI browses a watched root and creates current bytes in a new nested folder');
    } else fail('browser create workflow did not persist exact bytes at ' + browserCreatedPath);

    // A successful Save must update the append-only sidebar snapshot and retain the per-file disk
    // association. Switching away/back should show the committed bytes and restore Save/Delete.
    await page.evaluate(() => window.__fv.state.rawview.setValue('SAVED SNAPSHOT THROUGH UI'));
    await page.click('#saveBtn');
    for (let i = 0; i < 40 && readFileSync(browserCreatedPath, 'utf8') !== 'SAVED SNAPSHOT THROUGH UI'; i++) {
      await sleep(100);
    }
    const savedRootLabel = await page.evaluate(() => window.__fv.state.sidebarRoots.find(
      (root) => root.id === window.__fv.state.activeSidebarRootId,
    )?.label);
    await page.setInputFiles('#fileInput', switchAwayFile);
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'switch-away.txt');
    await page.locator(`.ft-row.ft-file[data-full-path="${savedRootLabel}"]`).click();
    const restoredSavedSnapshot = await page.waitForFunction(() =>
      window.__fv?.state?.rawview?.getValue?.() === 'SAVED SNAPSHOT THROUGH UI'
        && !document.getElementById('saveBtn')?.hidden
        && !document.getElementById('deleteBtn')?.hidden,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (restoredSavedSnapshot) {
      pass('switching away/back restores exact saved bytes and the standalone Companion link');
    } else fail('saved sidebar snapshot/link was stale after root switch');

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
    const allLogs = await page.evaluate(async () => (await import('/core/companion.js')).getLogs({ limit: 2000 }));
    if (Array.isArray(allLogs) && !allLogs.some((entry) => (entry.msg || '').includes('fvtest-e2e'))) {
      pass('activity log does not expose the session token');
    } else fail('activity log exposed the session token');
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.waitForSelector('.companion-panel', { state: 'attached' });
    await page.evaluate(() => {
      document.querySelector('.companion-panel').open = true;
      document.querySelector('.companion-logs').open = true;
    });
    await page.waitForSelector('.companion-logs-row');
    await capture(page, 'companion-activity-log');
    await page.click('#settingsDrawer [data-close]');

    // Simulate the exact state produced by intake's >64 MiB partial-read boundary without loading a
    // 64 MiB Monaco model into this integration run. Both normal visibility and stale/programmatic
    // activation must refuse write-back and leave the original bytes untouched.
    const truncatedPath = join(watched, 'truncated-guard.txt');
    writeFileSync(truncatedPath, 'COMPLETE ORIGINAL');
    await page.setInputFiles('#fileInput', truncatedPath);
    await page.waitForFunction(() => {
      const button = document.getElementById('saveBtn');
      const intake = window.__fv?.state?.intake;
      return button && !button.hidden
        && intake?.filename === 'truncated-guard.txt'
        && !document.getElementById('deleteBtn')?.hidden;
    });
    let truncatedPosts = 0;
    const countTruncatedPost = (request) => {
      if (request.method() === 'POST' && request.url().startsWith(`http://127.0.0.1:${PORT}/file?`)) truncatedPosts++;
    };
    page.on('request', countTruncatedPost);
    await page.evaluate(() => {
      window.__fv.state.intake.truncated = true;
      document.getElementById('saveBtn').click();
    });
    await page.waitForFunction(() => document.getElementById('saveBtn')?.hidden
      && window.__fv?.state?.intake?.truncated === true);
    await page.waitForTimeout(100);
    page.off('request', countTruncatedPost);
    const truncatedGuard = await page.evaluate(() => ({
      hidden: document.getElementById('saveBtn').hidden,
      toast: document.getElementById('toast').textContent || '',
    }));
    if (truncatedGuard.hidden && /loaded only part/i.test(truncatedGuard.toast)
      && truncatedPosts === 0 && readFileSync(truncatedPath, 'utf8') === 'COMPLETE ORIGINAL') {
      pass('truncated intake hides Save and cannot issue a write-back request');
    } else fail('truncated save guard failed: ' + JSON.stringify({ truncatedGuard, truncatedPosts }));

    // Load the disposable watched tree, resolve its real Companion root, and delete a nested folder
    // from the actual sidebar row. The confirmation must carry the recursive/irreversible warning,
    // the on-disk subtree must disappear, and the watcher must emit a remove event.
    const watchedName = watched.split(/[\\/]/).pop();
    await page.setInputFiles('#folderInput', watched);
    await page.waitForFunction(() => document.body.classList.contains('companion-folder-active'), null,
      { timeout: 8000 });
    const watchedRootId = await page.evaluate(() => window.__fv.state.activeSidebarRootId);

    // Root-level folder paths contain no slash. They must map to <absolute root>/<filename>, not be
    // dropped as an empty relative path. Also prove declining a new folder while this editor is
    // dirty neither creates/resolves the rejected root nor changes the active disk association.
    const rootLevelRow = page.locator(
      `.ft-row.ft-file[data-full-path="${watchedName}/root-level.txt"]`,
    );
    await rootLevelRow.click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'root-level.txt'
      && window.__fv.state.rawview?.getValue?.() === 'root level original'
      && !document.getElementById('saveBtn')?.hidden);
    await page.evaluate(() => window.__fv.state.rawview.setValue('ROOT LEVEL SAVED'));
    await page.waitForFunction(() => window.__fv?.state?.rawview?.isDirty?.()
      && window.__fv.state.downloadedSinceEdit === false
      && window.__fv.state.folderEdits?.get('root-level.txt') === 'ROOT LEVEL SAVED');
    const rootsBeforeCancelledFolder = await page.evaluate(() => window.__fv.state.sidebarRoots.length);
    dialogActions.push({ dismiss: true });
    await page.setInputFiles('#folderInput', fastWatched);
    await page.waitForTimeout(500);
    const cancelledFolderState = await page.evaluate(({ id, count }) => ({
      active: window.__fv.state.activeSidebarRootId,
      count: window.__fv.state.sidebarRoots.length,
      currentPath: window.__fv.state.currentFolderPath,
      fastAttached: window.__fv.state.sidebarRoots.some((root) => root.title === 'fast-root'),
      unchanged: window.__fv.state.activeSidebarRootId === id
        && window.__fv.state.sidebarRoots.length === count,
    }), { id: watchedRootId, count: rootsBeforeCancelledFolder });
    if (cancelledFolderState.unchanged && !cancelledFolderState.fastAttached
      && cancelledFolderState.currentPath === 'root-level.txt') {
      pass('declining a dirty folder replacement leaves the active linked root untouched');
    } else fail('cancelled folder intake changed root state: ' + JSON.stringify(cancelledFolderState));
    await page.click('#saveBtn');
    for (let i = 0; i < 40 && readFileSync(rootLevelFile, 'utf8') !== 'ROOT LEVEL SAVED'; i++) await sleep(100);
    if (readFileSync(rootLevelFile, 'utf8') === 'ROOT LEVEL SAVED') {
      pass('root-level folder file Save resolves to the exact watched-root path');
    } else fail('root-level folder Save did not update ' + rootLevelFile);

    // Cancel the large-file confirmation during a cross-root navigation. The transaction must roll
    // back to the linked A file with its bytes/actions intact; the 9 MiB B file stays untouched.
    await page.setInputFiles('#folderInput', largeWatched);
    await page.waitForFunction(() => window.__fv?.state?.sidebarRoots?.some(
      (root) => root.label === 'large-root' && !!root.companionFolderRoot,
    ), null, { timeout: 8000 });
    await page.locator(`.ft-row.ft-file[data-full-path="${watchedName}/root-level.txt"]`).click();
    await page.waitForFunction((id) => window.__fv?.state?.activeSidebarRootId === id
      && !window.__fv.state.sidebarNavigationPending
      && window.__fv.state.rawview?.getValue?.() === 'ROOT LEVEL SAVED'
      && !document.getElementById('saveBtn')?.hidden
      && !document.getElementById('deleteBtn')?.hidden, watchedRootId);
    dialogActions.push({ dismiss: true });
    await page.locator('.ft-row.ft-file[data-full-path="large-root/z-large.bin"]').click();
    await page.waitForFunction((id) => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.activeSidebarRootId === id
      && window.__fv.state.rawview?.getValue?.() === 'ROOT LEVEL SAVED', watchedRootId);
    const largeCancelState = await page.evaluate((id) => ({
      active: window.__fv.state.activeSidebarRootId,
      currentPath: window.__fv.state.currentFolderPath,
      value: window.__fv.state.rawview?.getValue?.(),
      saveHidden: document.getElementById('saveBtn')?.hidden,
      deleteHidden: document.getElementById('deleteBtn')?.hidden,
    }), watchedRootId);
    if (largeCancelState.active === watchedRootId
      && largeCancelState.currentPath === 'root-level.txt'
      && largeCancelState.value === 'ROOT LEVEL SAVED'
      && !largeCancelState.saveHidden && !largeCancelState.deleteHidden
      && statSync(largeCancelFile).size === 9 * 1024 * 1024) {
      pass('cancelled large cross-root open rolls back bytes, root association, and disk actions');
    } else fail('large-file cancel did not roll back safely: ' + JSON.stringify(largeCancelState));

    await page.evaluate((rootName) => {
      window.__fv.state.treeApi.openPaths([
        rootName,
        `${rootName}/nested`,
        `${rootName}/nested/remove-me`,
      ]);
    }, watchedName);
    await page.evaluate(() => {
      window.__companionNestedDeleteEvents = [];
      window.__companionNestedDeleteSource = new EventSource('http://127.0.0.1:7700/watch');
      window.__companionNestedDeleteSource.onmessage = (event) => {
        try { window.__companionNestedDeleteEvents.push(JSON.parse(event.data)); } catch { /* keepalive */ }
      };
    });
    await page.waitForFunction(() => window.__companionNestedDeleteSource?.readyState === EventSource.OPEN);
    const nestedRow = page.locator('.ft-row.ft-folder', { hasText: 'remove-me' }).first();
    await nestedRow.waitFor({ state: 'visible' });
    await nestedRow.hover();
    await capture(page, 'companion-nested-delete');
    dialogMsg = null;
    await nestedRow.locator('.ft-del').click();
    for (let i = 0; i < 40 && existsSync(nestedFolder); i++) await sleep(100);
    const nestedRemoveEvent = await page.waitForFunction(({ folder, sep }) =>
      (window.__companionNestedDeleteEvents || []).some((event) => event.kind === 'remove'
        && (event.path === folder || event.path.startsWith(folder + sep))),
    { folder: nestedFolder, sep: process.platform === 'win32' ? '\\' : '/' }, { timeout: 8000 })
      .then(() => true).catch(() => false);
    if (!existsSync(nestedFolder) && /everything inside|all its contents/i.test(dialogMsg || '')
      && /cannot be undone/i.test(dialogMsg || '')) {
      pass('sidebar confirmation recursively deletes the disposable nested folder');
    } else fail('nested-folder UI deletion failed: ' + JSON.stringify({
      exists: existsSync(nestedFolder), dialogMsg,
    }));
    if (nestedRemoveEvent) pass('nested-folder deletion emits a real remove SSE event');
    else fail('nested-folder deletion emitted no remove SSE event');
    await page.evaluate(() => { window.__companionNestedDeleteSource?.close(); delete window.__companionNestedDeleteSource; });

    // Open a second watched folder containing the same relative filename. Inactive roots must not
    // expose disk actions; switching back must restore the first root's exact absolute association,
    // so deleting its row cannot touch the same path under the newer root.
    const secondWatchedName = secondWatched.split(/[\\/]/).pop();
    await page.setInputFiles('#folderInput', secondWatched);
    await page.waitForFunction((root) => {
      const active = window.__fv?.state?.sidebarRoots?.find(
        (candidate) => candidate.id === window.__fv?.state?.activeSidebarRootId,
      );
      return active?.label === root && !!active.companionFolderRoot;
    }, secondWatchedName, { timeout: 8000 });
    const firstInactive = page.locator(`.ft-row.ft-file[data-full-path="${watchedName}/shared/same.txt"]`);
    const secondActive = page.locator(`.ft-row.ft-file[data-full-path="${secondWatchedName}/shared/same.txt"]`);
    await firstInactive.waitFor({ state: 'visible' });
    await secondActive.waitFor({ state: 'visible' });
    if (await firstInactive.locator('.ft-del').count() === 0
      && await secondActive.locator('.ft-del').count() === 1) {
      pass('inactive sidebar root exposes no Companion disk action');
    } else fail('sidebar root action scoping is incorrect');

    await firstInactive.click();
    await page.waitForFunction((root) => {
      const active = window.__fv?.state?.sidebarRoots?.find(
        (candidate) => candidate.id === window.__fv?.state?.activeSidebarRootId,
      );
      return active?.label === root && !!active.companionFolderRoot;
    }, watchedName, { timeout: 8000 });
    const firstRestored = page.locator(`.ft-row.ft-file[data-full-path="${watchedName}/shared/same.txt"]`);
    const secondInactive = page.locator(`.ft-row.ft-file[data-full-path="${secondWatchedName}/shared/same.txt"]`);
    await firstRestored.hover();
    dialogMsg = null;
    await firstRestored.locator('.ft-del').click();
    for (let i = 0; i < 40 && existsSync(firstShared); i++) await sleep(100);
    if (!existsSync(firstShared) && existsSync(secondShared)
      && (dialogMsg || '').includes(firstShared) && !(dialogMsg || '').includes(secondWatched)) {
      pass('switching sidebar roots restores the exact disk root before deletion');
    } else fail('two-root delete isolation failed: ' + JSON.stringify({
      firstExists: existsSync(firstShared), secondExists: existsSync(secondShared), dialogMsg,
    }));
    await page.waitForFunction(() => !window.__fv?.state?.companionOperationToken
      && !window.__fv?.state?.sidebarNavigationPending);

    // Delay A's /find-folder response, open B, and let B resolve first. Each result must attach to
    // the root captured before its await—not whichever root happens to be active on completion.
    const findFolderPattern = new RegExp(`^http://127\\.0\\.0\\.1:${PORT}/find-folder\\?`);
    let slowFindStartedResolve;
    const slowFindStarted = new Promise((resolveStarted) => { slowFindStartedResolve = resolveStarted; });
    let releaseSlowFind;
    const slowFindRelease = new Promise((resolveRelease) => { releaseSlowFind = resolveRelease; });
    let slowFindNotified = false;
    await page.route(findFolderPattern, async (route) => {
      const relPath = new URL(route.request().url()).searchParams.get('relPath') || '';
      if (relPath.startsWith('slow-root/')) {
        if (!slowFindNotified) { slowFindNotified = true; slowFindStartedResolve(); }
        await slowFindRelease;
      }
      await route.continue().catch(() => {});
    });
    await page.setInputFiles('#folderInput', slowWatched);
    if (!await Promise.race([slowFindStarted.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for delayed slow-root find-folder request');
    }
    await page.setInputFiles('#folderInput', fastWatched);
    await page.waitForFunction((fast) => {
      const roots = window.__fv?.state?.sidebarRoots || [];
      const fastRoot = roots.find((root) => root.label === 'fast-root');
      return fastRoot?.companionFolderRoot === fast
        && window.__fv.state.activeSidebarRootId === fastRoot.id;
    }, fastWatched, { timeout: 8000 });
    releaseSlowFind();
    const outOfOrderResolved = await page.waitForFunction(({ slow, fast }) => {
      const roots = window.__fv?.state?.sidebarRoots || [];
      const slowRoot = roots.find((root) => root.label === 'slow-root');
      const fastRoot = roots.find((root) => root.label === 'fast-root');
      return slowRoot?.companionFolderRoot === slow
        && fastRoot?.companionFolderRoot === fast
        && window.__fv.state.activeSidebarRootId === fastRoot.id;
    }, { slow: slowWatched, fast: fastWatched }, { timeout: 8000 }).then(() => true).catch(() => false);
    await page.unroute(findFolderPattern);
    if (outOfOrderResolved) pass('out-of-order folder resolution stays attached to each captured root');
    else fail('delayed folder resolution attached to the wrong sidebar root');

    // Two watched folders with the same basename get display labels "project" / "project 2", but
    // each incoming path still begins with the original "project/". Save through the second row and
    // prove normalization targets B, never A or a spurious B/project/... nesting.
    await page.setInputFiles('#folderInput', sameProjectA);
    await page.waitForFunction((path) => window.__fv?.state?.sidebarRoots?.some(
      (root) => root.label === 'project' && root.companionFolderRoot === path,
    ), sameProjectA);
    await page.setInputFiles('#folderInput', sameProjectB);
    await page.waitForFunction((path) => window.__fv?.state?.sidebarRoots?.some(
      (root) => root.label === 'project 2' && root.companionFolderRoot === path,
    ), sameProjectB);
    const duplicateRootShape = await page.evaluate(() => {
      const a = window.__fv.state.sidebarRoots.find((root) => root.label === 'project');
      const b = window.__fv.state.sidebarRoots.find((root) => root.label === 'project 2');
      return { a: a?.treeEntries?.map((entry) => entry.path), b: b?.treeEntries?.map((entry) => entry.path) };
    });
    await page.locator('.ft-row.ft-file[data-full-path="project 2/second-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'second-only.txt');
    await page.evaluate(() => window.__fv.state.rawview.setValue('SECOND PROJECT SAVED'));
    await page.click('#saveBtn');
    for (let i = 0; i < 40 && readFileSync(sameProjectBFile, 'utf8') !== 'SECOND PROJECT SAVED'; i++) {
      await sleep(100);
    }
    if (JSON.stringify(duplicateRootShape) === JSON.stringify({
      a: ['first-only.txt'], b: ['second-only.txt'],
    }) && readFileSync(sameProjectAFile, 'utf8') === 'first project'
      && readFileSync(sameProjectBFile, 'utf8') === 'SECOND PROJECT SAVED') {
      pass('same-basename sidebar roots normalize and save to the exact second disk root');
    } else fail('same-basename root mapping failed: ' + JSON.stringify({
      duplicateRootShape,
      a: readFileSync(sameProjectAFile, 'utf8'),
      b: readFileSync(sameProjectBFile, 'utf8'),
    }));

    // Start a delayed refresh of slow-root, then switch to fast-root before /tree resolves. The
    // captured slow root may finish safely in the background, but it must never overwrite B's
    // global tree or resolve its fetched rows against B's disk association.
    await page.locator('.ft-row.ft-file[data-full-path="slow-root/slow-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'slow-only.txt');
    await page.waitForTimeout(300); // allow the root-scoped seed request to settle
    const slowRefreshFile = join(slowWatched, 'slow-refresh.txt');
    writeFileSync(slowRefreshFile, 'new during delayed refresh');
    let delayedTreeStartedResolve;
    const delayedTreeStarted = new Promise((resolveStarted) => { delayedTreeStartedResolve = resolveStarted; });
    let releaseDelayedTree;
    const delayedTreeRelease = new Promise((resolveRelease) => { releaseDelayedTree = resolveRelease; });
    let delayedTreeNotified = false;
    const treePattern = new RegExp(`^http://127\\.0\\.0\\.1:${PORT}/tree\\?`);
    await page.route(treePattern, async (route) => {
      const path = new URL(route.request().url()).searchParams.get('path');
      if (path === slowWatched) {
        if (!delayedTreeNotified) { delayedTreeNotified = true; delayedTreeStartedResolve(); }
        await delayedTreeRelease;
      }
      await route.continue().catch(() => {});
    });
    let staleRefreshFileGets = 0;
    const countStaleRefreshGet = (request) => {
      const url = new URL(request.url());
      if (request.method() === 'GET' && url.origin === companionOrigin
        && url.pathname === '/file' && url.searchParams.get('path') === slowRefreshFile) {
        staleRefreshFileGets++;
      }
    };
    page.on('request', countStaleRefreshGet);
    await page.click('#ftRefreshBtn');
    if (!await Promise.race([delayedTreeStarted.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for delayed slow-root refresh request');
    }
    await page.locator('.ft-row.ft-file[data-full-path="fast-root/fast-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'fast-only.txt');
    releaseDelayedTree();
    await page.waitForTimeout(400);
    const refreshSwitchState = await page.evaluate(() => ({
      activeLabel: window.__fv.state.sidebarRoots.find(
        (root) => root.id === window.__fv.state.activeSidebarRootId,
      )?.label,
      paths: (window.__fv.state.treeEntries || []).map((entry) => entry.path),
      slowPaths: window.__fv.state.sidebarRoots.find(
        (root) => root.label === 'slow-root',
      )?.treeEntries?.map((entry) => entry.path),
    }));
    page.off('request', countStaleRefreshGet);
    await page.unroute(treePattern);
    if (staleRefreshFileGets === 1 && refreshSwitchState.activeLabel === 'fast-root'
      && refreshSwitchState.paths.includes('fast-only.txt')
      && !refreshSwitchState.paths.includes('slow-refresh.txt')
      && refreshSwitchState.slowPaths.includes('slow-refresh.txt')) {
      pass('delayed refresh updates only its captured root without overwriting the active root');
    } else fail('refresh/root-switch isolation failed: ' + JSON.stringify({
      staleRefreshFileGets, refreshSwitchState,
    }));

    // Deliver an older same-name find result after a second file has become current. The stale
    // request must not attach A's absolute path or expose Delete on B.
    const raceFindPattern = new RegExp(`^http://127\\.0\\.0\\.1:${PORT}/find-file\\?`);
    let raceFindCount = 0;
    let firstRaceFindResolve;
    const firstRaceFind = new Promise((resolveStarted) => { firstRaceFindResolve = resolveStarted; });
    await page.route(raceFindPattern, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('name') !== 'race-same.txt') {
        await route.continue().catch(() => {});
        return;
      }
      const requestNumber = ++raceFindCount;
      if (requestNumber === 1) {
        firstRaceFindResolve();
        await sleep(650);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify({ matches: requestNumber === 1 ? [sameNameWatched] : [] }),
      });
    });
    await page.setInputFiles('#fileInput', sameNameWatched);
    if (!await Promise.race([firstRaceFind.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for delayed same-name find-file request');
    }
    await page.setInputFiles('#fileInput', sameNameOutside);
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'race-same.txt'
      && window.__fv.state.sidebarRoots.find(
        (root) => root.id === window.__fv.state.activeSidebarRootId,
      )?.label === 'race-same.txt 2');
    await page.waitForTimeout(800);
    const staleAutoLinkState = await page.evaluate(() => ({
      deleteHidden: document.getElementById('deleteBtn')?.hidden,
      linkedHidden: document.getElementById('companionLinked')?.hidden,
      linkedText: document.getElementById('companionLinked')?.textContent || '',
    }));
    await page.unroute(raceFindPattern);
    if (raceFindCount === 2 && staleAutoLinkState.deleteHidden
      && staleAutoLinkState.linkedHidden && !staleAutoLinkState.linkedText.includes(sameNameWatched)) {
      pass('late same-name auto-link result cannot attach to the newer intake');
    } else fail('stale same-name auto-link leaked across intake identity: ' + JSON.stringify({
      raceFindCount, staleAutoLinkState,
    }));

    // Instrument EventSource.close, then manually deliver a queued A event after switching to B.
    // A closed watcher callback must be generation-scoped and unable to create a stale reload UI.
    await page.evaluate(() => {
      const NativeEventSource = window.EventSource;
      window.__trackedCompanionSources = [];
      window.EventSource = class TrackingEventSource extends NativeEventSource {
        constructor(...args) {
          super(...args);
          this.__closedByViewer = false;
          window.__trackedCompanionSources.push(this);
        }
        close() {
          this.__closedByViewer = true;
          return super.close();
        }
      };
    });
    await page.locator('.ft-row.ft-file[data-full-path="slow-root/slow-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'slow-only.txt'
      && window.__trackedCompanionSources.length > 0);
    await page.evaluate(() => { window.__staleCompanionSource = window.__trackedCompanionSources.at(-1); });
    await page.locator('.ft-row.ft-file[data-full-path="fast-root/fast-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'fast-only.txt');
    await page.evaluate((path) => {
      document.querySelector('.companion-reload-banner')?.remove();
      window.__staleCompanionSource?.onmessage?.({
        data: JSON.stringify({ path, kind: 'modify' }),
      });
    }, slowFile);
    await page.waitForTimeout(100);
    const staleWatcherBanner = await page.locator('.companion-reload-banner').count();
    if (staleWatcherBanner === 0) pass('closed A watcher cannot surface a reload banner after switching to B');
    else fail('stale watcher event leaked into the newly active root');

    // Enable folder auto-watch, delay a refresh at /tree, then opt out while it is in flight. Both
    // file/folder EventSources must close, row actions disappear, and no later /file fetch may start.
    await page.locator('.ft-row.ft-file[data-full-path="slow-root/slow-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'slow-only.txt');
    const autoWasOn = await page.locator('#ftAutoRefreshBtn').evaluate((button) =>
      button.classList.contains('ft-auto-on'));
    if (!autoWasOn) await page.click('#ftAutoRefreshBtn');
    await page.waitForTimeout(200);
    writeFileSync(slowFile, 'changed before opt-out');
    await page.evaluate(() => document.querySelector('.companion-reload-banner')?.remove());
    let disableTreeStartedResolve;
    const disableTreeStarted = new Promise((resolveStarted) => { disableTreeStartedResolve = resolveStarted; });
    let releaseDisableTree;
    const disableTreeRelease = new Promise((resolveRelease) => { releaseDisableTree = resolveRelease; });
    let disableTreeNotified = false;
    await page.route(treePattern, async (route) => {
      const path = new URL(route.request().url()).searchParams.get('path');
      if (path === slowWatched) {
        if (!disableTreeNotified) { disableTreeNotified = true; disableTreeStartedResolve(); }
        await disableTreeRelease;
      }
      await route.continue().catch(() => {});
    });
    let postDisableFileGets = 0;
    let disabledAt = Infinity;
    const postDisableCompanionRequests = [];
    const countPostDisable = (request) => {
      const url = new URL(request.url());
      if (url.origin !== companionOrigin) return;
      if (Date.now() >= disabledAt) postDisableCompanionRequests.push(request.url());
      if (Date.now() >= disabledAt && request.method() === 'GET' && url.pathname === '/file'
        && url.searchParams.get('path') === slowFile) postDisableFileGets++;
    };
    page.on('request', countPostDisable);
    await page.click('#ftRefreshBtn');
    if (!await Promise.race([disableTreeStarted.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for opt-out refresh request');
    }
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.waitForSelector('.companion-panel #companionEnabledToggle', { state: 'attached' });
    await page.evaluate(() => { document.querySelector('.companion-panel').open = true; });
    disabledAt = Date.now();
    await page.uncheck('#companionEnabledToggle');
    releaseDisableTree();
    await page.waitForFunction(() => !document.body.classList.contains('companion-active')
      && !document.body.classList.contains('companion-folder-active'));
    await page.waitForTimeout(900);
    page.off('request', countPostDisable);
    await page.unroute(treePattern);
    const optOutState = await page.evaluate(() => ({
      closed: (window.__trackedCompanionSources || []).filter((source) => source.__closedByViewer).length,
      total: (window.__trackedCompanionSources || []).length,
      actions: document.querySelectorAll('.ft-del,.ft-reveal').length,
      refreshHidden: document.getElementById('ftRefreshBtn')?.hidden,
      autoHidden: document.getElementById('ftAutoRefreshBtn')?.hidden,
    }));
    if (postDisableFileGets === 0 && postDisableCompanionRequests.length === 0
      && optOutState.total >= 2 && optOutState.closed === optOutState.total && optOutState.actions === 0
      && optOutState.refreshHidden && optOutState.autoHidden) {
      pass('opt-out closes folder/file watchers and cancels all post-await Companion traffic/actions');
    } else fail('Companion opt-out left live work or controls: ' + JSON.stringify({
      postDisableFileGets, postDisableCompanionRequests, optOutState,
    }));
    await page.check('#companionEnabledToggle');
    await page.waitForFunction(() => document.body.classList.contains('companion-active')
      && document.body.classList.contains('companion-folder-active'));
    await page.click('#settingsDrawer [data-close]');

    // Hold the Save action's second find-file response. A competing intake is locked out; opting
    // out before the response resumes invalidates the continuation and prevents the POST entirely.
    let delayedFindCount = 0;
    let delayedSaveFindResolve;
    const delayedSaveFindStarted = new Promise((resolveStarted) => { delayedSaveFindResolve = resolveStarted; });
    let releaseDelayedFind;
    const delayedFindRelease = new Promise((resolveRelease) => { releaseDelayedFind = resolveRelease; });
    await page.route(raceFindPattern, async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('name') !== 'delayed-save.txt') {
        await route.continue().catch(() => {});
        return;
      }
      const requestNumber = ++delayedFindCount;
      if (requestNumber === 2) {
        delayedSaveFindResolve();
        await delayedFindRelease;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': origin },
        body: JSON.stringify({ matches: requestNumber === 1 ? [] : [delayedSaveTarget] }),
      });
    });
    await page.setInputFiles('#fileInput', delayedSaveSource);
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'delayed-save.txt'
      && !document.getElementById('saveBtn')?.hidden);
    for (let i = 0; i < 40 && delayedFindCount < 1; i++) await sleep(50);
    let delayedSavePosts = 0;
    const countDelayedSavePost = (request) => {
      if (request.method() === 'POST' && request.url().startsWith(`http://127.0.0.1:${PORT}/file?`)) {
        delayedSavePosts++;
      }
    };
    page.on('request', countDelayedSavePost);
    await page.click('#saveBtn');
    if (!await Promise.race([delayedSaveFindStarted.then(() => true), sleep(8000).then(() => false)])) {
      throw new Error('timed out waiting for delayed Save find-file request');
    }
    await page.setInputFiles('#fileInput', switchAwayFile);
    await page.waitForTimeout(100);
    const competingIntakeBlocked = await page.evaluate(() =>
      window.__fv?.state?.intake?.filename === 'delayed-save.txt'
        && !!window.__fv.state.companionOperationToken);
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.waitForSelector('.companion-panel #companionEnabledToggle', { state: 'attached' });
    await page.evaluate(() => { document.querySelector('.companion-panel').open = true; });
    await page.uncheck('#companionEnabledToggle');
    releaseDelayedFind();
    await page.waitForTimeout(500);
    page.off('request', countDelayedSavePost);
    await page.unroute(raceFindPattern);
    if (competingIntakeBlocked && delayedSavePosts === 0
      && readFileSync(delayedSaveTarget, 'utf8') === 'TARGET MUST STAY') {
      pass('in-flight Save blocks competing intake and opt-out invalidates the pre-mutation continuation');
    } else fail('delayed Save race mutated or switched state: ' + JSON.stringify({
      competingIntakeBlocked, delayedSavePosts, target: readFileSync(delayedSaveTarget, 'utf8'),
    }));
    await page.check('#companionEnabledToggle');
    await page.waitForFunction(() => document.body.classList.contains('companion-active'));
    await page.click('#settingsDrawer [data-close]');

    // Reduce to one linked folder through the test seam, then remove it through the real UI. The
    // empty-list transition must clear the global association, controls, actions, and live watcher.
    await page.locator('.ft-row.ft-file[data-full-path="slow-root/slow-only.txt"]').click();
    await page.waitForFunction(() => !window.__fv?.state?.sidebarNavigationPending
      && window.__fv.state.currentFolderPath === 'slow-only.txt');
    const watchedRootRow = page.locator('.ft-row.ft-folder', { hasText: 'slow-root' }).first();
    await watchedRootRow.hover();
    dialogMsg = null;
    await watchedRootRow.locator('.ft-del').click();
    await page.waitForFunction(() => /Could not resolve that path on disk/.test(
      document.getElementById('toast')?.textContent || '',
    ));
    if (existsSync(slowWatched) && dialogMsg === null) {
      pass('tree UI refuses deletion of the watched root itself');
    } else fail('watched-root deletion was not refused safely');
    await page.evaluate(() => {
      const active = window.__fv.state.sidebarRoots.find(
        (root) => root.id === window.__fv.state.activeSidebarRootId,
      );
      window.__fv.state.sidebarRoots = [active];
    });
    await page.click('#ftRemoveRootBtn');
    const lastRootRemoval = await page.evaluate(() => ({
      roots: window.__fv.state.sidebarRoots.length,
      active: window.__fv.state.activeSidebarRootId,
      fileTreeHidden: document.getElementById('fileTree')?.hidden,
      bodyActive: document.body.classList.contains('companion-folder-active'),
      actions: document.querySelectorAll('.ft-del,.ft-reveal').length,
      refreshHidden: document.getElementById('ftRefreshBtn')?.hidden,
      deleteHidden: document.getElementById('deleteBtn')?.hidden,
    }));
    if (lastRootRemoval.roots === 0 && lastRootRemoval.active === null
      && lastRootRemoval.fileTreeHidden && !lastRootRemoval.bodyActive
      && lastRootRemoval.actions === 0 && lastRootRemoval.refreshHidden
      && lastRootRemoval.deleteHidden) {
      pass('removing the last linked root clears its watcher, association, and destructive controls');
    } else fail('last-root removal left stale Companion state: ' + JSON.stringify(lastRootRemoval));

    // Stop current source and drive the visible disconnected + reconnecting states. The Settings
    // Test connection path must report the failure, the topbar must turn red, and clicking it must
    // expose the retry guidance before recovering when the same disposable server restarts.
    await stopCompanion(server);
    server = null;
    await page.evaluate(() => document.getElementById('settingsBtn').click());
    await page.waitForSelector('.companion-panel', { state: 'attached' });
    await page.evaluate(() => { document.querySelector('.companion-panel').open = true; });
    await page.locator('.companion-panel button', { hasText: 'Test connection' }).click();
    await page.waitForFunction(() => /Companion not found/.test(document.getElementById('toast')?.textContent || ''),
      null, { timeout: 8000 });
    const disconnectedUi = await page.evaluate(() => ({
      summary: document.querySelector('.companion-panel > summary')?.textContent || '',
      indicator: document.getElementById('companionStatusBtn')?.textContent || '',
      down: document.getElementById('companionStatusBtn')?.classList.contains('conn-down'),
      hidden: document.getElementById('companionStatusBtn')?.hidden,
    }));
    if (/not found/i.test(disconnectedUi.summary) && disconnectedUi.indicator === '❗'
      && disconnectedUi.down && !disconnectedUi.hidden) {
      pass('Settings Test connection and topbar report the disconnected/absent state');
    } else fail('disconnected UI state is dishonest: ' + JSON.stringify(disconnectedUi));
    await capture(page, 'companion-settings-disconnected');
    await page.click('#settingsDrawer [data-close]');

    await page.click('#companionStatusBtn');
    await page.waitForFunction(() => /Trying to start the Companion/.test(
      document.getElementById('toast')?.textContent || '',
    ), null, { timeout: 8000 });
    pass('topbar retry exposes the reconnecting state and launch guidance');
    await capture(page, 'companion-reconnecting');
    server = spawnCompanion(cfgPath);
    const restarted = await waitForPort(true);
    const reconnected = restarted && await page.waitForFunction(() =>
      document.body.classList.contains('companion-active')
        && document.getElementById('companionStatusBtn')?.classList.contains('conn-up'),
    null, { timeout: 10000 }).then(() => true).catch(() => false);
    if (reconnected) pass('reconnecting UI recovers after current-source Companion restart');
    else fail('browser client did not recover after Companion restart');

    const companionTraffic = ctx.offOrigin.filter((url) => hasOrigin(url, companionOrigin));
    const launchTraffic = ctx.offOrigin.filter((url) => url === 'fvcompanion://start');
    const unexpectedTraffic = ctx.offOrigin.filter((url) =>
      !hasOrigin(url, companionOrigin) && url !== 'fvcompanion://start');
    if (companionTraffic.length > 0 && launchTraffic.length === 1 && unexpectedTraffic.length === 0) {
      pass('network traffic stays on the viewer plus exact Companion origin; retry emits one non-network launch URL');
    } else {
      fail('browser traffic boundary failed: ' + JSON.stringify({
        companionRequests: companionTraffic.length,
        launchTraffic,
        unexpected: [...new Set(unexpectedTraffic)],
      }));
    }
  } catch (e) {
    fail('e2e exception: ' + (e.stack || e.message));
  } finally {
    await stopCompanion(server);
    cleanup();
    // finish() prints the verdict and exits the process, so disposable cleanup must happen first.
    if (ctx) await finish(ctx);
  }

  function cleanup() { try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ } }
}

main();
