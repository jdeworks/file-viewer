export async function runAudioQcChecks(ctx) {
  const { page, openExample, pass, fail } = ctx;

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
    if (['rms', 'integrated lufs', 'sample peak', 'estimated true peak', 'noise floor', 'sample rate', 'channels', 'submission format', 'mp3 bitrate mode', 'quiet head spacing', 'quiet tail spacing']
      .every((n) => checklist.includes(n))) pass('P8b: QC pre-run shows the full 11-item check checklist');
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
    if (qcActions.runVisible && qcActions.expVisible) pass('P8b: QC actions (Run QC + ACX-targeted export) are visible before run');
    else fail('qc actions: ' + JSON.stringify(qcActions));
    const exportHint = await page.$eval(qcPanelSel + ' .media-qc-export-hint', (el) => el.textContent).catch(() => '');
    if (/mono 44\.1 kHz mp3 192k cbr/i.test(exportHint) && /does not synthesize room tone/i.test(exportHint))
      pass('P8b: QC export hint states the encoding target without claiming digital silence is room tone');
    else fail('qc export hint: ' + exportHint);
    // Run QC → decode the sample WAV + render the per-metric card.
    await page.click(qcPanelSel + ' .media-qc-run');
    await page.waitForSelector(qcPanelSel + ' .media-qc-table .media-qc-row', { timeout: 15000 });
    const qcMetrics = await page.$$eval(qcPanelSel + ' .media-qc-row', (els) => els.map((e) => e.dataset.metric));
    if (['rms', 'lufs', 'peak', 'truePeak', 'noise', 'sr', 'ch', 'format', 'bitrate', 'head', 'tail'].every((k) => qcMetrics.includes(k)))
      pass('P8b: QC card shows measured levels, encoding, channel, and edge-spacing rows');
    else fail('qc metrics: ' + qcMetrics.join(','));
    const qcVerdict = await page.$(qcPanelSel + ' .media-qc-verdict');
    if (qcVerdict) pass('P8b: QC card shows an overall pass/fail verdict'); else fail('qc verdict missing');
    const sourceFormat = await page.$eval(qcPanelSel + ' .media-qc-row[data-metric="format"]', (row) => ({
      status: row.className,
      value: row.querySelector('.media-qc-value')?.textContent || '',
    }));
    if (/media-qc-fail/.test(sourceFormat.status) && /PCM\/WAV|wav/i.test(sourceFormat.value))
      pass('P8b: a WAV working master is honestly rejected as an ACX upload format');
    else fail('source format row: ' + JSON.stringify(sourceFormat));
    // The targeted export button mounts alongside.
    const acxBtn = await page.$(qcPanelSel + ' .media-qc-export');
    const acxBtnText = acxBtn ? await acxBtn.evaluate((e) => e.textContent) : '';
    if (/Export ACX-targeted MP3/i.test(acxBtnText)) pass('P8e: ACX-targeted MP3 export button mounts'); else fail('acx export btn: ' + acxBtnText);
    await page.click('#previewHost .media-mode-tab[data-mode="listen"]');
    await page.waitForFunction(() => {
      const panel = document.querySelector('#previewHost .media-mode-panel[data-mode="qc"]');
      return panel && panel.hidden;
    }, null, { timeout: 3000 });
    pass('P8: QC panel collapses');
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-run', { timeout: 6000 });
    pass('P8: QC remounts after leaving to Listen');

    await openExample('ACX QC reference.mp3');
    await page.waitForSelector('#previewHost .media-mode-tab[data-mode="qc"]', { timeout: 12000 });
    await page.click('#previewHost .media-mode-tab[data-mode="qc"]');
    await page.click('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-run');
    await page.waitForSelector('#previewHost .media-mode-panel[data-mode="qc"] .media-qc-verdict.media-qc-pass', { timeout: 15000 });
    const fixture = await page.evaluate(() => {
      const panel = document.querySelector('#previewHost .media-mode-panel[data-mode="qc"]');
      const row = (metric) => {
        const el = panel?.querySelector(`.media-qc-row[data-metric="${metric}"]`);
        return { className: el?.className || '', value: el?.querySelector('.media-qc-value')?.textContent || '' };
      };
      return {
        verdict: panel?.querySelector('.media-qc-verdict')?.textContent || '',
        rms: row('rms'),
        noise: row('noise'),
        sampleRate: row('sr'),
        format: row('format'),
        bitrate: row('bitrate'),
        head: row('head'),
        tail: row('tail'),
      };
    });
    const passRows = ['rms', 'noise', 'sampleRate', 'format', 'bitrate', 'head', 'tail']
      .every((key) => /media-qc-pass/.test(fixture[key].className));
    if (passRows && /measured ACX checks/i.test(fixture.verdict)
      && /44\.1 kHz/.test(fixture.sampleRate.value)
      && /192 kbps · CBR/.test(fixture.bitrate.value))
      pass('P8b: cataloged ACX reference MP3 passes real-byte level, encoding, and edge-spacing QC');
    else fail('ACX reference fixture QC: ' + JSON.stringify(fixture));
  } else fail('Audiobook QC mode tab not found');
}
