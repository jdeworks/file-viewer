import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, ROOT } = ctx;

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
  // Bundles: every asset belongs to exactly one bundle, each bundle has a size, and the big libs
  // are flagged heavy (so the cache-download modal can leave them unchecked by default).
  const bundles = manifest.bundles || [];
  const bundleFiles = bundles.flatMap((b) => b.files);
  const allCovered = bundleFiles.length === manifest.assets.length && new Set(bundleFiles).size === manifest.assets.length;
  const sized = bundles.every((b) => typeof b.size === 'number' && b.size >= 0);
  const monaco = bundles.find((b) => b.id === 'vendor:monaco');
  const core = bundles.find((b) => b.id === 'core');
  if (allCovered && sized && monaco && monaco.heavy && core && !core.heavy) pass('asset-manifest grouped into ' + bundles.length + ' sized bundles (Monaco flagged heavy)');
  else fail('manifest bundles: covered=' + allCovered + ' sized=' + sized + ' monacoHeavy=' + (monaco && monaco.heavy) + ' coreLight=' + (core && !core.heavy));
}

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
  // Generic "Download as HTML" — a standalone, sanitized HTML file of the rendered preview.
  if (exportItems.some((t) => /Download as HTML/.test(t))) pass('export menu offers Download as HTML'); else fail('no Download as HTML in: ' + exportItems.join(','));
  const [htmlDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as HTML")'),
  ]);
  if (/\.html$/.test(htmlDownload.suggestedFilename())) pass('preview exported as standalone HTML (' + htmlDownload.suggestedFilename() + ')'); else fail('html export name: ' + htmlDownload.suggestedFilename());
  // "Download as Word (.docx)" — a real OOXML zip built with JSZip (no heavy writer lib).
  await page.click('#exportBtn');
  await page.waitForSelector('#exportMenu:not([hidden]) .export-item', { timeout: 5000 });
  const [docxDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('#exportMenu .export-item:has-text("Download as Word")'),
  ]);
  const docxPath = await docxDownload.path();
  const docxBytes = await readFile(docxPath);
  const isZip = docxBytes[0] === 0x50 && docxBytes[1] === 0x4b;               // PK
  const hasDoc = docxBytes.includes(Buffer.from('word/document.xml'));
  if (/\.docx$/.test(docxDownload.suggestedFilename()) && isZip && hasDoc) pass('preview exported as a valid .docx (OOXML zip)'); else fail('docx: name=' + docxDownload.suggestedFilename() + ' zip=' + isZip + ' hasDoc=' + hasDoc);
  // DOCX with an embedded data-URL <img> → real inline picture (word/media/* + image rels + drawing).
  const docxImg = await page.evaluate(async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const { buildDocx } = await import('/core/docx-export.js');
    const blob = await buildDocx('<h1>Title</h1><p>Body text</p><p><img src="' + png + '"></p>');
    const buf = await blob.arrayBuffer();
    const zip = await new window.JSZip().loadAsync(buf);
    const files = Object.keys(zip.files);
    const doc = await zip.file('word/document.xml').async('string');
    const rels = zip.file('word/_rels/document.xml.rels') ? await zip.file('word/_rels/document.xml.rels').async('string') : '';
    const ct = await zip.file('[Content_Types].xml').async('string');
    return {
      hasMedia: files.some((f) => /^word\/media\/image1\.png$/.test(f)),
      hasDrawing: /<w:drawing>/.test(doc) && /r:embed="rIdImg1"/.test(doc),
      hasRel: /relationships\/image/.test(rels) && /media\/image1\.png/.test(rels),
      hasPngType: /Extension="png"/.test(ct),
    };
  });
  if (docxImg.hasMedia && docxImg.hasDrawing && docxImg.hasRel && docxImg.hasPngType)
    pass('DOCX embeds data-URL image as an inline picture (media + rel + drawing)');
  else fail('docx image embed: ' + JSON.stringify(docxImg));

  // Template helper (core/template.js): {{key}} HTML-escapes, {{&key}} stays raw, and templates
  // load same-origin (the renderer .html-file refactor depends on this).
  const tpl = await page.evaluate(async () => {
    const { fill, loadTemplate } = await import('/core/template.js');
    const out = fill('<i>{{a}}</i>{{&b}}{{missing}}', { a: '<x>&"', b: '<b>raw</b>' });
    const vcardRow = await loadTemplate(new URL('/types/vcard/row.html', location.origin));
    return { out, hasRowTpl: /vcf-row/.test(vcardRow) };
  });
  if (tpl.out === '<i>&lt;x&gt;&amp;&quot;</i><b>raw</b>' && tpl.hasRowTpl)
    pass('template helper: {{}} escapes, {{&}} raw, .html partials load same-origin');
  else fail('template helper: ' + JSON.stringify(tpl));

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

  // Advanced settings group exists and the "Reduce motion" toggle flips the root class.
  if (groups.includes('Advanced')) pass('settings expose an Advanced group'); else fail('no Advanced group: ' + groups.join(', '));
  await page.evaluate(() => { const d = [...document.querySelectorAll('#settingsBody .set-group > summary')].find((s) => s.textContent === 'Advanced'); if (d) d.parentElement.open = true; });
  await page.waitForSelector('#set-reduceMotion', { timeout: 3000 });
  await page.click('label[for="set-reduceMotion"]');
  await page.waitForTimeout(120);
  const rmOn = await page.evaluate(() => document.documentElement.classList.contains('reduce-motion') && document.getElementById('set-reduceMotion').checked);
  if (rmOn) pass('reduce-motion toggle sets the root class'); else fail('reduce-motion did not apply');
  await page.click('label[for="set-reduceMotion"]');   // restore
  await page.waitForTimeout(80);
  const rmOff = await page.evaluate(() => !document.documentElement.classList.contains('reduce-motion'));
  if (rmOff) pass('reduce-motion toggle clears the root class'); else fail('reduce-motion did not clear');

  await page.click('#settingsDrawer [data-close]');

}
