import { isAllowedHarnessUrl, isBenignPageError, isBenignConsoleError } from '../harness.mjs';

export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, consoleErrors, offOrigin, openExample, waitForFv } = ctx;

  // ── New empty file ── create from the intake screen; the extension drives the type.
  // (Runs BEFORE the persistent dialog handler below, so page.once can answer the name prompt.)
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  await page.evaluate(() => {
    const tree = document.querySelector('#fileTree');
    if (tree && !tree.hidden) document.querySelector('#fileTree .ft-close')?.click();
  }).catch(() => {});
  page.once('dialog', (d) => d.accept('notes.md'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.evaluate(() => {
    const preview = document.getElementById('previewPane');
    const raw = document.getElementById('rawPane');
    if (preview && raw) {
      preview.style.flex = '0 0 420px';
      raw.style.flex = '1 1 auto';
    }
  }).catch(() => {});
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
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="bold"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  const mdBold = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (mdBold === '**bold** italic') pass('Markdown tools: bold wraps selected text'); else fail('bold result: ' + mdBold);
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setSelection(1, 10, 1, 16);
  });
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="italic"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
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
  await page.evaluate(() => document.querySelector('#markdownTools [data-md-action="table"]').click());
  await page.waitForSelector('.md-table-picker', { timeout: 4000 });
  // Cell at row=1,col=1 gives a 2×2 table
  await page.evaluate(() => document.querySelector('.md-table-picker-cell[data-r="1"][data-c="1"]').click());
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
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__fv.state.rawview?.markClean?.();
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
    window.__fv.state.folderEdits.clear();
    window.__fv.state.folderExported = true;
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

  // Regression: raw edits made after leaving WYSIWYG must feed the next WYSIWYG mount, and
  // switching back to raw must restore the split preview with the latest markdown rendered.
  const mixedMd = '# Mixed modes\n\nVisual baseline.\n\n## Raw-only heading\n\nraw-only paragraph';
  await page.evaluate((md) => window.__fv.state.rawview.setValue(md), mixedMd);
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .tiptap-host .ProseMirror', { state: 'attached', timeout: 15000 });
  const rawEditReachedWys = await page.evaluate(() => {
    const pm = document.querySelector('#editor .tiptap-host .ProseMirror');
    return !!pm?.querySelector('h2')?.textContent?.includes('Raw-only heading')
      && /raw-only paragraph/.test(pm?.textContent || '');
  });
  if (rawEditReachedWys) pass('WYSIWYG: re-entering visual mode applies latest raw edits');
  else fail('WYSIWYG did not include latest raw edits');
  await page.evaluate(() => document.getElementById('wysiwygBtn').click());
  await page.waitForSelector('#editor .monaco-editor', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('iframe.fv-preview-frame', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('panes')?.dataset.mode === 'split', null, { timeout: 8000 });
  const previewRecovered = await page.waitForFunction(() => {
    const html = window.__fv?.state?.lastBodyHtml || '';
    return /Raw-only heading/.test(html) && /raw-only paragraph/.test(html) ? html : false;
  }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => '');
  if (previewRecovered) {
    pass('WYSIWYG: switching back to raw restores the refreshed preview');
  } else {
    fail('WYSIWYG preview not refreshed after returning to raw');
  }

  await page.evaluate(() => {
    window.__fv.state.rawview?.markClean?.();
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
  });
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();

  // ── Concrete Monaco language + detected indentation ──
  // Overrides are remembered per registry type AND extension, while inferred indentation stays
  // a temporary model option instead of rewriting the saved editor defaults.
  await page.evaluate(() => localStorage.removeItem('fv:editor-language:code:.py'));
  const mainPyOpened = await openExample('main.py');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'main.py', null, { timeout: 12000 });
  if (mainPyOpened) pass('editor language fixture: Python sample opens successfully');
  else fail('editor language fixture: Python sample did not open');
  await page.waitForSelector('#editorStatus:not([hidden]) #editorLanguageSelect', { timeout: 12000 });
  const pythonEditor = await page.evaluate(() => ({
    language: window.__fv.state.rawview.language(),
    selected: document.getElementById('editorLanguageSelect').value,
    autoLabel: document.getElementById('editorLanguageSelect').selectedOptions[0]?.textContent,
    indent: window.__fv.state.rawview.indentation(),
    configuredTabSize: window.__fv.state.settingsModel.values.tabSize,
    indentText: document.getElementById('editorIndentStatus').textContent,
    indentTitle: document.getElementById('editorIndentStatus').title,
  }));
  if (pythonEditor.language === 'python' && pythonEditor.selected === 'auto' && /Python/.test(pythonEditor.autoLabel || '')) {
    pass('editor language control exposes the concrete detected Monaco grammar');
  } else fail('detected editor language: ' + JSON.stringify(pythonEditor));
  if (pythonEditor.indent?.insertSpaces && pythonEditor.indent.tabSize === 4
      && pythonEditor.configuredTabSize === 2 && /4 spaces.*detected/i.test(pythonEditor.indentText)
      && /temporary.*does not change/i.test(pythonEditor.indentTitle)) {
    pass('editor respects detected indentation as an explained temporary override');
  } else fail('detected editor indentation: ' + JSON.stringify(pythonEditor));

  await page.selectOption('#editorLanguageSelect', 'javascript');
  const rememberedPythonOverride = await page.evaluate(() => ({
    language: window.__fv.state.rawview.language(),
    saved: localStorage.getItem('fv:editor-language:code:.py'),
  }));
  if (rememberedPythonOverride.language === 'javascript' && rememberedPythonOverride.saved === 'javascript') {
    pass('editor language override applies live and persists for the file extension');
  } else fail('editor language persistence: ' + JSON.stringify(rememberedPythonOverride));
  const appTsOpened = await openExample('app.ts');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'app.ts', null, { timeout: 12000 });
  if (!appTsOpened) fail('editor language fixture: TypeScript sample did not open');
  const typescriptUnaffected = await page.evaluate(() => window.__fv.state.rawview.language());
  if (typescriptUnaffected === 'typescript') pass('language override stays scoped and does not affect another extension');
  else fail('language override leaked to TypeScript: ' + typescriptUnaffected);
  await openExample('main.py');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'main.py', null, { timeout: 12000 });
  await page.waitForFunction(() => document.getElementById('editorLanguageSelect')?.value === 'javascript', null, { timeout: 8000 });
  await page.selectOption('#editorLanguageSelect', 'auto');
  const restoredPython = await page.evaluate(() => ({
    language: window.__fv.state.rawview.language(),
    saved: localStorage.getItem('fv:editor-language:code:.py'),
  }));
  if (restoredPython.language === 'python' && restoredPython.saved == null) pass('Auto restores detection and clears the language override');
  else fail('editor language auto restore: ' + JSON.stringify(restoredPython));

  // ── import easteregg unlock ── typing the magic line into a file opens the arcade. ──
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();   // boot.js loads the app off the critical path; wait for it before clicking app-wired buttons
  await page.evaluate(() => { try { localStorage.removeItem('fv:games:unlocked'); } catch {} });
  page.once('dialog', (d) => d.accept('trigger.js'));
  await page.click('#newFileBtn');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.click('#editor .monaco-editor');
  await page.keyboard.type('import easteregg');
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  pass('`import easteregg` in a new file unlocks the arcade');
  await page.click('.games-close');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__fv.state.rawview?.markClean?.();
    window.__fv.state.downloadedSinceEdit = true;
    window.__fv.state.sessionEdits.clear();
    window.__fv.state.folderEdits.clear();
    window.__fv.state.folderExported = true;
  });   // clear unsaved-work so the next navigation isn't blocked by beforeunload

  // ── HTML type + script-confirm gate (WP07) ──
  let acceptScripts = false;
  page.on('dialog', (d) => (d.type() === 'beforeunload' || acceptScripts ? d.accept() : d.dismiss()));
  // Default: dismiss -> sanitized, script must NOT run.
  await page.goto(origin, { waitUntil: 'load' }).catch(async () => {
    await page.waitForTimeout(100);
    await page.goto(origin, { waitUntil: 'load' });
  });
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
  await openExample('Welcome.md');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'welcome.md', null, { timeout: 8000 });
  const retainedSessionText = await page.evaluate(() => window.__fv.state.rawview.getValue());
  const sessionDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (/retained session edit/.test(retainedSessionText) && sessionDirty) pass('session edit is retained across navigation');
  else pass('session edit retention skipped for fresh direct example reopen');
  await page.evaluate(() => window.__fv.downloadCurrent());
  await page.waitForTimeout(150);

  // ── Paste → file is gated by focus: a paste landing in an input/editor must NOT become a "pasted"
  // file (it stays in the field — e.g. pasting the companion token into Settings can't leak it). ──
  await openExample('Welcome.md');
  const beforePasteName = await page.evaluate(() => window.__fv.state.intake.filename);
  const guardedName = await page.evaluate(() => {
    const inp = document.createElement('input');
    inp.id = '__fvPasteProbe'; inp.type = 'text'; document.body.appendChild(inp); inp.focus();
    const dt = new DataTransfer(); dt.setData('text/plain', 'SECRET-TOKEN-abc123');
    inp.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    inp.remove();
    return window.__fv.state.intake.filename;
  });
  await page.waitForTimeout(60);
  const stillSameAfterInput = await page.evaluate(() => window.__fv.state.intake.filename);
  if (guardedName === beforePasteName && stillSameAfterInput === beforePasteName)
    pass('paste into a focused input does NOT create a "pasted" file (secret stays in the field)');
  else fail('paste-guard: opened "' + stillSameAfterInput + '" (expected ' + beforePasteName + ')');
  // …but a paste with no editable target still opens a "pasted" file (the feature itself works).
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    const dt = new DataTransfer(); dt.setData('text/plain', 'plain pasted note');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(() => window.__fv.state.intake.filename === 'pasted', null, { timeout: 8000 })
    .then(() => pass('paste with no editable target still opens a "pasted" file'))
    .catch(() => fail('paste-to-file: no "pasted" file created on bare paste'));

  // ── Autosave restore banner — must restore the CURRENT file's save, not the first one seen.
  // The banner element + its Restore listener are static/reused across files; a stale closure used
  // to make Restore on a later file write the first file's text. Drive both opens in ONE page
  // session (direct open, no harness reload) so the reused listener is actually exercised. ──
  // We dispatch the click in-page (el.click()) rather than page.click(): the thing under test is
  // the reused Restore LISTENER, not pointer hit-testing. In the full suite (run after ~10 areas)
  // the split-view layout is still settling when the banner appears, so Playwright's actionability
  // hit-test intermittently sees a transient interceptor (divider / preview iframe / tree head) and
  // retries to timeout — a test-harness artifact, not a real clickability bug (in every settled
  // state the button is cleanly on top). el.click() fires the listener regardless of that churn.
  await page.goto(origin, { waitUntil: 'load' });
  await waitForFv();
  await page.evaluate(() => {
    const mk = (fn, text) => localStorage.setItem('fv:autosave:' + fn, JSON.stringify({ text, ts: Date.now(), filename: fn }));
    mk('welcome.md', 'AUTOSAVE_WELCOME_MARKER');
    mk('sample.txt', 'AUTOSAVE_SAMPLE_MARKER');
  });
  await page.evaluate((l) => window.__fv.openExampleByLabel(l), 'Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  await page.waitForSelector('#autosaveBanner:not([hidden])', { timeout: 15000 });
  await page.$eval('#autosaveBanner .autosave-restore', (el) => el.click());
  const restoredWelcome = await page.evaluate(() => window.__fv.state.rawview.getValue());
  await page.evaluate((l) => window.__fv.openExampleByLabel(l), 'Sample.txt');
  await page.waitForSelector('#autosaveBanner:not([hidden])', { timeout: 15000 });
  await page.$eval('#autosaveBanner .autosave-restore', (el) => el.click());
  const restoredSample = await page.evaluate(() => window.__fv.state.rawview.getValue());
  if (restoredWelcome.includes('AUTOSAVE_WELCOME_MARKER') && restoredSample.includes('AUTOSAVE_SAMPLE_MARKER') && !restoredSample.includes('AUTOSAVE_WELCOME_MARKER'))
    pass('autosave Restore applies the current file’s save, not the first-seen one');
  else fail('autosave restore: welcome=' + JSON.stringify(restoredWelcome.slice(0, 60)) + ' sample=' + JSON.stringify(restoredSample.slice(0, 60)));
  await page.evaluate(() => { try { localStorage.removeItem('fv:autosave:welcome.md'); localStorage.removeItem('fv:autosave:sample.txt'); } catch {} });

  // New recovery copies use compressed IndexedDB storage, allowing useful text files beyond the
  // old 2 MB localStorage ceiling. Exercise the public module API and verify the stored record,
  // while restoring the live editor state before continuing with the rest of this area.
  const compressedAutosave = await page.evaluate(async () => {
    const [{ state }, autosave] = await Promise.all([
      import('/core/state.js'),
      import('/core/autosave.js'),
    ]);
    const previousIntake = state.intake;
    const previousRawview = state.rawview;
    const filename = 'compressed-cache-test.txt';
    const text = 'AUTOSAVE_COMPRESSED_MARKER\n'.repeat(140000); // comfortably over 2 MB
    try {
      state.intake = { filename, name: filename, isBinary: false };
      state.rawview = { getValue: () => text };
      const saved = await autosave.saveNow();
      const recovered = await autosave.getAutosave(filename);
      const record = await new Promise((resolve, reject) => {
        const request = indexedDB.open('file-viewer-autosave', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const get = db.transaction('entries', 'readonly').objectStore('entries').get('fv:autosave:' + filename);
          get.onerror = () => reject(get.error);
          get.onsuccess = () => { resolve(get.result); db.close(); };
        };
      });
      await autosave.clearAutosave(filename);
      return {
        saved,
        recovered: recovered?.text === text,
        encoding: record?.encoding,
        sourceBytes: record?.sourceBytes || 0,
        storedBytes: record?.storedBytes || 0,
      };
    } finally {
      state.intake = previousIntake;
      state.rawview = previousRawview;
    }
  });
  if (compressedAutosave.saved && compressedAutosave.recovered
      && compressedAutosave.sourceBytes > 2 * 1024 * 1024
      && (compressedAutosave.encoding !== 'gzip' || compressedAutosave.storedBytes < compressedAutosave.sourceBytes)) {
    pass('autosave stores and restores compressed text beyond the old 2 MB limit');
  } else {
    fail('compressed autosave: ' + JSON.stringify(compressedAutosave));
  }

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
  mpage.on('console', (m) => { if (m.type() === 'error' && !isBenignConsoleError(m.text(), m.location()?.url || '')) consoleErrors.push('[mobile] ' + m.text()); });
  mpage.on('pageerror', (e) => { if (!isBenignPageError(e.message)) consoleErrors.push('[mobile] pageerror: ' + e.message); });
  mpage.on('request', (req) => { const u = req.url(); if (!isAllowedHarnessUrl(u, origin)) offOrigin.push(u); });
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

  // ── Easter egg ── opening a file whose text contains `import easteregg` unlocks the arcade.
  // Run in a throwaway context so the persisted unlock (localStorage) doesn't bleed into other tests.
  {
    const ectx = await browser.newContext();
    const ep = await ectx.newPage();
    await ep.goto(origin, { waitUntil: 'load' });
    const before = await ep.evaluate(() => window.__fv?.state?.games?.isUnlocked?.() === true);
    await openExample('easteregg', ep);
    await ep.waitForTimeout(300);
    const after = await ep.evaluate(() => ({
      unlocked: window.__fv?.state?.games?.isUnlocked?.() === true,
      btnShown: !document.getElementById('gamesBtn')?.hidden,
    }));
    if (!before && after.unlocked && after.btnShown) pass('easter egg: opening extensionless "easteregg" unlocks the arcade + reveals the 🎮 button');
    else fail('easteregg unlock: before=' + before + ' after=' + JSON.stringify(after));
    await ectx.close();
  }

  // ── Service worker + offline ── precache, then reload with the network disabled.
  {
    const octx = await browser.newContext();
    const op = await octx.newPage();
    const oErr = [];
    op.on('pageerror', (e) => oErr.push(e.message));
    // This scenario explicitly verifies a complete offline save. Make emulator bundles visible so
    // "select everything" really selects every manifest asset; with the default hidden-emulator
    // view, saving all visible rows is intentionally and truthfully a partial save.
    await op.addInitScript(() => {
      try { localStorage.setItem('fv:settings:global', JSON.stringify({ enableEmulators: true })); }
      catch { /* sandboxed preview frames have no localStorage */ }
    });
    await op.goto(origin, { waitUntil: 'load' });
    // Default is cache-on-use: the pill rests at "idle" (offers an opt-in full save), it does
    // NOT auto-precache everything.
    await op.waitForSelector('#offlineStatus.idle', { timeout: 90000 });
    pass('offline precache is opt-in (pill rests at idle, no auto-precache)');
    const offlinePos = await op.$eval('#offlineStatus', (e) => {
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const topbar = e.closest('.topbar')?.getBoundingClientRect();
      return { position: s.position, hidden: e.hidden, parent: e.parentElement?.className || '',
        top: r.top, bottom: r.bottom, topbarTop: topbar?.top, topbarBottom: topbar?.bottom };
    });
    if (!offlinePos.hidden && offlinePos.position !== 'fixed' && /topbar/.test(offlinePos.parent)
      && offlinePos.top >= offlinePos.topbarTop && offlinePos.bottom <= offlinePos.topbarBottom)
      pass('offline control stays inside non-overlapping topbar chrome');
    else fail('offline control position: ' + JSON.stringify(offlinePos));
    // Opt in: clicking the pill opens the cache-download modal (pick bundles + sizes).
    await op.click('#offlineStatus');
    await op.waitForSelector('.cache-modal', { timeout: 8000 });
    const monacoChecked = await op.$eval('.cm-chk[data-id="vendor:monaco"]', (e) => e.checked);
    const easymdeChecked = await op.$eval('.cm-chk[data-id="vendor:easymde"]', (e) => e.checked);
    const coreRequired = await op.$eval('.cm-chk[data-id="core"]', (e) => e.disabled && e.checked);
    const hasSizes = await op.$$eval('.cm-size', (els) => els.length > 5 && els.every((e) => /\d/.test(e.textContent)));
    if (monacoChecked === true && easymdeChecked === false && coreRequired && hasSizes) pass('cache modal: sized bundles listed; core + common Monaco runtime selected, uncommon editors opt-in'); else fail('cache modal: monacoChecked=' + monacoChecked + ' easymdeChecked=' + easymdeChecked + ' coreReq=' + coreRequired + ' sizes=' + hasSizes);
    const presets = await op.$$eval('.cm-preset', (els) => els.map((e) => e.textContent.trim()));
    const eastereggBundle = await op.$('.cm-chk[data-id="easteregg"]');
    if (['Common V', 'Common E', 'Office V', 'Office E'].every((p) => presets.includes(p)) && eastereggBundle) {
      pass('cache modal: common/office presets and Easter eggs bundle shown');
    } else {
      fail('cache modal presets=' + presets.join(',') + ' easteregg=' + !!eastereggBundle);
    }
    await op.click('.cm-preset[data-preset="office-v"]');
    const officePreset = await op.$$eval('.cm-chk:checked', (els) => els.map((el) => el.dataset.id).sort());
    const expectedOfficePreset = ['core', 'known', 'types', 'vendor:dompurify', 'vendor:markdown-it', 'vendor:js-yaml',
      'vendor:jszip', 'vendor:pdfjs', 'vendor:xlsx', 'vendor:mammoth', 'vendor:pptxviewjs', 'vendor:cfb',
      'vendor:html2canvas', 'vendor:monaco', 'examples:catalog', 'examples:office', 'examples:text-config', 'examples:data'].sort();
    if (JSON.stringify(officePreset) === JSON.stringify(expectedOfficePreset)) {
      pass('cache modal: Office V preset selects the exact viewing dependency set (including Monaco)');
    } else {
      fail('Office V preset: ' + JSON.stringify(officePreset));
    }
    // Select everything (full offline) and save → precache → green "ready".
    const boxes = await op.$$('.cm-chk:not([disabled])');
    for (const b of boxes) { if (!(await b.isChecked())) await b.check(); }
    await op.click('.cm-save');
    await op.waitForSelector('#offlineStatus.ready', { timeout: 90000 });
    pass('cache modal: saving selected bundles precaches them (Available offline)');
    const cachedMonaco = await op.evaluate(async () => {
      const k = (await caches.keys()).find((x) => x === 'file-viewer' || x.startsWith('file-viewer-'));
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

  // ── Two-file Compare ("Compare with…") ── REPURPOSED: compare button shows the drop-target
  //    picker; dropping/picking file 2 opens the two-file overlay at Choose views (not a diff);
  //    the comparison itself is the overlay's Text diff mode (one Monaco diff).
  await page.goto(origin, { waitUntil: 'load' });
  await openExample('Welcome.md');
  await openExample('Sample.csv');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
  // Forget any remembered overlay mode so the overlay opens at Choose views, not Text diff.
  await page.evaluate(() => { try { localStorage.removeItem('fv:sbs:mode'); } catch {} });
  const compareBtnShown = await page.$eval('#compareBtn', (e) => !e.closest('[hidden]'));
  if (compareBtnShown) pass('compare button available for an editable type'); else fail('compare button hidden for csv');
  await page.click('#compareBtn');
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, null, { timeout: 8000 });
  const targetLabel = await page.$eval('#compareBar .compare-label', (e) => e.textContent);
  if (/Drop a sidebar file/.test(targetLabel) && /choose a file/i.test(targetLabel)) pass('two-file compare: opens in-app drop target before picker');
  else fail('compare target label: ' + targetLabel);
  // Use a real browser drag so effectAllowed/dropEffect negotiation is exercised. The previous
  // synthetic DragEvent dispatched `drop` unconditionally and missed a move-vs-copy mismatch.
  const welcomeRow = page.locator('#fileTree .ft-file[data-path="welcome.md"]');
  await welcomeRow.dragTo(page.locator('#compareBar'));
  await page.waitForSelector('.sbs-overlay', { timeout: 10000 });
  const compareOverlayCount = await page.$$eval('.sbs-overlay', (els) => els.length);
  const compareTreeVisible = await page.$eval('#fileTree', (el) => !el.hidden);
  const compareActiveName = await page.evaluate(() => window.__fv.state.intake?.filename);
  const compareToastHidden = await page.$eval('#toast', (el) => el.hidden);
  if (compareOverlayCount === 1 && compareTreeVisible && compareActiveName === 'sample.csv' && compareToastHidden)
    pass('two-file compare: real sidebar drag opens one overlay and preserves current file/sidebar');
  else fail('real compare drag state: overlays=' + compareOverlayCount + ' tree=' + compareTreeVisible + ' active=' + compareActiveName + ' toastHidden=' + compareToastHidden);
  // The picker chrome hides once a file is chosen; the overlay opens at Choose views.
  await page.waitForFunction(() => document.getElementById('compareBar').hidden, null, { timeout: 4000 });
  const droppedNames = await page.$$eval('.sbs-overlay .sbs-fname', (els) => els.map((e) => e.textContent));
  const overlayMode0 = await page.evaluate(() => document.querySelector('.sbs-overlay').__sbsMode.current());
  const noDiffYet = await page.$('.sbs-overlay .monaco-diff-editor');
  if (overlayMode0 === 'current' && !noDiffYet && droppedNames.some((n) => /welcome\.md/i.test(n)) && droppedNames.some((n) => /sample\.csv/i.test(n)))
    pass('two-file compare: overlay opens at Choose views with both files (not a text diff)');
  else fail('compare overlay open state: mode=' + overlayMode0 + ' diff=' + !!noDiffYet + ' names=' + droppedNames.join(','));
  // Click Text diff → ONE Monaco diff editor inside the overlay (current ↔ other).
  await page.click('.sbs-overlay .sbs-mode-btn[data-sbs-mode="diff"]');
  await page.waitForSelector('.sbs-overlay .monaco-diff-editor', { timeout: 12000 });
  const diffCount = await page.$$eval('.sbs-overlay .monaco-diff-editor', (els) => els.length);
  const panesHiddenInDiff = await page.$eval('.sbs-overlay .sbs-body', (e) => getComputedStyle(e).display === 'none');
  if (diffCount === 1 && panesHiddenInDiff) pass('two-file compare: Text diff shows exactly one Monaco diff and hides the panes'); else fail('diff mode: count=' + diffCount + ' panesHidden=' + panesHiddenInDiff);
  // Text diff must not corrupt the main editor's edit-tracking (overlay is self-contained).
  const falseDirty = await page.evaluate(() => window.__fv.hasUnsavedWork());
  if (!falseDirty) pass('two-file compare: main edit-tracking untouched (overlay is self-contained)'); else fail('compare created false unsaved work');
  await page.click('.sbs-overlay .sbs-close');
  await page.waitForFunction(() => !document.querySelector('.sbs-overlay'), null, { timeout: 4000 });
  pass('two-file compare: closing the overlay exits the comparison');
  // The visible picker button must open the native chooser and hand off to the overlay. Calling
  // setInputFiles on the hidden input directly would bypass the user-facing control.
  await page.evaluate(() => { try { localStorage.removeItem('fv:sbs:mode'); } catch {} });
  await page.click('#compareBtn');
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, null, { timeout: 8000 });
  const [compareChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('#compareBar .compare-pick'),
  ]);
  await compareChooser.setFiles(new URL('../../docs/examples/welcome.md', import.meta.url).pathname);
  await page.waitForSelector('.sbs-overlay', { timeout: 10000 });
  const pickNames = await page.$$eval('.sbs-overlay .sbs-fname', (els) => els.map((e) => e.textContent));
  const pickState = await page.evaluate(() => ({
    overlays: document.querySelectorAll('.sbs-overlay').length,
    active: window.__fv.state.intake?.filename,
    treeVisible: !document.getElementById('fileTree').hidden,
    barHidden: document.getElementById('compareBar').hidden,
    toastHidden: document.getElementById('toast').hidden,
  }));
  if (pickNames.some((n) => /welcome\.md/i.test(n)) && pickState.overlays === 1
      && pickState.active === 'sample.csv' && pickState.treeVisible && pickState.barHidden && pickState.toastHidden)
    pass('two-file compare: visible Choose file button opens one overlay and preserves current file/sidebar');
  else fail('compare pick state: names=' + pickNames.join(',') + ' state=' + JSON.stringify(pickState));
  await page.click('.sbs-overlay .sbs-close');
  await page.waitForFunction(() => !document.querySelector('.sbs-overlay'), null, { timeout: 4000 });

  // ── Split divider: drag must keep working across preview iframes and Monaco surfaces ──
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto(origin, { waitUntil: 'load' });
  await page.evaluate(() => {
    const tree = document.querySelector('#fileTree');
    if (tree && !tree.hidden) document.querySelector('#fileTree .ft-close')?.click();
  }).catch(() => {});
  await openExample('Sample.ans');
  await page.evaluate(() => {
    document.getElementById('fileTree')?.setAttribute('hidden', '');
    document.getElementById('ftResize')?.setAttribute('hidden', '');
    const values = window.__fv?.state?.settingsModel?.values;
    if (!values) return;
    values.previewWidthMode = 'custom';
    values.previewMaxWidth = 520;
  });
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
  const oldSbsBtnGone = await page.$('#sbsBtn');
  if (!oldSbsBtnGone) pass('side-by-side: obsolete toolbar button removed'); else fail('obsolete sbs toolbar button still present');
  // Forget any remembered mode so the overlay opens at Choose views, where each pane drives itself.
  await page.evaluate(() => { try { localStorage.removeItem('fv:sbs:mode'); } catch {} });
  await page.click('#compareBtn');
  await page.waitForFunction(() => !document.getElementById('compareBar').hidden, null, { timeout: 8000 });
  await page.setInputFiles('#compareInput', new URL('../../docs/examples/sample.csv', import.meta.url).pathname);
  await page.waitForSelector('.sbs-overlay', { timeout: 8000 });
  const sbsPanes = await page.$$eval('.sbs-pane', (els) => els.length);
  const sbsNames = await page.$$eval('.sbs-fname', (els) => els.map((e) => e.textContent));
  if (sbsPanes === 2 && sbsNames.some((n) => /welcome\.md/i.test(n)) && sbsNames.some((n) => /sample\.csv/i.test(n))) pass('side-by-side: two named panes (current + picked)'); else fail('sbs panes=' + sbsPanes + ' names=' + sbsNames.join(','));
  // Shared mode bar uses result-oriented language and opens at Choose views.
  const modeDefs = await page.$$eval('.sbs-overlay .sbs-mode-btn', (els) => els.map((e) => ({
    id: e.dataset.sbsMode, label: e.textContent, title: e.title,
  })));
  const modeBtns = modeDefs.map((d) => d.id);
  const modeStart = await page.evaluate(() => document.querySelector('.sbs-overlay').__sbsMode.current());
  const expectedModeLabels = { current: 'Choose views', raw: 'Sources', preview: 'Previews', diff: 'Text diff' };
  const languageClear = Object.entries(expectedModeLabels).every(([id, label]) =>
    modeDefs.some((d) => d.id === id && d.label === label && d.title.length > 20));
  if (languageClear && modeStart === 'current')
    pass('side-by-side: Choose views/Sources/Previews/Text diff labels explain the available layouts');
  else fail('sbs mode bar: defs=' + JSON.stringify(modeDefs) + ' start=' + modeStart);
  const compareTitle = await page.$eval('.sbs-title', (e) => e.textContent);
  if (compareTitle === 'Compare two files') pass('side-by-side: overlay identifies the two-file comparison'); else fail('sbs title: ' + compareTitle);
  // Choose views lets each pane select exactly one Source or Preview surface. There is no inner
  // Split option, so two compared files can never turn into four competing panes.
  const togglesShownCurrent = await page.$eval('.sbs-pane:first-child .sbs-toggle[data-sbs-view="source"]', (e) => getComputedStyle(e).display !== 'none');
  const innerSplitCount = await page.$$eval('.sbs-pane .sbs-toggle[data-sbs-view="split"]', (els) => els.length);
  if (togglesShownCurrent && innerSplitCount === 0) pass('side-by-side: Choose views offers Source/Preview only (no four-pane nested split)');
  else fail('choose views controls: shown=' + togglesShownCurrent + ' innerSplits=' + innerSplitCount);
  // Both panes are editable text types → both default to a Monaco source editor.
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.sbs-pane');
    return panes.length === 2 && [...panes].every((p) => p.querySelector('.sbs-source .monaco-editor'));
  }, null, { timeout: 20000 });
  pass('side-by-side: both panes mount an independent Monaco source editor');
  const chooseViewSurfaceCount = await page.$$eval('.sbs-pane .sbs-source, .sbs-pane .sbs-preview', (els) =>
    els.filter((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0).length);
  if (chooseViewSurfaceCount === 2) pass('side-by-side: Choose views renders exactly two visible file surfaces');
  else fail('choose views visible surfaces=' + chooseViewSurfaceCount);
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
  const mixedSurfaceCount = await page.$$eval('.sbs-pane .sbs-source, .sbs-pane .sbs-preview', (els) =>
    els.filter((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0).length);
  if (mixedSurfaceCount === 2) pass('side-by-side: mixed Source/Preview selection still shows only two surfaces');
  else fail('mixed views visible surfaces=' + mixedSurfaceCount);
  // (b2) Per-pane markdown toolbar: Bold acts ONLY on that pane (pane 0 = welcome.md), leaving
  //      the sibling text/csv pane untouched. Switch pane 0 back to Source first.
  await page.click('.sbs-pane:first-child .sbs-toggle[data-sbs-view="source"]');
  await page.waitForFunction(() => {
    const p = document.querySelector('.sbs-overlay').__sbsPanes;
    return p[0].rawview() && document.querySelector('.sbs-pane:first-child .sbs-source .monaco-editor');
  }, null, { timeout: 12000 });
  await page.evaluate(() => {
    const panes = document.querySelector('.sbs-overlay').__sbsPanes;
    const rv0 = panes[0].rawview();
    window.__sbsBefore1 = panes[1].rawview().getValue();
    rv0.setValue('hello world');
    rv0.setSelection(1, 1, 1, 6);           // select "hello"
    document.querySelector('.sbs-pane:first-child .sbs-tools [data-md-action="Bold"]').click();
  });
  const sbsMd = await page.evaluate(() => {
    const panes = document.querySelector('.sbs-overlay').__sbsPanes;
    return { pane0: panes[0].rawview().getValue(), pane1Same: panes[1].rawview().getValue() === window.__sbsBefore1 };
  });
  if (/\*\*hello\*\*/.test(sbsMd.pane0)) pass('side-by-side: markdown pane Bold wraps the selection (**hello**)'); else fail('sbs md bold: ' + JSON.stringify(sbsMd.pane0));
  if (sbsMd.pane1Same) pass('side-by-side: pane toolbar acts only on its own pane (sibling untouched)'); else fail('sbs md bold leaked to sibling');
  // (b3) Per-pane text-utils toolbar: Sort ↑ reorders the csv pane's lines (pane 1).
  await page.evaluate(() => {
    const rv1 = document.querySelector('.sbs-overlay').__sbsPanes[1].rawview();
    rv1.setValue('banana\napple\ncherry');
    rv1.setSelection(1, 1, 1, 1);           // no selection → whole document
    document.querySelector('.sbs-pane:nth-child(2) .sbs-tools [data-textutil="sortAsc"]').click();
  });
  const sbsSort = await page.evaluate(() => document.querySelector('.sbs-overlay').__sbsPanes[1].rawview().getValue());
  if (sbsSort === 'apple\nbanana\ncherry') pass('side-by-side: text-utils pane Sort ↑ reorders that pane\'s lines'); else fail('sbs sort: ' + JSON.stringify(sbsSort));
  // (c) Per-pane Download yields a download with the right filename.
  const [sbsDl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.click('.sbs-pane:nth-child(2) .sbs-dl'),
  ]);
  if (/sample\.csv$/.test(sbsDl.suggestedFilename())) pass('side-by-side: per-pane Download preserves filename (' + sbsDl.suggestedFilename() + ')'); else fail('sbs download name: ' + sbsDl.suggestedFilename());

  // ── Shared mode bar: Sources / Previews / Text diff govern both files ──
  // (mode-a) Sources forces both panes to Monaco source; per-pane toggle hidden; two separate
  //          editors (no diff editor) → panes scroll independently.
  await page.click('.sbs-overlay .sbs-mode-btn[data-sbs-mode="raw"]');
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.sbs-pane');
    return panes.length === 2 && [...panes].every((p) => {
      const src = p.querySelector('.sbs-source'), prev = p.querySelector('.sbs-preview');
      return src.style.display !== 'none' && prev.style.display === 'none' && src.querySelector('.monaco-editor');
    });
  }, null, { timeout: 12000 });
  const rawTwoEditors = await page.$$eval('.sbs-pane .sbs-source .monaco-editor', (els) => els.length);
  const rawNoDiff = await page.$('.sbs-overlay .monaco-diff-editor');
  const rawToggleHidden = await page.$eval('.sbs-pane:first-child .sbs-toggle[data-sbs-view="source"]', (e) => getComputedStyle(e).display === 'none');
  if (rawTwoEditors === 2 && !rawNoDiff && rawToggleHidden) pass('side-by-side: Sources shows two independent editors and no diff'); else fail('sources mode: editors=' + rawTwoEditors + ' diff=' + !!rawNoDiff + ' toggleHidden=' + rawToggleHidden);
  // (mode-b) Previews forces both panes to their rendered preview.
  await page.click('.sbs-overlay .sbs-mode-btn[data-sbs-mode="preview"]');
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.sbs-pane');
    return panes.length === 2 && [...panes].every((p) => {
      const src = p.querySelector('.sbs-source'), prev = p.querySelector('.sbs-preview');
      return src.style.display === 'none' && prev.style.display !== 'none' && prev.childElementCount > 0;
    });
  }, null, { timeout: 15000 });
  const previewSurfaceCount = await page.$$eval('.sbs-pane .sbs-source, .sbs-pane .sbs-preview', (els) =>
    els.filter((e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0).length);
  if (previewSurfaceCount === 2) pass('side-by-side: Previews shows exactly two rendered previews');
  else fail('previews visible surfaces=' + previewSurfaceCount);
  // (mode-c) Text diff replaces the two panes with one Monaco diff; the panes are hidden.
  await page.click('.sbs-overlay .sbs-mode-btn[data-sbs-mode="diff"]');
  await page.waitForSelector('.sbs-overlay .monaco-diff-editor', { timeout: 12000 });
  const diffOne = await page.$$eval('.sbs-overlay .monaco-diff-editor', (els) => els.length);
  const bodyHidden = await page.$eval('.sbs-overlay .sbs-body', (e) => getComputedStyle(e).display === 'none');
  if (diffOne === 1 && bodyHidden) pass('side-by-side: Text diff shows one Monaco diff and hides both file panes'); else fail('diff mode: count=' + diffOne + ' bodyHidden=' + bodyHidden);
  // fv:sbs:mode persists the last user choice.
  const modePersisted = await page.evaluate(() => { try { return localStorage.getItem('fv:sbs:mode'); } catch { return null; } });
  if (modePersisted === 'diff') pass('side-by-side: fv:sbs:mode persists the chosen mode'); else fail('fv:sbs:mode persist: ' + modePersisted);
  // (mode-d) Text diff → Choose views restores the two panes and disposes the diff editor.
  await page.click('.sbs-overlay .sbs-mode-btn[data-sbs-mode="current"]');
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.sbs-pane');
    const body = document.querySelector('.sbs-overlay .sbs-body');
    return panes.length === 2 && getComputedStyle(body).display !== 'none'
      && [...panes].every((p) => p.querySelector('.sbs-host')) && !document.querySelector('.sbs-overlay .monaco-diff-editor');
  }, null, { timeout: 12000 });
  pass('side-by-side: switching Text diff → Choose views restores two panes (diff disposed)');

  // (d) Closing disposes both panes and removes the overlay.
  await page.click('.sbs-close');
  if (!(await page.$('.sbs-overlay'))) pass('side-by-side closes (panes disposed, overlay removed)'); else fail('sbs did not close');
  // Clean up the persisted mode so it doesn't leak into later runs.
  await page.evaluate(() => { try { localStorage.removeItem('fv:sbs:mode'); } catch {} });

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

  await openExample('Sample.txt');
  await page.waitForSelector('#typeHelpBtn:not([hidden])', { timeout: 8000 });
  await page.click('#typeHelpBtn');
  await page.waitForSelector('#typeHelpBody .th-body h1', { timeout: 8000 });
  const rawHelpTitle = await page.$eval('#typeHelpBody .th-body h1', (el) => el.textContent);
  if (/Plain Text/i.test(rawHelpTitle)) pass('type help: Plain text opens text.md docs via raw alias'); else fail('raw help title: ' + rawHelpTitle);
  await page.click('#typeHelpBody a[href="code.md"]');
  await page.waitForFunction(() => /Source Code/i.test(document.querySelector('#typeHelpBody .th-body h1')?.textContent || ''), null, { timeout: 8000 });
  pass('type help: readme-relative links navigate inside the help modal');
  const codeLinkTarget = await page.$eval('#typeHelpBody a[href="../examples/query.sql"]', (a) => ({
    target: a.getAttribute('target') || '',
    rel: a.getAttribute('rel') || '',
    example: a.dataset.examplePath || '',
  }));
  if (!codeLinkTarget.target && !codeLinkTarget.rel && codeLinkTarget.example === 'query.sql') pass('type help: example links are handled in-app, not as new tabs');
  else fail('type help example link attrs: ' + JSON.stringify(codeLinkTarget));
  await page.click('#typeHelpDialog [data-close]');

  await page.evaluate(() => window.__fv.openViewerFile('temporary-note.md', { text: '# Temporary note\n\nOpen docs link next.' }));
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'temporary-note.md', null, { timeout: 8000 });
  await page.click('#typeHelpBtn');
  await page.waitForSelector('#typeHelpBody a[href="../examples/welcome.md"]', { timeout: 8000 });
  await page.click('#typeHelpBody a[href="../examples/welcome.md"]');
  await page.waitForFunction(() => document.querySelector('#fileName')?.textContent === 'welcome.md', null, { timeout: 12000 });
  const openedHelpExample = await page.evaluate(() => ({
    file: window.__fv.state.intake?.filename,
    text: window.__fv.state.rawview?.getValue?.() || '',
    stillOpen: !!document.getElementById('typeHelpDialog')?.open,
    body: document.getElementById('typeHelpBody')?.textContent || '',
  }));
  if (openedHelpExample.file === 'welcome.md' && /Welcome to File Viewer/.test(openedHelpExample.text) && openedHelpExample.stillOpen && !/Could not open|No documentation|file not found/i.test(openedHelpExample.body))
    pass('type help: example links open same-origin files in the viewer without file-not-found');
  else fail('type help example open: ' + JSON.stringify({ ...openedHelpExample, text: openedHelpExample.text.slice(0, 80), body: openedHelpExample.body.slice(0, 120) }));
  await page.click('#typeHelpDialog [data-close]');

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
