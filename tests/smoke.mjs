// Standalone smoke test: serves docs/ and drives headless Chromium.
// Uses the Playwright install from the sibling make-it-look-good repo.
// Verifies: page loads clean, markdown renders in the sandboxed iframe, the magic
// selector wires preview->raw, and ZERO off-origin requests are made (trust guarantee).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
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
  '.wav': 'audio/wav', '.ipynb': 'application/json', '.svg': 'image/svg+xml', '.eml': 'message/rfc822' };

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

  // ── PDF module (WP17) ── fresh load so the examples gallery is reachable.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.pdf' }).click();
  const pframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const pf = await pframe.contentFrame();
  await pf.waitForSelector('img.pdf-page', { timeout: 15000 });
  pass('PDF rendered to image pages');
  const hasEditor = await page.$('#editor .monaco-editor');
  if (!hasEditor) pass('PDF is preview-only (no raw editor)'); else fail('raw editor present for PDF');
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

  // ── Email (.eml) ── parsed MIME: header card + sanitized HTML body, encoded subject decoded.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.eml' }).click();
  const eframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ef = await eframe.contentFrame();
  await ef.waitForSelector('.eml-head', { timeout: 8000 });
  const emlType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (emlType2 === 'eml') pass('.eml detected as Email'); else fail('eml type: ' + emlType2);
  const emlHead = await ef.$eval('.eml-head', (e) => e.textContent);
  if (/Hello from File Viewer/.test(emlHead) && /alice@example\.com/.test(emlHead)) pass('email header card (encoded subject decoded + From)'); else fail('eml head: ' + emlHead.slice(0, 80));
  const emlBody = await ef.$eval('.eml-html', (e) => e.innerHTML);
  if (/<b>File Viewer<\/b>/.test(emlBody) && !/<script/i.test(emlBody)) pass('email HTML body rendered + sanitized (script stripped)'); else fail('eml body: ' + emlBody.slice(0, 80));

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

  // ── Audio/Video (media) ── native player rendered in the pane via a blob: URL.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sample.wav' }).click();
  await page.waitForSelector('#previewHost audio.media-view', { timeout: 12000 });
  const mediaType = await page.$eval('#typeSelect', (s) => s.value);
  if (mediaType === 'media') pass('.wav detected as Audio / Video'); else fail('media type: ' + mediaType);
  const audioSrc = await page.$eval('#previewHost audio.media-view', (e) => e.getAttribute('src') || '');
  if (audioSrc.startsWith('blob:')) pass('audio served from in-page blob URL (streamed, no size ceiling)'); else fail('audio src: ' + audioSrc.slice(0, 30));
  // No iframe for media — it renders directly in the pane (outside the sandbox).
  const mediaIframe = await page.$('#previewHost iframe.fv-preview-frame');
  if (!mediaIframe) pass('media renders outside the sandboxed iframe'); else fail('media used an iframe');
  const mediaHasEditor = await page.$('#editor .monaco-editor');
  if (!mediaHasEditor) pass('media is preview-only (no raw editor)'); else fail('raw editor present for media');

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
  await mpage.waitForSelector('iframe.fv-preview-frame', { timeout: 20000 });
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
    await op.waitForSelector('#offlineStatus.ready', { timeout: 90000 });
    pass('service worker precached all assets (status: Available offline)');
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
    await (await offl.contentFrame()).waitForSelector('h1', { timeout: 10000 });
    pass('app loads + renders OFFLINE (reload with network disabled)');
    await octx.setOffline(false);
    if (oErr.length === 0) pass('no errors during offline run'); else fail('offline errors:\n  ' + oErr.join('\n  '));
    await octx.close();
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
