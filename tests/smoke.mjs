// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

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
  '.wav': 'audio/wav', '.ipynb': 'application/json' };

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

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const origin = `http://localhost:${port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();

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

  // Load the Welcome.md example.
  await page.getByRole('button', { name: 'Welcome.md' }).click();

  // Monaco raw view appears.
  await page.waitForSelector('.monaco-editor', { timeout: 20000 });
  pass('Monaco raw editor mounted');

  // Preview iframe renders the markdown (h1 "Welcome to File Viewer").
  const frame = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
  const f = await frame.contentFrame();
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

  // Sandbox attribute is allow-scripts only (no allow-same-origin).
  const sandbox = await frame.getAttribute('sandbox');
  if (sandbox === 'allow-scripts') pass('iframe sandbox = allow-scripts only'); else fail('sandbox: ' + sandbox);

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
  const f2 = await frame2.contentFrame();
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

  // ── PDF module (WP17) ── fresh load so the examples gallery is reachable.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.pdf' }).click();
  const pframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const pf = await pframe.contentFrame();
  await pf.waitForSelector('img.pdf-page', { timeout: 15000 });
  pass('PDF rendered to image pages');
  const hasEditor = await page.$('#editor .monaco-editor');
  if (!hasEditor) pass('PDF is preview-only (no raw editor)'); else fail('raw editor present for PDF');
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
  const cf = await cframe.contentFrame();
  await cf.waitForSelector('table', { timeout: 10000 });
  const headers = await cf.$$eval('thead th', (els) => els.map((e) => e.textContent));
  if (headers.join(',') === 'name,role,city,commits') pass('CSV rendered as table with header row'); else fail('CSV headers: ' + headers.join(','));
  const rowCount = await cf.$$eval('tbody tr', (els) => els.length);
  if (rowCount === 5) pass('CSV body rows (' + rowCount + ')'); else fail('CSV rows: ' + rowCount);
  // CSV is editable text -> raw editor + diff available.
  const csvHasEditor = await page.$('#editor .monaco-editor');
  if (csvHasEditor) pass('CSV has raw editor (editable text)'); else fail('CSV missing raw editor');

  // ── Excel module (WP19) ── multi-sheet workbook via SheetJS on the tabular renderer.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.xlsx' }).click();
  const xframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const xf = await xframe.contentFrame();
  await xf.waitForSelector('.sheet table', { timeout: 12000 });
  const sheetTitles = await xf.$$eval('.sheet-title', (els) => els.map((e) => e.textContent));
  if (sheetTitles.join(',') === 'People,Totals') pass('Excel: both sheets rendered'); else fail('sheet titles: ' + sheetTitles.join(','));
  const xTables = await xf.$$eval('.sheet table', (els) => els.length);
  if (xTables === 2) pass('Excel: one table per sheet'); else fail('Excel tables: ' + xTables);

  // ── Word module (WP19) ── mammoth -> sanitized HTML in the iframe.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.docx' }).click();
  const dframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const df = await dframe.contentFrame();
  await df.waitForSelector('.docx-body h1', { timeout: 12000 });
  const dh1 = await df.$eval('.docx-body h1', (e) => e.textContent);
  if (/Hello, File Viewer/.test(dh1)) pass('Word: docx converted to HTML (h1)'); else fail('docx h1: ' + dh1);
  const strong = await df.$$eval('.docx-body strong, .docx-body b', (els) => els.length);
  if (strong > 0) pass('Word: formatting preserved (bold)'); else fail('no bold run in docx');

  // ── PowerPoint module (WP19) ── pptxviewjs renders slides to images in the iframe.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.pptx' }).click();
  const ppframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 25000 });
  const ppf = await ppframe.contentFrame();
  await ppf.waitForSelector('img.pptx-slide', { timeout: 25000 });
  const slideDims = await ppf.$$eval('img.pptx-slide', (els) => els.map((e) => e.naturalWidth));
  if (slideDims.length === 2 && slideDims.every((w) => w > 100)) pass('PPTX: ' + slideDims.length + ' slides rendered to images'); else fail('pptx slides: ' + JSON.stringify(slideDims));

  // ── JSON / Code / Image simple types (WP19) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.json' }).click();
  const jframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const jf = await jframe.contentFrame();
  await jf.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  const jkeys = await jf.$$eval('.json-tree .j-key', (els) => els.length);
  if (jkeys > 0) pass('JSON rendered as collapsible tree (' + jkeys + ' keys)'); else fail('no json keys');

  // ── Jupyter Notebook (.ipynb) ── markdown + code cells + saved outputs, sanitized.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.ipynb' }).click();
  const nframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const nf = await nframe.contentFrame();
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

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'example.svg' }).click();
  const sframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const sf = await sframe.contentFrame();
  await sf.waitForSelector('.img-doc svg', { timeout: 8000 });
  pass('SVG sanitized and rendered inline');

  // ── Audio/Video (media) ── native player fed a data: URL in the sandbox.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.wav' }).click();
  const aframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const af = await aframe.contentFrame();
  await af.waitForSelector('audio.media-view', { timeout: 8000 });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await af.$eval('audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('data:audio/wav;base64,')) pass('audio served as in-page data URL (no fetch)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  const mediaHasEditor = await page.$('#editor .monaco-editor');
  if (!mediaHasEditor) pass('media is preview-only (no raw editor)'); else fail('raw editor present for media');

  // ── Folder tree sidebar ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const mk = (name, body) => ({ file: new File([body], name.split('/').pop(), { type: '' }), path: name });
    const entries = [
      mk('proj/README.md', '# Project\n\nHello from the tree.'),
      mk('proj/src/app.js', 'console.log(1)'),
      mk('proj/src/util.py', 'print(2)'),
      mk('proj/data/rows.csv', 'a,b\n1,2'),
    ];
    window.__fv.loadFolder(entries);
  });
  await page.waitForSelector('#fileTree:not([hidden]) .ft-file', { timeout: 8000 });
  const fileRows = await page.$$eval('#fileTree .ft-file', (els) => els.length);
  const folderRows = await page.$$eval('#fileTree .ft-folder', (els) => els.length);
  if (fileRows === 4 && folderRows >= 2) pass('folder tree built (' + fileRows + ' files, ' + folderRows + ' folders)'); else fail('tree rows: files=' + fileRows + ' folders=' + folderRows);
  // README opened by default + marked active (async open, so wait for it).
  await page.waitForSelector('#fileTree .ft-file.active', { timeout: 8000 });
  const active = await page.$eval('#fileTree .ft-file.active .ft-name', (e) => e.textContent).catch(() => null);
  if (active === 'README.md') pass('default file (README) opened + active'); else fail('active file: ' + active);
  // Click the Python file -> Code type with python highlighting.
  await page.click('#fileTree .ft-file[data-path="proj/src/util.py"]');
  await page.waitForTimeout(400);
  const pyType = await page.$eval('#typeSelect', (s) => s.value);
  if (pyType === 'code') pass('clicking tree file opens it (util.py -> Code)'); else fail('py type: ' + pyType);

  // ── HTML type + script-confirm gate (WP07) ──
  let acceptScripts = false;
  page.on('dialog', (d) => (acceptScripts ? d.accept() : d.dismiss()));
  // Default: dismiss -> sanitized, script must NOT run.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.html' }).click();
  const hframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hf = await hframe.contentFrame();
  await hf.waitForSelector('#safe', { timeout: 8000 });
  await page.waitForTimeout(300);
  const sanitizedRan = await hf.$('#ran-script');
  if (!sanitizedRan) pass('HTML sanitized by default (script did NOT run)'); else fail('script ran while sanitized');
  // Opt in: accept -> scripts run in the sandbox.
  acceptScripts = true;
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.html' }).click();
  const hframe2 = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hf2 = await hframe2.contentFrame();
  await hf2.waitForSelector('#ran-script', { timeout: 8000 });
  pass('HTML scripts run after explicit opt-in (sandboxed)');

  // ── Mobile hardening (WP06) ── phone viewport: Preview-first + scrollable topbar.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const mpage = await mctx.newPage();
  mpage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[mobile] ' + m.text()); });
  mpage.on('pageerror', (e) => consoleErrors.push('[mobile] pageerror: ' + e.message));
  mpage.on('request', (req) => { const u = req.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u); });
  await mpage.goto(origin, { waitUntil: 'networkidle' });
  await mpage.getByRole('button', { name: 'Welcome.md' }).click();
  await mpage.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
  // Tab bar is shown on phones and defaults to Preview (reading-first).
  const tabbarShown = await mpage.$eval('#tabbar', (e) => getComputedStyle(e).display !== 'none');
  if (tabbarShown) pass('mobile: tab bar shown (not split)'); else fail('mobile: tab bar hidden');
  const activeTab = await mpage.$eval('#tabbar button.active', (e) => e.dataset.mode).catch(() => null);
  if (activeTab === 'preview') pass('mobile: defaults to Preview tab'); else fail('mobile active tab: ' + activeTab);
  // Topbar overflows but is horizontally scrollable (contained, not clipped/wrapped).
  const tb = await mpage.$eval('.topbar', (e) => ({ ox: getComputedStyle(e).overflowX, scroll: e.scrollWidth, client: e.clientWidth, h: e.clientHeight }));
  if (tb.ox === 'auto' && tb.scroll > tb.client) pass('mobile: topbar scrollable, all controls reachable (' + tb.scroll + '>' + tb.client + 'px)');
  else fail('mobile topbar: ' + JSON.stringify(tb));
  if (tb.h <= 60) pass('mobile: topbar stays single-row (' + tb.h + 'px)'); else fail('mobile topbar height: ' + tb.h);
  await mctx.close();

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
} catch (e) {
  fail('exception: ' + e.message);
} finally {
  await browser.close();
  server.close();
  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}
