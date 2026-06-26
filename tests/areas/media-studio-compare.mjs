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
  await page.waitForSelector(`${panelSel} .mmx-compare-source`, { timeout: 5000 });
  const modularCompare = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const project = root.__mediaMixerCompare?.getProject?.();
    const overlap = root.__mediaMixerCompare?.getOverlap?.();
    const settings = root.__mediaMixerCompare?.exportSettings?.() || '';
    return {
      lanes: project?.lanes?.length || 0,
      elements: project?.elements?.length || 0,
      compareA: !!project?.compare?.a?.elementId,
      compareB: !!project?.compare?.b?.elementId,
      overlapMs: overlap?.overlap?.durationMs || 0,
      view: root.dataset.compareView,
      hasOverlayButton: !!root.querySelector('.mmx-compare-view[data-view="overlay"]'),
      hasSettingsExport: !!root.querySelector('.mmx-settings-download'),
      hasSettingsImport: !!root.querySelector('.mmx-settings-import'),
      hasBytes: /blob:|data:|objectURL|mediaBytes|frameCache|thumbnailCache/i.test(settings),
    };
  });
  if (modularCompare.lanes === 2 && modularCompare.elements === 2
    && modularCompare.compareA && modularCompare.compareB && modularCompare.overlapMs > 0
    && modularCompare.view === 'stacked' && modularCompare.hasOverlayButton
    && modularCompare.hasSettingsExport && modularCompare.hasSettingsImport && !modularCompare.hasBytes)
    pass(`${kind} compare: modular shared-model A/B surface mounts with config-only state`);
  else fail(`${kind} modular compare state: ` + JSON.stringify(modularCompare));
  const modularTargetIds = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const project = root.__mediaMixerCompare?.getProject?.();
    return {
      a: project?.compare?.a?.elementId || '',
      b: project?.compare?.b?.elementId || '',
      selects: root.querySelectorAll('.mmx-compare-target-select').length,
      aOptions: root.querySelectorAll('.mmx-compare-target-select[data-side="a"] option').length,
      bOptions: root.querySelectorAll('.mmx-compare-target-select[data-side="b"] option').length,
    };
  });
  await page.selectOption(`${panelSel} .mmx-compare-source .mmx-compare-target-select[data-side="a"]`, modularTargetIds.b);
  const modularRetargeted = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const project = root.__mediaMixerCompare?.getProject?.();
    return {
      compareA: project?.compare?.a?.elementId || '',
      selectedA: root.querySelector('.mmx-compare-target-select[data-side="a"]')?.value || '',
      overlapMs: root.__mediaMixerCompare?.getOverlap?.()?.overlap?.durationMs || 0,
    };
  });
  await page.selectOption(`${panelSel} .mmx-compare-source .mmx-compare-target-select[data-side="a"]`, modularTargetIds.a);
  if (modularTargetIds.selects === 2 && modularTargetIds.aOptions >= 2 && modularTargetIds.bOptions >= 2
    && modularRetargeted.compareA === modularTargetIds.b && modularRetargeted.selectedA === modularTargetIds.b
    && modularRetargeted.overlapMs > 0)
    pass(`${kind} compare: modular A/B selectors choose from existing mixer elements`);
  else fail(`${kind} modular compare target selectors: ` + JSON.stringify({ modularTargetIds, modularRetargeted }));
  await page.fill(`${panelSel} .mmx-compare-source .mmx-compare-offset[data-side="b"]`, '0.2');
  await page.fill(`${panelSel} .mmx-compare-source .mmx-compare-range-start[data-side="a"]`, '0.1');
  await page.fill(`${panelSel} .mmx-compare-source .mmx-compare-range-end[data-side="a"]`, '0.6');
  const modularTiming = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const project = root.__mediaMixerCompare?.getProject?.();
    const overlap = root.__mediaMixerCompare?.getOverlap?.();
    return {
      inputs: root.querySelectorAll('.mmx-compare-target-input').length,
      offsetB: project?.compare?.b?.offsetMs,
      rangeStartA: project?.compare?.a?.rangeStartMs,
      rangeEndA: project?.compare?.a?.rangeEndMs,
      overlapMs: overlap?.overlap?.durationMs || 0,
      renderedOverlapMs: Number(root.dataset.compareOverlapMs || 0),
      hasAnalysis: !!root.__mediaMixerCompare?.getLastAnalysis?.(),
      offsetValue: root.querySelector('.mmx-compare-offset[data-side="b"]')?.value || '',
      rangeStartValue: root.querySelector('.mmx-compare-range-start[data-side="a"]')?.value || '',
      rangeEndValue: root.querySelector('.mmx-compare-range-end[data-side="a"]')?.value || '',
    };
  });
  if (modularTiming.inputs === 6 && modularTiming.offsetB === 200
    && modularTiming.rangeStartA === 100 && modularTiming.rangeEndA === 600
    && modularTiming.overlapMs > 0 && modularTiming.renderedOverlapMs === Math.round(modularTiming.overlapMs)
    && !modularTiming.hasAnalysis
    && modularTiming.offsetValue === '0.2' && modularTiming.rangeStartValue === '0.1' && modularTiming.rangeEndValue === '0.6')
    pass(`${kind} compare: modular A/B offset and range controls update shared overlap state`);
  else fail(`${kind} modular compare timing controls: ` + JSON.stringify(modularTiming));
  await page.click(`${panelSel} .mmx-compare-source .mmx-compare-view[data-view="overlay"]`);
  const modularOverlay = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => ({
    view: root.dataset.compareView,
    overlay: !!root.querySelector('.mmx-compare-overlay'),
    canvasKind: root.querySelector('.mmx-compare-overlay-canvas')?.dataset.kind || '',
    compareA: root.querySelector('.mmx-compare-overlay-canvas')?.dataset.compareA || '',
    compareB: root.querySelector('.mmx-compare-overlay-canvas')?.dataset.compareB || '',
    varied: Number(root.querySelector('.mmx-compare-overlay-canvas')?.dataset.variedPixels || 0),
    status: root.querySelector('.mmx-compare-overlay-status')?.textContent || '',
    overlapMs: Number(root.dataset.compareOverlapMs || 0),
  }));
  const expectedOverlayKind = kind === 'video' ? 'visual' : 'audio';
  if (modularOverlay.view === 'overlay' && modularOverlay.overlay
    && modularOverlay.canvasKind === expectedOverlayKind
    && modularOverlay.compareA && modularOverlay.compareB
    && modularOverlay.varied > 8 && modularOverlay.overlapMs > 0
    && new RegExp(`${expectedOverlayKind} overlay`, 'i').test(modularOverlay.status))
    pass(`${kind} compare: modular shared-model overlay mode paints shared coordinates`);
  else fail(`${kind} modular compare overlay: ` + JSON.stringify(modularOverlay));
  if (kind === 'audio') {
    await page.waitForFunction((sel) => {
      const project = document.querySelector(sel)?.__mediaMixerCompare?.getProject?.();
      return project?.elements?.every((element) => element.analysis?.waveformSummary);
    }, `${panelSel} .mmx-compare-source`, { timeout: 12000 });
  }
  await page.click(`${panelSel} .mmx-compare-source .mmx-compare-analyze`);
  const modularAnalysis = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const analysis = root.__mediaMixerCompare.getLastAnalysis();
    const panel = root.querySelector('.mmx-compare-analysis');
    return {
      status: analysis?.status || '',
      kind: analysis?.kind || '',
      metric: analysis?.metric || '',
      value: Number.isFinite(analysis?.value) ? analysis.value : null,
      overlapMs: analysis?.overlapMs || 0,
      panelStatus: panel?.dataset.status || '',
      panelKind: panel?.dataset.kind || '',
      message: panel?.textContent || '',
    };
  });
  if (modularAnalysis.status === 'analyzed'
    && modularAnalysis.kind === expectedOverlayKind
    && modularAnalysis.metric
    && modularAnalysis.overlapMs > 0
    && modularAnalysis.panelStatus === 'analyzed'
    && modularAnalysis.panelKind === expectedOverlayKind
    && /Analyzed selected/i.test(modularAnalysis.message))
    pass(`${kind} compare: modular explicit analyze hook reports selected overlap`);
  else fail(`${kind} modular compare analysis: ` + JSON.stringify(modularAnalysis));
  await page.setInputFiles(`${panelSel} .mmx-compare-source .mmx-compare-b-input`,
    new URL(kind === 'video' ? '../../docs/examples/sample.webm' : '../../docs/examples/sample.wav', import.meta.url).pathname);
  await page.waitForFunction(({ sel, expected }) => {
    const root = document.querySelector(sel);
    const project = root?.__mediaMixerCompare?.getProject?.();
    const b = project?.elements?.find((element) => element.id === project?.compare?.b?.elementId);
    const asset = project?.assets?.find((item) => item.id === b?.assetId);
    return asset?.name === expected;
  }, {
    sel: `${panelSel} .mmx-compare-source`,
    expected: kind === 'video' ? 'sample.webm' : 'sample.wav',
  }, { timeout: 12000 });
  const modularDrop = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const project = root.__mediaMixerCompare?.getProject?.();
    const b = project?.elements?.find((element) => element.id === project?.compare?.b?.elementId);
    const asset = project?.assets?.find((item) => item.id === b?.assetId);
    const settings = root.__mediaMixerCompare?.exportSettings?.() || '';
    return {
      bName: asset?.name || '',
      bHasAudio: !!b?.capabilities?.hasAudio,
      bHasVideo: !!b?.capabilities?.hasVideo,
      bHasImage: !!b?.capabilities?.hasImage,
      compareB: project?.compare?.b?.elementId === b?.id,
      overlapMs: root.__mediaMixerCompare?.getOverlap?.()?.overlap?.durationMs || 0,
      hasBytes: /blob:|data:|objectURL|mediaBytes|frameCache|thumbnailCache/i.test(settings),
    };
  });
  const expectedName = kind === 'video' ? 'sample.webm' : 'sample.wav';
  const expectedCaps = kind === 'video' ? modularDrop.bHasVideo : modularDrop.bHasAudio;
  if (modularDrop.bName === expectedName && expectedCaps && modularDrop.compareB && modularDrop.overlapMs > 0 && !modularDrop.hasBytes)
    pass(`${kind} compare: modular B file browse retargets shared compare state`);
  else fail(`${kind} modular compare B file: ` + JSON.stringify(modularDrop));
  const modularSettings = await page.$eval(`${panelSel} .mmx-compare-source`, async (root) => {
    const json = root.__mediaMixerCompare.exportSettings();
    const imported = root.__mediaMixerCompare.importSettings(json);
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.querySelector('.mmx-relink-choice[data-choice="apply-all"]')?.click();
    return {
      matches: imported.relink.matches.length,
      missing: imported.relink.missing.length,
      modal: !!root.querySelector('.mmx-relink-modal'),
      choice: root.dataset.lastRelinkChoice || '',
      applied: Number(root.dataset.lastRelinkApplied || 0),
      hasBytes: /blob:|data:|objectURL|mediaBytes|frameCache|thumbnailCache/i.test(json),
    };
  });
  if (modularSettings.matches >= 1 && modularSettings.missing >= 0
    && modularSettings.modal && modularSettings.choice === 'apply-all'
    && modularSettings.applied >= 1 && !modularSettings.hasBytes)
    pass(`${kind} compare: modular settings import exposes reapply choices`);
  else fail(`${kind} modular compare settings import: ` + JSON.stringify(modularSettings));
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
      await window.__fv.openBlobFile(new Blob([bytes], { type: 'video/webm' }), 'SidebarDropMain.webm', { mime: 'video/webm' });
    });
    await page.waitForFunction(() => window.__fv?.state?.intake?.filename === 'SidebarDropMain.webm', null, { timeout: 8000 });
    await page.click('#previewHost .media-mode-tab[data-mode="compare"]');
    await page.waitForSelector(`${panelSel} .media-compare`, { timeout: 5000 });
    const fileDrop = await page.evaluate(async () => {
      const bytes = await fetch('/examples/sample.webm').then((res) => res.arrayBuffer());
      const cmp = new File([bytes], 'SidebarDropCmp.webm', { type: 'video/webm' });
      const dropZone = document.querySelector('#previewHost .media-mode-panel[data-mode="compare"] .media-compare-drop .media-ed-drop-zone');
      if (!dropZone) return { dropZone: false };
      const dt = new DataTransfer();
      dt.items.add(cmp);
      dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return {
        dropZone: true,
        current: window.__fv?.state?.intake?.filename || '',
        laneB: document.querySelector('#previewHost .media-compare-lane[data-lane="B"] .media-compare-lane-label')?.textContent || '',
      };
    });
    if (fileDrop.current === 'SidebarDropMain.webm' && /SidebarDropCmp\.webm/.test(fileDrop.laneB))
      pass('video compare: second-file drop fills lane B without opening as main file');
    else fail('video compare file drop: ' + JSON.stringify(fileDrop));
    await page.click(`${panelSel} .media-compare-layout-btn[data-layout="overlay"]`);
    await page.selectOption(`${panelSel} .media-compare-foreground-select`, 'A');
    await page.fill(`${panelSel} .media-compare-video-opacity-a`, '80');
    await page.fill(`${panelSel} .media-compare-video-opacity-b`, '30');
    const livePreview = await page.$eval(`${panelSel} .media-compare`, (el) => {
      const visualKids = Array.from(el.querySelector('.media-compare-visual')?.children || []).map((node) => node.className);
      const preview = el.querySelector('.media-compare-video-preview');
      const canvas = preview?.querySelector('.media-compare-video-canvas');
      const canvasCtx = canvas?.getContext('2d');
      const layerA = preview?.querySelector('.media-compare-video-layer--a');
      const layerB = preview?.querySelector('.media-compare-video-layer--b');
      const sampleCanvas = () => {
        if (!canvas || !canvasCtx) return null;
        const { width, height } = canvas;
        if (!width || !height) return null;
        const data = canvasCtx.getImageData(0, 0, width, height).data;
        const first = [data[0], data[1], data[2], data[3]];
        let varied = 0;
        let ink = 0;
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] > 0) ink++;
          if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied++;
        }
        return {
          width,
          height,
          ink,
          varied,
          first,
        };
      };
      const layerInfo = (layer) => {
        const video = layer?.querySelector('video');
        if (!video) return null;
        const rect = video.getBoundingClientRect();
        const style = getComputedStyle(video);
        const isInViewport = rect.width > 0.5 && rect.height > 0.5
          && rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight;
        const isInvisible = layer?.hidden
          || style.display === 'none'
          || style.visibility === 'hidden'
          || Number(style.opacity) <= 0
          || !isInViewport;
        return {
          lane: layer?.dataset?.lane || '',
          hidden: !!layer?.hidden,
          styleOpacity: style.opacity,
          display: style.display,
          controls: !!video.controls,
          src: video.currentSrc || video.src || '',
          visible: !isInvisible,
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        };
      };
      return {
        layout: el.dataset.layout,
        foreground: el.dataset.videoForeground,
        stageFirst: typeof visualKids[0] === 'string'
          && visualKids[0].split(' ').includes('media-compare-video-preview'),
        previewKids: visualKids,
        canvas: sampleCanvas(),
        layers: [
          layerInfo(layerA),
          layerInfo(layerB),
        ],
      };
    });
    const allSourcesAreBlobs = livePreview.layers.every((row) => typeof row?.src === 'string' && row.src.startsWith('blob:'));
    const videosHidden = livePreview.layers.every((row) => row && row.visible === false);
    const canvasPainted = !!livePreview.canvas && livePreview.canvas.width > 0 && livePreview.canvas.height > 0
      && livePreview.canvas.varied > 8 && livePreview.canvas.ink > 8;
    const hasPreviewSurface = livePreview.previewKids.some((row) => String(row).includes('media-compare-video-preview'));
    if (livePreview.layout === 'overlay' && livePreview.foreground === 'A' && livePreview.stageFirst
      && hasPreviewSurface
      && allSourcesAreBlobs && videosHidden && canvasPainted)
      pass('video compare: overlay live preview renders via hidden video decode sources + canvas compositor');
    else fail('video compare live preview: ' + JSON.stringify(livePreview));

    const frameBefore = await page.$eval(`${panelSel} .media-compare-video-canvas`, (canvas) => {
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      let checksum = 0;
      for (let i = 0; i < data.length; i += 24) checksum = (checksum + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7 + data[i + 3] * 11) % 2147483647;
      return { width, height, checksum };
    });
    const dragBefore = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      offset: Number(el.querySelector('.media-compare-offset-input[data-lane="B"]')?.value || 0),
      left: el.querySelector('.media-compare-lane[data-lane="B"] .media-compare-selection')?.style.left || '',
    }));
    const clipLocator = page.locator(`${panelSel} .media-compare-lane[data-lane="B"] .media-compare-selection`);
    await clipLocator.scrollIntoViewIfNeeded();
    const clipBox = await clipLocator.boundingBox();
    if (clipBox) {
      await page.mouse.move(clipBox.x + Math.min(24, clipBox.width / 2), clipBox.y + clipBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(clipBox.x + Math.min(24, clipBox.width / 2) + 60, clipBox.y + clipBox.height / 2);
      await page.mouse.up();
    }
    const dragAfter = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      offset: Number(el.querySelector('.media-compare-offset-input[data-lane="B"]')?.value || 0),
      left: el.querySelector('.media-compare-lane[data-lane="B"] .media-compare-selection')?.style.left || '',
    }));
    if (clipBox && dragAfter.offset > dragBefore.offset && dragAfter.left !== dragBefore.left)
      pass('video compare: lane clip box drags independently on the shared timeline');
    else fail('video compare clip drag: ' + JSON.stringify({ clipBox: !!clipBox, dragBefore, dragAfter }));
    await page.click(`${panelSel} .media-compare-play`);
    await page.waitForTimeout(350);
    const playState = await page.$eval(`${panelSel} .media-compare`, (el) => ({
      playing: el.dataset.playing,
      time: el.querySelector('.media-compare-time')?.textContent || '',
      playheadLeft: el.querySelector('.media-compare-playhead')?.style.left || '',
    }));
    await page.click(`${panelSel} .media-compare-stop`);
    const frameAfter = await page.$eval(`${panelSel} .media-compare-video-canvas`, (canvas) => {
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      let checksum = 0;
      for (let i = 0; i < data.length; i += 24) checksum = (checksum + data[i] * 3 + data[i + 1] * 5 + data[i + 2] * 7 + data[i + 3] * 11) % 2147483647;
      return { width, height, checksum };
    });
    if (playState.playing === 'true' && /0:0[0-9.]+ \//.test(playState.time)
      && playState.playheadLeft && playState.playheadLeft !== '0%'
      && frameBefore && frameAfter && (frameBefore.checksum !== frameAfter.checksum || frameBefore.width !== frameAfter.width || frameBefore.height !== frameAfter.height))
      pass('video compare: shared transport advances the red playhead and syncs top preview');
    else fail('video compare transport: ' + JSON.stringify(playState));
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
