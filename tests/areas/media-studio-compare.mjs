import { MEDIA_MOBILE_VIEWPORT } from './media-studio-helpers.mjs';

async function assertCompareNoOverflow(ctx, kind, label) {
  const { page, pass, fail } = ctx;
  const geometry = await page.$eval('#previewHost .media-compare', (el) => {
    const host = document.querySelector('#previewHost');
    const hostRect = host?.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const docEl = document.documentElement;
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      hostLeft: Math.round(hostRect?.left || 0),
      hostRight: Math.round(hostRect?.right || 0),
      overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
    };
  });
  if (geometry.overflowX === 0 && geometry.left >= geometry.hostLeft - 1 && geometry.right <= geometry.hostRight + 1)
    pass(`${kind} compare: no horizontal overflow (${label})`);
  else fail(`${kind} compare overflow (${label}): ` + JSON.stringify(geometry));
}

export async function exerciseCompare(ctx, kind) {
  const { page, pass, fail } = ctx;
  const panelSel = '#previewHost .media-mode-panel[data-mode="compare"]';
  const absentBefore = await page.$('#previewHost .media-compare');
  if (!absentBefore) pass(`${kind} Compare mounts lazily`);
  else fail(`${kind} Compare should not mount before tab selection`);
  await page.click('#previewHost .media-mode-tab[data-mode="compare"]');
  await page.waitForSelector(`${panelSel} .media-compare`, { timeout: 5000 });
  const layouts = await page.$$eval(`${panelSel} .media-compare-layout-btn`, (els) => els.map((el) => ({
    layout: el.dataset.layout,
    text: el.textContent.trim(),
  })));
  if (['side-by-side', 'top-bottom', 'overlay'].every((layout) => layouts.some((row) => row.layout === layout)))
    pass(`${kind} compare: layout controls include side-by-side/top-bottom/overlay`);
  else fail(`${kind} compare layouts: ` + JSON.stringify(layouts));
  const normState = await page.$eval(`${panelSel} .media-compare-normalize`, (el) => ({
    hidden: el.hidden,
    text: el.textContent.trim(),
    checked: el.querySelector('input')?.checked || false,
  }));
  if (kind === 'audio') {
    if (!normState.hidden && /off/i.test(normState.text) && !normState.checked)
      pass('audio compare: explicit normalization toggle is present and off by default');
    else fail('audio compare normalize state: ' + JSON.stringify(normState));
  } else if (normState.hidden) {
    pass('video compare: audio normalization control is absent');
  } else {
    fail('video compare should not show audio normalization controls: ' + JSON.stringify(normState));
  }
  const initialCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
  await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '4.0');
  const offsetCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
  const offsetLabel = await page.$eval(`${panelSel} .media-compare-lane[data-lane="B"] .media-compare-lane-label`, (el) => el.textContent);
  if (offsetCopy !== initialCopy && /\+4\.00s/.test(offsetCopy) && /offset 4\.00s/.test(offsetLabel))
    pass(`${kind} compare: changing lane offset updates offset and overlap readout`);
  else fail(`${kind} compare offset copy: ${offsetCopy} / ${offsetLabel}`);
  const rangeInputs = await page.$$eval(`${panelSel} .media-compare-in-input, ${panelSel} .media-compare-out-input`, (els) => els.length);
  await page.fill(`${panelSel} .media-compare-in-input[data-lane="A"]`, '1.0');
  await page.fill(`${panelSel} .media-compare-out-input[data-lane="A"]`, '5.0');
  const rangeCopy = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
  const rangeHandles = await page.$$eval(`${panelSel} .media-compare-range-handle`, (els) => els.length);
  if (rangeInputs === 4 && rangeHandles >= 4 && /Missing\/extra ranges/.test(rangeCopy))
    pass(`${kind} compare: range inputs/handles exist and update partial range copy`);
  else fail(`${kind} compare range state: inputs=${rangeInputs} handles=${rangeHandles} copy=${rangeCopy}`);
  await page.click(`${panelSel} .media-compare-layout-btn[data-layout="overlay"]`);
  if (kind === 'audio') {
    await page.fill(`${panelSel} .media-compare-opacity-input`, '30');
    const overlayState = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      layout: el.dataset.layout,
      opacity: el.dataset.overlayOpacity,
      css: getComputedStyle(el.querySelector('.media-compare-visual')).getPropertyValue('--compare-opacity').trim(),
    }));
    if (overlayState.layout === 'overlay' && overlayState.opacity === '30' && overlayState.css === '0.3')
      pass(`${kind} compare: overlay opacity control affects UI state`);
    else fail(`${kind} compare overlay state: ` + JSON.stringify(overlayState));
  } else {
    await page.selectOption(`${panelSel} .media-compare-foreground-select`, 'A');
    await page.fill(`${panelSel} .media-compare-video-opacity-a`, '80');
    await page.fill(`${panelSel} .media-compare-video-opacity-b`, '30');
    const overlayState = await page.$eval(`${panelSel} .media-compare`, (el) => {
      const visual = el.querySelector('.media-compare-visual');
      const style = getComputedStyle(visual);
      return {
        layout: el.dataset.layout,
        foreground: el.dataset.videoForeground,
        opacityA: el.dataset.videoOpacityA,
        opacityB: el.dataset.videoOpacityB,
        cssA: style.getPropertyValue('--compare-video-opacity-a').trim(),
        cssB: style.getPropertyValue('--compare-video-opacity-b').trim(),
      };
    });
    if (overlayState.layout === 'overlay' && overlayState.foreground === 'A'
      && overlayState.opacityA === '80' && overlayState.opacityB === '30'
      && overlayState.cssA === '0.8' && overlayState.cssB === '0.3')
      pass('video compare: overlay controls expose foreground plus A/B opacity');
    else fail('video compare overlay state: ' + JSON.stringify(overlayState));
  }
  const dropExists = await page.$(`${panelSel} .media-compare-drop .media-ed-file-input`);
  if (dropExists) pass(`${kind} compare: second-file drop/browse control exists`);
  else fail(`${kind} compare second-file picker missing`);
  const analyzeExists = await page.$(`${panelSel} .media-compare-analyze`);
  if (kind === 'audio') {
    if (analyzeExists) pass('audio compare: explicit analyze button exists');
    else fail('audio compare analyze button missing');
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="A"]`, '0');
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '0.1');
    await page.fill(`${panelSel} .media-compare-in-input[data-lane="A"]`, '0');
    await page.fill(`${panelSel} .media-compare-out-input[data-lane="A"]`, '0.4');
    await page.fill(`${panelSel} .media-compare-in-input[data-lane="B"]`, '0');
    await page.fill(`${panelSel} .media-compare-out-input[data-lane="B"]`, '0.4');
    await page.setInputFiles(`${panelSel} .media-compare-drop .media-ed-file-input`, new URL('../../docs/examples/sample.wav', import.meta.url).pathname);
    await page.click(`${panelSel} .media-compare-analyze`);
    await page.waitForFunction(() => /Analyzed shifted overlap WAV range/i.test(document.querySelector('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-analysis-status')?.textContent || ''), null, { timeout: 12000 });
    const analysisStatus = await page.$eval(`${panelSel} .media-compare-analysis-status`, (el) => el.textContent.trim());
    if (/Analyzed shifted overlap WAV range/i.test(analysisStatus)) pass('audio compare: sample WAV uses shifted-overlap WAV analysis path');
    else fail('audio compare WAV range status: ' + analysisStatus);
    const analysisPaint = await page.$$eval(`${panelSel} .media-compare-waveform-canvas, ${panelSel} .media-compare-diff-canvas`, (canvases) => canvases.map((canvas) => {
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      const first = [data[0], data[1], data[2], data[3]];
      let varied = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied++;
      }
      return { cls: canvas.className, width, height, hidden: canvas.hidden, varied };
    }));
    if (analysisPaint.length >= 3 && analysisPaint.every((row) => row.width > 0 && row.height > 0 && !row.hidden && row.varied > 8))
      pass('audio compare: analysis paints lane waveforms and difference canvas');
    else fail('audio compare canvas paint: ' + JSON.stringify(analysisPaint));
    const diffReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    if (/Measured shifted overlap: average diff energy/i.test(diffReadout) && /Raw amplitude compare/i.test(diffReadout))
      pass('audio compare: measured difference readout distinguishes overlap energy');
    else fail('audio compare diff readout: ' + diffReadout);
    await page.click(`${panelSel} .media-compare-normalize-input`);
    const normReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    const normLabel = await page.$eval(`${panelSel} .media-compare-normalize`, (el) => ({
      checked: el.querySelector('input')?.checked || false,
      text: el.textContent,
    }));
    if (normLabel.checked && /user chosen/i.test(normLabel.text) && /normalization is on for compare only/i.test(normReadout))
      pass('audio compare: normalize toggle updates compare-only label/state');
    else fail('audio compare normalize after analysis: ' + JSON.stringify({ normLabel, normReadout }));
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '0.2');
    const staleStatus = await page.$eval(`${panelSel} .media-compare-analysis-status`, (el) => el.textContent);
    if (/analyze shifted overlap WAV range again/i.test(staleStatus))
      pass('audio compare: shifted-overlap WAV analysis clears after offset edits');
    else fail('audio compare stale WAV status: ' + staleStatus);
  } else {
    if (analyzeExists) pass('video compare: explicit video analyze button exists');
    else fail('video compare analyze button missing');
    const analyzeText = await page.$eval(`${panelSel} .media-compare-analyze`, (el) => el.textContent);
    if (/Analyze selected video/i.test(analyzeText)) pass('video compare: no audio analyze control is shown');
    else fail('video compare analyze label: ' + analyzeText);
    await page.evaluate(async () => {
      const bytes = await fetch('/examples/sample.webm').then((res) => res.arrayBuffer());
      const main = new File([bytes], 'SidebarDropMain.webm', { type: 'video/webm' });
      const cmp = new File([bytes], 'SidebarDropCmp.webm', { type: 'video/webm' });
      window.__fv.state._skipDiscardGuard = true;
      await window.__fv.loadFolder([
        { file: main, path: 'Videos/SidebarDropMain.webm' },
        { file: cmp, path: 'Videos/SidebarDropCmp.webm' },
      ]);
    });
    await page.click('[data-path="Videos/SidebarDropMain.webm"]');
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'SidebarDropMain.webm', null, { timeout: 8000 });
    await page.click('#previewHost .media-mode-tab[data-mode="compare"]');
    await page.waitForSelector(`${panelSel} .media-compare`, { timeout: 5000 });
    const sidebarDrop = await page.evaluate(async () => {
      const src = document.querySelector('[data-path="Videos/SidebarDropCmp.webm"]');
      const dropZone = document.querySelector('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-drop .media-ed-drop-zone');
      if (!src || !dropZone) return { src: !!src, dropZone: !!dropZone };
      const dt = new DataTransfer();
      src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      src.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return {
        src: true,
        dropZone: true,
        current: window.__fv?.state?.intake?.filename || '',
        laneB: document.querySelector('#previewHost .media-compare-lane[data-lane="B"] .media-compare-lane-label')?.textContent || '',
      };
    });
    if (sidebarDrop.current === 'SidebarDropMain.webm' && /SidebarDropCmp\.webm/.test(sidebarDrop.laneB))
      pass('video compare: sidebar drop fills lane B without opening as main file');
    else fail('video compare sidebar drop: ' + JSON.stringify(sidebarDrop));
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="A"]`, '0');
    await page.fill(`${panelSel} .media-compare-offset-input[data-lane="B"]`, '0.1');
    await page.fill(`${panelSel} .media-compare-in-input[data-lane="A"]`, '0');
    await page.fill(`${panelSel} .media-compare-out-input[data-lane="A"]`, '0.6');
    await page.fill(`${panelSel} .media-compare-in-input[data-lane="B"]`, '0');
    await page.fill(`${panelSel} .media-compare-out-input[data-lane="B"]`, '0.6');
    await page.setInputFiles(`${panelSel} .media-compare-drop .media-ed-file-input`, new URL('../../docs/examples/sample.webm', import.meta.url).pathname);
    await page.click(`${panelSel} .media-compare-analyze`);
    await page.waitForFunction(() => /Analyzed \d+ shifted-overlap video frame/i.test(document.querySelector('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-analysis-status')?.textContent || ''), null, { timeout: 15000 });
    const videoPaint = await page.$$eval(`${panelSel} .media-compare-waveform-canvas, ${panelSel} .media-compare-overlay-canvas, ${panelSel} .media-compare-diff-canvas`, (canvases) => canvases.map((canvas) => {
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      const first = [data[0], data[1], data[2], data[3]];
      let varied = 0;
      let ink = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] > 0) ink++;
        if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied++;
      }
      return { cls: canvas.className, width, height, hidden: canvas.hidden, varied, ink };
    }));
    if (videoPaint.length >= 4 && videoPaint.every((row) => row.width > 0 && row.height > 0 && !row.hidden && row.ink > 8 && row.varied > 8))
      pass('video compare: analysis paints frame strips, overlay preview, and diff canvas');
    else fail('video compare canvas paint: ' + JSON.stringify(videoPaint));
    const videoReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    if (/Measured shifted overlap: average visual difference/i.test(videoReadout) && /shifted\/missing ranges are separate from content differences/i.test(videoReadout))
      pass('video compare: measured visual difference readout separates timeline gaps from content changes');
    else fail('video compare diff readout: ' + videoReadout);
    await page.selectOption(`${panelSel} .media-compare-foreground-select`, 'B');
    await page.fill(`${panelSel} .media-compare-video-opacity-a`, '90');
    await page.fill(`${panelSel} .media-compare-video-opacity-b`, '75');
    const videoOpacityReadout = await page.$eval(`${panelSel} .media-compare-copy`, (el) => el.textContent);
    const videoOpacityState = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      foreground: el.dataset.videoForeground,
      opacityA: el.dataset.videoOpacityA,
      opacityB: el.dataset.videoOpacityB,
    }));
    if (videoOpacityState.foreground === 'B' && videoOpacityState.opacityA === '90'
      && videoOpacityState.opacityB === '75' && /B over A/i.test(videoOpacityReadout)
      && /A opacity 90%/i.test(videoOpacityReadout) && /B opacity 75%/i.test(videoOpacityReadout))
      pass('video compare: overlay A/B opacity and foreground update preview/readout state after analysis');
    else fail('video compare opacity after analysis: ' + JSON.stringify({ videoOpacityState, videoOpacityReadout }));
  }
  await assertCompareNoOverflow(ctx, kind, 'desktop');
  const priorViewport = page.viewportSize();
  await page.setViewportSize(MEDIA_MOBILE_VIEWPORT);
  await assertCompareNoOverflow(ctx, kind, 'mobile');
  if (priorViewport) await page.setViewportSize(priorViewport);
}
