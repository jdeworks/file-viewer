import zlib from 'node:zlib';

export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, openExample, waitForFv } = ctx;

  // ── SQLite browser ── sql.js (WASM, same-origin) table list + grid + query. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.sqlite');
  await page.waitForSelector('#previewHost .sq-grid', { timeout: 25000 });
  const sqType = await page.$eval('#typeSelect', (s) => s.value);
  if (sqType === 'sqlite') pass('.sqlite detected as SQLite database'); else fail('sqlite type: ' + sqType);
  const sqTables = await page.$$eval('#previewHost .sq-table .sq-tname', (els) => els.map((e) => e.textContent));
  if (sqTables.includes('artists') && sqTables.includes('albums')) pass('SQLite tables listed (' + sqTables.join(', ') + ')'); else fail('sqlite tables: ' + sqTables.join(','));
  // Run a query and read the grid.
  await page.fill('#previewHost .sq-sql', "SELECT name FROM artists WHERE country='UK' ORDER BY name");
  await page.click('#previewHost .sq-run');
  await page.waitForFunction(() => /Aphex Twin/.test(document.querySelector('#previewHost .sq-grid')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  const sqQueryText = await page.$eval('#previewHost .sq-grid', (e) => e.textContent);
  if (/Aphex Twin/.test(sqQueryText) && /Bonobo/.test(sqQueryText) && !/Tycho/.test(sqQueryText)) pass('SQLite query executes (filtered result)'); else fail('sqlite query: ' + sqQueryText.replace(/\s+/g, ' ').slice(0, 80));

  // ── Clip Studio Paint (.clip) ── SQLite-backed structure view with partial-support banner.
  await page.goto(origin, { waitUntil: 'load' });
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
  await page.goto(origin, { waitUntil: 'load' });
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
  await fb2f.waitForSelector('.fb2-reader .ebook-controls', { timeout: 8000 });
  const fb2Size0 = await fb2f.$eval('.fb2-book', (e) => getComputedStyle(e).fontSize);
  await fb2f.click('label[for="fb2-size-large"]');
  await fb2f.click('label[for="fb2-theme-sepia"]');
  await fb2f.click('label[for="fb2-font-sans"]');
  await fb2f.click('label[for="fb2-line-loose"]');
  await fb2f.click('label[for="fb2-margin-wide"]');
  const fb2Prefs = await fb2f.$eval('.fb2-book', (e) => {
    const s = getComputedStyle(e);
    return { size: s.fontSize, font: s.fontFamily, bg: s.backgroundColor, line: s.lineHeight, maxWidth: s.maxWidth };
  });
  if (parseFloat(fb2Prefs.size) > parseFloat(fb2Size0) && /system|Segoe|Roboto|sans/i.test(fb2Prefs.font) && fb2Prefs.bg !== 'rgba(0, 0, 0, 0)' && parseFloat(fb2Prefs.line) > 35 && parseFloat(fb2Prefs.maxWidth) < 600)
    pass('FB2 reader controls adjust size, font, theme, line height, and margins');
  else fail('fb2 reader controls: ' + JSON.stringify({ before: fb2Size0, after: fb2Prefs }));

  // ── MOBI / Kindle (.mobi) ── PalmDB parse + PalmDOC text → sanitized HTML, inline data: images. ──
  // Now rendered in parentNode mode with external sticky toolbar (no sandboxed iframe).
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.mobi');
  await page.waitForSelector('#previewHost .mobi-toolbar', { timeout: 12000 });
  const mobiType = await page.$eval('#typeSelect', (s) => s.value);
  if (mobiType === 'mobi') pass('.mobi detected as Kindle / MOBI'); else fail('mobi type: ' + mobiType);
  const mobiText = await page.$eval('#previewHost .mobi-book', (e) => e.textContent);
  if (/The Gift of the Magi/.test(mobiText) && /Project Gutenberg text by O\. Henry/.test(mobiText) && mobiText.length > 2000)
    pass('MOBI text decompressed + rendered with long sample text');
  else fail('mobi text: ' + mobiText.slice(0, 80) + ' len=' + mobiText.length);
  const mobiImg = await page.$eval('#previewHost .mobi-img', (e) => e.getAttribute('src')).catch(() => '');
  if (/^data:image\/png;base64,/.test(mobiImg)) pass('MOBI embedded image inlined as data: URL (zero off-origin)'); else fail('mobi img: ' + mobiImg.slice(0, 30));
  const mobiToolbar = await page.$('#previewHost .mobi-toolbar');
  if (mobiToolbar) pass('MOBI external reader toolbar visible'); else fail('mobi toolbar missing');
  const mobiSize0 = await page.$eval('#previewHost .mobi-book', (e) => getComputedStyle(e).fontSize);
  // Click each setting button — all are in the parent page, not inside an iframe
  await page.click('#previewHost .mobi-tb-btn[title="A+"]', {}).catch(async () => {
    // Fallback: find button by text
    const btns = await page.$$('#previewHost .mobi-tb-btn');
    for (const b of btns) { if (await b.evaluate((el) => el.textContent === 'A+')) { await b.click(); break; } }
  });
  await page.$$eval('#previewHost .mobi-tb-btn', (btns) => {
    const click = (text) => { const b = btns.find((el) => el.textContent === text); if (b) b.click(); };
    click('Sepia'); click('Sans'); click('Loose'); click('Wide');
  });
  const mobiPrefs = await page.$eval('#previewHost .mobi-book', (e) => {
    const s = getComputedStyle(e);
    return { size: s.fontSize, font: s.fontFamily, color: s.color, line: s.lineHeight, maxWidth: s.maxWidth };
  });
  if (parseFloat(mobiPrefs.size) > parseFloat(mobiSize0) && /system|Segoe|Roboto|sans/i.test(mobiPrefs.font)
      && /75.*57.*40|4b3928/i.test(mobiPrefs.color.replace(/\s/g, ''))
      && parseFloat(mobiPrefs.line) > 35 && parseFloat(mobiPrefs.maxWidth) < 600)
    pass('MOBI reader toolbar adjusts size, font, theme, line height, and margins');
  else fail('mobi reader controls: ' + JSON.stringify({ before: mobiSize0, after: mobiPrefs }));

  // ── Sony LRF ── recognized (BBeB), shown with a clear note instead of a raw hex dump. ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.lrf');
  const lrfframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const lrff = await frameOf('iframe.fv-preview-frame');
  await lrff.waitForSelector('.comic-note', { timeout: 8000 });
  const lrfType = await page.$eval('#typeSelect', (s) => s.value);
  const lrfNote = await lrff.$eval('.comic-note', (e) => e.textContent);
  if (lrfType === 'lrf' && /Sony/.test(lrfNote)) pass('.lrf recognized as Sony LRF with a friendly note'); else fail('lrf: type=' + lrfType + ' note=' + lrfNote.slice(0, 40));

  // ── DjVu ── either renders through the decoder or shows the intentional partial-support message.
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.djvu');
  await page.waitForSelector('#previewHost .djvu-viewer', { timeout: 15000 });
  const djvuType = await page.$eval('#typeSelect', (s) => s.value);
  const djvuText = await page.$eval('#previewHost .djvu-viewer', (e) => e.textContent || '');
  const djvuCanvas = await page.$eval('#previewHost .djvu-canvas', (c) => c.width > 1 && c.height > 1).catch(() => false);
  const djvuPartial = /DjVu preview is partially supported|Could not parse DjVu document/.test(djvuText);
  const djvuOldCrash = /Failed to load DjVu library|DjVu missing after load|Preview failed/i.test(djvuText);
  if (djvuType === 'djvu' && (djvuCanvas || djvuPartial) && !djvuOldCrash) pass('DjVu sample renders or shows friendly partial-support message');
  else fail('djvu: type=' + djvuType + ' canvas=' + djvuCanvas + ' text=' + djvuText.replace(/\s+/g, ' ').slice(0, 180));

  // ── EPUB e-book (hand-rolled reader) ── unzip + spine + TOC, rendered in the pane. ──
  await page.goto(origin, { waitUntil: 'load' });
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
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.epub');
  await page.waitForSelector('#previewHost .epub-content', { timeout: 15000 });
  const resumed = await page.$eval('#previewHost .epub-content', (e) => e.textContent || '').catch(() => '');
  if (resumed && resumed !== beforeNext) pass('EPUB resumes at the last-read chapter on reopen (persistence)'); else fail('epub did not resume at next spine item');

  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.epub');
  await page.waitForSelector('#previewHost .epub-doc', { timeout: 15000 });
  const mobileClosed = await page.$eval('#previewHost .epub-doc', (doc) => {
    const side = doc.querySelector('.epub-side');
    const content = doc.querySelector('.epub-content');
    const sideBox = side.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    return {
      menu: getComputedStyle(doc.querySelector('.epub-menu')).display,
      sideLeft: sideBox.left,
      contentWidth: Math.round(contentBox.width),
      docWidth: Math.round(doc.getBoundingClientRect().width),
    };
  });
  if (mobileClosed.menu !== 'none' && mobileClosed.sideLeft < -10 && mobileClosed.contentWidth >= mobileClosed.docWidth - 2) pass('EPUB mobile reader uses full-width content with slide-in settings closed');
  else fail('epub mobile closed: ' + JSON.stringify(mobileClosed));
  await page.click('#previewHost .epub-menu');
  await page.waitForFunction(() => {
    const doc = document.querySelector('#previewHost .epub-doc');
    const side = doc?.querySelector('.epub-side');
    return doc?.classList.contains('epub-side-open') && side?.getBoundingClientRect().left >= -1;
  }, { timeout: 4000 });
  const mobileOpen = await page.$eval('#previewHost .epub-doc', (doc) => {
    const sideBox = doc.querySelector('.epub-side').getBoundingClientRect();
    const backdrop = getComputedStyle(doc.querySelector('.epub-backdrop')).display;
    return { open: doc.classList.contains('epub-side-open'), sideLeft: Math.round(sideBox.left), backdrop };
  });
  if (mobileOpen.open && mobileOpen.sideLeft >= -1 && mobileOpen.backdrop !== 'none') pass('EPUB mobile settings pane slides in over the reader');
  else fail('epub mobile open: ' + JSON.stringify(mobileOpen));
  await page.setViewportSize({ width: 1100, height: 800 });

  // ── Binary file → hex dump in the read-only editor ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.bin');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  const hexVal = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/^00000000\s+([0-9a-f]{2} )+/m.test(hexVal)) pass('binary file rendered as hex dump (offset + hex columns)'); else fail('no hex dump: ' + hexVal.slice(0, 40));
  if (/\|.*Hello.*\|/.test(hexVal)) pass('hex dump shows ASCII column (printable bytes)'); else fail('no ASCII column in hex dump');

  // ── Folder tree sidebar ──
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
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
  const nestedHidden = await page.$('#fileTree .ft-file[data-path="proj/src/app.js"]') === null;
  if (fileRows === 2 && folderRows >= 3 && nestedHidden) pass('folder tree opens only the first level by default'); else fail('tree rows: files=' + fileRows + ' folders=' + folderRows + ' nestedHidden=' + nestedHidden);
  await page.click('#ftExpandBtn');
  await page.waitForSelector('#fileTree .ft-file[data-path="proj/src/app.js"]', { timeout: 5000 });
  const expandedRows = await page.$$eval('#fileTree .ft-file', (els) => els.length);
  if (expandedRows === 5) pass('folder tree expand-all reveals nested files'); else fail('expanded file rows: ' + expandedRows);
  await page.click('#ftCollapseBtn');
  await page.waitForTimeout(100);
  const nestedCollapsed = await page.$('#fileTree .ft-file[data-path="proj/src/app.js"]') === null;
  if (nestedCollapsed) pass('folder tree collapse-all hides nested files'); else fail('nested file still visible after collapse-all');
  await page.click('#ftExpandBtn');
  await page.waitForSelector('#fileTree .ft-file[data-path="proj/src/util.py"]', { timeout: 5000 });
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
  await page.waitForFunction(() => document.querySelector('#fileTree .ft-file[data-path="proj/src/app.js"]')?.classList.contains('ft-edited'), null, { timeout: 5000 }).catch(() => {});
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
  await page.waitForFunction(() => /file/.test(document.getElementById('ftSearchCount').textContent), null, { timeout: 5000 });
  const readmeVisible = await page.$('#fileTree .ft-file[data-path="proj/README.md"]') !== null;
  const appHidden2 = await page.$('#fileTree .ft-file[data-path="proj/src/app.js"]') === null;
  if (readmeVisible && appHidden2) pass('folder search: content search matches inside files'); else fail('content search: readme=' + readmeVisible + ' appHidden=' + appHidden2);
  await page.fill('#ftSearchInput', '');
  await page.waitForTimeout(100);

  // ── Huge-folder virtual scroll: all 20 010 entries load; only a viewport slice is in the DOM ──
  const loadingSeen = await page.evaluate(() => {
    const entries = [];
    for (let i = 0; i < 20010; i++) entries.push({ file: new File(['x'], 'f' + i + '.txt', { type: '' }), path: 'big/f' + i + '.txt' });
    window.__fv.state._skipDiscardGuard = true;
    window.__fv.loadFolder(entries);
    const notice = document.getElementById('ftNotice');
    return !notice.hidden && /Preparing big|Building file tree/.test(notice.textContent);
  });
  if (loadingSeen) pass('folder load shows progress feedback'); else fail('folder load progress not shown');
  await page.waitForFunction(() => window.__fv.state.treeEntries?.length === 20010, null, { timeout: 15000 });
  const ftNoticeHidden = await page.$eval('#ftNotice', (e) => e.hidden);
  const domRows = await page.$$eval('#fileTree .ft-row', (els) => els.length);
  const loadedCount = await page.evaluate(() => window.__fv.state.treeEntries.length);
  if (loadedCount === 20010 && ftNoticeHidden && domRows < 200)
    pass('virtual tree: all ' + loadedCount + ' entries loaded, only ' + domRows + ' DOM rows mounted');
  else fail('virtual tree: loaded=' + loadedCount + ' ftNoticeHidden=' + ftNoticeHidden + ' domRows=' + domRows);
}
