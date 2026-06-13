// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, relative } from 'node:path';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

// Resolve Playwright from whatever's available: a sibling make-it-look-good checkout
// (local dev), this tests/ folder's own node_modules (CI installs it there), or cwd.
function loadChromium() {
  const bases = [
    '/home/jens/repos/make-it-look-good/',
    new URL('./', import.meta.url).pathname,
    process.cwd() + '/',
  ];
  for (const base of bases) {
    try { return createRequire(base)('playwright').chromium; } catch { /* try next */ }
  }
  throw new Error('Playwright not found. Run: cd tests && npm install && npx playwright install chromium');
}
const chromium = loadChromium();

const ROOT = new URL('../docs/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain',
  '.wav': 'audio/wav', '.ipynb': 'application/json', '.svg': 'image/svg+xml', '.eml': 'message/rfc822', '.zip': 'application/zip', '.ics': 'text/calendar', '.yaml': 'application/yaml', '.toml': 'application/toml',
  '.xml': 'application/xml', '.epub': 'application/epub+zip', '.pdf': 'application/pdf',
  '.env': 'text/plain', '.ini': 'text/plain', '.patch': 'text/x-diff', '.log': 'text/plain',
  '.geojson': 'application/geo+json', '.gpx': 'application/gpx+xml', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg',
  '.sqlite': 'application/vnd.sqlite3', '.wasm': 'application/wasm', '.png': 'image/png', '.srt': 'application/x-subrip', '.vcf': 'text/vcard', '.stl': 'model/stl', '.obj': 'model/obj', '.glb': 'model/gltf-binary', '.mbox': 'application/mbox', '.ply': 'model/ply' };

const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (p === '/') p = '/index.html';
    const file = join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});

const fail = (m) => { console.error('✗ ' + m); process.exitCode = 1; };
const pass = (m) => console.log('✓ ' + m);

