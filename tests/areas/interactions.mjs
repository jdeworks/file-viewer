export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, consoleErrors, offOrigin, openExample } = ctx;

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

  // ── Markdown editable text tools ── raw/split editor actions format selections, insert tables,
  // and extend the right-click path for sorting a selected Markdown table.
  const mdToolsShown = await page.$eval('#markdownTools', (e) => !e.hidden);
  if (mdToolsShown) pass('Markdown tools menu shown for editable Markdown'); else fail('Markdown tools hidden');
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('Title');
    rv.setSelection(1, 1, 1, 1);
  });
  await page.click('#markdownTools .md-tools-toggle');
  await page.click('#markdownTools [data-md-action="heading"]');
  const mdHeading = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdHeading === '# Title') pass('Markdown tools: heading action formats current line'); else fail('heading result: ' + mdHeading);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('bold italic');
    rv.setSelection(1, 1, 1, 5);
  });
  await page.click('#markdownTools .md-tools-toggle');
  await page.click('#markdownTools [data-md-action="bold"]');
  const mdBold = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdBold === '**bold** italic') pass('Markdown tools: bold wraps selected text'); else fail('bold result: ' + mdBold);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setSelection(1, 10, 1, 16);
  });
  await page.click('#markdownTools .md-tools-toggle');
  await page.click('#markdownTools [data-md-action="italic"]');
  const mdItalic = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdItalic === '**bold** *italic*') pass('Markdown tools: italic wraps selected text'); else fail('italic result: ' + mdItalic);
  page.once('dialog', (d) => d.accept('2,2'));
  await page.click('#markdownTools .md-tools-toggle');
  await page.click('#markdownTools [data-md-action="table"]');
  const mdTableInserted = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/\| Column 1 \| Column 2 \|/.test(mdTableInserted) && mdTableInserted.split('\n').length === 4) pass('Markdown tools: table prompt inserts requested dimensions'); else fail('table inserted: ' + mdTableInserted);
  await page.evaluate(() => {
    const table = [
      '| Name | Score |',
      '| --- | --- |',
      '| Beta | 10 |',
      '| Alpha | 2 |',
    ].join('\n');
    const rv = window.__fv.state.rawview;
    rv.setValue(table);
    rv.setSelection(1, 1, 4, 13);
  });
  await page.click('#editor .monaco-editor', { button: 'right' });
  await page.waitForSelector('.md-context-menu', { timeout: 4000 });
  await page.click('.md-context-menu button:has-text("Name")');
  const mdSorted = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/\| Alpha \| 2 \|\n\| Beta \| 10 \|/.test(mdSorted)) pass('Markdown context menu: sorts selected table by chosen column'); else fail('sorted table: ' + mdSorted);
  await page.evaluate(() => {
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
  });

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
  await page.evaluate(() => {
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
  });   // clear unsaved-work so the next navigation isn't blocked by beforeunload

  // ── HTML type + script-confirm gate (WP07) ──
  let acceptScripts = false;
  page.on('dialog', (d) => (acceptScripts ? d.accept() : d.dismiss()));
  // Default: dismiss -> sanitized, script must NOT run.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.html');
  const hframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 12000 });
  const hf = await frameOf('iframe.fv-preview-frame');
  await hf.waitForSelector('#safe', { timeout: 8000 });
  await page.waitForTimeout(300);
  const sanitizedRan = await hf.$('#ran-script');
  if (!sanitizedRan) pass('HTML sanitized by default (script did NOT run)'); else fail('script ran while sanitized');
  // Opt in: accept -> scripts run in the sandbox.
  acceptScripts = true;
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.html');
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
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  const clean0 = await page.evaluate(() => window.__fv.hasUnsavedWork());
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue(rv.getValue() + '\nunsaved edit'); });
  await page.waitForTimeout(350);
  const dirty1 = await page.evaluate(() => window.__fv.hasUnsavedWork());
  await page.evaluate(() => window.__fv.downloadCurrent());
  await page.waitForTimeout(150);
  const afterDl = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (!clean0 && dirty1 && !afterDl) pass('unsaved-work tracked (clean → edit → download clears it; gates discard + beforeunload)'); else fail('unsaved flags clean=' + clean0 + ' dirty=' + dirty1 + ' afterDownload=' + afterDl);

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue(rv.getValue() + '\nretained session edit'); });
  await page.waitForTimeout(350);
  await openExample('Sample.txt');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'sample.txt', { timeout: 8000 });
  await page.waitForSelector('#ftBody [data-path="welcome.md"].ft-edited', { timeout: 8000 });
  await page.click('#ftBody [data-path="welcome.md"]');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'welcome.md', { timeout: 8000 });
  const retainedSessionText = await page.evaluate(() => window.__fv.state.rawview.getValue());
  const sessionDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (/retained session edit/.test(retainedSessionText) && sessionDirty) pass('session sidebar retains edited files with an unsaved marker'); else fail('session retained=' + /retained session edit/.test(retainedSessionText) + ' dirty=' + sessionDirty);
  await page.evaluate(() => window.__fv.downloadCurrent());
  await page.waitForTimeout(150);

  // ── Mobile hardening (WP06) ── phone viewport: Preview-first + ⋯ overflow menu.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const mpage = await mctx.newPage();
  mpage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[mobile] ' + m.text()); });
  mpage.on('pageerror', (e) => consoleErrors.push('[mobile] pageerror: ' + e.message));
  mpage.on('request', (req) => { const u = req.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u); });
  await mpage.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Welcome.md', mpage);
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
    // Opt in: clicking the pill opens the cache-download modal (pick bundles + sizes).
    await op.click('#offlineStatus');
    await op.waitForSelector('.cache-modal', { timeout: 8000 });
    const monacoChecked = await op.$eval('.cm-chk[data-id="vendor:monaco"]', (e) => e.checked);
    const coreRequired = await op.$eval('.cm-chk[data-id="core"]', (e) => e.disabled && e.checked);
    const hasSizes = await op.$$eval('.cm-size', (els) => els.length > 5 && els.every((e) => /\d/.test(e.textContent)));
    if (monacoChecked === false && coreRequired && hasSizes) pass('cache modal: sized bundles listed; core required, Monaco (heavy) opt-in'); else fail('cache modal: monacoChecked=' + monacoChecked + ' coreReq=' + coreRequired + ' sizes=' + hasSizes);
    // Select everything (full offline) and save → precache → green "ready".
    const boxes = await op.$$('.cm-chk:not([disabled])');
    for (const b of boxes) { if (!(await b.isChecked())) await b.check(); }
    await op.click('.cm-save');
    await op.waitForSelector('#offlineStatus.ready', { timeout: 90000 });
    pass('cache modal: saving selected bundles precaches them (Available offline)');
    const cachedMonaco = await op.evaluate(async () => {
      const k = (await caches.keys()).find((x) => x === 'file-viewer');
      return k ? !!(await (await caches.open(k)).match('vendor/monaco/vs/loader.js')) : false;
    });
    if (cachedMonaco) pass('offline cache holds vendored assets (Monaco)'); else fail('Monaco not in cache');
    // Go offline, hard-reload: the app must still load and render from cache.
    await octx.setOffline(true);
    await op.reload({ waitUntil: 'domcontentloaded' });
    await op.waitForFunction(() => !!window.__fv?.openExampleByLabel, { timeout: 30000 });
    await openExample('Welcome.md', op);
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
  await openExample('Sample.csv');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  const compareBtnShown = await page.$eval('#compareBtn', (e) => !e.closest('[hidden]'));
  if (compareBtnShown) pass('compare button available for an editable type'); else fail('compare button hidden for csv');
  // Feed the comparison file through the hidden input (Playwright sets files directly — no dialog).
  await page.setInputFiles('#compareInput', new URL('../../docs/examples/welcome.md', import.meta.url).pathname);
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

  // ── Split divider: drag must keep working across preview iframes and Monaco surfaces ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Sample.ans');
  await page.click('#viewMode button[data-mode="split"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 15000 });
  const splitBox = await (await page.$('#splitDivider')).boundingBox();
  const previewBox = await (await page.$('#previewPane')).boundingBox();
  if (splitBox && previewBox) {
    const beforePreview = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
    await page.mouse.move(splitBox.x + splitBox.width / 2, splitBox.y + splitBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(previewBox.x + previewBox.width - 40, splitBox.y + splitBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const afterRight = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
    if (afterRight < beforePreview - 80) pass('split divider drags across preview iframe'); else fail('split iframe drag width: ' + beforePreview + ' -> ' + afterRight);

    const splitBox2 = await (await page.$('#splitDivider')).boundingBox();
    const rawBox = await (await page.$('#rawPane')).boundingBox();
    if (splitBox2 && rawBox) {
      await page.mouse.move(splitBox2.x + splitBox2.width / 2, splitBox2.y + splitBox2.height / 2);
      await page.mouse.down();
      await page.mouse.move(rawBox.x + 120, splitBox2.y + splitBox2.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      const afterLeft = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
      if (afterLeft > afterRight + 80) pass('split divider drags back across Monaco pane'); else fail('split Monaco drag width: ' + afterRight + ' -> ' + afterLeft);
    } else fail('split drag missing raw/divider boxes after iframe drag');
  } else fail('split drag missing preview/divider boxes');

  // ── Side-by-side: view two files (incl. non-text) next to each other ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Welcome.md');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 15000 });
  const sbsShown = await page.$eval('#sbsBtn', (e) => !e.hidden);
  if (sbsShown) pass('side-by-side button shown for a previewable file'); else fail('sbs button hidden');
  await page.setInputFiles('#sbsInput', new URL('../../docs/examples/sample.csv', import.meta.url).pathname);
  await page.waitForSelector('.sbs-overlay', { timeout: 8000 });
  const sbsPanes = await page.$$eval('.sbs-pane', (els) => els.length);
  const sbsNames = await page.$$eval('.sbs-name', (els) => els.map((e) => e.textContent));
  if (sbsPanes === 2 && sbsNames.some((n) => /welcome\.md/i.test(n)) && sbsNames.some((n) => /sample\.csv/i.test(n))) pass('side-by-side: two named panes (current + picked)'); else fail('sbs panes=' + sbsPanes + ' names=' + sbsNames.join(','));
  await page.waitForFunction(() => document.querySelectorAll('.sbs-host iframe').length === 2, { timeout: 12000 });
  pass('side-by-side: both files rendered independently');
  await page.click('.sbs-close');
  if (!(await page.$('.sbs-overlay'))) pass('side-by-side closes'); else fail('sbs did not close');
}
