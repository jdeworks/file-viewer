export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── Calendar (.ics) ── parse iCalendar, render events chronologically.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.ics');
  const icframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const icf = await frameOf('iframe.fv-preview-frame');
  await icf.waitForSelector('.ics-event', { timeout: 8000 });
  const icsType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (icsType2 === 'ics') pass('.ics detected as Calendar'); else fail('ics type: ' + icsType2);
  const evTitles = await icf.$$eval('.ics-event .ics-title', (els) => els.map((e) => e.textContent));
  if (evTitles.length === 3 && evTitles[0] === 'Project kickoff') pass('calendar events parsed + sorted (' + evTitles.length + ')'); else fail('ics events: ' + evTitles.join(','));
  const rrule = await icf.$eval('.ics-rrule', (e) => e.textContent).catch(() => '');
  if (/weekly/i.test(rrule)) pass('recurrence rule shown (' + rrule.trim() + ')'); else fail('ics rrule: ' + rrule);
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const icsMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/All-day events\s*1/.test(icsMeta) && /Recurring events\s*1/.test(icsMeta)) pass('calendar metadata includes all-day and recurring counts'); else fail('ics meta: ' + icsMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── Archive (.zip) ── list entries from the central directory (no extraction).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.zip');
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
  await page.waitForSelector('#fileTree:not([hidden]) #ftBody .ft-file', { timeout: 8000 });
  const zipTreeRoot = await page.$eval('#ftRoot', (e) => e.textContent);
  const zipTreeNames = await page.$$eval('#ftBody .ft-file .ft-name', (els) => els.map((e) => e.textContent));
  if (/sample\.zip/i.test(zipTreeRoot) && zipTreeNames.includes('rows.csv')) pass('archive mounted as sidebar tree'); else fail('zip tree root=' + zipTreeRoot + ' names=' + zipTreeNames.join(','));
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
  const zipTreeStillOpen = await page.$eval('#fileTree', (e) => !e.hidden);
  const zipTreeActive = await page.$eval('#ftBody .ft-row.active', (e) => e.getAttribute('data-path')).catch(() => '');
  if (zipTreeStillOpen && zipTreeActive === 'data/rows.csv') pass('archive sidebar remains active after opening entry'); else fail('archive sidebar active=' + zipTreeActive + ' open=' + zipTreeStillOpen);
  const innerFrameEl = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const innerFrame = await frameOf('iframe.fv-preview-frame');
  await innerFrame.waitForSelector('table', { timeout: 10000 });
  const innerHasTable = await innerFrame.$$eval('table tbody tr', (els) => els.length);
  if (innerHasTable > 0) pass('zip entry rendered through its real renderer (CSV table, ' + innerHasTable + ' rows)'); else fail('inner CSV rows: ' + innerHasTable);
  const ctxOpened = await page.evaluate(async () => {
    const { folderContext } = await import('./core/folder.js');
    const ctx = folderContext();
    const readme = ctx.files.find((entry) => entry.path === 'README.txt');
    if (!readme) return false;
    await ctx.open(readme.file);
    return document.getElementById('fileName')?.textContent === 'README.txt'
      && window.__fv.state.currentFolderPath === 'README.txt';
  });
  if (ctxOpened) pass('archive folderContext opens sibling entries through archive tree'); else fail('archive folderContext sibling open failed');

  // ── Password-protected zip ── JSZip refuses it; we still list via our own central-dir parse + 🔒. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Locked.zip');
  const lzframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const lzf = await frameOf('iframe.fv-preview-frame');
  await lzf.waitForSelector('.zip-table tbody tr', { timeout: 12000 });
  const lzNames = await lzf.$$eval('.zip-table .z-name', (els) => els.map((e) => e.textContent));
  if (lzNames.some((n) => /secret\.txt/.test(n)) && lzNames.some((n) => /readme\.txt/.test(n))) pass('encrypted zip still lists entries (fallback parser)'); else fail('locked zip names: ' + lzNames.join(','));
  const lockBadge = await lzf.$$eval('.zip-table .z-lock', (els) => els.length);
  const lockBanner = await lzf.$eval('.zip-locked', (e) => e.textContent).catch(() => '');
  if (lockBadge === 1 && /password-protected/.test(lockBanner)) pass('password-protected entry flagged (lock badge + banner)'); else fail('lock badge=' + lockBadge + ' banner=' + lockBanner.slice(0, 50));

  // ── Archive repack ── edit a zip entry in memory, download the modified archive ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.zip');
  await page.waitForSelector('#fileTree:not([hidden]) #ftBody .ft-file', { timeout: 8000 });
  const repackExportShown = await page.$eval('#ftExportBtn', (e) => !e.hidden);
  if (repackExportShown) pass('archive export button shown when zip loaded'); else fail('archive export button hidden');
  await page.evaluate(() => { window.__fv.state.folderEdits.set('README.txt', 'Edited by smoke test'); });
  const [repackDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 12000 }),
    page.click('#ftExportBtn'),
  ]);
  if (/^edited-/.test(repackDl.suggestedFilename())) pass('archive repacked and downloaded (' + repackDl.suggestedFilename() + ')'); else fail('repack filename: ' + repackDl.suggestedFilename());

  // ── 7z archive ── with enableArchiveWasm off, shows the opt-in hint panel.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.7z');
  const szframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const szf = await frameOf('iframe.fv-preview-frame');
  await szf.waitForSelector('.zip-doc', { timeout: 12000 });
  const szType = await page.$eval('#typeSelect', (s) => s.value);
  if (szType === 'archive') pass('.7z detected as Archive type'); else fail('7z type: ' + szType);
  const szHint = await szf.$('.archive-hint');
  if (szHint) pass('7z shows opt-in hint when enableArchiveWasm is off'); else fail('no hint for 7z without WASM enabled');

  // ── Comic book (.cbz) ── zip of images → page reader (parent pane, blob image URLs, natural sort).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.cbz');
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
  await openExample('Sample.eml');
  const eframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const ef = await frameOf('iframe.fv-preview-frame');
  await ef.waitForSelector('.eml-head', { timeout: 8000 });
  const emlType2 = await page.$eval('#typeSelect', (s) => s.value);
  if (emlType2 === 'eml') pass('.eml detected as Email'); else fail('eml type: ' + emlType2);
  const emlHead = await ef.$eval('.eml-head', (e) => e.textContent);
  if (/Hello from File Viewer/.test(emlHead) && /alice@example\.com/.test(emlHead)) pass('email header card (encoded subject decoded + From)'); else fail('eml head: ' + emlHead.slice(0, 80));
  const emlBody = await ef.$eval('.eml-html', (e) => e.innerHTML);
  if (/<b>File Viewer<\/b>/.test(emlBody) && !/<script/i.test(emlBody)) pass('email HTML body rendered + sanitized (script stripped)'); else fail('eml body: ' + emlBody.slice(0, 80));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const emlMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Body\s*HTML/.test(emlMeta) && /Attachments\s*0/.test(emlMeta)) pass('email metadata includes body kind and attachments'); else fail('eml meta: ' + emlMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── Outlook .msg ── CFB-backed email preview; regression for Uint8Array/TextDecoder handling.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.msg');
  await page.waitForSelector('#previewHost .msg-badge', { timeout: 15000 });
  const msgType = await page.$eval('#typeSelect', (s) => s.value);
  if (msgType === 'msg') pass('.msg detected as Outlook Email'); else fail('msg type: ' + msgType);
  const msgText = await page.$eval('#previewHost', (e) => e.textContent || '');
  const msgCrashed = /Preview failed|TextDecoder|parameter 1 is not of type|TypeError|ReferenceError/i.test(msgText);
  if (/Outlook Email/.test(msgText) && !msgCrashed) pass('MSG preview opens without TextDecoder crash'); else fail('msg preview: ' + msgText.replace(/\s+/g, ' ').slice(0, 180));

  // ── Mailbox (.mbox) ── split into messages, inbox list (reuses the eml MIME parser). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.mbox');
  const mbframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const mbf = await frameOf('iframe.fv-preview-frame');
  await mbf.waitForSelector('.mbox-msg', { timeout: 8000 });
  const mboxTypeId = await page.$eval('#typeSelect', (s) => s.value);
  if (mboxTypeId === 'mbox') pass('.mbox detected as Mailbox'); else fail('mbox type: ' + mboxTypeId);
  const mboxCount = await mbf.$$eval('.mbox-msg', (els) => els.length);
  const mboxFroms = await mbf.$$eval('.mbox-from', (els) => els.map((e) => e.textContent).join(' '));
  if (mboxCount === 3 && /Alice/.test(mboxFroms) && /Carol/.test(mboxFroms)) pass('mbox split into 3 messages with senders'); else fail('mbox count=' + mboxCount + ' froms=' + mboxFroms);
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const mboxMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Senders\s*3/.test(mboxMeta) && /HTML messages\s*\d+/.test(mboxMeta)) pass('mbox metadata includes sender and HTML counts'); else fail('mbox meta: ' + mboxMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── Jupyter Notebook (.ipynb) ── markdown + code cells + saved outputs, sanitized.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.ipynb');
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
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const nbMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Saved outputs\s*\d+/.test(nbMeta) && /Executed code cells\s*\d+/.test(nbMeta)) pass('notebook metadata includes execution and output counts'); else fail('notebook meta: ' + nbMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.js');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  const codeType = await page.$eval('#typeSelect', (s) => s.value);
  if (codeType === 'code') pass('JS file detected as Code with syntax highlighting'); else fail('js type: ' + codeType);
  const codeOption = await page.$eval('#typeSelect option:checked', (o) => o.textContent);
  if (/JavaScript source code/.test(codeOption)) pass('code dropdown shows concrete JavaScript type'); else fail('code dropdown label: ' + codeOption);
  // Per-function metrics CodeLens (LOC + cyclomatic complexity) — display-only overlay.
  await page.waitForFunction(() => document.querySelectorAll('#editor .codelens-decoration').length >= 2, { timeout: 15000 }).catch(() => {});
  const lensText = await page.$$eval('#editor .codelens-decoration', (els) => els.map((e) => e.innerText).join(' | '));
  const okLens = /\bfib\b/.test(lensText) && /\bclassify\b/.test(lensText) && /complexity 2\b/.test(lensText) && /complexity 7\b/.test(lensText);
  if (okLens) pass('code metrics CodeLens: per-function LOC + complexity (fib=2, classify=7)'); else fail('codelens text: ' + lensText.slice(0, 160));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const codeMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Type\s*JavaScript source code/.test(codeMeta) && /Lines of code\s*14/.test(codeMeta) && /Max complexity\s*7/.test(codeMeta) && /Most complex function\s*classify \(7\)/.test(codeMeta)) pass('code metadata includes concrete type, LOC, and complexity summary');
  else fail('code metadata: ' + codeMeta.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaDrawer [data-close]');

  await page.evaluate(() => window.__fv.openExampleFile('main.c'));
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'main.c', { timeout: 8000 });
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  const cLabels = await page.evaluate(() => ({
    selected: document.querySelector('#typeSelect option:checked')?.textContent || '',
    display: window.__fv.state.type.displayLabel(window.__fv.state.intake),
  }));
  if (/C source code/.test(cLabels.selected) && cLabels.display === 'C source code') pass('C sample UI shows C, not generic Code or C++');
  else fail('C code labels: ' + JSON.stringify(cLabels));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.svg');
  const sframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const sf = await frameOf('iframe.fv-preview-frame');
  await sf.waitForSelector('.img-doc svg', { timeout: 8000 });
  pass('SVG sanitized and rendered inline');
}
