import { MEDIA_MOBILE_VIEWPORT } from './media-studio-helpers.mjs';

async function assertCompareNoOverflow(ctx, kind, label) {
  const { page, pass, fail } = ctx;
  const geometry = await page.$eval('#previewHost .mmx-compare-source', (el) => {
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
      hasAnalyzeButton: !!root.querySelector('.mmx-compare-analyze'),
      hasSettingsExport: !!root.querySelector('.mmx-settings-download'),
      hasSettingsImport: !!root.querySelector('.mmx-settings-import'),
      hasBytes: /blob:|data:|objectURL|mediaBytes|frameCache|thumbnailCache/i.test(settings),
    };
  });
  if (modularCompare.lanes === 2 && modularCompare.elements === 2
    && modularCompare.compareA && modularCompare.compareB && modularCompare.overlapMs > 0
    && modularCompare.view === 'stacked' && modularCompare.hasOverlayButton
    && modularCompare.hasAnalyzeButton
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
  const modularNormalize = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => ({
    exists: !!root.querySelector('.mmx-compare-normalize-input'),
    checked: !!root.querySelector('.mmx-compare-normalize-input')?.checked,
    text: root.querySelector('.mmx-compare-normalize')?.textContent || '',
    model: !!root.__mediaMixerCompare?.getProject?.()?.compare?.normalizeAudio,
  }));
  if (kind === 'audio') {
    if (modularNormalize.exists && !modularNormalize.checked && !modularNormalize.model && /off/i.test(modularNormalize.text))
      pass('audio compare: modular normalization is off by default');
    else fail('audio modular compare normalize default: ' + JSON.stringify(modularNormalize));
    await page.click(`${panelSel} .mmx-compare-source .mmx-compare-normalize-input`);
    const modularNormalizeOn = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => ({
      checked: !!root.querySelector('.mmx-compare-normalize-input')?.checked,
      text: root.querySelector('.mmx-compare-normalize')?.textContent || '',
      model: !!root.__mediaMixerCompare?.getProject?.()?.compare?.normalizeAudio,
    }));
    if (modularNormalizeOn.checked && modularNormalizeOn.model && /on/i.test(modularNormalizeOn.text))
      pass('audio compare: modular normalization toggle updates shared compare state');
    else fail('audio modular compare normalize toggle: ' + JSON.stringify(modularNormalizeOn));
  } else if (!modularNormalize.exists && !modularNormalize.model) {
    pass('video compare: modular audio normalization control is absent');
  } else {
    fail('video modular compare should not expose audio normalize: ' + JSON.stringify(modularNormalize));
  }
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
  await page.$eval(`${panelSel} .mmx-compare-source`, (root) => root.__mediaMixerCompare.analyze());
  await page.waitForFunction((sel) => {
    const root = document.querySelector(sel);
    return !!root?.__mediaMixerCompare?.getLastAnalysis?.();
  }, `${panelSel} .mmx-compare-source`, { timeout: 5000 });
  const modularAnalysis = await page.$eval(`${panelSel} .mmx-compare-source`, (root) => {
    const analysis = root.__mediaMixerCompare.getLastAnalysis();
    const panel = root.querySelector('.mmx-compare-analysis');
    return {
      status: analysis?.status || '',
      kind: analysis?.kind || '',
      metric: analysis?.metric || '',
      value: Number.isFinite(analysis?.value) ? analysis.value : null,
      normalized: !!analysis?.normalized,
      maxDelta: Number.isFinite(analysis?.maxDelta) ? analysis.maxDelta : null,
      averageEnergy: Number.isFinite(analysis?.averageEnergy) ? analysis.averageEnergy : null,
      highRatio: Number.isFinite(analysis?.highRatio) ? analysis.highRatio : null,
      averageDifference: Number.isFinite(analysis?.averageDifference) ? analysis.averageDifference : null,
      highPixels: Number.isFinite(analysis?.highPixels) ? analysis.highPixels : null,
      transformDelta: analysis?.transformDelta?.summary || '',
      detailRows: panel?.querySelectorAll('.mmx-compare-analysis-details dt').length || 0,
      panelMaxDelta: panel?.dataset.maxDelta || '',
      panelAverageEnergy: panel?.dataset.averageEnergy || '',
      panelHighRatio: panel?.dataset.highRatio || '',
      panelAverageDifference: panel?.dataset.averageDifference || '',
      panelHighPixels: panel?.dataset.highPixels || '',
      panelTransformDelta: panel?.dataset.transformDelta || '',
      overlapMs: analysis?.overlapMs || 0,
      timingOverlapMs: analysis?.timing?.overlapMs || 0,
      timingAOnlyMs: analysis?.timing?.aOnlyMs || 0,
      timingBOnlyMs: analysis?.timing?.bOnlyMs || 0,
      timingUnionMs: analysis?.timing?.unionMs || 0,
      timingRatio: analysis?.timing?.overlapRatio || 0,
      panelStatus: panel?.dataset.status || '',
      panelKind: panel?.dataset.kind || '',
      panelAOnlyMs: Number(panel?.dataset.aOnlyMs || 0),
      panelBOnlyMs: Number(panel?.dataset.bOnlyMs || 0),
      panelUnionMs: Number(panel?.dataset.unionMs || 0),
      timingRows: panel?.querySelectorAll('.mmx-compare-analysis-timing dt').length || 0,
      timingText: panel?.querySelector('.mmx-compare-analysis-timing')?.textContent || '',
      message: panel?.textContent || '',
    };
  });
  if (modularAnalysis.status === 'analyzed'
    && modularAnalysis.kind === expectedOverlayKind
    && modularAnalysis.metric
    && modularAnalysis.overlapMs > 0
    && modularAnalysis.timingOverlapMs === modularAnalysis.overlapMs
    && modularAnalysis.timingUnionMs >= modularAnalysis.timingOverlapMs
    && modularAnalysis.timingAOnlyMs >= 0 && modularAnalysis.timingBOnlyMs >= 0
    && modularAnalysis.panelStatus === 'analyzed'
    && modularAnalysis.panelKind === expectedOverlayKind
    && modularAnalysis.panelAOnlyMs === Math.round(modularAnalysis.timingAOnlyMs)
    && modularAnalysis.panelBOnlyMs === Math.round(modularAnalysis.timingBOnlyMs)
    && modularAnalysis.panelUnionMs === Math.round(modularAnalysis.timingUnionMs)
    && modularAnalysis.timingRows === 4
    && (kind !== 'audio' || modularAnalysis.normalized)
    && modularAnalysis.detailRows >= 4
    && (kind !== 'audio' || (
      modularAnalysis.maxDelta !== null
      && modularAnalysis.averageEnergy !== null
      && modularAnalysis.highRatio !== null
      && modularAnalysis.panelMaxDelta !== ''
      && modularAnalysis.panelAverageEnergy !== ''
      && modularAnalysis.panelHighRatio !== ''
    ))
    && (kind !== 'video' || (
      /Δpos/.test(modularAnalysis.transformDelta)
      && modularAnalysis.panelTransformDelta === modularAnalysis.transformDelta
      && modularAnalysis.panelHighPixels !== ''
    ))
    && /Analyzed selected/i.test(modularAnalysis.message)
    && /A only/i.test(modularAnalysis.timingText) && /B only/i.test(modularAnalysis.timingText))
    pass(`${kind} compare: modular explicit analyze hook reports selected overlap and shifted ranges`);
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
  const legacyDefault = await page.$eval(panelSel, (panel) => ({
    legacyMounted: !!panel.querySelector('.media-compare'),
    legacyToggle: !!panel.querySelector('.media-legacy-compare-wrap'),
    modularMounted: !!panel.querySelector('.mmx-compare-source'),
  }));
  if (!legacyDefault.legacyMounted && !legacyDefault.legacyToggle && legacyDefault.modularMounted)
    pass(`${kind} compare: legacy compare surface is removed`);
  else fail(`${kind} compare legacy default state: ` + JSON.stringify(legacyDefault));
  await assertCompareNoOverflow(ctx, kind, 'desktop');
  const priorViewport = page.viewportSize();
  await page.setViewportSize(MEDIA_MOBILE_VIEWPORT);
  await assertCompareNoOverflow(ctx, kind, 'mobile');
  if (priorViewport) await page.setViewportSize(priorViewport);
}
