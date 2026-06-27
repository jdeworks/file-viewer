export async function run(ctx) {
  const { page, origin, pass, fail, openExample } = ctx;

  // ── Tree-drag → side by side: dragging a tree file onto the workspace opens an overlay ──
  // Load a folder (two files), then simulate dragging one tree file onto the workspace.
  await page.goto(origin, { waitUntil: 'load' });

  // Drop a two-file synthetic folder: welcome.md + sample.csv (via the welcome.md example
  // then use the folder-drop path via __fv.loadFolder).
  // Simpler: open welcome.md from examples first (single file open), then simulate a
  // tree-drag from a second file by directly calling into the app's internals.
  await openExample('Welcome.md');
  await page.waitForSelector('#editor .monaco-editor', { timeout: 20000 });

  // Single files now participate in the append-only sidebar too.
  const treeHiddenBefore = await page.$eval('#fileTree', (el) => el.hidden);
  if (!treeHiddenBefore) pass('tree-drag: single file opens a sidebar root before drag');
  else fail('tree-drag: sidebar hidden before drag');

  // Simulate a drag from a tree file item to the workspace. The first pass builds a real
  // two-file tree; the second pass below dispatches dragstart/drop on the actual row.
  await page.evaluate(async () => {
    const { TREE_DRAG_TYPE } = await import('./core/filetree.js');
    // Build a synthetic File node representing sample.csv.
    const csvContent = 'a,b\n1,2\n';
    const file = new File([csvContent], 'sample.csv', { type: 'text/csv' });
    const node = { name: 'sample.csv', path: 'sample.csv', file, dir: false };

    const ws = document.getElementById('workspace');

    // Simulate dragover with the tree drag type (so the handler calls preventDefault).
    const overEvt = new DragEvent('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(overEvt, 'dataTransfer', { value: { types: [TREE_DRAG_TYPE] } });
    ws.dispatchEvent(overEvt);

    // Build a minimal folder entry set to produce real rows, then drag a row programmatically.
    const entries = [
      { file: new File([window.__fv.state.rawview?.getValue() || '# hi'], 'welcome.md', { type: 'text/plain' }), path: 'welcome.md' },
      { file, path: 'sample.csv' },
    ];
    // Use loadFolder to set up the tree with both files.
    window.__fv.state._skipDiscardGuard = true;
    await window.__fv.loadFolder(entries);
  });

  // After loadFolder, the sidebar should be visible with both files.
  await page.waitForSelector('#fileTree:not([hidden])', { timeout: 5000 });
  pass('tree-drag: sidebar visible after folder load');

  // Now simulate dragging the second tree item (sample.csv) onto the workspace to open it
  // beside the active file.
  // First open welcome.md by clicking it in the tree.
  const treeRows = await page.$$('.ft-row.ft-file');
  if (treeRows.length >= 2) pass('tree-drag: at least 2 file rows in tree'); else fail('tree-drag: expected 2 tree rows, got ' + treeRows.length);

  // Find the sample.csv row and check it is draggable.
  const csvRowDraggable = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.ft-row.ft-file')];
    const csvRow = rows.find((r) => r.dataset.path === 'sample.csv');
    return csvRow ? csvRow.draggable : null;
  });
  if (csvRowDraggable === true) pass('tree-drag: file rows have draggable=true');
  else fail('tree-drag: file row draggable=' + csvRowDraggable);

  // Open welcome.md from the tree so it is the active file.
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.ft-row.ft-file')];
    const mdRow = rows.find((r) => r.dataset.path === 'welcome.md');
    if (mdRow) mdRow.click();
  });
  await page.waitForSelector('#editor .monaco-editor', { timeout: 10000 });

  // Now simulate a real dragstart on the sample.csv row followed by a drop on the workspace.
  await page.evaluate(async () => {
    const { TREE_DRAG_TYPE } = await import('./core/filetree.js');
    const csvRow = document.querySelector('.ft-row.ft-file[data-path="sample.csv"]');
    if (!csvRow) return;
    // Dispatch dragstart on the row to set _dragNode.
    const dt = new DataTransfer();
    dt.setData(TREE_DRAG_TYPE, 'sample.csv');
    const startEvt = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt });
    csvRow.dispatchEvent(startEvt);
  });

  // Drop onto the workspace.
  await page.evaluate(async () => {
    const { TREE_DRAG_TYPE } = await import('./core/filetree.js');
    const ws = document.getElementById('workspace');
    const dt = new DataTransfer();
    dt.setData(TREE_DRAG_TYPE, 'sample.csv');
    const dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
    ws.dispatchEvent(dropEvt);
  });

  await page.waitForSelector('.sbs-overlay', { timeout: 10000 });
  const sbsNames = await page.$$eval('.sbs-overlay .sbs-fname', (els) => els.map((e) => e.textContent));
  if (sbsNames.some((n) => /welcome\.md/i.test(n)) && sbsNames.some((n) => /sample\.csv/i.test(n)))
    pass('tree-drag: dragged sidebar file opens side-by-side overlay');
  else fail('tree-drag: side-by-side names=' + sbsNames.join(','));

  const activeName = await page.evaluate(() => window.__fv?.state?.intake?.filename);
  if (activeName === 'welcome.md') pass('tree-drag: workspace drop keeps current file active');
  else fail('tree-drag: active file after side-by-side drop: ' + activeName);

  // The sidebar must still be visible while the side-by-side overlay is open.
  const treeVisible = await page.$eval('#fileTree', (el) => !el.hidden);
  if (treeVisible) pass('tree-drag: sidebar stays visible after side-by-side drag');
  else fail('tree-drag: sidebar hidden after drag');
  await page.click('.sbs-overlay .sbs-close');
  await page.waitForFunction(() => !document.querySelector('.sbs-overlay'), null, { timeout: 4000 });

  await page.evaluate(async () => {
    window.__fv.state._skipDiscardGuard = true;
    await window.__fv.loadFolder([
      { file: new File(['alpha'], 'a.txt', { type: 'text/plain' }), path: 'proj/src/a.txt' },
      { file: new File(['beta'], 'b.txt', { type: 'text/plain' }), path: 'proj/dest/b.txt' },
    ]);
  });
  await page.click('#ftExpandBtn');
  await page.waitForSelector('#fileTree .ft-file[data-path="src/a.txt"]', { timeout: 8000 });
  await page.evaluate(() => {
    const src = document.querySelector('#fileTree .ft-file[data-path="src/a.txt"]');
    const folders = [...document.querySelectorAll('#fileTree .ft-folder')];
    const dest = folders.find((row) => row.textContent.includes('dest'));
    const dt = new DataTransfer();
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dest.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    dest.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await page.waitForSelector('#fileTree .ft-file[data-path="dest/a.txt"].ft-moved', { timeout: 8000 });
  const movedState = await page.evaluate(() => ({
    move: window.__fv.state.folderMoves.get('src/a.txt'),
    indicator: document.querySelector('#fileTree .ft-file[data-path="dest/a.txt"] .ft-move-dest')?.textContent || '',
  }));
  if (movedState.move === 'dest/a.txt' && /dest\/a\.txt/.test(movedState.indicator))
    pass('tree-drag: folder drop records virtual move + destination indicator');
  else fail('tree-drag: move=' + movedState.move + ' indicator=' + movedState.indicator);

  const movedZip = await page.evaluate(async () => {
    const { exportFolderZip } = await import('./core/folder-export.js');
    const { blob, count } = await exportFolderZip(window.__fv.state.treeEntries, window.__fv.state.folderEdits, {
      changedOnly: true,
      moves: window.__fv.state.folderMoves,
    });
    const zip = await window.JSZip.loadAsync(await blob.arrayBuffer());
    return {
      count,
      hasMoved: !!zip.file('dest/a.txt'),
      hasOriginal: !!zip.file('src/a.txt'),
      movesScript: await zip.file('_moves.sh').async('string'),
    };
  });
  if (movedZip.count === 1 && movedZip.hasMoved && !movedZip.hasOriginal && /mv 'src\/a\.txt' 'dest\/a\.txt'/.test(movedZip.movesScript))
    pass('tree-drag: moved files export at resolved path with _moves.sh');
  else fail('tree-drag: moved zip=' + JSON.stringify(movedZip));
}
