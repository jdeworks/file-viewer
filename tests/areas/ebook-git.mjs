import zlib from 'node:zlib';

export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── SQLite browser ── sql.js (WASM, same-origin) table list + grid + query. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.sqlite');
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

  // ── Clip Studio Paint (.clip) ── SQLite-backed structure view with partial-support banner.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.clip');
  await page.waitForSelector('#previewHost .clip-doc', { timeout: 25000 });
  const clipType = await page.$eval('#typeSelect', (s) => s.value);
  if (clipType === 'clip') pass('.clip detected as Clip Studio Paint'); else fail('clip type: ' + clipType);
  const clipText = await page.$eval('#previewHost .clip-doc', (e) => e.textContent);
  const clipThumb = await page.$eval('#previewHost .clip-thumb', (e) => e.getAttribute('src') || '');
  if (/Layer pixel data is proprietary/.test(clipText) && /1600 x 1200 px/.test(clipText) && /Layers\s*3/.test(clipText) && /CanvasPreview/.test(clipText) && clipThumb.startsWith('blob:'))
    pass('Clip Studio structure rendered with canvas, layers, tables, and thumbnail');
  else fail('clip render: ' + clipText.replace(/\s+/g, ' ').slice(0, 200) + ' thumb=' + clipThumb.slice(0, 20));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const clipMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Canvas\s*1600 x 1200 px/.test(clipMeta) && /Layers\s*3/.test(clipMeta) && /Thumbnail\s*image\/png/.test(clipMeta))
    pass('Clip Studio metadata includes canvas, layers, and thumbnail');
  else fail('clip meta: ' + clipMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  // ── FictionBook (.fb2) ── XML ebook → sanitized reading HTML with inline data: images. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.fb2');
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
  await openExample('Sample.mobi');
  const mobiframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 15000 });
  const mobif = await frameOf('iframe.fv-preview-frame');
  await mobif.waitForSelector('.mobi-book', { timeout: 10000 });
  const mobiType = await page.$eval('#typeSelect', (s) => s.value);
  if (mobiType === 'mobi') pass('.mobi detected as Kindle / MOBI'); else fail('mobi type: ' + mobiType);
  const mobiText = await mobif.$eval('.mobi-book', (e) => e.textContent);
  if (/The Gift of the Magi/.test(mobiText) && /Project Gutenberg text by O\. Henry/.test(mobiText)) pass('MOBI text decompressed + rendered'); else fail('mobi text: ' + mobiText.slice(0, 80));
  const mobiImg = await mobif.$eval('.mobi-img', (e) => e.getAttribute('src')).catch(() => '');
  if (/^data:image\/png;base64,/.test(mobiImg)) pass('MOBI embedded image inlined as data: URL (zero off-origin)'); else fail('mobi img: ' + mobiImg.slice(0, 30));

  // ── Sony LRF ── recognized (BBeB), shown with a clear note instead of a raw hex dump. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.lrf');
  const lrfframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const lrff = await frameOf('iframe.fv-preview-frame');
  await lrff.waitForSelector('.comic-note', { timeout: 8000 });
  const lrfType = await page.$eval('#typeSelect', (s) => s.value);
  const lrfNote = await lrff.$eval('.comic-note', (e) => e.textContent);
  if (lrfType === 'lrf' && /Sony/.test(lrfNote)) pass('.lrf recognized as Sony LRF with a friendly note'); else fail('lrf: type=' + lrfType + ' note=' + lrfNote.slice(0, 40));

  // ── EPUB e-book (hand-rolled reader) ── unzip + spine + TOC, rendered in the pane. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.epub');
  await page.waitForSelector('#previewHost .epub-doc', { timeout: 15000 });
  const epubType = await page.$eval('#typeSelect', (s) => s.value);
  if (epubType === 'epub') pass('.epub detected as E-book (outscores Archive)'); else fail('epub type: ' + epubType);
  const epubTitle = await page.$eval('#previewHost .epub-title', (e) => e.textContent);
  if (/The Gift of the Magi/.test(epubTitle)) pass('EPUB title parsed from OPF metadata'); else fail('epub title: ' + epubTitle);
  const tocCount = await page.$$eval('#previewHost .epub-toc-item', (els) => els.length);
  if (tocCount >= 2) pass('EPUB table of contents built (' + tocCount + ' entries)'); else fail('epub toc entries: ' + tocCount);
  // Reading settings: font-size zoom (size-based, not transform) + theme.
  const fs0 = await page.$eval('#previewHost .epub-content', (e) => getComputedStyle(e).fontSize);
  await page.click('#previewHost .epub-fs-up');
  await page.click('#previewHost .epub-fs-up');
  const fs1 = await page.$eval('#previewHost .epub-content', (e) => getComputedStyle(e).fontSize);
  if (parseFloat(fs1) === parseFloat(fs0) + 2) pass('EPUB font-size zoom increases real size (' + fs0 + '→' + fs1 + ')'); else fail('epub font-size: ' + fs0 + ' → ' + fs1);
  await page.click('#previewHost .epub-theme[data-theme="sepia"]');
  const sepia = await page.$eval('#previewHost .epub-doc', (e) => e.classList.contains('epub-theme-sepia'));
  if (sepia) pass('EPUB reading theme switch (sepia)'); else fail('epub theme not applied');
  // Two-column reading mode: the inner flow uses CSS columns (wide screen).
  await page.click('#previewHost .epub-cols[data-cols="2"]');
  const twocol = await page.$eval('#previewHost .epub-doc', (e) => e.classList.contains('epub-twocol'));
  const colCount = await page.$eval('#previewHost .epub-flow', (e) => getComputedStyle(e).columnCount);
  if (twocol && colCount === '2') pass('EPUB two-column reading mode (CSS columns)'); else fail('epub columns: twocol=' + twocol + ' count=' + colCount);
  await page.click('#previewHost .epub-cols[data-cols="1"]');   // back to single column for later assertions
  // First chapter rendered, with any embedded image rewritten to an in-book blob URL.
  const epubContent = await page.$eval('#previewHost .epub-content', (e) => ({
    text: e.textContent || '',
    html: e.innerHTML || '',
    images: e.querySelectorAll('img').length,
  })).catch(() => ({ text: '', html: '', images: 0 }));
  if (epubContent.text.trim().length > 20 || epubContent.images > 0 || epubContent.html.length > 100) pass('EPUB first spine item rendered');
  else fail('epub content: ' + JSON.stringify(epubContent).slice(0, 180));
  const epubImg = await page.$eval('#previewHost .epub-content img', (e) => e.getAttribute('src') || 'none').catch(() => 'none');
  if (epubImg.startsWith('blob:')) pass('EPUB embedded image rewritten to in-book blob URL (zero off-origin)'); else fail('epub img src: ' + epubImg);
  // Navigate to the next spine item, then reopen the book → resumes there (per-file persistence).
  const beforeNext = await page.$eval('#previewHost .epub-content', (e) => e.textContent || '');
  await page.click('#previewHost .epub-next');
  await page.waitForFunction((prev) => {
    const t = document.querySelector('#previewHost .epub-content')?.textContent || '';
    return t && t !== prev;
  }, beforeNext, { timeout: 8000 });
  pass('EPUB next-chapter navigation works');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.epub');
  await page.waitForSelector('#previewHost .epub-content', { timeout: 15000 });
  const resumed = await page.$eval('#previewHost .epub-content', (e) => e.textContent || '').catch(() => '');
  if (resumed && resumed !== beforeNext) pass('EPUB resumes at the last-read chapter on reopen (persistence)'); else fail('epub did not resume at next spine item');

  // ── Binary file → hex dump in the read-only editor ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.bin');
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

  // ── Folder edit-tracking + export as .zip ── edit a file → * marker + export the folder.
  await page.click('#fileTree .ft-file[data-path="proj/src/app.js"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.click('#editor .monaco-editor');
  await page.keyboard.type('// an edit\n');
  await page.waitForFunction(() => document.querySelector('#fileTree .ft-file[data-path="proj/src/app.js"]')?.classList.contains('ft-edited'), { timeout: 5000 }).catch(() => {});
  const edited = await page.$eval('#fileTree .ft-file[data-path="proj/src/app.js"]', (e) => e.classList.contains('ft-edited'));
  if (edited) pass('folder edit tracked (* marker on the edited file)'); else fail('no ft-edited marker after edit');
  // The edit survives navigating away and back (stashed in folderEdits).
  await page.click('#fileTree .ft-file[data-path="proj/src/util.py"]');
  await page.waitForTimeout(250);
  await page.click('#fileTree .ft-file[data-path="proj/src/app.js"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 10000 });
  await page.waitForTimeout(250);
  const persisted = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/an edit/.test(persisted)) pass('folder edit persists across navigation'); else fail('edit lost on nav: ' + persisted.slice(0, 40));
  // Export the whole folder as a .zip (edits applied).
  const exportShown = await page.$eval('#ftExportBtn', (e) => !e.hidden);
  if (exportShown) pass('folder export button shown'); else fail('export button hidden for folder');
  const [zipDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 12000 }),
    page.click('#ftExportBtn'),
  ]);
  if (/\.zip$/.test(zipDownload.suggestedFilename())) pass('folder exported as .zip (' + zipDownload.suggestedFilename() + ')'); else fail('folder zip name: ' + zipDownload.suggestedFilename());
  await page.evaluate(() => { window.__fv.state.downloadedSinceEdit = true; });   // clear unsaved-work for the next folder load

  // ── Folder search ── live filename filter + content search on Enter. ──
  await page.fill('#ftSearchInput', 'util');
  await page.waitForTimeout(150);
  const utilVisible = await page.$('#fileTree .ft-file[data-path="proj/src/util.py"]') !== null;
  const appHidden = await page.$('#fileTree .ft-file[data-path="proj/src/app.js"]') === null;
  if (utilVisible && appHidden) pass('folder search: filename filter narrows the tree'); else fail('search filter: util=' + utilVisible + ' appHidden=' + appHidden);
  const searchCount = await page.$eval('#ftSearchCount', (e) => e.textContent);
  if (/1 match/.test(searchCount)) pass('folder search: match count shown (' + searchCount + ')'); else fail('search count: ' + searchCount);
  // Content search: "Project" appears only INSIDE README.md (not in any filename).
  await page.fill('#ftSearchInput', 'Project');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /file/.test(document.getElementById('ftSearchCount').textContent), { timeout: 5000 });
  const readmeVisible = await page.$('#fileTree .ft-file[data-path="proj/README.md"]') !== null;
  const appHidden2 = await page.$('#fileTree .ft-file[data-path="proj/src/app.js"]') === null;
  if (readmeVisible && appHidden2) pass('folder search: content search matches inside files'); else fail('content search: readme=' + readmeVisible + ' appHidden=' + appHidden2);
  await page.fill('#ftSearchInput', '');
  await page.waitForTimeout(100);

  // ── Huge-folder virtual scroll: all 20 010 entries load; only a viewport slice is in the DOM ──
  await page.evaluate(() => {
    const entries = [];
    for (let i = 0; i < 20010; i++) entries.push({ file: new File(['x'], 'f' + i + '.txt', { type: '' }), path: 'big/f' + i + '.txt' });
    window.__fv.state._skipDiscardGuard = true;
    window.__fv.loadFolder(entries);
  });
  await page.waitForFunction(() => window.__fv.state.treeEntries?.length === 20010, { timeout: 15000 });
  const ftNoticeHidden = await page.$eval('#ftNotice', (e) => e.hidden);
  const domRows = await page.$$eval('#fileTree .ft-row', (els) => els.length);
  const loadedCount = await page.evaluate(() => window.__fv.state.treeEntries.length);
  if (loadedCount === 20010 && ftNoticeHidden && domRows < 200)
    pass('virtual tree: all ' + loadedCount + ' entries loaded, only ' + domRows + ' DOM rows mounted');
  else fail('virtual tree: loaded=' + loadedCount + ' ftNoticeHidden=' + ftNoticeHidden + ' domRows=' + domRows);

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
}
