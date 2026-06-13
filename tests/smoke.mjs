// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/jens/repos/make-it-look-good/');
const { chromium } = require('playwright');

const ROOT = new URL('../docs/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain' };

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

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
} catch (e) {
  fail('exception: ' + e.message);
} finally {
  await browser.close();
  server.close();
  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}
