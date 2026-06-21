export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, consoleErrors, offOrigin, openExample, waitForFv } = ctx;

  // ── New empty file ── create from the intake screen; the extension drives the type.
  // (Runs BEFORE the persistent dialog handler below, so page.once can answer the name prompt.)
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  page.once('dialog', (d) => d.accept('notes.md'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  const newType = await page.$eval('#typeSelect', (s) => s.value);
  if (newType === 'markdown') pass('new file: created + typed from extension (notes.md → Markdown)'); else fail('new file type: ' + newType);
  const newName = await page.$eval('#fileName', (e) => e.textContent);
  if (newName === 'notes.md') pass('new file: named as entered'); else fail('new file name: ' + newName);
  await page.keyboard.type('autofocused');
  const typedWithoutClick = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (typedWithoutClick === 'autofocused') pass('new file: editor focused for immediate typing'); else fail('new file autofocus value: ' + typedWithoutClick);

  // ── Markdown editable text tools ── raw/split editor actions format selections, insert tables,
  // and extend the right-click path for sorting a selected Markdown table.
  const mdToolsShown = await page.$eval('#markdownTools', (e) => !e.hidden);
  if (mdToolsShown) pass('Markdown tools bar shown for editable Markdown'); else fail('Markdown tools hidden');
  const mdBoldBtn = await page.$('#markdownTools .md-btn[data-md-action="bold"]');
  if (mdBoldBtn) pass('Markdown tools: bold button present'); else fail('bold button missing');
  const mdTableBtn = await page.$('#markdownTools .md-btn[data-md-action="table"]');
  if (mdTableBtn) pass('Markdown tools: table button present'); else fail('table button missing');
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('Title');
    rv.setSelection(1, 1, 1, 1);
  });
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="heading"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.md-heading-menu', { timeout: 4000 });
  await page.click('.md-heading-item[data-level="1"]');
  const mdHeading = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdHeading === '# Title') pass('Markdown tools: heading action formats current line (H1 from picker)'); else fail('heading result: ' + mdHeading);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('bold italic');
    rv.setSelection(1, 1, 1, 5);
  });
  await page.click('#markdownTools [data-md-action="bold"]');
  const mdBold = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdBold === '**bold** italic') pass('Markdown tools: bold wraps selected text'); else fail('bold result: ' + mdBold);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setSelection(1, 10, 1, 16);
  });
  await page.click('#markdownTools [data-md-action="italic"]');
  const mdItalic = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdItalic === '**bold** *italic*') pass('Markdown tools: italic wraps selected text'); else fail('italic result: ' + mdItalic);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('OpenAI docs');
    rv.setSelection(1, 1, 1, 7);
    const data = new DataTransfer();
    data.setData('text/plain', 'https://openai.com/docs');
    const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    document.querySelector('#editor .monaco-editor')?.dispatchEvent(event);
  });
  const mdPasteLink = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdPasteLink === '[OpenAI](https://openai.com/docs) docs') pass('Markdown paste: selected text plus URL becomes link'); else fail('paste link result: ' + mdPasteLink);
  // Table picker — click the table button, then click the 2×2 cell in the grid picker
  await page.click('#markdownTools [data-md-action="table"]');
  await page.waitForSelector('.md-table-picker', { timeout: 4000 });
  // Cell at row=1,col=1 gives a 2×2 table
  await page.click('.md-table-picker-cell[data-r="1"][data-c="1"]');
  const mdTableInserted = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (/\| Column 1 \| Column 2 \|/.test(mdTableInserted) && mdTableInserted.split('\n').length === 4) pass('Markdown tools: table grid picker inserts 2×2 table'); else fail('table inserted: ' + mdTableInserted);
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

  // ── Markdown WYSIWYG toggle ──
  // The WYSIWYG button is present and clicking it mounts the TipTap editor in place of Monaco.
  const wysiwygBtn = await page.$('#wysiwygBtn');
  if (wysiwygBtn) pass('Markdown tools: WYSIWYG button present'); else fail('WYSIWYG button missing');
  // Re-create a markdown file and click WYSIWYG
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  page.once('dialog', (d) => d.accept('notes.md'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  // A rich source exercising the round-trip: heading, emphasis, list, code, link.
  const srcMd = '# Hello WYSIWYG\n\nThis is **bold** and *italic*.\n\n- one\n- two\n\n[link](https://example.com)';
  await page.evaluate((md) => window.__fv.state.rawview.setValue(md), srcMd);
  // #textUtils can shadow #wysiwygBtn in headless; use JS click to bypass pointer-event interception.
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  // TipTap renders a contenteditable .ProseMirror inside the .tiptap-host container.
  await page.waitForSelector('#editor .tiptap-host .ProseMirror', { state: 'attached', timeout: 15000 });
  const wysiwygActive = await page.evaluate(() => !!document.querySelector('#editor .tiptap-host .ProseMirror'));
  if (wysiwygActive) pass('WYSIWYG: TipTap mounts when toggle clicked'); else fail('TipTap not mounted');
  // The parsed rich doc must render the heading as an <h1> (markdown → model).
  const headingRendered = await page.evaluate(() =>
    document.querySelector('#editor .tiptap-host .ProseMirror h1')?.textContent?.includes('Hello WYSIWYG'));
  if (headingRendered) pass('WYSIWYG: markdown parsed to rich doc (h1)'); else fail('TipTap did not parse markdown heading');
  // Toggling back should restore Monaco AND faithfully serialize back to markdown.
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .monaco-editor', { state: 'attached', timeout: 15000 });
  const monacoBack = await page.$('#editor .monaco-editor');
  if (monacoBack) pass('WYSIWYG: toggling off restores Monaco editor'); else fail('Monaco not restored after WYSIWYG off');
  const roundTripped = await page.evaluate(() => window.__fv.state.rawview.getValue());
  const rtOk = /# Hello WYSIWYG/.test(roundTripped) && /\*\*bold\*\*/.test(roundTripped)
    && /\*italic\*/.test(roundTripped) && /- one/.test(roundTripped)
    && /\[link\]\(https:\/\/example\.com\)/.test(roundTripped);
  if (rtOk) pass('WYSIWYG: markdown round-trips through TipTap');
  else fail('WYSIWYG round-trip lost fidelity: ' + JSON.stringify(roundTripped));

  // ── GFM task lists (checkboxes) ── parse → checkable TaskItems → serialize ──
  const taskMd = '# Tasks\n\n- [ ] task\n- [x] done';
  await page.evaluate((md) => window.__fv.state.rawview.setValue(md), taskMd);
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .tiptap-host .ProseMirror', { state: 'attached', timeout: 15000 });
  // GFM `- [ ]`/`- [x]` must mount as a taskList with checkbox <input>s, one checked.
  const taskMounted = await page.evaluate(() => {
    const list = document.querySelector('#editor .tiptap-host ul[data-type="taskList"]');
    if (!list) return false;
    const items = list.querySelectorAll('li[data-type="taskItem"], li[data-checked]');
    const boxes = list.querySelectorAll('input[type="checkbox"]');
    const checked = list.querySelectorAll('li[data-checked="true"]').length;
    return items.length >= 2 && boxes.length >= 2 && checked === 1;
  });
  if (taskMounted) pass('WYSIWYG: GFM task list mounts as checkable TaskItems (1 checked)');
  else fail('WYSIWYG: task list did not mount as checkable items');
  // Serialize back: must emit `- [ ]` and `- [x]` GFM checkboxes.
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .monaco-editor', { state: 'attached', timeout: 15000 });
  const taskRt = await page.evaluate(() => window.__fv.state.rawview.getValue());
  const taskRtOk = /- \[ \] task/.test(taskRt) && /- \[x\] done/.test(taskRt);
  if (taskRtOk) pass('WYSIWYG: task list round-trips to `- [ ]`/`- [x]` markdown');
  else fail('WYSIWYG: task list round-trip lost GFM checkboxes: ' + JSON.stringify(taskRt));

  await page.evaluate(() => {
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
  });

  // ── import easteregg unlock ── typing the magic line into a file opens the arcade. ──
  await page.goto(origin, { waitUntil: 'load' });
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
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.html');
  const hframe = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const hf = await frameOf('iframe.fv-preview-frame');
  await hf.waitForSelector('#safe', { timeout: 8000 });
  await page.waitForTimeout(300);
  const sanitizedRan = await hf.$('#ran-script');
  if (!sanitizedRan) pass('HTML sanitized by default (script did NOT run)'); else fail('script ran while sanitized');
  // Opt in: accept -> scripts run in the sandbox.
  acceptScripts = true;
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.html');
  const hframe2 = await page.waitForSelector('iframe.fv-preview-frame', { timeout: 30000 });
  const hf2 = await frameOf('iframe.fv-preview-frame');
  await hf2.waitForSelector('#ran-script', { timeout: 8000 });
  pass('HTML scripts run after explicit opt-in (sandboxed)');

  // ── HTML structural diff (Layer-2 DOM diff) ── reindenting is ignored; real edits are flagged.
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, null, { timeout: 8000 });
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
  await page.waitForFunction(() => /\badded\b/.test(document.querySelector('.jsondiff .jd-head')?.textContent || ''), null, { timeout: 6000 }).catch(() => {});
  const htmlChgHead = await page.$eval('.jsondiff .jd-head', (e) => e.textContent);
  const htmlAddedKeys = await page.$$eval('.jsondiff .jd-added .jd-key', (els) => els.map((e) => e.textContent));
  if (/added/.test(htmlChgHead) && htmlAddedKeys.some((k) => /p#fv-added/.test(k))) pass('HTML structural diff flags an added element (p#fv-added)'); else fail('html change diff: ' + htmlChgHead + ' keys=' + htmlAddedKeys.join(','));
  await page.click('#rawMode button[data-raw="current"]');

  // ── Duplicate open button removed + unsaved-work tracking ──
  await page.goto(origin, { waitUntil: 'load' });
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

  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue(rv.getValue() + '\nretained session edit'); });
  await page.waitForTimeout(350);
  await openExample('Sample.txt');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'sample.txt', null, { timeout: 8000 });
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 30000 });
  const txtFrame = await frameOf('iframe.fv-preview-frame');
  await txtFrame.waitForSelector('.plain-doc .plain-text', { timeout: 8000 });
  const txtPreview = await txtFrame.$eval('.plain-doc .plain-text', (e) => ({
    text: e.textContent,
    wrap: getComputedStyle(e).whiteSpace,
    width: e.closest('.plain-doc').getBoundingClientRect().width,
  }));
  if (/Plain text sample/i.test(txtPreview.text) && txtPreview.wrap === 'pre-wrap' && txtPreview.width > 250)
    pass('Plain text preview renders readable wrapped text');
  else fail('plain text preview: ' + JSON.stringify(txtPreview));
  await page.waitForSelector('#ftBody [data-path="welcome.md"].ft-edited', { timeout: 8000 });
  await page.click('#ftBody [data-path="welcome.md"]');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'welcome.md', null, { timeout: 8000 });
  const retainedSessionText = await page.evaluate(() => window.__fv.state.rawview.getValue());
  const sessionDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (/retained session edit/.test(retainedSessionText) && sessionDirty) pass('session sidebar retains edited files with an unsaved marker'); else fail('session retained=' + /retained session edit/.test(retainedSessionText) + ' dirty=' + sessionDirty);
  await page.evaluate(() => window.__fv.downloadCurrent());
  await page.waitForTimeout(150);

  // ── Preview sizing quick modes ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await page.click('#viewMode button[data-mode="split"]');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 15000 });
  await page.click('#settingsBtn');
  await page.waitForSelector('#set-previewWidthMode', { timeout: 8000 });
  async function previewBodyMetrics() {
    const pf = await frameOf('iframe.fv-preview-frame');
    await pf.waitForSelector('body', { timeout: 8000 });
    return pf.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      return {
        maxWidth: bodyStyle.maxWidth,
        marginLeft: bodyStyle.marginLeft,
        overflowX: htmlStyle.overflowX,
      };
    });
  }
  await page.selectOption('#set-previewWidthMode', 'page');
  await page.waitForTimeout(150);
  const pageSizing = await previewBodyMetrics();
  if (pageSizing.maxWidth === '820px') pass('preview sizing: A4/page mode uses 820px content width'); else fail('page preview maxWidth: ' + pageSizing.maxWidth);
  await page.selectOption('#set-previewWidthMode', 'phone');
  await page.waitForTimeout(150);
  const phoneSizing = await previewBodyMetrics();
  const phonePane = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
  if (phoneSizing.maxWidth === '390px' && phonePane < 430) pass('preview sizing: phone mode uses phone content and pane width'); else fail('phone sizing: max=' + phoneSizing.maxWidth + ' pane=' + Math.round(phonePane));
  await page.selectOption('#set-previewWidthMode', 'available');
  await page.waitForTimeout(150);
  const availableSizing = await previewBodyMetrics();
  if (availableSizing.maxWidth === 'none' && availableSizing.marginLeft === '0px' && availableSizing.overflowX === 'hidden') pass('preview sizing: available mode fills the pane without horizontal page scroll'); else fail('available sizing: ' + JSON.stringify(availableSizing));
  await page.selectOption('#set-previewWidthMode', 'unrestricted');
  await page.waitForTimeout(150);
  const unrestrictedSizing = await previewBodyMetrics();
  if (unrestrictedSizing.maxWidth === 'none' && unrestrictedSizing.overflowX === 'auto') pass('preview sizing: unrestricted mode removes width cap and allows x overflow'); else fail('unrestricted sizing: ' + JSON.stringify(unrestrictedSizing));
  await page.selectOption('#set-previewWidthMode', 'custom');
  await page.fill('#set-previewMaxWidth', '640');
  await page.dispatchEvent('#set-previewMaxWidth', 'change');
  await page.waitForTimeout(150);
  const customSizing = await previewBodyMetrics();
  const customMode = await page.evaluate(() => window.__fv.state.settingsModel.values.previewWidthMode);
  if (customMode === 'custom' && customSizing.maxWidth === '640px') pass('preview sizing: custom mode keeps numeric preview width'); else fail('custom sizing: mode=' + customMode + ' max=' + customSizing.maxWidth);
  const splitBoxForSizing = await (await page.$('#splitDivider')).boundingBox();
  const previewBoxForSizing = await (await page.$('#previewPane')).boundingBox();
  if (splitBoxForSizing && previewBoxForSizing) {
    await page.mouse.move(splitBoxForSizing.x + splitBoxForSizing.width / 2, splitBoxForSizing.y + splitBoxForSizing.height / 2);
    await page.mouse.down();
    await page.mouse.move(previewBoxForSizing.x + previewBoxForSizing.width - 35, splitBoxForSizing.y + splitBoxForSizing.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const dragMode = await page.evaluate(() => window.__fv.state.settingsModel.values.previewWidthMode);
    if (dragMode === 'custom') pass('preview sizing: split divider writes back as custom numeric width'); else fail('split divider sizing mode: ' + dragMode);
  } else fail('preview sizing: missing split divider boxes');
  await page.click('#scrim');

  // ── Mobile hardening (WP06) ── phone viewport: Preview-first + ⋯ overflow menu.
  const mctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const mpage = await mctx.newPage();
  mpage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[mobile] ' + m.text()); });
  mpage.on('pageerror', (e) => consoleErrors.push('[mobile] pageerror: ' + e.message));
  mpage.on('request', (req) => { const u = req.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) offOrigin.push(u); });
  await mpage.goto(origin, { waitUntil: 'load' });
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
    await op.goto(origin, { waitUntil: 'load' });
    // Default is cache-on-use: the pill rests at "idle" (offers an opt-in full save), it does
    // NOT auto-precache everything.
    await op.waitForSelector('#offlineStatus.idle', { timeout: 90000 });
    pass('offline precache is opt-in (pill rests at idle, no auto-precache)');
    const offlinePos = await op.$eval('#offlineStatus', (e) => {
      const s = getComputedStyle(e);
      return { position: s.position, left: s.left, bottom: s.bottom, hidden: e.hidden };
    });
    if (!offlinePos.hidden && offlinePos.position === 'fixed' && offlinePos.left === '12px' && offlinePos.bottom === '12px')
      pass('offline control stays fixed at bottom-left');
    else fail('offline control position: ' + JSON.stringify(offlinePos));
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
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await openExample('Sample.csv');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  const compareBtnShown = await page.$eval('#compareBtn', (e) => !e.closest('[hidden]'));
  if (compareBtnShown) pass('compare button available for an editable type'); else fail('compare button hidden for csv');
  await page.click('#compareBtn');
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, null, { timeout: 8000 });
  const targetLabel = await page.$eval('#compareBar .compare-label', (e) => e.textContent);
  if (/Drop a sidebar file/.test(targetLabel) && /choose a file/i.test(targetLabel)) pass('two-file compare: opens in-app drop target before picker');
  else fail('compare target label: ' + targetLabel);
  const sidebarDropCompared = await page.evaluate(() => {
    const bar = document.getElementById('compareBar');
    const data = new DataTransfer();
    data.setData('text/x-fv-tree-path', 'welcome.md');
    bar.dispatchEvent(new DragEvent('dragover', { dataTransfer: data, bubbles: true, cancelable: true }));
    bar.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
    return true;
  });
  if (sidebarDropCompared) pass('two-file compare: sidebar file can be dropped on target');
  await page.waitForFunction(() => /welcome\.md/i.test(document.querySelector('#compareBar .compare-label')?.textContent || ''), null, { timeout: 8000 });
  await page.waitForSelector('#editor .monaco-diff-editor', { timeout: 10000 });
  pass('two-file compare: sidebar drop starts Monaco diff');
  await page.click('#compareBar .compare-stop');
  await page.waitForFunction(() => document.getElementById('compareBar').hidden, null, { timeout: 4000 });
  await page.click('#compareBtn');
  // Feed the comparison file through the fallback input (Playwright sets files directly — no dialog).
  await page.setInputFiles('#compareInput', new URL('../../docs/examples/welcome.md', import.meta.url).pathname);
  await page.waitForFunction(() => /Comparing current.*welcome\.md/i.test(document.querySelector('#compareBar .compare-label')?.textContent || ''), null, { timeout: 8000 });
  const compLabel = await page.$eval('#compareBar .compare-label', (e) => e.textContent);
  if (/Comparing current/.test(compLabel) && /welcome\.md/i.test(compLabel)) pass('two-file compare: bar names the compared file'); else fail('compare label: ' + compLabel);
  await page.waitForSelector('#editor .monaco-diff-editor', { timeout: 10000 });
  pass('two-file compare: Monaco diff editor shown (current ↔ other)');
  const falseDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (!falseDirty) pass('two-file compare: edit-tracking untouched (no false unsaved-work)'); else fail('compare created false unsaved work');
  await page.click('#compareBar .compare-stop');
  await page.waitForFunction(() => document.getElementById('compareBar').hidden, null, { timeout: 4000 });
  pass('two-file compare: "Stop comparing" exits');

  // ── Split divider: drag must keep working across preview iframes and Monaco surfaces ──
  await page.goto(origin, { waitUntil: 'load' });
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

  // ── Side-by-side: each pane is a full, independent editor (source/preview toggle + download) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 15000 });
  const sbsShown = await page.$eval('#sbsBtn', (e) => !e.hidden);
  if (sbsShown) pass('side-by-side button shown for a previewable file'); else fail('sbs button hidden');
  await page.setInputFiles('#sbsInput', new URL('../../docs/examples/sample.csv', import.meta.url).pathname);
  await page.waitForSelector('.sbs-overlay', { timeout: 8000 });
  const sbsPanes = await page.$$eval('.sbs-pane', (els) => els.length);
  const sbsNames = await page.$$eval('.sbs-fname', (els) => els.map((e) => e.textContent));
  if (sbsPanes === 2 && sbsNames.some((n) => /welcome\.md/i.test(n)) && sbsNames.some((n) => /sample\.csv/i.test(n))) pass('side-by-side: two named panes (current + picked)'); else fail('sbs panes=' + sbsPanes + ' names=' + sbsNames.join(','));
  // Both panes are editable text types → both default to a Monaco source editor.
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.sbs-pane');
    return panes.length === 2 && [...panes].every((p) => p.querySelector('.sbs-source .monaco-editor'));
  }, null, { timeout: 20000 });
  pass('side-by-side: both panes mount an independent Monaco source editor');
  // (a) An editable pane exposes a Monaco controller you can type into; getValue() reflects it.
  const sbsEdit = await page.evaluate(() => {
    const panes = document.querySelector('.sbs-overlay').__sbsPanes;
    const rv0 = panes[0].rawview(); const rv1 = panes[1].rawview();
    const before0 = rv0.getValue();
    rv0.setValue(before0 + '\nedited pane 0');
    // Independence: editing pane 0 must NOT change pane 1.
    const pane1Unchanged = rv1.getValue().indexOf('edited pane 0') === -1;
    return { reflects: rv0.getValue().indexOf('edited pane 0') !== -1, pane1Unchanged };
  });
  if (sbsEdit.reflects) pass('side-by-side: editable pane Monaco accepts edits (getValue reflects)'); else fail('sbs pane edit not reflected');
  if (sbsEdit.pane1Unchanged) pass('side-by-side: panes are independent (editing one leaves the other untouched)'); else fail('sbs panes coupled');
  // (b) The Source/Preview toggle switches views (pane 0 → Preview re-renders from the edited text).
  await page.click('.sbs-pane:first-child .sbs-toggle[data-sbs-view="preview"]');
  await page.waitForFunction(() => {
    const host = document.querySelector('.sbs-pane:first-child .sbs-host');
    const src = host.querySelector('.sbs-source'), prev = host.querySelector('.sbs-preview');
    return src && prev && src.style.display === 'none' && prev.style.display !== 'none' && prev.childElementCount > 0;
  }, null, { timeout: 12000 });
  pass('side-by-side: Source/Preview toggle switches the pane view');
  // (c) Per-pane Download yields a download with the right filename.
  const [sbsDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('.sbs-pane:nth-child(2) .sbs-dl'),
  ]);
  if (/sample\.csv$/.test(sbsDl.suggestedFilename())) pass('side-by-side: per-pane Download preserves filename (' + sbsDl.suggestedFilename() + ')'); else fail('sbs download name: ' + sbsDl.suggestedFilename());
  // (d) Closing disposes both panes and removes the overlay.
  await page.click('.sbs-close');
  if (!(await page.$('.sbs-overlay'))) pass('side-by-side closes (panes disposed, overlay removed)'); else fail('sbs did not close');

  // ── Editor mode for Monaco code types (gcode): editable Monaco + Ctrl+S download ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('sample.gcode');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  const gcodeEditable = await page.evaluate(() => {
    const rv = window.__fv.state.rawview; const before = rv.getValue();
    rv.setValue(before + '\n; editor-mode test'); const after = rv.getValue();
    rv.setValue(before); return after !== before;
  });
  if (gcodeEditable) pass('editor mode: gcode Monaco is editable (readOnly off)'); else fail('gcode editor not editable');
  // Ctrl+S triggers a download with the filename preserved (the editor-mode save binding).
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue(rv.getValue() + '\n; saved'); });
  await page.waitForTimeout(300);
  const [gcodeDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.evaluate(() => window.__fv.downloadCurrent()),
  ]);
  if (/\.gcode$/.test(gcodeDl.suggestedFilename())) pass('editor mode: gcode Ctrl+S/download preserves filename (' + gcodeDl.suggestedFilename() + ')'); else fail('gcode download name: ' + gcodeDl.suggestedFilename());

  // ── Text utilities: selection-aware line sort + undoable edits (Ctrl+Z) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Sample.txt');
  await page.click('#viewMode button[data-mode="split"]');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.waitForFunction(() => !!window.__fv?.state?.rawview, null, { timeout: 8000 });
  // Plain text has no always-on format toolbar → the text-utilities bar is shown.
  const tuShown = await page.$eval('#textUtils', (e) => !e.hidden);
  if (tuShown) pass('text utils: utilities bar shown for plain text'); else fail('text utils bar hidden for plain text');

  // Sort with NOTHING selected → whole document; and the edit must be undoable (Ctrl+Z).
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('banana\napple\ncherry');
    rv.setSelection(1, 1, 1, 1);   // collapsed caret = no selection
  });
  await page.evaluate(() => document.querySelector('#textUtils [data-textutil="sortAsc"]').click());
  const sortedAll = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (sortedAll === 'apple\nbanana\ncherry') pass('text utils: sort with no selection sorts the whole document'); else fail('whole-doc sort: ' + JSON.stringify(sortedAll));
  // Undo reverts the sort — executeEdits stays on Monaco's undo stack (setValue would have wiped it).
  await page.evaluate(() => window.__fv.state.rawview.focus());
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  const undone = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (undone === 'banana\napple\ncherry') pass('text utils: Ctrl+Z undoes a sort (raw-editor undo preserved)'); else fail('undo after sort: ' + JSON.stringify(undone));

  // Sort WITH a selection → only the selected lines are reordered.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue('banana\napple\ncherry\ndate');
    rv.setSelection(1, 1, 2, 6);   // covers lines 1–2 ("banana","apple") only
  });
  await page.evaluate(() => document.querySelector('#textUtils [data-textutil="sortAsc"]').click());
  const sortedSel = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (sortedSel === 'apple\nbanana\ncherry\ndate') pass('text utils: sort with a selection sorts only the selected lines'); else fail('selection sort: ' + JSON.stringify(sortedSel));
  // The selection stays highlighted over the sorted block (not collapsed to a caret).
  const selAfter = await page.evaluate(() => {
    const r = window.__fv.state.rawview.selectionRange();
    return { empty: r.isEmpty(), text: window.__fv.state.rawview.selectionText() };
  });
  if (!selAfter.empty && selAfter.text === 'apple\nbanana') pass('text utils: selection stays highlighted over the sorted lines'); else fail('selection after sort: ' + JSON.stringify(selAfter));
  // The line/char count renders INLINE on the text-utils row; the standalone bar stays hidden.
  const countLayout = await page.evaluate(() => {
    const inline = document.getElementById('textUtilsCount');
    const bar = document.getElementById('wordCountBar');
    return { inlineShown: !!inline && !inline.hidden, inlineText: inline?.textContent || '', barHidden: !bar || bar.hidden };
  });
  if (countLayout.inlineShown && /chars/.test(countLayout.inlineText) && countLayout.barHidden) pass('text utils: line/char count shown inline on the toolbar row (no separate bar)'); else fail('count layout: ' + JSON.stringify(countLayout));

  // ── Trim variants (trim / ltrim / rtrim) + whitespace-vs-lines mode (remembered) ──
  // Default mode = whitespace only: Trim R strips trailing whitespace but keeps blank lines.
  await page.evaluate(() => {
    try { localStorage.setItem('fv:textutil:trimMode', 'ws'); } catch {}
    const rv = window.__fv.state.rawview; rv.setValue('a  \n\nb  '); rv.setSelection(1, 1, 1, 1);
  });
  await page.evaluate(() => document.querySelector('#textUtils [data-textutil="rtrim"]').click());
  const rtrimmed = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (rtrimmed === 'a\n\nb') pass('text utils: Trim R strips trailing whitespace, keeps blank lines'); else fail('rtrim: ' + JSON.stringify(rtrimmed));
  // Trim L strips leading whitespace per line.
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue('  a\n   b'); rv.setSelection(1, 1, 1, 1); });
  await page.evaluate(() => document.querySelector('#textUtils [data-textutil="ltrim"]').click());
  const ltrimmed = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (ltrimmed === 'a\nb') pass('text utils: Trim L strips leading whitespace'); else fail('ltrim: ' + JSON.stringify(ltrimmed));
  // Mode = whitespace + blank lines: Trim also drops blank lines.
  await page.evaluate(() => {
    try { localStorage.setItem('fv:textutil:trimMode', 'ws+lines'); } catch {}
    const rv = window.__fv.state.rawview; rv.setValue('a  \n   \nb'); rv.setSelection(1, 1, 1, 1);
  });
  await page.evaluate(() => document.querySelector('#textUtils [data-textutil="trim"]').click());
  const trimDropped = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (trimDropped === 'a\nb') pass('text utils: Trim in "whitespace + lines" mode drops blank lines'); else fail('trim+lines: ' + JSON.stringify(trimDropped));
  // The mode split-button opens a dropdown; picking an option persists to localStorage + updates the label.
  await page.evaluate(() => { try { localStorage.setItem('fv:textutil:trimMode', 'ws'); } catch {} });
  await page.click('#trimModeBtn');
  await page.waitForSelector('.tu-mode-menu', { timeout: 4000 });
  await page.click('.tu-mode-item:has-text("blank lines")');
  const modePersist = await page.evaluate(() => ({
    ls: (() => { try { return localStorage.getItem('fv:textutil:trimMode'); } catch { return null; } })(),
    label: document.getElementById('trimModeBtn')?.textContent || '',
  }));
  if (modePersist.ls === 'ws+lines' && /lines/i.test(modePersist.label)) pass('text utils: trim-mode split button persists choice (localStorage) + updates label'); else fail('trim mode persist: ' + JSON.stringify(modePersist));

  await page.evaluate(() => { window.__fv.state.downloadedSinceEdit = true; window.__fv.state.sessionEdits.clear(); });

  // ── Type documentation opens as a centered modal dialog (not a side drawer) ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  await page.waitForSelector('#typeHelpBtn:not([hidden])', { timeout: 8000 });
  await page.click('#typeHelpBtn');
  await page.waitForFunction(() => document.getElementById('typeHelpDialog')?.open, null, { timeout: 6000 });
  const helpModal = await page.evaluate(() => {
    const d = document.getElementById('typeHelpDialog');
    return { isDialog: d?.tagName === 'DIALOG', open: !!d?.open, modal: !!d?.matches?.(':modal') };
  });
  if (helpModal.isDialog && helpModal.open && helpModal.modal) pass('type help: opens as a centered modal <dialog> (not a drawer)'); else fail('type help modal: ' + JSON.stringify(helpModal));
  await page.click('#typeHelpDialog [data-close]');
  await page.waitForFunction(() => !document.getElementById('typeHelpDialog')?.open, null, { timeout: 4000 });
  pass('type help: close button dismisses the modal');

  // ── Markdown heading levels + WYSIWYG compare/side-by-side handoff ──
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });
  // Make sure we're in Monaco (not auto-restored WYSIWYG) for the source-path heading test.
  if (await page.evaluate(() => !!window.__fv.state.wysiwygActive)) {
    await page.evaluate(() => document.getElementById('wysiwygBtn').click());
    await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  }
  // The "H" button opens a level picker; choosing Heading 3 applies ### in the source.
  await page.evaluate(() => { const rv = window.__fv.state.rawview; rv.setValue('Section title'); rv.setSelection(1, 1, 1, 1); });
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="heading"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.md-heading-menu', { timeout: 4000 });
  await page.click('.md-heading-item[data-level="3"]');
  const h3src = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (h3src === '### Section title') pass('markdown heading menu: applies H3 in the source editor'); else fail('heading H3 source: ' + JSON.stringify(h3src));

  // In WYSIWYG the same picker toggles a real heading node (H2), and the line-based text utils hide.
  await page.evaluate(() => window.__fv.state.rawview.setValue('Visual heading'));
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .tiptap-host .ProseMirror', { timeout: 15000 });
  await page.click('#editor .tiptap-host .ProseMirror');
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="heading"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.md-heading-menu', { timeout: 4000 });
  await page.click('.md-heading-item[data-level="2"]');
  const h2wys = await page.evaluate(() => !!document.querySelector('#editor .tiptap-host .ProseMirror h2'));
  if (h2wys) pass('markdown heading menu: applies H2 in the WYSIWYG editor'); else fail('WYSIWYG H2 not applied');
  const tuHidden = await page.evaluate(() => !!document.getElementById('textUtils')?.hidden);
  if (tuHidden) pass('WYSIWYG: line-based text utils (sort/trim/dedup) hidden'); else fail('textUtils visible in WYSIWYG');

  // Compare button while WYSIWYG is active → exits to the Monaco raw editor + shows the flashing compare bar.
  await page.evaluate(() => document.getElementById('compareBtn').click());
  await page.waitForSelector('#editor .monaco-editor', { timeout: 15000 });
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, null, { timeout: 8000 });
  const afterCompare = await page.evaluate(() => ({
    wys: !!window.__fv.state.wysiwygActive,
    flash: document.getElementById('compareBar').classList.contains('flash'),
  }));
  if (!afterCompare.wys && afterCompare.flash) pass('compare in WYSIWYG: switches back to raw view + flashes the drop target'); else fail('compare-from-wysiwyg: ' + JSON.stringify(afterCompare));
  await page.click('#compareBar .compare-stop');
  await page.evaluate(() => { window.__fv.state.downloadedSinceEdit = true; window.__fv.state.sessionEdits.clear(); });
}
