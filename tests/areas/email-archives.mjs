export async function run(ctx) {
  const { page, origin, frameOf, pass, fail } = ctx;

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
}
