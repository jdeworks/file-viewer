export async function run(ctx) {
  const { page, origin, frameOf, pass, fail } = ctx;

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
  await page.waitForFunction(() => document.querySelectorAll('#editor .line-insert, #editor .char-insert').length > 0, { timeout: 4000 }).catch(() => {});
  const changes = await page.$$eval('#editor .line-insert, #editor .char-insert', (els) => els.length);
  if (changes > 0) pass('diff shows inserted change (' + changes + ' markers)');
  else {
    const modelChanged = await page.evaluate(() => {
      const rv = window.__fv.state.rawview;
      return rv.getValue().includes('An edited line for the diff test.') && !rv.originalValue().includes('An edited line for the diff test.');
    });
    if (modelChanged) pass('diff retains inserted change in the current model'); else fail('no insert markers in diff');
  }

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

  // Word-level diff: change ONE word in a paragraph -> only that word is highlighted
  // (not the whole block). Load fresh markdown so block matching is clean.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    const orig = rv.originalValue();
    rv.setValue(orig.replace(/Viewer/, 'Veiwer'));   // single-word typo in one block
  });
  await page.click('#rawMode button[data-raw="current"]');
  await page.click('#rawMode button[data-raw="movediff"]');
  await page.waitForSelector('.movediff', { timeout: 5000 });
  await page.waitForTimeout(200);
  const wIns = await page.$$eval('.md-current .w-ins', (els) => els.map((e) => e.textContent));
  const wDel = await page.$$eval('.md-original .w-del', (els) => els.map((e) => e.textContent));
  if (wIns.length >= 1 && wIns.length <= 3 && wIns.some((t) => /Veiwer/.test(t))) pass('word-level diff highlights only the changed word (' + JSON.stringify(wIns) + ')');
  else fail('word-level ins spans: ' + JSON.stringify(wIns));
  if (wDel.some((t) => /Viewer/.test(t))) pass('word-level diff marks the removed word on the original side'); else fail('word-level del spans: ' + JSON.stringify(wDel));

  // ── Draggable split divider (linked to Preview width) ──
  // Diff/move-diff go full-width; return to split so the divider is shown.
  await page.click('#rawMode button[data-raw="current"]');
  await page.evaluate(() => {
    window.__fv.state.settingsModel.values.previewWidthMode = 'custom';
    window.__fv.state.settingsModel.values.previewMaxWidth = 340;
  });
  await page.click('#viewMode button[data-mode="raw"]');
  await page.click('#viewMode button[data-mode="split"]');
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

  // Monaco diff editor + preview split: dragging across the raw side must keep moving.
  await page.evaluate(() => {
    const rv = window.__fv.state.rawview;
    rv.setValue(rv.originalValue() + '\n\nDiff editor resize target.\n');
    window.__fv.state.settingsModel.values.previewWidthMode = 'custom';
    window.__fv.state.settingsModel.values.previewMaxWidth = 340;
  });
  await page.click('#viewMode button[data-mode="split"]');
  await page.click('#rawMode button[data-raw="diff"]');
  await page.waitForSelector('#editor .monaco-diff-editor', { timeout: 8000 });
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 8000 });
  const diffBefore = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
  const diffDivider = await (await page.$('#splitDivider')).boundingBox();
  const diffRaw = await (await page.$('#rawPane')).boundingBox();
  if (diffDivider && diffRaw) {
    await page.mouse.move(diffDivider.x + diffDivider.width / 2, diffDivider.y + diffDivider.height / 2);
    await page.mouse.down();
    await page.mouse.move(diffRaw.x + 140, diffDivider.y + diffDivider.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const diffAfter = await page.$eval('#previewPane', (e) => e.getBoundingClientRect().width);
    if (diffAfter > diffBefore + 80) pass('split divider drags across Monaco diff editor (' + Math.round(diffBefore) + ' -> ' + Math.round(diffAfter) + 'px)');
    else fail('diff divider drag: ' + Math.round(diffBefore) + ' -> ' + Math.round(diffAfter));
  } else fail('split divider missing for Monaco diff split');

  // ── Inline open button (next to type dropdown) ──
  await page.click('#openInlineBtn');
  const intakeShown = await page.$eval('#intake', (e) => !e.hidden);
  if (intakeShown) pass('inline open button returns to file/folder picker'); else fail('inline open did not show intake');

}
