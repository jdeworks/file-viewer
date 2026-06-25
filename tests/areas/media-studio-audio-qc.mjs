export async function runAudioQcChecks(ctx) {
  const { page, pass, fail } = ctx;

  // ── P8: Audiobook QC (ACX) — pass/fail report card + one-click ACX export ─────
  // QC now lives in a dedicated mode tab. CPU-lazy: no decode / ffmpeg until Run is clicked.
  const qcTab = await page.$('#previewHost .media-mode-tab[data-mode="qc"]');
  if (qcTab) {
    pass('P8: Audiobook QC (ACX) mode tab present');
    const qcPanelSel = '#previewHost .media-mode-panel[data-mode="qc"]';
    const preQc = await page.$(qcPanelSel + ' .media-qc-run');
    if (!preQc) pass('P8: QC panel CPU-lazy (no decode/ffmpeg until opened)'); else fail('QC panel mounted before open');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector(qcPanelSel + ' .media-qc-run', { timeout: 6000 });
    const noIntro = await page.$eval(qcPanelSel, (el) => !el.querySelector('.media-ed-note'));
    if (noIntro) pass('P8b: QC shell renders as a report card instead of prose-heavy intro text'); else fail('qc intro paragraph still present');
    const checklist = await page.$$eval(qcPanelSel + ' .media-qc-checklist-item .media-qc-checklist-label',
      (els) => els.map((e) => e.textContent.trim().toLowerCase()));
    if (['rms', 'integrated lufs', 'sample peak', 'estimated true peak', 'noise floor', 'sample rate', 'channels', 'head silence', 'tail silence']
      .every((n) => checklist.includes(n))) pass('P8b: QC pre-run shows the full 9-item check checklist');
    else fail('qc checklist labels: ' + checklist.join(','));
    const qcActions = await page.$eval(qcPanelSel, (el) => {
      const run = el.querySelector('.media-qc-run');
      const exp = el.querySelector('.media-qc-export');
      const actions = el.querySelector('.media-ed-actions.media-qc-actions');
      const actionText = actions ? getComputedStyle(actions).display !== 'none' : false;
      const runVisible = run ? run.offsetWidth > 0 && run.offsetHeight > 0 && actionText : false;
      const expVisible = exp ? exp.offsetWidth > 0 && exp.offsetHeight > 0 && actionText : false;
      return { runVisible, expVisible };
    });
    if (qcActions.runVisible && qcActions.expVisible) pass('P8b: QC actions (Run QC + Export for ACX) are visible before run');
    else fail('qc actions: ' + JSON.stringify(qcActions));
    const exportHint = await page.$eval(qcPanelSel + ' .media-qc-export-hint', (el) => el.textContent).catch(() => '');
    if (/mono 44\.1 kHz mp3 192k cbr/i.test(exportHint)) pass('P8b: QC export hint clearly states the ACX target'); else fail('qc export hint: ' + exportHint);
    // Run QC → decode the sample WAV + render the per-metric card.
    await page.click(qcPanelSel + ' .media-qc-run');
    await page.waitForSelector(qcPanelSel + ' .media-qc-table .media-qc-row', { timeout: 15000 });
    const qcMetrics = await page.$$eval(qcPanelSel + ' .media-qc-row', (els) => els.map((e) => e.dataset.metric));
    if (['rms', 'lufs', 'peak', 'truePeak', 'noise', 'sr', 'ch', 'head', 'tail'].every((k) => qcMetrics.includes(k)))
      pass('P8b: QC card shows all 9 ACX metric rows (RMS/LUFS/sample peak/estimated true peak/noise/sr/ch/head/tail)');
    else fail('qc metrics: ' + qcMetrics.join(','));
    const qcVerdict = await page.$(qcPanelSel + ' .media-qc-verdict');
    if (qcVerdict) pass('P8b: QC card shows an overall pass/fail verdict'); else fail('qc verdict missing');
    // The "Export for ACX" one-click button mounts alongside.
    const acxBtn = await page.$(qcPanelSel + ' .media-qc-export');
    const acxBtnText = acxBtn ? await acxBtn.evaluate((e) => e.textContent) : '';
    if (/Export for ACX/i.test(acxBtnText)) pass('P8e: "Export for ACX" one-click button mounts'); else fail('acx export btn: ' + acxBtnText);
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    await page.waitForFunction(() => {
      const panel = document.querySelector('#previewHost .media-mode-panel[data-mode="qc"]');
      return panel && panel.hidden;
    }, null, { timeout: 3000 });
    pass('P8: QC panel collapses');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-run', { timeout: 6000 });
    pass('P8: QC remounts after leaving to Listen');
  } else fail('Audiobook QC mode tab not found');
}