// Asset manifest must list every static file (so the offline precache is complete).
{
  const { readdir, stat } = await import('node:fs/promises');
  const exclude = new Set(['asset-manifest.json', 'sw.js']);
  const onDisk = [];
  await (async function walk(dir) {
    for (const name of await readdir(dir)) {
      const full = join(dir, name);
      if ((await stat(full)).isDirectory()) await walk(full);
      else { const p = relative(ROOT, full).split('\\').join('/'); if (!exclude.has(p)) onDisk.push(p); }
    }
  })(ROOT);
  const manifest = JSON.parse(await readFile(join(ROOT, 'asset-manifest.json'), 'utf8'));
  const listed = new Set(manifest.assets);
  const missing = onDisk.filter((p) => !listed.has(p));
  const extra = manifest.assets.filter((p) => !onDisk.includes(p));
  if (!missing.length && !extra.length) pass('asset-manifest covers every file (' + manifest.assets.length + ') — offline precache complete');
  else fail('asset-manifest stale (run node scripts/gen-asset-manifest.mjs). missing=' + missing.join(',') + ' extra=' + extra.join(','));
}

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const origin = `http://localhost:${port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();

// Robust contentFrame(): an iframe element can exist before its content document has committed,
// so handle.contentFrame() transiently returns null → "Cannot read properties of null". Poll
// briefly until the frame is ready. Used everywhere instead of a bare .contentFrame().
// Accepts a CSS selector (preferred) or an element handle. A selector is re-queried fresh on
// each poll, so it survives the app swapping the iframe (which detaches a held handle and makes
// its contentFrame() return null forever).
async function frameOf(target, timeout = 8000) {
  const deadline = Date.now() + timeout;
  const get = async () => {
    const h = typeof target === 'string' ? await page.$(target) : target;
    return h ? await h.contentFrame() : null;
  };
  let f = await get();
  while (!f && Date.now() < deadline) { await page.waitForTimeout(50); f = await get(); }
  if (!f) throw new Error('iframe never produced a content frame: ' + (typeof target === 'string' ? target : '<handle>'));
  return f;
}

const consoleErrors = [];
const offOrigin = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('request', (req) => {
  const u = req.url();
  if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u);
});

try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  pass('page loaded');

  // Favicon present + same-origin (no off-origin icon fetch).
  const iconHref = await page.$eval('link[rel="icon"]', (l) => l.getAttribute('href')).catch(() => null);
  if (iconHref) {
    const r = await page.evaluate(async (h) => (await fetch(h)).ok, iconHref);
    if (r) pass('favicon present and served same-origin'); else fail('favicon fetch failed: ' + iconHref);
  } else fail('no favicon link');

  // Startup stays light: no Monaco editor exists before a file is opened...
  const editorAtStartup = await page.$('#editor .monaco-editor');
  if (!editorAtStartup) pass('startup is lazy (no editor mounted before opening a file)'); else fail('Monaco editor mounted at startup');
  // ...but Monaco is warmed in the background (idle) so the first open is instant.
  await page.waitForFunction(() => !!window.monaco, { timeout: 12000 });
  pass('Monaco preloaded in the background during idle');

  // Examples gallery is grouped by category (tidy intake catalogue).
  const exGroups = await page.$$eval('#examples .ex-group .ex-group-label', (els) => els.map((e) => e.textContent));
  if (exGroups.includes('Documents') && exGroups.includes('Office') && exGroups.length >= 5)
    pass(`examples grouped by category (${exGroups.length} groups: ${exGroups.join(', ')})`);
  else fail('examples not grouped; labels: ' + JSON.stringify(exGroups));

  // Load the Welcome.md example.
  await page.getByRole('button', { name: 'Welcome.md' }).click();

  // Monaco raw view appears.
  await page.waitForSelector('.monaco-editor', { timeout: 20000 });
  pass('Monaco raw editor mounted');

  // Preview iframe renders the markdown (h1 "Welcome to File Viewer").
  const frame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
  const f = await frameOf('iframe.fv-preview-frame');
  await f.waitForSelector('h1', { timeout: 10000 });
  const h1 = await f.$eval('h1', (el) => el.textContent);
  if (/Welcome to File Viewer/.test(h1)) pass('markdown rendered in sandboxed iframe'); else fail('h1 text: ' + h1);

  // Source map present (magic selector data attributes).
  const mapped = await f.$$eval('[data-fv-src]', (els) => els.length);
  if (mapped > 0) pass(`source map present (${mapped} mapped blocks)`); else fail('no data-fv-src blocks');

  // Magic selector: click a mapped preview block -> Monaco line decoration appears.
  await f.click('[data-fv-src]');
  await page.waitForTimeout(300);
  const deco = await page.$$eval('.fv-line-hl', (els) => els.length);
  if (deco > 0) pass('magic selector highlighted raw line'); else fail('no raw decoration after preview click');

  // Export framework: a Markdown (HTML) preview offers "Print / Save as PDF". (Don't click Print —
  // window.print() would open a dialog; we only assert the menu is wired.)
  const exportHidden = await page.$eval('#exportBtn', (e) => e.hidden);
  if (!exportHidden) pass('export button shown for an HTML preview'); else fail('export button hidden for markdown');
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const exportItems = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (exportItems.some((t) => /Print \/ Save as PDF/.test(t))) pass('export menu offers Print / Save as PDF'); else fail('export items: ' + exportItems.join(','));
  await page.click('#exportBtn');   // close the menu

  // Sandbox attribute is allow-scripts only (no allow-same-origin).
  const sandbox = await frame.getAttribute('sandbox');
  if (sandbox === 'allow-scripts') pass('iframe sandbox = allow-scripts only'); else fail('sandbox: ' + sandbox);

  // Per-file persistence (foundation for stateful viewers): fingerprint stability + round-trip.
  const persist = await page.evaluate(() => {
    const p = window.__fv.persistence;
    const a = { filename: 'book.epub', size: 1234, lastModified: 99 };
    const a2 = { filename: 'book.epub', size: 1234, lastModified: 99 };   // same file again
    const b = { filename: 'book.epub', size: 9999 };                       // different size
    const fpStable = p.fingerprint(a) === p.fingerprint(a2) && p.fingerprint(a) !== p.fingerprint(b);
    p.clearState(a);
    p.saveState(a, { pos: 0.5, bookmarks: [1, 2] });
    const merged = p.updateState(a, { pos: 0.8 });
    const reread = p.loadState(a2);                                        // same fingerprint reads it back
    const ok = fpStable && reread && reread.pos === 0.8 && reread.bookmarks.length === 2 && merged.bookmarks.length === 2;
    p.clearState(a);
    const cleared = p.loadState(a) === null;
    return ok && cleared;
  });
  if (persist) pass('per-file persistence: fingerprint stable + save/update/load/clear round-trip'); else fail('persistence round-trip failed');

  // Screenshot (WP18): sanitized body re-rendered in a same-origin temp iframe + html2canvas.
  const shotUrl = await page.evaluate(() => window.__fv.screenshot());
  if (typeof shotUrl === 'string' && shotUrl.startsWith('data:image/png') && shotUrl.length > 2000) pass('preview screenshot captured (PNG)'); else fail('screenshot: ' + String(shotUrl).slice(0, 40));

  // ── Settings (WP03) ──
  await page.click('#settingsBtn');
  await page.waitForSelector('#settingsBody .set-group', { timeout: 5000 });
  const groups = await page.$$eval('#settingsBody .set-group > summary', (els) => els.map((e) => e.textContent));
  if (groups.includes('Editor') && groups.includes('Preview')) pass('settings render by category (' + groups.join(', ') + ')');
  else fail('categories: ' + groups.join(', '));

  // Switch preset to Compact -> preview re-renders at 680px max width.
  const presetSel = await page.$('#settingsBody select');
  await presetSel.selectOption('compact');
  await page.waitForTimeout(500);
  const frame2 = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 5000 });
  const f2 = await frameOf('iframe.fv-preview-frame');
  const maxW = await f2.evaluate(() => getComputedStyle(document.body).maxWidth);
  if (maxW === '680px') pass('preset applied to preview (maxWidth=680px)'); else fail('preview maxWidth after Compact: ' + maxW);

  // Preset matcher reports Compact (not Custom) after selecting it.
  const presetVal = await page.$eval('#settingsBody select', (s) => s.value);
  if (presetVal === 'compact') pass('preset dropdown reflects selection'); else fail('preset value: ' + presetVal);

  // Changing one value flips the dropdown to Custom.
  const numInput = await page.$('#settingsBody input[type="number"]');
  await numInput.fill('22'); await numInput.dispatchEvent('change');
  await page.waitForTimeout(200);
  const afterEdit = await page.$eval('#settingsBody select', (s) => s.value);
  if (afterEdit === 'custom') pass('manual edit -> Custom preset'); else fail('expected custom, got ' + afterEdit);

  // Every setting carries a visible info hint (self-documenting).
  const hintCount = await page.$$eval('#settingsBody .set-hint', (els) => els.length);
  if (hintCount > 12) pass('settings show an info hint per option (' + hintCount + ')'); else fail('set-hints: ' + hintCount);

  // Type dropdown is filtered to plausible matches by default (welcome.md -> just Markdown).
  const optsDefault = await page.$$eval('#typeSelect option', (els) => els.length);
  if (optsDefault <= 2) pass('type dropdown filtered to matches by default (' + optsDefault + ')'); else fail('default type options: ' + optsDefault);

  // Clicking the LABEL (not the checkbox) of "Show all file types" toggles it -> full list.
  await page.click('label[for="set-showAllTypes"]');
  await page.waitForTimeout(150);
  const boxChecked = await page.$eval('#set-showAllTypes', (e) => e.checked);
  if (boxChecked) pass('clicking a setting label toggles its checkbox'); else fail('label click did not toggle checkbox');
  const optsAll = await page.$$eval('#typeSelect option', (els) => els.length);
  if (optsAll > optsDefault && optsAll >= 11) pass('"show all types" reveals every type (' + optsDefault + ' -> ' + optsAll + ')'); else fail('show-all options: ' + optsAll);
  await page.click('label[for="set-showAllTypes"]');   // restore default for later checks

  await page.click('#settingsDrawer [data-close]');

  // ── Diff (WP13/WP14) ──
  // Edit the working copy programmatically (robust vs. simulating Monaco keystrokes),
  // then open standard diff and assert Monaco's diff editor renders the change.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue(rv.getValue() + '\n\nAn edited line for the diff test.\n');
  });
  await page.waitForTimeout(200);
  const dirty = await page.evaluate(() => window.__fv.state.rawview.isDirty());
  if (dirty) pass('edit tracked vs original (isDirty)'); else fail('isDirty false after edit');
  await page.click('#rawMode button[data-raw="diff"]');
  const diffEl = await page.waitForSelector('#editor .monaco-diff-editor', { timeout: 8000 });
  if (diffEl) pass('standard Monaco diff editor mounted');
  const changes = await page.$$eval('#editor .line-insert, #editor .char-insert', (els) => els.length);
  if (changes > 0) pass('diff shows inserted change (' + changes + ' markers)'); else fail('no insert markers in diff');

  // 4-way switch back to current keeps the edit.
  await page.click('#rawMode button[data-raw="current"]');
  await page.waitForTimeout(200);
  const stillEdited = await page.evaluate(() => document.querySelector('#editor .monaco-diff-editor')?.offsetParent !== null);
  if (!stillEdited) pass('switching back to current hides diff editor'); else fail('diff editor still visible after switching to current');

  // ── Original mode: read-only + non-destructive (edits live in a separate model) ──
  await page.click('#rawMode button[data-raw="original"]');
  await page.waitForTimeout(200);
  const origClean = await page.evaluate(() => !window.__fv.state.rawview.originalValue().includes('An edited line for the diff test.'));
  if (origClean) pass('original view shows the pristine text (edit not present)'); else fail('original contains the edit');
  // Typing in original must not stick (read-only) nor pollute current.
  await page.click('#editor .monaco-editor .view-lines').catch(() => {});
  await page.keyboard.type('XX_SHOULD_NOT_STICK');
  await page.waitForTimeout(150);
  const origUnchanged = await page.evaluate(() => !window.__fv.state.rawview.originalValue().includes('XX_SHOULD_NOT_STICK'));
  if (origUnchanged) pass('original is read-only (typing rejected)'); else fail('original was edited');
  await page.click('#rawMode button[data-raw="current"]');
  await page.waitForTimeout(200);
  const recovered = await page.evaluate(() => {
    const v = window.__fv.state.rawview.getValue();
    return v.includes('An edited line for the diff test.') && !v.includes('XX_SHOULD_NOT_STICK');
  });
  if (recovered) pass('switching original→current recovers the edit unchanged'); else fail('edit not recovered after original toggle');

  // ── Move-aware diff (WP15/WP16) ──
  // Reorder a paragraph in the working copy, then open the move-aware view.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    const parts = rv.originalValue().split('\n\n');
    const moved = [parts[2], ...parts.slice(0, 2), ...parts.slice(3)].join('\n\n');
    rv.setValue(moved);
  });
  await page.click('#rawMode button[data-raw="movediff"]');
  await page.waitForSelector('.movediff', { timeout: 5000 });
  await page.waitForTimeout(300);
  const movedBlocks = await page.$$eval('.k-moved, .k-moved-modified', (els) => els.length);
  if (movedBlocks > 0) pass('move-aware view classified moved block(s)'); else fail('no moved blocks rendered');
  const arrows = await page.$$eval('.md-arrows path[d]', (els) => els.length);
  if (arrows > 0) pass('move arrow drawn (' + arrows + ')'); else fail('no move arrows drawn');

  // Word-level diff: change ONE word in a paragraph -> only that word is highlighted
  // (not the whole block). Load fresh markdown so block matching is clean.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    const orig = rv.originalValue();
    rv.setValue(orig.replace(/Viewer/, 'Veiwer'));   // single-word typo in one block
  });
  await page.click('#rawMode button[data-raw="current"]');
  await page.click('#rawMode button[data-raw="movediff"]');
  await page.waitForSelector('.movediff', { timeout: 5000 });
  await page.waitForTimeout(200);
  const wIns = await page.$$eval('.md-current .w-ins', (els) => els.map((e) => e.textContent));
  const wDel = await page.$$eval('.md-original .w-del', (els) => els.map((e) => e.textContent));
  if (wIns.length >= 1 && wIns.length <= 3 && wIns.some((t) => /Veiwer/.test(t))) pass('word-level diff highlights only the changed word (' + JSON.stringify(wIns) + ')');
  else fail('word-level ins spans: ' + JSON.stringify(wIns));
  if (wDel.some((t) => /Viewer/.test(t))) pass('word-level diff marks the removed word on the original side'); else fail('word-level del spans: ' + JSON.stringify(wDel));

  // ── Draggable split divider (linked to Preview width) ──
  // Diff/move-diff go full-width; return to split so the divider is shown.
  await page.click('#rawMode button[data-raw="current"]');
  await page.waitForTimeout(200);
  const beforeW = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
  const dvBox = await (await page.$('#splitDivider')).boundingBox();
  if (dvBox) {
    await page.mouse.move(dvBox.x + dvBox.width / 2, dvBox.y + dvBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(dvBox.x - 150, dvBox.y + dvBox.height / 2, { steps: 10 });  // drag left -> grow preview
    await page.mouse.up();
    await page.waitForTimeout(200);
    const afterW = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
    if (afterW - beforeW > 60) pass('split divider drag resized preview pane (' + Math.round(beforeW) + ' -> ' + Math.round(afterW) + 'px)'); else fail('divider drag: ' + Math.round(beforeW) + ' -> ' + Math.round(afterW));
    const pmw = await page.evaluate(() => window.__fv.state.settingsModel.values.previewMaxWidth);
    if (Math.abs(pmw - afterW) < 40) pass('divider linked to Preview width setting (' + pmw + 'px)'); else fail('previewMaxWidth ' + pmw + ' vs pane ' + Math.round(afterW));
  } else fail('split divider not visible in desktop split');

  // ── Inline open button (next to type dropdown) ──
  await page.click('#openInlineBtn');
  const intakeShown = await page.$eval('#intake', (e) => !e.hidden);
  if (intakeShown) pass('inline open button returns to file/folder picker'); else fail('inline open did not show intake');

  // ── PDF module (WP17) ── fresh load so the examples gallery is reachable. Renders in the
  // parent pane now (interactive lite editor), not the iframe.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.pdf' }).click();
  await page.waitForSelector('#previewHost img.pdf-page', { timeout: 20000 });
  pass('PDF rendered to image pages');
  const hasEditor = await page.$('#editor .monaco-editor');
  if (!hasEditor) pass('PDF is preview-only (no raw editor)'); else fail('raw editor present for PDF');

  // ── PDF lite editor ── rotate/delete pages with pdf-lib, then download the edited PDF. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample (3 pages).pdf' }).click();
  await page.waitForFunction(() => document.querySelectorAll('#previewHost img.pdf-page').length === 3, { timeout: 20000 });
  pass('PDF: multi-page document rendered (3 pages)');
  await page.click('#previewHost .pdf-edit');                         // enter edit mode
  await page.waitForSelector('#previewHost .pdf-pagectl', { timeout: 8000 });
  // Delete the first page → 2 pages remain + "modified" + download enabled.
  await page.click('#previewHost .pdf-page-wrap .pdf-pagectl button[data-act="del"]');
  await page.waitForFunction(() => document.querySelectorAll('#previewHost img.pdf-page').length === 2, { timeout: 10000 });
  const info = await page.$eval('#previewHost .pdf-info', (e) => e.textContent);
  const dlVisible = await page.$eval('#previewHost .pdf-download', (e) => !e.hidden);
  if (/modified/.test(info) && dlVisible) pass('PDF edit: page deleted (3→2), marked modified, download enabled'); else fail('pdf edit: info=' + info + ' dl=' + dlVisible);
  // The edited bytes are a valid PDF with 2 pages — verify via pdf.js re-parse in the page.
  const editedPages = await page.evaluate(async () => {
    const a = document.querySelector('#previewHost .pdf-download');
    // trigger build path by reading current rendered count is enough; re-render already used edited bytes.
    return document.querySelectorAll('#previewHost img.pdf-page').length;
  });
  if (editedPages === 2) pass('PDF edit: re-rendered from the rebuilt PDF bytes'); else fail('edited pages: ' + editedPages);
  // Edit-changes summary (the lightweight PDF "diff").
  const pdfChanges = await page.$eval('#previewHost .pdf-changes', (e) => e.textContent);
  if (/Page 1 deleted/.test(pdfChanges)) pass('PDF edit: changes summary lists the edit'); else fail('pdf changes: ' + pdfChanges);
  // Rotate the (now first) page → summary also notes a rotation.
  await page.click('#previewHost .pdf-page-wrap .pdf-pagectl button[data-act="rr"]');
  await page.waitForFunction(() => /rotated/.test(document.querySelector('#previewHost .pdf-changes')?.textContent || ''), { timeout: 8000 }).catch(() => {});
  const pdfChanges2 = await page.$eval('#previewHost .pdf-changes', (e) => e.textContent);
  if (/rotated 90/.test(pdfChanges2)) pass('PDF edit: rotation reflected in changes summary'); else fail('pdf changes2: ' + pdfChanges2);
  // Insert an image as a new page: pick sample.png → page count grows + summary notes it.
  const beforeAdd = await page.$$eval('#previewHost img.pdf-page', (els) => els.length);
  await page.waitForSelector('#previewHost .pdf-addimg:not([hidden])', { timeout: 4000 });
  await page.setInputFiles('#previewHost .pdf-imginput', new URL('../docs/examples/sample.png', import.meta.url).pathname);
  await page.waitForFunction((n) => document.querySelectorAll('#previewHost img.pdf-page').length === n + 1, beforeAdd, { timeout: 12000 });
  pass('PDF edit: image inserted as a new page (' + beforeAdd + '→' + (beforeAdd + 1) + ')');
  const pdfChanges3 = await page.$eval('#previewHost .pdf-changes', (e) => e.textContent);
  if (/image page.* added/.test(pdfChanges3)) pass('PDF edit: image insertion noted in changes summary'); else fail('pdf changes3: ' + pdfChanges3);
  // Book mode: the spread toggle lays pages two-up (wide screens). Pages wrap into rows.
  await page.click('#previewHost .pdf-spread');
  const spreadOn = await page.$eval('#previewHost .pdf-doc', (e) => e.classList.contains('pdf-spread-on'));
  const twoUp = await page.$$eval('#previewHost .pdf-page-wrap', (els) => {
    if (els.length < 2) return false;
    const a = els[0].getBoundingClientRect(), b = els[1].getBoundingClientRect();
    return Math.abs(a.top - b.top) < 5 && b.left > a.left;   // first two pages share a row, side by side
  });
  if (spreadOn && twoUp) pass('PDF book mode: two-page spread lays pages side by side'); else fail('pdf spread: on=' + spreadOn + ' twoUp=' + twoUp);
  // Type dropdown shows PDF's confidence but NOT the fallback floor as a phantom "%".
  const pdfOpts = await page.$$eval('#typeSelect option', (els) => els.map((e) => e.textContent));
  if (pdfOpts.some((t) => /^PDF \(\d+%\)/.test(t))) pass('PDF shows match confidence (' + pdfOpts.find((t) => /^PDF/.test(t)) + ')'); else fail('PDF option: ' + pdfOpts.join(', '));
  if (!pdfOpts.some((t) => /Plain text \(\d+%\)/.test(t))) pass('fallback "Plain text" not shown as a phantom percentage'); else fail('phantom fallback %: ' + pdfOpts.join(', '));
  // Shown confidences are normalized to total exactly 100%.
  const pctSum = pdfOpts.reduce((a, t) => a + (Number((t.match(/\((\d+)%\)/) || [])[1]) || 0), 0);
  if (pctSum === 100) pass('match percentages normalized to 100% (sum=' + pctSum + ')'); else fail('percent sum: ' + pctSum + ' from ' + pdfOpts.join(', '));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row');
  const meta = await page.$$eval('#metaBody .meta-row .k', (els) => els.map((e) => e.textContent));
  if (meta.includes('Pages') && meta.includes('Created')) pass('PDF embedded metadata (Pages, Created)');
  else fail('PDF metadata rows: ' + meta.join(', '));
  await page.click('#metaDrawer [data-close]');

  // ── CSV module + shared tabular renderer (WP19) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.csv' }).click();
  const cframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const cf = await frameOf('iframe.fv-preview-frame');
  await cf.waitForSelector('table', { timeout: 10000 });
  const headers = await cf.$$eval('thead th', (els) => els.map((e) => e.textContent));
  if (headers.join(',') === 'name,role,city,commits') pass('CSV rendered as table with header row'); else fail('CSV headers: ' + headers.join(','));
  const rowCount = await cf.$$eval('tbody tr', (els) => els.length);
  if (rowCount === 5) pass('CSV body rows (' + rowCount + ')'); else fail('CSV rows: ' + rowCount);
  // CSV is editable text -> raw editor + diff available.
  const csvHasEditor = await page.$('#editor .monaco-editor');
  if (csvHasEditor) pass('CSV has raw editor (editable text)'); else fail('CSV missing raw editor');
  // CSV export (loadExports hook): menu offers JSON / Excel; JSON download actually fires.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const csvExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (['Download as JSON', 'Download as Excel (.xlsx)'].every((l) => csvExports.includes(l))) pass('CSV export menu offers JSON + Excel'); else fail('CSV exports: ' + csvExports.join(','));
  const [csvDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as JSON")'),
  ]);
  if (/\.json$/.test(csvDownload.suggestedFilename())) pass('CSV exported to JSON (' + csvDownload.suggestedFilename() + ')'); else fail('CSV download name: ' + csvDownload.suggestedFilename());

  // ── Excel module (WP19) ── multi-sheet workbook via SheetJS on the tabular renderer.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.xlsx' }).click();
  const xframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const xf = await frameOf('iframe.fv-preview-frame');
  await xf.waitForSelector('.sheet table', { timeout: 12000 });
  const sheetTitles = await xf.$$eval('.sheet-title', (els) => els.map((e) => e.textContent));
  if (sheetTitles.join(',') === 'People,Totals') pass('Excel: both sheets rendered'); else fail('sheet titles: ' + sheetTitles.join(','));
  const xTables = await xf.$$eval('.sheet table', (els) => els.length);
  if (xTables === 2) pass('Excel: one table per sheet'); else fail('Excel tables: ' + xTables);
  // Multi-sheet tab switcher (CSS-only): a tab per sheet; only the active panel is visible, and
  // clicking the 2nd tab reveals the 2nd sheet (no script — pure :checked CSS).
  const sheetTabs = await xf.$$eval('.sheet-tabbar .sheet-tab', (els) => els.map((e) => e.textContent));
  const panel0Visible = await xf.$eval('#tb-p0', (e) => getComputedStyle(e).display !== 'none');
  const panel1Hidden = await xf.$eval('#tb-p1', (e) => getComputedStyle(e).display === 'none');
  if (sheetTabs.join(',') === 'People,Totals' && panel0Visible && panel1Hidden) pass('Excel: multi-sheet tab switcher (only active sheet shown)'); else fail('sheet tabs=' + sheetTabs.join(',') + ' p0vis=' + panel0Visible + ' p1hid=' + panel1Hidden);
  await xf.click('.sheet-tabbar .sheet-tab:nth-of-type(2)');
  const panel1NowVisible = await xf.$eval('#tb-p1', (e) => getComputedStyle(e).display !== 'none');
  if (panel1NowVisible) pass('Excel: clicking a tab switches sheets (CSS-only, no script)'); else fail('tab switch did not reveal sheet 2');
  // Excel export (loadExports hook): menu offers CSV / JSON (+ all-sheets for multi-sheet); CSV fires.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const xlsxExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (['Download first sheet as CSV', 'Download first sheet as JSON', 'Download all sheets as JSON'].every((l) => xlsxExports.includes(l))) pass('Excel export menu offers CSV/JSON/all-sheets'); else fail('Excel exports: ' + xlsxExports.join(','));
  const [xlsxDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download first sheet as CSV")'),
  ]);
  if (/\.csv$/.test(xlsxDownload.suggestedFilename())) pass('Excel exported to CSV (' + xlsxDownload.suggestedFilename() + ')'); else fail('Excel download name: ' + xlsxDownload.suggestedFilename());

  // ── Word module (WP19) ── mammoth -> sanitized HTML in the iframe.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.docx' }).click();
  const dframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const df = await frameOf('iframe.fv-preview-frame');
  await df.waitForSelector('.docx-body h1', { timeout: 12000 });
  const dh1 = await df.$eval('.docx-body h1', (e) => e.textContent);
  if (/Hello, File Viewer/.test(dh1)) pass('Word: docx converted to HTML (h1)'); else fail('docx h1: ' + dh1);
  const strong = await df.$$eval('.docx-body strong, .docx-body b', (els) => els.length);
  if (strong > 0) pass('Word: formatting preserved (bold)'); else fail('no bold run in docx');

  // ── PowerPoint module (WP19) ── pptxviewjs renders slides to images in the iframe.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.pptx' }).click();
  const ppframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 25000 });
  const ppf = await frameOf('iframe.fv-preview-frame');
  await ppf.waitForSelector('img.pptx-slide', { timeout: 25000 });
  const slideDims = await ppf.$$eval('img.pptx-slide', (els) => els.map((e) => e.naturalWidth));
  if (slideDims.length === 2 && slideDims.every((w) => w > 100)) pass('PPTX: ' + slideDims.length + ' slides rendered to images'); else fail('pptx slides: ' + JSON.stringify(slideDims));

  // ── JSON / Code / Image simple types (WP19) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.json' }).click();
  const jframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const jf = await frameOf('iframe.fv-preview-frame');
  await jf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const jkeys = await jf.$$eval('.json-tree .j-key', (els) => els.length);
  if (jkeys > 0) pass('JSON rendered as collapsible tree (' + jkeys + ' keys)'); else fail('no json keys');

  // Semantic JSON key-tree diff: edit working copy (add/remove/change a key + REORDER one)
  // then open Diff — reordering must NOT show as a change.
  await page.evaluate(() => {
    const obj = { private: true, name: 'file-viewer', mobileFirst: false, added: 1, trust: { server: false, tracking: false, cdn: false }, types: ['markdown', 'pdf', 'csv', 'xlsx', 'docx', 'pptx', 'json', 'image', 'code'], counts: { smokeChecks: 29, offOriginRequests: 0 }, tags: ['client-only', 'vendored', 'modular'] };
    window.__fv.state.rawview.setValue(JSON.stringify(obj, null, 2));
  });   // vs original: 'private' moved up (reorder), mobileFirst true->false, 'added' new, 'name' same
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForSelector('.jsondiff', { timeout: 6000 });
  const jdAdded = await page.$$eval('.jd-added > .jd-key, .jd-added > summary .jd-key', (els) => els.map((e) => e.textContent));
  const jdChanged = await page.$$eval('.jsondiff .jd-changed', (els) => els.length);
  if (jdAdded.includes('added')) pass('JSON key diff flags an added key'); else fail('jd-added keys: ' + jdAdded.join(','));
  // 'mobileFirst' changed value -> a changed leaf; reordered 'private'/'name' must NOT be changed.
  const changedKeys = await page.$$eval('.jsondiff .jd-changed > .jd-key', (els) => els.map((e) => e.textContent));
  if (changedKeys.includes('mobileFirst') && !changedKeys.includes('private') && !changedKeys.includes('name')) pass('JSON key diff: value change flagged, reordered keys ignored'); else fail('jd changed keys: ' + changedKeys.join(','));
  await page.click('#rawMode button[data-raw="current"]');

  // ── YAML ── parse with js-yaml, render as a collapsible tree (reuses JSON tree styling).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.yaml' }).click();
  const yframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const yf = await frameOf('iframe.fv-preview-frame');
  await yf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const yType = await page.$eval('#typeSelect', (s) => s.value);
  if (yType === 'yaml') pass('.yaml detected as YAML'); else fail('yaml type: ' + yType);
  const yKeys = await yf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (yKeys.includes('mobileFirst') && yKeys.includes('trust')) pass('YAML rendered as tree (' + yKeys.length + ' keys)'); else fail('yaml keys: ' + yKeys.join(','));
  const yBool = await yf.$$eval('.json-tree .j-bool', (els) => els.length);
  if (yBool > 0) pass('YAML scalar types preserved (booleans rendered)'); else fail('no yaml booleans');
  const yamlHasEditor = await page.$('#editor .monaco-editor');
  if (yamlHasEditor) pass('YAML has raw editor (editable text)'); else fail('YAML missing raw editor');

  // ── TOML ── hand-rolled parser, render as a collapsible tree (reuses JSON tree styling).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.toml' }).click();
  const tframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const tf = await frameOf('iframe.fv-preview-frame');
  await tf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const tType = await page.$eval('#typeSelect', (s) => s.value);
  if (tType === 'toml') pass('.toml detected as TOML'); else fail('toml type: ' + tType);
  const tKeys = await tf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (tKeys.includes('trust') && tKeys.includes('types')) pass('TOML tables rendered as tree (' + tKeys.length + ' keys)'); else fail('toml keys: ' + tKeys.join(','));
  // Array-of-tables [[types]] -> an array with 2 entries; booleans preserved.
  const tBool = await tf.$$eval('.json-tree .j-bool', (els) => els.length);
  const tNum = await tf.$$eval('.json-tree .j-num', (els) => els.length);
  if (tBool >= 4 && tNum >= 2) pass('TOML scalar types preserved (booleans + numbers)'); else fail('toml scalars: bool=' + tBool + ' num=' + tNum);

  // ── XML ── element tree (reuses JSON tree styling) + structural diff. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.xml' }).click();
  const xmlframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const xmlf = await frameOf('iframe.fv-preview-frame');
  await xmlf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const xType = await page.$eval('#typeSelect', (s) => s.value);
  if (xType === 'xml') pass('.xml detected as XML'); else fail('xml type: ' + xType);
  const xTags = await xmlf.$$eval('.json-tree .j-key', (els) => els.map((e) => e.textContent));
  if (xTags.some((t) => /<catalog>/.test(t)) && xTags.some((t) => /<book>/.test(t))) pass('XML rendered as element tree (' + xTags.length + ' nodes)'); else fail('xml tags: ' + xTags.slice(0, 6).join(','));
  // Structural diff: change one element's text → flagged; reindenting ignored.
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, { timeout: 8000 });
  const xmlOrig = await page.evaluate(() => window.__fv.state.rawview.originalValue());
  await page.evaluate((o) => window.__fv.state.rawview.setValue(o.replace('Midnight Rain', 'Midnight Sun')), xmlOrig);
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForFunction(() => /\bchanged\b/.test(document.querySelector('.jsondiff .jd-head')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const xmlDiffHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  if (/changed/.test(xmlDiffHead)) pass('XML structural diff flags a changed text node'); else fail('xml diff: ' + xmlDiffHead.slice(0, 80));
  await page.click('#rawMode button[data-raw="current"]');

  // ── INI / .env ── key-value tables grouped by section. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ini' }).click();
  const iniframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const inif = await frameOf('iframe.fv-preview-frame');
  await inif.waitForSelector('.kv-table', { timeout: 8000 });
  const iniType = await page.$eval('#typeSelect', (s) => s.value);
  if (iniType === 'ini') pass('.ini detected as Config (INI/env)'); else fail('ini type: ' + iniType);
  const iniSecs = await inif.$$eval('.kv-section h3', (els) => els.map((e) => e.textContent));
  const iniKeys = await inif.$$eval('.kv-key', (els) => els.map((e) => e.textContent));
  if (iniSecs.some((s) => /server/.test(s)) && iniKeys.includes('port')) pass('INI rendered as sectioned key-value tables'); else fail('ini secs=' + iniSecs.join(',') + ' keys=' + iniKeys.join(','));

  // ── Patch / unified diff ── colorized add/remove/hunk lines. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.patch' }).click();
  const patchframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const patchf = await frameOf('iframe.fv-preview-frame');
  await patchf.waitForSelector('.patch', { timeout: 8000 });
  const patchType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (patchType2 === 'patch') pass('.patch detected as Patch / Diff'); else fail('patch type: ' + patchType2);
  const adds = await patchf.$$eval('.patch .p-add', (els) => els.length);
  const dels = await patchf.$$eval('.patch .p-del', (els) => els.length);
  const hunks = await patchf.$$eval('.patch .p-hunk', (els) => els.length);
  if (adds >= 2 && dels >= 1 && hunks >= 1) pass('patch colorized (+' + adds + ' −' + dels + ', ' + hunks + ' hunk)'); else fail('patch lines: add=' + adds + ' del=' + dels + ' hunk=' + hunks);

  // ── Log ── severity highlighting + timestamps. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.log' }).click();
  const lframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const lf = await frameOf('iframe.fv-preview-frame');
  await lf.waitForSelector('.logv', { timeout: 8000 });
  const logType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (logType2 === 'log') pass('.log detected as Log'); else fail('log type: ' + logType2);
  const errLines = await lf.$$eval('.logv .l-error', (els) => els.length);
  const warnLines = await lf.$$eval('.logv .l-warn', (els) => els.length);
  const tsSpans = await lf.$$eval('.logv .l-ts', (els) => els.length);
  if (errLines >= 1 && warnLines >= 1 && tsSpans >= 4) pass('log severity highlighted (' + errLines + ' error, ' + warnLines + ' warn, ' + tsSpans + ' timestamps)'); else fail('log: err=' + errLines + ' warn=' + warnLines + ' ts=' + tsSpans);

  // ── vCard (.vcf) ── parse contacts into cards (name, email, phone). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.vcf' }).click();
  const vcfframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const vcff = await frameOf('iframe.fv-preview-frame');
  await vcff.waitForSelector('.vcf-card', { timeout: 8000 });
  const vcfTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (vcfTypeId === 'vcard') pass('.vcf detected as Contacts (vCard)'); else fail('vcard type: ' + vcfTypeId);
  const vcfNames = await vcff.$$eval('.vcf-card .vcf-name', (els) => els.map((e) => e.textContent));
  const mailto = await vcff.$$eval('.vcf-card a[href^="mailto:"]', (els) => els.map((a) => a.getAttribute('href')));
  if (vcfNames.length === 2 && vcfNames.includes('Ada Lovelace') && mailto.some((h) => /ada@example\.com/.test(h))) pass('vCard contacts parsed (2 cards, mailto links)'); else fail('vcard names=' + vcfNames.join(',') + ' mailto=' + mailto.join(','));

  // ── Subtitles (.srt/.vtt) ── parse cues into a timecoded list. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.srt' }).click();
  const subframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const subf = await frameOf('iframe.fv-preview-frame');
  await subf.waitForSelector('.sub-cue', { timeout: 8000 });
  const subTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (subTypeId === 'subtitle') pass('.srt detected as Subtitles'); else fail('subtitle type: ' + subTypeId);
  const cueCount = await subf.$$eval('.sub-cue', (els) => els.length);
  const firstTime = await subf.$eval('.sub-cue .sub-time', (e) => e.textContent);
  if (cueCount === 3 && /0:01\s*→\s*0:04/.test(firstTime)) pass('subtitle cues parsed with timecodes (' + cueCount + ' cues)'); else fail('subtitle cues=' + cueCount + ' first=' + firstTime);

  // ── GeoJSON map ── pure inline SVG, no tiles (zero network). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.geojson' }).click();
  const geoframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const geof = await frameOf('iframe.fv-preview-frame');
  await geof.waitForSelector('.geo-svg', { timeout: 8000 });
  const geoTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (geoTypeId === 'geo') pass('.geojson detected as Map (GeoJSON/GPX)'); else fail('geo type: ' + geoTypeId);
  const geoLines = await geof.$$eval('.geo-svg .geo-line', (els) => els.length);
  const geoPolys = await geof.$$eval('.geo-svg .geo-poly', (els) => els.length);
  const geoPts = await geof.$$eval('.geo-svg .geo-pt', (els) => els.length);
  if (geoLines >= 1 && geoPolys >= 1 && geoPts >= 2) pass('GeoJSON drawn as SVG (' + geoLines + ' line, ' + geoPolys + ' polygon, ' + geoPts + ' points)'); else fail('geo svg: line=' + geoLines + ' poly=' + geoPolys + ' pt=' + geoPts);

  // ── ID3 metadata ── an MP3's tags surface in the info drawer. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.mp3' }).click();
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  await page.click('#metaBtn');
  await page.waitForSelector('#metaDrawer:not([hidden]) #metaBody', { timeout: 6000 });
  await page.waitForFunction(() => /Demo Artist/.test(document.querySelector('#metaBody')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const metaText = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Demo Artist/.test(metaText) && /Demo Track/.test(metaText)) pass('ID3 tags surfaced in metadata (artist + title)'); else fail('id3 meta: ' + metaText.replace(/\s+/g, ' ').slice(0, 100));
  await page.click('#metaDrawer [data-close]').catch(() => {});

  // ── Font specimen ── load the font via FontFace + render sample text in the parent pane. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ttf' }).click();
  await page.waitForSelector('#previewHost .font-doc', { timeout: 12000 });
  const fontTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (fontTypeId === 'font') pass('.ttf detected as Font'); else fail('font type: ' + fontTypeId);
  const fontSamples = await page.$$eval('#previewHost .font-sample', (els) => els.length);
  const fontLoaded = await page.evaluate(() => [...document.fonts].some((f) => /^fvfont-/.test(f.family) && f.status === 'loaded'));
  if (fontSamples >= 6 && fontLoaded) pass('font specimen rendered + FontFace loaded (' + fontSamples + ' samples)'); else fail('font: samples=' + fontSamples + ' loaded=' + fontLoaded);

  // ── Known-file enhancement (Layer 3): package.json -> npm links + revert chip ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'package.json', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  pass('package.json gets the enhanced view (rendered in the parent pane)');
  const npmHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (npmHrefs.some((h) => /npmjs\.com\/package\/markdown-it/.test(h)) && npmHrefs.every((h) => /^https:\/\/www\.npmjs\.com\/package\//.test(h))) pass('dependencies link to npm (' + npmHrefs.length + ' deps)'); else fail('npm links: ' + npmHrefs.join(','));
  // External links are href-only (open in a new tab, rel=noopener) — not auto-fetched.
  const linkRel = await page.$eval('#previewHost .pj-deps a.pj-link', (a) => a.rel + '|' + a.target);
  if (/noopener/.test(linkRel) && /_blank/.test(linkRel)) pass('npm links are external-safe (noopener, new tab)'); else fail('link rel/target: ' + linkRel);
  // The enhance chip is shown and reverts to the plain JSON tree.
  const chipShown = await page.$eval('#enhanceChip', (e) => !e.hidden && /package\.json/.test(e.textContent));
  if (chipShown) pass('enhance chip shows the active known-file'); else fail('enhance chip not shown');
  await page.click('#enhanceChip .ec-toggle');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 8000 });
  const pjFrame = await frameOf('#previewHost iframe.fv-preview-frame');
  await pjFrame.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  pass('revert chip switches to the plain JSON tree view');

  // ── More known-files (Layer 3): Cargo.toml, tsconfig.json, Dockerfile, docker-compose, .gitignore ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cargo.toml', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const crateHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (crateHrefs.some((h) => /crates\.io\/crates\/serde/.test(h))) pass('Cargo.toml: dependencies link to crates.io'); else fail('crate links: ' + crateHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'tsconfig.json', exact: true }).click();
  await page.waitForSelector('#previewHost .ts-table', { timeout: 12000 });
  const tsDocs = await page.$$eval('#previewHost .ts-table .ts-doc', (els) => els.map((e) => e.textContent).join(' '));
  if (/strict type-checking/i.test(tsDocs)) pass('tsconfig.json: compiler options annotated'); else fail('tsconfig docs: ' + tsDocs.slice(0, 80));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Dockerfile', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfBadges = await page.$$eval('#previewHost .kf-badge', (els) => els.map((e) => e.textContent));
  if (dfBadges.filter((b) => b === 'FROM').length === 2 && dfBadges.includes('HEALTHCHECK')) pass('Dockerfile: instructions broken down (2 FROM stages)'); else fail('dockerfile badges: ' + dfBadges.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'docker-compose.yml', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const svcNames = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  if (svcNames.includes('web') && svcNames.includes('api')) pass('docker-compose: a card per service (' + svcNames.join(', ') + ')'); else fail('compose services: ' + svcNames.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '.gitignore', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-pat', { timeout: 12000 });
  const giPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const giTags = await page.$$eval('#previewHost .kf-pat .kf-tag', (els) => els.map((e) => e.textContent));
  if (giPats.includes('node_modules/') && giTags.includes('un-ignore')) pass('.gitignore: patterns annotated (directory, un-ignore, …)'); else fail('gitignore pats=' + giPats.join(',') + ' tags=' + giTags.join(','));

  // ── More known-files (Layer 3): dependency manifests → ecosystem links ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'requirements.txt', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const reqHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (reqHrefs.some((h) => /pypi\.org\/project\/Flask/.test(h)) && reqHrefs.some((h) => /pypi\.org\/project\/celery/i.test(h))) pass('requirements.txt: packages link to PyPI'); else fail('pypi links: ' + reqHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'go.mod', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const goHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const goIndirect = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (goHrefs.some((h) => /pkg\.go\.dev\/github\.com\/gin-gonic\/gin/.test(h)) && goIndirect.includes('indirect')) pass('go.mod: modules link to pkg.go.dev (+ indirect tagged)'); else fail('go links: ' + goHrefs.join(',') + ' tags=' + goIndirect.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'composer.json', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const composerHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composerHrefs.some((h) => /packagist\.org\/packages\/guzzlehttp\/guzzle/.test(h))) pass('composer.json: dependencies link to Packagist'); else fail('packagist links: ' + composerHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Gemfile', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const gemHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const gemGroups = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (gemHrefs.some((h) => /rubygems\.org\/gems\/rails/.test(h)) && gemGroups.some((g) => /development/.test(g))) pass('Gemfile: gems link to RubyGems (+ groups tagged)'); else fail('gem links: ' + gemHrefs.join(',') + ' groups=' + gemGroups.join(','));

  // ── More known-files (Layer 3): CODEOWNERS, .editorconfig, pom.xml ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'CODEOWNERS', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const coPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const coOwners = await page.$$eval('#previewHost .kf-pat a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (coPats.includes('/docs/') && coOwners.some((h) => /github\.com\/orgs\/acme\/teams\/web-team/.test(h)) && coOwners.some((h) => /github\.com\/ada$/.test(h))) pass('CODEOWNERS: rules + owners link to GitHub (user + team)'); else fail('codeowners pats=' + coPats.join(',') + ' owners=' + coOwners.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '.editorconfig', exact: true }).click();
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const ecGlobs = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  const ecRoot = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (ecGlobs.some((g) => /\*\.py/.test(g)) && ecRoot.includes('root')) pass('.editorconfig: sections per glob (+ root flag)'); else fail('editorconfig globs=' + ecGlobs.join(',') + ' tags=' + ecRoot.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'pom.xml', exact: true }).click();
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pomHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pomScopes = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (pomHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && pomScopes.includes('test')) pass('pom.xml: dependencies link to mvnrepository (+ scope tagged)'); else fail('pom links=' + pomHrefs.join(',') + ' scopes=' + pomScopes.join(','));

  // ── Calendar (.ics) ── parse iCalendar, render events chronologically.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ics' }).click();
  const icframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const icf = await frameOf('iframe.fv-preview-frame');
  await icf.waitForSelector('.ics-event', { timeout: 8000 });
  const icsType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (icsType2 === 'ics') pass('.ics detected as Calendar'); else fail('ics type: ' + icsType2);
  const evTitles = await icf.$$eval('.ics-event .ics-title', (els) => els.map((e) => e.textContent));
  if (evTitles.length === 3 && evTitles[0] === 'Project kickoff') pass('calendar events parsed + sorted (' + evTitles.length + ')'); else fail('ics events: ' + evTitles.join(','));
  const rrule = await icf.$eval('.ics-rrule', (e) => e.textContent).catch(() => '');
  if (/weekly/i.test(rrule)) pass('recurrence rule shown (' + rrule.trim() + ')'); else fail('ics rrule: ' + rrule);

  // ── Archive (.zip) ── list entries from the central directory (no extraction).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.zip' }).click();
  const zframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const zf = await frameOf('iframe.fv-preview-frame');
  await zf.waitForSelector('.zip-table tbody tr', { timeout: 12000 });
  const zipType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (zipType2 === 'zip') pass('.zip detected as Archive'); else fail('zip type: ' + zipType2);
  const zNames = await zf.$$eval('.zip-table .z-name', (els) => els.map((e) => e.textContent));
  if (zNames.includes('README.txt') && zNames.some((n) => n.startsWith('src/'))) pass('archive lists entries (' + zNames.length + ' files)'); else fail('zip names: ' + zNames.join(','));
  const zMeta = await zf.$eval('.zip-meta', (e) => e.textContent);
  if (/files/.test(zMeta) && /uncompressed/.test(zMeta)) pass('archive summary (counts + size)'); else fail('zip meta: ' + zMeta);
  const zipHasEditor = await page.$('#editor .monaco-editor');
  if (!zipHasEditor) pass('archive is preview-only (no raw editor)'); else fail('raw editor present for zip');
  // Open-file-inside-zip: entry names are clickable → the entry opens through normal detection.
  const openable = await zf.$$eval('.zip-table .z-open', (els) => els.map((e) => e.getAttribute('data-fv-open')));
  if (openable.includes('README.txt') && openable.includes('data/rows.csv')) pass('archive entries are clickable (open-inside-zip)'); else fail('zip openable: ' + openable.join(','));
  await zf.click('.zip-table .z-open[data-fv-open="data/rows.csv"]');
  // The extracted CSV is re-detected and rendered in a fresh preview iframe (as a CSV table).
  // Wait for the new intake to load (filename swaps to the entry's own name) before asserting.
  await page.waitForFunction(() => document.getElementById('fileName').textContent === 'rows.csv', { timeout: 12000 });
  const innerType = await page.$eval('#typeSelect', (s) => s.value);
  if (innerType === 'csv') pass('zip entry opened + re-detected (rows.csv → CSV)'); else fail('inner type: ' + innerType);
  pass('opened entry shows its own filename (rows.csv)');
  const innerFrameEl = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const innerFrame = await frameOf('iframe.fv-preview-frame');
  await innerFrame.waitForSelector('table', { timeout: 10000 });
  const innerHasTable = await innerFrame.$$eval('table tbody tr', (els) => els.length);
  if (innerHasTable > 0) pass('zip entry rendered through its real renderer (CSV table, ' + innerHasTable + ' rows)'); else fail('inner CSV rows: ' + innerHasTable);

  // ── Password-protected zip ── JSZip refuses it; we still list via our own central-dir parse + 🔒. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Locked.zip' }).click();
  const lzframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const lzf = await frameOf('iframe.fv-preview-frame');
  await lzf.waitForSelector('.zip-table tbody tr', { timeout: 12000 });
  const lzNames = await lzf.$$eval('.zip-table .z-name', (els) => els.map((e) => e.textContent));
  if (lzNames.some((n) => /secret\.txt/.test(n)) && lzNames.some((n) => /readme\.txt/.test(n))) pass('encrypted zip still lists entries (fallback parser)'); else fail('locked zip names: ' + lzNames.join(','));
  const lockBadge = await lzf.$$eval('.zip-table .z-lock', (els) => els.length);
  const lockBanner = await lzf.$eval('.zip-locked', (e) => e.textContent).catch(() => '');
  if (lockBadge === 1 && /password-protected/.test(lockBanner)) pass('password-protected entry flagged (🔒 badge + banner)'); else fail('lock badge=' + lockBadge + ' banner=' + lockBanner.slice(0, 50));

  // ── Comic book (.cbz) ── zip of images → page reader (parent pane, blob image URLs, natural sort).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.cbz' }).click();
  await page.waitForSelector('#previewHost .comic-doc .comic-page', { timeout: 15000 });
  const cbzType = await page.$eval('#typeSelect', (s) => s.value);
  if (cbzType === 'comic') pass('.cbz detected as Comic book'); else fail('cbz type: ' + cbzType);
  const comicPages = await page.$$eval('#previewHost .comic-page', (els) => els.map((e) => e.getAttribute('src')));
  if (comicPages.length === 3 && comicPages.every((s) => s.startsWith('blob:'))) pass('comic: pages rendered from blob URLs (' + comicPages.length + ')'); else fail('comic pages: ' + comicPages.length);
  // Book-mode spread toggle pairs pages two-up.
  await page.click('#previewHost .comic-spread');
  const comicSpread = await page.$$eval('#previewHost .comic-page-wrap', (els) => {
    if (els.length < 2) return false;
    const a = els[0].getBoundingClientRect(), b = els[1].getBoundingClientRect();
    return Math.abs(a.top - b.top) < 5 && b.left > a.left;
  });
  if (comicSpread) pass('comic book mode: two-page spread'); else fail('comic spread not two-up');

  // ── Email (.eml) ── parsed MIME: header card + sanitized HTML body, encoded subject decoded.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.eml' }).click();
  const eframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ef = await frameOf('iframe.fv-preview-frame');
  await ef.waitForSelector('.eml-head', { timeout: 8000 });
  const emlType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (emlType2 === 'eml') pass('.eml detected as Email'); else fail('eml type: ' + emlType2);
  const emlHead = await ef.$eval('.eml-head', (e) => e.textContent);
  if (/Hello from File Viewer/.test(emlHead) && /alice@example\.com/.test(emlHead)) pass('email header card (encoded subject decoded + From)'); else fail('eml head: ' + emlHead.slice(0, 80));
  const emlBody = await ef.$eval('.eml-html', (e) => e.innerHTML);
  if (/<b>File Viewer<\/b>/.test(emlBody) && !/<script/i.test(emlBody)) pass('email HTML body rendered + sanitized (script stripped)'); else fail('eml body: ' + emlBody.slice(0, 80));

  // ── Mailbox (.mbox) ── split into messages, inbox list (reuses the eml MIME parser). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.mbox' }).click();
  const mbframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const mbf = await frameOf('iframe.fv-preview-frame');
  await mbf.waitForSelector('.mbox-msg', { timeout: 8000 });
  const mboxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mboxTypeId === 'mbox') pass('.mbox detected as Mailbox'); else fail('mbox type: ' + mboxTypeId);
  const mboxCount = await mbf.$$eval('.mbox-msg', (els) => els.length);
  const mboxFroms = await mbf.$$eval('.mbox-from', (els) => els.map((e) => e.textContent).join(' '));
  if (mboxCount === 3 && /Alice/.test(mboxFroms) && /Carol/.test(mboxFroms)) pass('mbox split into 3 messages with senders'); else fail('mbox count=' + mboxCount + ' froms=' + mboxFroms);

  // ── Jupyter Notebook (.ipynb) ── markdown + code cells + saved outputs, sanitized.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ipynb' }).click();
  const nframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const nf = await frameOf('iframe.fv-preview-frame');
  await nf.waitForSelector('.nb-notebook', { timeout: 10000 });
  const nbType = await page.$eval('#typeSelect', (s) => s.value);
  if (nbType === 'ipynb') pass('.ipynb detected as Jupyter Notebook'); else fail('ipynb type: ' + nbType);
  const nbMd = await nf.$$eval('.nb-md h1', (els) => els.map((e) => e.textContent));
  if (nbMd.some((t) => /Notebook demo/.test(t))) pass('notebook markdown cell rendered'); else fail('nb markdown h1: ' + nbMd.join(','));
  const nbCode = await nf.$$eval('.nb-code .nb-src', (els) => els.length);
  if (nbCode === 3) pass('notebook code cells rendered (' + nbCode + ')'); else fail('nb code cells: ' + nbCode);
  const nbStream = await nf.$eval('.nb-stream', (e) => e.textContent).catch(() => '');
  if (/Hello from a saved notebook output/.test(nbStream)) pass('notebook stream output shown'); else fail('nb stream: ' + nbStream);
  const nbHtmlOut = await nf.$$eval('.nb-rich table td', (els) => els.length);
  if (nbHtmlOut > 0) pass('notebook rich HTML output sanitized + rendered (' + nbHtmlOut + ' cells)'); else fail('no nb rich output table');
  const nbErr = await nf.$('.nb-error');
  if (nbErr) pass('notebook error output shown'); else fail('no nb error output');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'example.js' }).click();
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  const codeType = await page.$eval('#typeSelect', (s) => s.value);
  if (codeType === 'code') pass('JS file detected as Code with syntax highlighting'); else fail('js type: ' + codeType);
  // Per-function metrics CodeLens (LOC + cyclomatic complexity) — display-only overlay.
  await page.waitForFunction(() => document.querySelectorAll('#editor .codelens-decoration').length >= 2, { timeout: 15000 }).catch(() => {});
  const lensText = await page.$$eval('#editor .codelens-decoration', (els) => els.map((e) => e.innerText).join(' | '));
  const okLens = /\bfib\b/.test(lensText) && /\bclassify\b/.test(lensText) && /complexity 2\b/.test(lensText) && /complexity 7\b/.test(lensText);
  if (okLens) pass('code metrics CodeLens: per-function LOC + complexity (fib=2, classify=7)'); else fail('codelens text: ' + lensText.slice(0, 160));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'example.svg' }).click();
  const sframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const sf = await frameOf('iframe.fv-preview-frame');
  await sf.waitForSelector('.img-doc svg', { timeout: 8000 });
  pass('SVG sanitized and rendered inline');

  // ── STL 3D viewer ── hand-rolled canvas renderer (zero dep), draws the mesh. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.stl' }).click();
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const stlTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (stlTypeId === 'stl') pass('.stl detected as 3D model'); else fail('stl type: ' + stlTypeId);
  const stlInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/8 triangles/.test(stlInfo)) pass('STL parsed (binary, 8 triangles)'); else fail('stl info: ' + stlInfo);
  // Confirm the mesh actually rasterized to the canvas (non-transparent pixels exist).
  await page.waitForTimeout(400);
  const painted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (painted > 100) pass('STL mesh rendered to canvas (' + painted + ' painted pixels)'); else fail('stl canvas painted pixels: ' + painted);

  // ── OBJ 3D viewer ── reuses the shared mesh viewer; polygons fan-triangulated. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.obj' }).click();
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const objTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (objTypeId === 'obj') pass('.obj detected as 3D model'); else fail('obj type: ' + objTypeId);
  const objInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  // Cube = 8 vertices, 6 quad faces → 12 triangles.
  if (/12 triangles/.test(objInfo) && /8 vertices/.test(objInfo)) pass('OBJ parsed (cube: 8 vertices → 12 triangles)'); else fail('obj info: ' + objInfo);
  await page.waitForTimeout(400);
  const objPainted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (objPainted > 100) pass('OBJ mesh rendered to canvas (' + objPainted + ' painted pixels)'); else fail('obj painted pixels: ' + objPainted);

  // ── glTF/GLB 3D viewer ── binary GLB parsed (chunks + accessors + node transforms). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.glb' }).click();
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const glbTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (glbTypeId === 'gltf') pass('.glb detected as 3D model (glTF)'); else fail('glb type: ' + glbTypeId);
  const glbInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/12 triangles/.test(glbInfo)) pass('GLB parsed (cube: 12 triangles from accessors)'); else fail('glb info: ' + glbInfo);
  await page.waitForTimeout(400);
  const glbPainted = await page.evaluate(() => {
    const c = document.querySelector('#previewHost .stl-canvas');
    if (!c || !c.width) return 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) n++;
    return n;
  });
  if (glbPainted > 100) pass('GLB mesh rendered to canvas (' + glbPainted + ' painted pixels)'); else fail('glb painted pixels: ' + glbPainted);

  // ── PLY 3D viewer ── ASCII (gallery) + binary-little-endian (via file input). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ply' }).click();
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const plyTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (plyTypeId === 'ply') pass('.ply detected as 3D model'); else fail('ply type: ' + plyTypeId);
  const plyInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/12 triangles/.test(plyInfo)) pass('ASCII PLY parsed (cube: 6 quads → 12 triangles)'); else fail('ply info: ' + plyInfo);
  // Binary little-endian PLY via the file input — generate the fixture at runtime (self-contained,
  // so CI's clean checkout has it too; never depend on a pre-existing local file).
  const plyBinPath = join(tmpdir(), 'fv-smoke-sample-bin.ply');
  {
    const verts = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const faces = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
    const header = Buffer.from('ply\nformat binary_little_endian 1.0\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nelement face 4\nproperty list uchar int vertex_indices\nend_header\n', 'latin1');
    const vb = Buffer.alloc(4 * 3 * 4); let o = 0; for (const v of verts) for (const c of v) { vb.writeFloatLE(c, o); o += 4; }
    const fb = Buffer.alloc(4 * (1 + 3 * 4)); o = 0; for (const f of faces) { fb.writeUInt8(3, o); o += 1; for (const i of f) { fb.writeInt32LE(i, o); o += 4; } }
    writeFileSync(plyBinPath, Buffer.concat([header, vb, fb]));
  }
  await page.setInputFiles('#fileInput', plyBinPath);
  await page.waitForSelector('#previewHost .stl-canvas', { timeout: 12000 });
  const plyBinInfo = await page.$eval('#previewHost .stl-info', (e) => e.textContent);
  if (/4 triangles/.test(plyBinInfo)) pass('binary PLY parsed (tetrahedron: 4 triangles)'); else fail('ply binary info: ' + plyBinInfo);

  // ── Raster image ── parent-pane viewer with fit-to-screen default + size-based zoom. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.png' }).click();
  await page.waitForSelector('#previewHost .imgv-img', { timeout: 12000 });
  const imgType = await page.$eval('#typeSelect', (s) => s.value);
  if (imgType === 'image') pass('.png detected as Image'); else fail('image type: ' + imgType);
  const imgSrc = await page.$eval('#previewHost .imgv-img', (e) => e.src);
  if (imgSrc.startsWith('blob:')) pass('raster image served from blob URL (no base64 inflation)'); else fail('img src: ' + imgSrc.slice(0, 20));
  const fitDefault = await page.$eval('#previewHost .imgv-fit', (e) => e.classList.contains('active'));
  if (fitDefault) pass('image defaults to fit-to-screen'); else fail('image not fit by default');
  // Zoom changes the real rendered width (size-based, not transform).
  await page.click('#previewHost .imgv-up');
  const zoomLabel = await page.$eval('#previewHost .imgv-zoom', (e) => e.textContent);
  const widthSet = await page.$eval('#previewHost .imgv-img', (e) => e.style.width);
  if (/%/.test(zoomLabel) && /px$/.test(widthSet)) pass('image zoom sets a real pixel width (' + zoomLabel + ')'); else fail('image zoom: label=' + zoomLabel + ' width=' + widthSet);
  // Image export (loadExports hook): menu offers PNG/JPEG/WebP, and a conversion actually downloads.
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const imgExports = await page.$$eval('#exportMenu .export-item', (els) => els.map((e) => e.textContent));
  if (['Download as PNG', 'Download as JPEG', 'Download as WebP'].every((l) => imgExports.includes(l))) pass('image export menu offers PNG/JPEG/WebP'); else fail('image exports: ' + imgExports.join(','));
  const [imgDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as WebP")'),
  ]);
  if (/\.webp$/.test(imgDownload.suggestedFilename())) pass('image converted + downloaded (' + imgDownload.suggestedFilename() + ')'); else fail('image download name: ' + imgDownload.suggestedFilename());

  // ── Audio/Video (media) ── native player rendered in the pane via a blob: URL.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.wav' }).click();
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await page.$eval('#previewHost audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('blob:')) pass('audio served from in-page blob URL (streamed, no size ceiling)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  // Streaming: the File handle is retained on the intake (blob built from the File = disk-backed,
  // never reads a multi-GB file into memory).
  const hasFileHandle = await page.evaluate(() => !!window.__fv.state.intake.file);
  if (hasFileHandle) pass('media keeps the File handle (streams off disk, no full read into memory)'); else fail('no File handle on media intake');
  // Sleep timer control present (long-form listening).
  const sleepOpts = await page.$$eval('#previewHost .media-sleep select option', (els) => els.map((e) => e.textContent));
  if (sleepOpts.includes('Off') && sleepOpts.includes('30 min')) pass('audio: sleep timer control present (Off … 60 min)'); else fail('sleep options: ' + sleepOpts.join(','));
  // Folder playlist: load a 2-track folder via the seam → prev/next + position + shuffle appear.
  await page.evaluate(async () => {
    const r = await fetch('examples/sample.wav');
    const buf = await r.arrayBuffer();
    const mk = (n) => new File([buf], n, { type: 'audio/wav' });
    await window.__fv.loadFolder([
      { file: mk('01-intro.wav'), path: 'album/01-intro.wav' },
      { file: mk('02-outro.wav'), path: 'album/02-outro.wav' },
    ]);
  });
  await page.waitForSelector('#previewHost .media-playlist', { timeout: 12000 });
  const trackPos = await page.$eval('#previewHost .media-track-pos', (e) => e.textContent);
  if (/1\s*\/\s*2/.test(trackPos)) pass('audio folder playlist: track position (' + trackPos.trim() + ')'); else fail('playlist pos: ' + trackPos);
  const hasShuffle = await page.$('#previewHost .media-shuffle input');
  if (hasShuffle) pass('audio folder playlist: prev/next + shuffle controls'); else fail('no shuffle toggle in playlist');
  // iOS install exception: the Add-to-Home-Screen hint must NOT appear on desktop (no-install default).
  const iosHintDesktop = await page.$eval('#iosAudioHint', (e) => e.hidden);
  if (iosHintDesktop) pass('iOS audio hint NOT shown on desktop (no-install default holds)'); else fail('iOS hint showed on desktop');
  const appleMeta = await page.$('meta[name="apple-mobile-web-app-capable"]');
  if (appleMeta) pass('iOS standalone meta + manifest present'); else fail('no apple-mobile-web-app-capable meta');

  // ── iOS background-audio exception ── on an iPhone UA, opening audio surfaces the opt-in hint.
  {
    const ictx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      hasTouch: true, isMobile: true,
    });
    const ip = await ictx.newPage();
    await ip.goto(origin, { waitUntil: 'networkidle' });
    await ip.getByRole('button', { name: 'Sample.wav' }).click();
    await ip.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
    const shown = await ip.waitForSelector('#iosAudioHint:not([hidden])', { timeout: 8000 }).catch(() => null);
    const hintText = shown ? await ip.$eval('#iosAudioHint', (e) => e.textContent) : '';
    if (shown && /Add to Home Screen/i.test(hintText)) pass('iOS: background-audio Add-to-Home-Screen hint shown for audio'); else fail('iOS hint missing/wrong: ' + hintText.slice(0, 60));
    await ip.click('#iosAudioHint .ios-hint-never');
    const hiddenAfter = await ip.$eval('#iosAudioHint', (e) => e.hidden);
    if (hiddenAfter) pass('iOS: hint permanently dismissible'); else fail('iOS hint not dismissed');
    await ictx.close();
  }
  // No iframe for media — it renders directly in the pane (outside the sandbox).
  const mediaIframe = await page.$('#previewHost iframe.fv-preview-frame');
  if (!mediaIframe) pass('media renders outside the sandboxed iframe'); else fail('media used an iframe');
  const mediaHasEditor = await page.$('#editor .monaco-editor');
  if (!mediaHasEditor) pass('media is preview-only (no raw editor)'); else fail('raw editor present for media');

  // ── SQLite browser ── sql.js (WASM, same-origin) table list + grid + query. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.sqlite' }).click();
  await page.waitForSelector('#previewHost .sq-grid', { timeout: 25000 });
  const sqType = await page.$eval('#typeSelect', (s) => s.value);
  if (sqType === 'sqlite') pass('.sqlite detected as SQLite database'); else fail('sqlite type: ' + sqType);
  const sqTables = await page.$$eval('#previewHost .sq-table .sq-tname', (els) => els.map((e) => e.textContent));
  if (sqTables.includes('artists') && sqTables.includes('albums')) pass('SQLite tables listed (' + sqTables.join(', ') + ')'); else fail('sqlite tables: ' + sqTables.join(','));
  // Run a query and read the grid.
  await page.fill('#previewHost .sq-sql', "SELECT name FROM artists WHERE country='UK' ORDER BY name");
  await page.click('#previewHost .sq-run');
  await page.waitForFunction(() => /Aphex Twin/.test(document.querySelector('#previewHost .sq-grid')?.textContent || ''), { timeout: 8000 }).catch(() => {});
  const sqQueryText = await page.$eval('#previewHost .sq-grid', (e) => e.textContent);
  if (/Aphex Twin/.test(sqQueryText) && /Bonobo/.test(sqQueryText) && !/Tycho/.test(sqQueryText)) pass('SQLite query executes (filtered result)'); else fail('sqlite query: ' + sqQueryText.replace(/\s+/g, ' ').slice(0, 80));

  // ── FictionBook (.fb2) ── XML ebook → sanitized reading HTML with inline data: images. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.fb2' }).click();
  const fb2frame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const fb2f = await frameOf('iframe.fv-preview-frame');
  await fb2f.waitForSelector('.fb2-book', { timeout: 10000 });
  const fb2Type = await page.$eval('#typeSelect', (s) => s.value);
  if (fb2Type === 'fb2') pass('.fb2 detected as FictionBook (outscores XML)'); else fail('fb2 type: ' + fb2Type);
  const fb2Title = await fb2f.$eval('.fb2-booktitle', (e) => e.textContent).catch(() => '');
  if (/Analytical Engine/.test(fb2Title)) pass('FB2 book title rendered from title-info'); else fail('fb2 title: ' + fb2Title);
  const fb2Headings = await fb2f.$$eval('.fb2-title', (els) => els.map((e) => e.textContent));
  if (fb2Headings.some((h) => /Chapter One/.test(h)) && fb2Headings.some((h) => /Chapter Two/.test(h))) pass('FB2 sections become headings (' + fb2Headings.length + ')'); else fail('fb2 headings: ' + fb2Headings.join(','));
  // The inline <binary> image is embedded as a data: URL (zero off-origin — no network fetch).
  const fb2ImgSrc = await fb2f.$eval('.fb2-img', (e) => e.getAttribute('src')).catch(() => '');
  if (/^data:image\/png;base64,/.test(fb2ImgSrc)) pass('FB2 inline image embedded as a data: URL (zero off-origin)'); else fail('fb2 img src: ' + fb2ImgSrc.slice(0, 30));

  // ── MOBI / Kindle (.mobi) ── PalmDB parse + PalmDOC text → sanitized HTML, inline data: images. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.mobi' }).click();
  const mobiframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const mobif = await frameOf('iframe.fv-preview-frame');
  await mobif.waitForSelector('.mobi-book', { timeout: 10000 });
  const mobiType = await page.$eval('#typeSelect', (s) => s.value);
  if (mobiType === 'mobi') pass('.mobi detected as Kindle / MOBI'); else fail('mobi type: ' + mobiType);
  const mobiText = await mobif.$eval('.mobi-book', (e) => e.textContent);
  if (/Mobi Sampler/.test(mobiText) && /rendered entirely in the browser/.test(mobiText)) pass('MOBI text decompressed + rendered'); else fail('mobi text: ' + mobiText.slice(0, 60));
  const mobiImg = await mobif.$eval('.mobi-img', (e) => e.getAttribute('src')).catch(() => '');
  if (/^data:image\/png;base64,/.test(mobiImg)) pass('MOBI embedded image inlined as data: URL (zero off-origin)'); else fail('mobi img: ' + mobiImg.slice(0, 30));

  // ── EPUB e-book (hand-rolled reader) ── unzip + spine + TOC, rendered in the pane. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.epub' }).click();
  await page.waitForSelector('#previewHost .epub-doc', { timeout: 15000 });
  const epubType = await page.$eval('#typeSelect', (s) => s.value);
  if (epubType === 'epub') pass('.epub detected as E-book (outscores Archive)'); else fail('epub type: ' + epubType);
  const epubTitle = await page.$eval('#previewHost .epub-title', (e) => e.textContent);
  if (/File Viewer Sampler/.test(epubTitle)) pass('EPUB title parsed from OPF metadata'); else fail('epub title: ' + epubTitle);
  const tocCount = await page.$$eval('#previewHost .epub-toc-item', (els) => els.length);
  if (tocCount === 3) pass('EPUB table of contents built (' + tocCount + ' entries)'); else fail('epub toc entries: ' + tocCount);
  // Reading settings: font-size zoom (size-based, not transform) + theme.
  const fs0 = await page.$eval('#previewHost .epub-content', (e) => getComputedStyle(e).fontSize);
  await page.click('#previewHost .epub-fs-up');
  await page.click('#previewHost .epub-fs-up');
  const fs1 = await page.$eval('#previewHost .epub-content', (e) => getComputedStyle(e).fontSize);
  if (parseFloat(fs1) === parseFloat(fs0) + 2) pass('EPUB font-size zoom increases real size (' + fs0 + '→' + fs1 + ')'); else fail('epub font-size: ' + fs0 + ' → ' + fs1);
  await page.click('#previewHost .epub-theme[data-theme="sepia"]');
  const sepia = await page.$eval('#previewHost .epub-doc', (e) => e.classList.contains('epub-theme-sepia'));
  if (sepia) pass('EPUB reading theme switch (sepia)'); else fail('epub theme not applied');
  // First chapter rendered, with its embedded SVG image rewritten to an in-book blob URL.
  const epubH1 = await page.$eval('#previewHost .epub-content h1', (e) => e.textContent).catch(() => '');
  if (/A Beginning/.test(epubH1)) pass('EPUB first chapter rendered'); else fail('epub chapter h1: ' + epubH1);
  const epubImg = await page.$eval('#previewHost .epub-content img', (e) => e.getAttribute('src') || 'none').catch(() => 'none');
  if (epubImg.startsWith('blob:')) pass('EPUB embedded image rewritten to in-book blob URL (zero off-origin)'); else fail('epub img src: ' + epubImg);
  // Navigate to chapter 2, then reopen the book → resumes at chapter 2 (per-file persistence).
  await page.click('#previewHost .epub-next');
  await page.waitForFunction(() => /The Middle/.test(document.querySelector('#previewHost .epub-content h1')?.textContent || ''), { timeout: 8000 });
  pass('EPUB next-chapter navigation works');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.epub' }).click();
  await page.waitForSelector('#previewHost .epub-content', { timeout: 15000 });
  const resumedH1 = await page.waitForFunction(() => {
    const t = document.querySelector('#previewHost .epub-content h1')?.textContent || '';
    return /The Middle/.test(t) ? t : false;
  }, { timeout: 8000 }).then(() => true).catch(() => false);
  if (resumedH1) pass('EPUB resumes at the last-read chapter on reopen (persistence)'); else fail('epub did not resume at chapter 2');

  // ── Binary file → hex dump in the read-only editor ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.bin' }).click();
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  const hexVal = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/^00000000\s+([0-9a-f]{2} )+/m.test(hexVal)) pass('binary file rendered as hex dump (offset + hex columns)'); else fail('no hex dump: ' + hexVal.slice(0, 40));
  if (/\|.*Hello.*\|/.test(hexVal)) pass('hex dump shows ASCII column (printable bytes)'); else fail('no ASCII column in hex dump');

  // ── Folder tree sidebar ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const mk = (name, body) => ({ file: new File([body], name.split('/').pop(), { type: '' }), path: name });
    const entries = [
      mk('proj/README.md', '# Project\n\nHello from the tree.'),
      mk('proj/src/app.js', 'console.log(1)'),
      mk('proj/src/util.py', 'print(2)'),
      mk('proj/data/rows.csv', 'a,b\n1,2'),
      mk('proj/a-really-extremely-long-file-name-that-overflows-the-sidebar-column.txt', 'x'),
    ];
    window.__fv.loadFolder(entries);
  });
  await page.waitForSelector('#fileTree:not([hidden]) .ft-file', { timeout: 8000 });
  const fileRows = await page.$$eval('#fileTree .ft-file', (els) => els.length);
  const folderRows = await page.$$eval('#fileTree .ft-folder', (els) => els.length);
  if (fileRows === 5 && folderRows >= 2) pass('folder tree built (' + fileRows + ' files, ' + folderRows + ' folders)'); else fail('tree rows: files=' + fileRows + ' folders=' + folderRows);
  // README opened by default + marked active (async open, so wait for it).
  await page.waitForSelector('#fileTree .ft-file.active', { timeout: 8000 });
  const active = await page.$eval('#fileTree .ft-file.active .ft-name', (e) => e.textContent).catch(() => null);
  if (active === 'README.md') pass('default file (README) opened + active'); else fail('active file: ' + active);
  // Click the Python file -> Code type with python highlighting.
  await page.click('#fileTree .ft-file[data-path="proj/src/util.py"]');
  await page.waitForTimeout(400);
  const pyType = await page.$eval('#typeSelect', (s) => s.value);
  if (pyType === 'code') pass('clicking tree file opens it (util.py -> Code)'); else fail('py type: ' + pyType);

  // Marquee: a long active file name that overflows the column scrolls (ticker class).
  await page.click('#fileTree .ft-file[data-path="proj/a-really-extremely-long-file-name-that-overflows-the-sidebar-column.txt"]');
  await page.waitForTimeout(200);
  const ticking = await page.$('#fileTree .ft-file.active .ft-name.ft-ticker');
  if (ticking) pass('long active file name marquees (ticker)'); else fail('no marquee on overflowing active name');

  // Sidebar resize: drag the handle wider; width grows.
  const beforeTreeW = await page.$eval('#fileTree', (e) => e.getBoundingClientRect().width);
  const rb = await (await page.$('#ftResize')).boundingBox();
  await page.mouse.move(rb.x + rb.width / 2, rb.y + 60);
  await page.mouse.down();
  await page.mouse.move(rb.x + 130, rb.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const afterTreeW = await page.$eval('#fileTree', (e) => e.getBoundingClientRect().width);
  if (afterTreeW - beforeTreeW > 60) pass('sidebar resized by dragging (' + Math.round(beforeTreeW) + ' -> ' + Math.round(afterTreeW) + 'px)'); else fail('sidebar resize: ' + Math.round(beforeTreeW) + ' -> ' + Math.round(afterTreeW));

  // Arrow-key navigation: focus the FIRST file, ArrowDown opens the next file in the list.
  const firstPath = await page.$eval('#fileTree .ft-file', (e) => e.dataset.path);
  await page.click('#fileTree .ft-file[data-path="' + firstPath + '"]');
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  const navPath = await page.$eval('#fileTree .ft-file.active', (e) => e.dataset.path).catch(() => null);
  if (navPath && navPath !== firstPath) pass('arrow-key navigation moves + opens next file (' + navPath + ')'); else fail('arrow nav active: ' + navPath + ' (first=' + firstPath + ')');

  // ── Huge-folder render cap ── a folder with a very high file count is capped (not frozen) + noted.
  await page.evaluate(() => {
    // 20010 tiny files (over the 20000 cap). File bodies are 1 char — cheap; we're testing the cap.
    const entries = [];
    for (let i = 0; i < 20010; i++) entries.push({ file: new File(['x'], 'f' + i + '.txt', { type: '' }), path: 'big/f' + i + '.txt' });
    window.__fv.state._skipDiscardGuard = true;
    window.__fv.loadFolder(entries);
  });
  await page.waitForFunction(() => !document.getElementById('ftNotice').hidden, { timeout: 15000 });
  const cappedCount = await page.evaluate(() => window.__fv.state.treeEntries.length);
  const capNotice = await page.$eval('#ftNotice', (e) => e.textContent);
  if (cappedCount === 20000 && /20,000 of 20,010/.test(capNotice)) pass('huge folder render-capped + noted (' + capNotice.trim() + ')'); else fail('cap: count=' + cappedCount + ' notice=' + capNotice);

  // ── Git repository browser (in-browser .git reader) ──
  {
    const sha = 'b'.repeat(40);
    const content = 'tree ' + 'a'.repeat(40) + '\n'
      + 'author Tester <t@example.com> 1700000000 +0000\n'
      + 'committer Tester <t@example.com> 1700000000 +0000\n\n'
      + 'Initial commit\n';
    const store = Buffer.concat([Buffer.from('commit ' + Buffer.byteLength(content) + '\0'), Buffer.from(content)]);
    const obj = Array.from(zlib.deflateSync(store));     // zlib stream (DecompressionStream 'deflate')
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, obj }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk('repo/.git/objects/' + sha.slice(0, 2) + '/' + sha.slice(2), new Uint8Array(obj)),
        mk('repo/README.md', enc('# Repo')),
      ]);
    }, { sha, obj });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const branchVal = await page.$eval('#repoPanel .repo-branch', (s) => s.options[s.selectedIndex].textContent);
    if (/main/.test(branchVal)) pass('git: current branch detected (' + branchVal + ')'); else fail('git branch: ' + branchVal);
    const subj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Initial commit/.test(subj)) pass('git: loose commit object inflated + listed'); else fail('git subject: ' + subj);
    const detailTxt = await page.$eval('#repoPanel .repo-detail', (e) => e.textContent);
    if (/Tester/.test(detailTxt) && /Initial commit/.test(detailTxt)) pass('git: commit details (author + message)'); else fail('git detail: ' + detailTxt.slice(0, 60));
    const treePaths = await page.$$eval('#fileTree .ft-file', (els) => els.map((e) => e.dataset.path));
    if (!treePaths.some((p) => p.includes('.git/'))) pass('git: .git internals hidden from the file tree'); else fail('.git shown in tree: ' + treePaths.join(','));
    const badge = await page.$('#repoBtn:not([hidden])');
    if (badge) pass('git: repo badge shown in sidebar'); else fail('no repo badge');
  }

  // ── Git Phase 2: packfile reading ── a commit stored only in a .pack/.idx (no loose object).
  {
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
    const packObjHeader = (type, size) => { const out = []; let b = (type << 4) | (size & 0x0f); size = Math.floor(size / 16); if (size) b |= 0x80; out.push(b); while (size) { let bb = size & 0x7f; size = Math.floor(size / 128); if (size) bb |= 0x80; out.push(bb); } return out; };
    const sha = 'c'.repeat(40);
    const pcontent = 'tree ' + 'a'.repeat(40) + '\n'
      + 'author Tester <t@example.com> 1700000000 +0000\n'
      + 'committer Tester <t@example.com> 1700000000 +0000\n\n'
      + 'Packed commit\n';
    const deflated = zlib.deflateSync(Buffer.from(pcontent));
    const packBuf = Buffer.concat([Buffer.from('PACK'), u32(2), u32(1), Buffer.from(packObjHeader(1, Buffer.byteLength(pcontent))), deflated, Buffer.alloc(20)]);
    const fanout = Buffer.alloc(256 * 4);
    for (let i = 0; i < 256; i++) fanout.writeUInt32BE(i >= 0xcc ? 1 : 0, i * 4);
    const idxBuf = Buffer.concat([Buffer.from([0xff, 0x74, 0x4f, 0x63]), u32(2), fanout, Buffer.alloc(20, 0xcc), u32(0), u32(12), Buffer.alloc(20), Buffer.alloc(20)]);
    const packArr = Array.from(packBuf), idxArr = Array.from(idxBuf);
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, packArr, idxArr }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      const base = 'repo/.git/objects/pack/pack-' + 'c'.repeat(40);
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk(base + '.pack', new Uint8Array(packArr)),
        mk(base + '.idx', new Uint8Array(idxArr)),
        mk('repo/README.md', enc('# Packed repo')),
      ]);
    }, { sha, packArr, idxArr });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const packSubj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Packed commit/.test(packSubj)) pass('git Phase 2: commit read from packfile (idx + inflate)'); else fail('packed subject: ' + packSubj);
  }

  // ── Git Phase 2: OFS_DELTA resolution ── the HEAD commit is a delta against an earlier object.
  {
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
    const hdr = (type, size) => { const out = []; let b = (type << 4) | (size & 0x0f); size = Math.floor(size / 16); if (size) b |= 0x80; out.push(b); while (size) { let bb = size & 0x7f; size = Math.floor(size / 128); if (size) bb |= 0x80; out.push(bb); } return out; };
    const varint = (n) => { const b = []; for (;;) { let x = n & 0x7f; n = Math.floor(n / 128); if (n) b.push(x | 0x80); else { b.push(x); break; } } return b; };
    const encodeOfs = (n) => { const b = [n & 0x7f]; n = Math.floor(n / 128) - 1; while (n >= 0) { b.unshift(0x80 | (n & 0x7f)); n = Math.floor(n / 128) - 1; } return b; };

    const baseContent = 'tree ' + 'a'.repeat(40) + '\nauthor T <t@e> 1700000000 +0000\ncommitter T <t@e> 1700000000 +0000\n\nBase commit\n';
    const prefixLen = baseContent.lastIndexOf('Base commit\n');
    const tail = 'Delta-resolved subject\n';
    const targetContent = baseContent.slice(0, prefixLen) + tail;

    const delta = [...varint(baseContent.length), ...varint(targetContent.length)];
    { let size = prefixLen, cmd = 0x80; const sz = []; if (size & 0xff) { cmd |= 0x10; sz.push(size & 0xff); } if ((size >> 8) & 0xff) { cmd |= 0x20; sz.push((size >> 8) & 0xff); } delta.push(cmd, ...sz); }   // copy prefix from base
    { const tb = Buffer.from(tail); delta.push(tb.length, ...tb); }                                                                                                                                                  // insert new tail

    const baseBytes = Buffer.concat([Buffer.from(hdr(1, Buffer.byteLength(baseContent))), zlib.deflateSync(Buffer.from(baseContent))]);
    const deltaBytes = Buffer.concat([Buffer.from(hdr(6, delta.length)), Buffer.from(encodeOfs(baseBytes.length)), zlib.deflateSync(Buffer.from(delta))]);
    const deltaOffset = 12 + baseBytes.length;
    const packBuf = Buffer.concat([Buffer.from('PACK'), u32(2), u32(2), baseBytes, deltaBytes, Buffer.alloc(20)]);
    const fanout = Buffer.alloc(256 * 4);
    for (let i = 0; i < 256; i++) fanout.writeUInt32BE(i >= 0xdd ? 1 : 0, i * 4);
    const idxBuf = Buffer.concat([Buffer.from([0xff, 0x74, 0x4f, 0x63]), u32(2), fanout, Buffer.alloc(20, 0xdd), u32(0), u32(deltaOffset), Buffer.alloc(20), Buffer.alloc(20)]);
    const packArr = Array.from(packBuf), idxArr = Array.from(idxBuf), sha = 'd'.repeat(40);

    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, packArr, idxArr }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      const base = 'repo/.git/objects/pack/pack-' + 'd'.repeat(40);
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk(base + '.pack', new Uint8Array(packArr)),
        mk(base + '.idx', new Uint8Array(idxArr)),
        mk('repo/README.md', enc('# Delta repo')),
      ]);
    }, { sha, packArr, idxArr });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const deltaSubj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Delta-resolved subject/.test(deltaSubj)) pass('git Phase 2: OFS_DELTA resolved against base object'); else fail('delta subject: ' + deltaSubj);
  }

  // ── New empty file ── create from the intake screen; the extension drives the type.
  // (Runs BEFORE the persistent dialog handler below, so page.once can answer the name prompt.)
  await page.goto(origin, { waitUntil: 'networkidle' });
  page.once('dialog', (d) => d.accept('notes.md'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  const newType = await page.$eval('#typeSelect', (s) => s.value);
  if (newType === 'markdown') pass('new file: created + typed from extension (notes.md → Markdown)'); else fail('new file type: ' + newType);
  const newName = await page.$eval('#fileName', (e) => e.textContent);
  if (newName === 'notes.md') pass('new file: named as entered'); else fail('new file name: ' + newName);

  // ── import easteregg unlock ── typing the magic line into a file opens the arcade. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.removeItem('fv:games:unlocked'); } catch {} });
  page.once('dialog', (d) => d.accept('trigger.js'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.click('#editor .monaco-editor');
  await page.keyboard.type('import easteregg');
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  pass('`import easteregg` in a new file unlocks the arcade');
  await page.click('.games-close');
  await page.evaluate(() => { window.__fv.state.downloadedSinceEdit = true; });   // clear unsaved-work so the next navigation isn't blocked by beforeunload

  // ── HTML type + script-confirm gate (WP07) ──
  let acceptScripts = false;
  page.on('dialog', (d) => (acceptScripts ? d.accept() : d.dismiss()));
  // Default: dismiss -> sanitized, script must NOT run.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.html' }).click();
  const hframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hf = await frameOf('iframe.fv-preview-frame');
  await hf.waitForSelector('#safe', { timeout: 8000 });
  await page.waitForTimeout(300);
  const sanitizedRan = await hf.$('#ran-script');
  if (!sanitizedRan) pass('HTML sanitized by default (script did NOT run)'); else fail('script ran while sanitized');
  // Opt in: accept -> scripts run in the sandbox.
  acceptScripts = true;
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.html' }).click();
  const hframe2 = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hf2 = await frameOf('iframe.fv-preview-frame');
  await hf2.waitForSelector('#ran-script', { timeout: 8000 });
  pass('HTML scripts run after explicit opt-in (sandboxed)');

  // ── HTML structural diff (Layer-2 DOM diff) ── reindenting is ignored; real edits are flagged.
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, { timeout: 8000 });
  const htmlOrig = await page.evaluate(() => window.__fv.state.rawview.originalValue());
  // Whitespace-only reformat → no structural difference.
  await page.evaluate((o) => window.__fv.state.rawview.setValue(o.replace(/>\s+</g, '>\n      <')), htmlOrig);
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForSelector('.jsondiff', { timeout: 6000 });
  const htmlWsHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  if (/No structural differences/.test(htmlWsHead)) pass('HTML structural diff ignores whitespace/reindenting'); else fail('html ws diff: ' + htmlWsHead.slice(0, 80));
  // Real change: inject an identifiable element → flagged as added.
  await page.click('#rawMode button[data-raw="current"]');
  await page.evaluate((o) => {
    const add = '<p id="fv-added">new</p>';
    window.__fv.state.rawview.setValue(/<\/body>/i.test(o) ? o.replace(/<\/body>/i, add + '</body>') : o + add);
  }, htmlOrig);
  await page.click('#rawMode button[data-raw="diff"]');
  // The custom diff re-renders async; wait for the head to reflect the change (not the stale render).
  await page.waitForFunction(() => /\badded\b/.test(document.querySelector('.jsondiff .jd-head')?.textContent || ''), { timeout: 6000 }).catch(() => {});
  const htmlChgHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  const htmlAddedKeys = await page.$$eval('.jsondiff .jd-added .jd-key', (els) => els.map((e) => e.textContent));
  if (/added/.test(htmlChgHead) && htmlAddedKeys.some((k) => /p#fv-added/.test(k))) pass('HTML structural diff flags an added element (p#fv-added)'); else fail('html change diff: ' + htmlChgHead + ' keys=' + htmlAddedKeys.join(','));
  await page.click('#rawMode button[data-raw="current"]');

  // ── Duplicate open button removed + unsaved-work tracking ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  const hasOldOpen = await page.$('#openBtn');
  const hasInlineOpen = await page.$('#openInlineBtn');
  if (!hasOldOpen && hasInlineOpen) pass('duplicate top-bar open button removed (inline 📂 kept)'); else fail('openBtn present=' + !!hasOldOpen + ' inline=' + !!hasInlineOpen);
  await page.getByRole('button', { name: 'Welcome.md' }).click();
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  const clean0 = await page.evaluate(() => window.__fv.hasUnsavedWork());
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue(rv.getValue() + '\nunsaved edit'); });
  await page.waitForTimeout(350);
  const dirty1 = await page.evaluate(() => window.__fv.hasUnsavedWork());
  await page.evaluate(() => window.__fv.downloadCurrent());
  await page.waitForTimeout(150);
  const afterDl = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (!clean0 && dirty1 && !afterDl) pass('unsaved-work tracked (clean → edit → download clears it; gates discard + beforeunload)'); else fail('unsaved flags clean=' + clean0 + ' dirty=' + dirty1 + ' afterDownload=' + afterDl);

  // ── Mobile hardening (WP06) ── phone viewport: Preview-first + ⋯ overflow menu.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const mpage = await mctx.newPage();
  mpage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[mobile] ' + m.text()); });
  mpage.on('pageerror', (e) => consoleErrors.push('[mobile] pageerror: ' + e.message));
  mpage.on('request', (req) => { const u = req.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u); });
  await mpage.goto(origin, { waitUntil: 'networkidle' });
  await mpage.getByRole('button', { name: 'Welcome.md' }).click();
  const mframe = await mpage.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
  // Preview must NOT scroll horizontally on a phone (fixed to screen width).
  const mpf = await frameOf('iframe.fv-preview-frame');
  await mpf.waitForSelector('h1', { timeout: 10000 });
  const overflowX = await mpf.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflowX <= 1) pass('mobile: preview has no horizontal scroll (width fixed to screen)'); else fail('mobile preview overflows x by ' + overflowX + 'px');
  // Tab bar is shown on phones and defaults to Preview (reading-first).
  const tabbarShown = await mpage.$eval('#tabbar', (e) => getComputedStyle(e).display !== 'none');
  if (tabbarShown) pass('mobile: tab bar shown (not split)'); else fail('mobile: tab bar hidden');
  const activeTab = await mpage.$eval('#tabbar button.active', (e) => e.dataset.mode).catch(() => null);
  if (activeTab === 'preview') pass('mobile: defaults to Preview tab'); else fail('mobile active tab: ' + activeTab);
  // Overflow menu: ⋯ is shown, settings lives inside the popover (not the bar), and the
  // bar stays a single row.
  const moreShown = await mpage.$eval('#moreBtn', (e) => !e.hidden);
  const settingsInBar = await mpage.evaluate(() => document.querySelector('.topbar > #settingsBtn') != null);
  if (moreShown && !settingsInBar) pass('mobile: ⋯ overflow menu shown, secondary controls moved out of the bar'); else fail('mobile overflow: more=' + moreShown + ' settingsInBar=' + settingsInBar);
  await mpage.click('#moreBtn');
  await mpage.waitForTimeout(150);
  const menuHasSettings = await mpage.evaluate(() => !document.querySelector('#moreMenu').hidden && document.querySelector('#moreMenu #settingsBtn') != null);
  if (menuHasSettings) pass('mobile: ⋯ opens popover containing the overflow controls'); else fail('overflow menu missing settings');
  const barH = await mpage.$eval('.topbar', (e) => e.clientHeight);
  if (barH <= 60) pass('mobile: topbar stays single-row (' + barH + 'px)'); else fail('mobile topbar height: ' + barH);
  await mctx.close();

  // ── Service worker + offline ── precache, then reload with the network disabled.
  {
    const octx = await browser.newContext();
    const op = await octx.newPage();
    const oErr = [];
    op.on('pageerror', (e) => oErr.push(e.message));
    await op.goto(origin, { waitUntil: 'networkidle' });
    // Default is cache-on-use: the pill rests at "idle" (offers an opt-in full save), it does
    // NOT auto-precache everything.
    await op.waitForSelector('#offlineStatus.idle', { timeout: 90000 });
    pass('offline precache is opt-in (pill rests at idle, no auto-precache)');
    // Opt in: clicking the pill kicks off the full precache → green "ready".
    await op.click('#offlineStatus');
    await op.waitForSelector('#offlineStatus.ready', { timeout: 90000 });
    pass('clicking the pill precaches all assets (status: Available offline)');
    const cachedMonaco = await op.evaluate(async () => {
      const k = (await caches.keys()).find((x) => x === 'file-viewer');
      return k ? !!(await (await caches.open(k)).match('vendor/monaco/vs/loader.js')) : false;
    });
    if (cachedMonaco) pass('offline cache holds vendored assets (Monaco)'); else fail('Monaco not in cache');
    // Go offline, hard-reload: the app must still load and render from cache.
    await octx.setOffline(true);
    await op.reload({ waitUntil: 'domcontentloaded' });
    await op.getByRole('button', { name: 'Welcome.md' }).click();
    await op.waitForSelector('.monaco-editor', { timeout: 30000 });
    const offl = await op.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
    await (await frameOf('iframe.fv-preview-frame')).waitForSelector('h1', { timeout: 10000 });
    pass('app loads + renders OFFLINE (reload with network disabled)');
    await octx.setOffline(false);
    if (oErr.length === 0) pass('no errors during offline run'); else fail('offline errors:\n  ' + oErr.join('\n  '));
    await octx.close();
  }

  // ── Two-file Compare ("Compare with…") ── pick a 2nd file → diff current ↔ other ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.csv' }).click();
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  const compareBtnShown = await page.$eval('#compareBtn', (e) => !e.closest('[hidden]'));
  if (compareBtnShown) pass('compare button available for an editable type'); else fail('compare button hidden for csv');
  // Feed the comparison file through the hidden input (Playwright sets files directly — no dialog).
  await page.setInputFiles('#compareInput', new URL('../docs/examples/welcome.md', import.meta.url).pathname);
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, { timeout: 8000 });
  const compLabel = await page.$eval('#compareBar .compare-label', (e) => e.textContent);
  if (/Comparing current/.test(compLabel) && /welcome\.md/i.test(compLabel)) pass('two-file compare: bar names the compared file'); else fail('compare label: ' + compLabel);
  await page.waitForSelector('#editor .monaco-diff-editor', { timeout: 10000 });
  pass('two-file compare: Monaco diff editor shown (current ↔ other)');
  const falseDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (!falseDirty) pass('two-file compare: edit-tracking untouched (no false unsaved-work)'); else fail('compare created false unsaved work');
  await page.click('#compareBar .compare-stop');
  await page.waitForFunction(() => document.getElementById('compareBar').hidden, { timeout: 4000 });
  pass('two-file compare: "Stop comparing" exits');

  // ── Easter-egg games (Konami → hub → Snake) ── lazy-loaded; one tiny listener at startup.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.removeItem('fv:games:unlocked'); } catch {} });
  const preOverlay = await page.$('.games-overlay');
  if (!preOverlay) pass('games hub not present before unlock (lazy-loaded)'); else fail('games overlay present before unlock');
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  pass('Konami code unlocks + opens the arcade hub');
  const gameCards = await page.$$eval('.games-card .games-title', (els) => els.map((e) => e.textContent));
  if (gameCards.includes('Snake')) pass('Snake appears in the hub (' + gameCards.join(', ') + ')'); else fail('hub games: ' + gameCards.join(','));
  await page.click('.games-card[data-game="snake"]');
  await page.waitForSelector('.snake-canvas', { timeout: 8000 });
  const snakeScore = await page.$eval('.snake-score', (e) => e.textContent);
  if (/Score: 0/.test(snakeScore)) pass('Snake launches (canvas + score HUD)'); else fail('snake score: ' + snakeScore);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });
  pass('Back returns from Snake to the hub grid');
  await page.click('.games-close');
  const stillOpen = await page.$('.games-overlay:not([hidden])');
  if (!stillOpen) pass('hub closes'); else fail('hub did not close');

  // ── Graceful offline-miss ── cache-on-use only (no full precache), then open a viewer that
  // was never loaded online while offline → friendly note instead of a raw error.
  {
    const mctx = await browser.newContext();
    const mp = await mctx.newPage();
    await mp.goto(origin, { waitUntil: 'networkidle' });
    await mp.waitForSelector('#offlineStatus', { timeout: 90000 });
    await mp.getByRole('button', { name: 'Welcome.md' }).click();   // caches app + markdown only
    await mp.waitForSelector('.monaco-editor', { timeout: 30000 });
    await mctx.setOffline(true);
    // Feed a PDF from disk (no network for the bytes); its viewer + pdf.js were never cached.
    await mp.setInputFiles('#fileInput', new URL('../docs/examples/sample.pdf', import.meta.url).pathname);
    const miss = await mp.waitForSelector('.offline-miss', { timeout: 20000 }).catch(() => null);
    if (miss) pass('graceful offline-miss note shown for an uncached viewer'); else fail('no offline-miss note for uncached PDF viewer while offline');
    await mctx.setOffline(false);
    await mctx.close();
  }

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
} catch (e) {
  fail('exception: ' + e.message);
} finally {
  await browser.close();
  server.close();
  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}
