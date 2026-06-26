export const MEDIA_MOBILE_VIEWPORT = { width: 390, height: 844 };
export const MEDIA_DEFAULT_DESKTOP_VIEWPORT = { width: 1100, height: 800 };

export async function reloadExampleAtViewport({ page, origin, openExample }, viewport, exampleName, readySelector) {
  await page.setViewportSize(viewport);
  await page.goto(origin, { waitUntil: 'load' });
  await openExample(exampleName);
  const waitState = readySelector.includes('audio.media-view') ? 'attached' : 'visible';
  await page.waitForSelector(readySelector, { timeout: 12000, state: waitState });
}

export async function enableFfmpegForMedia(page) {
  await page.evaluate(() => {
    localStorage.setItem('fv:settings:global', JSON.stringify({ version: 1, values: { enableFfmpeg: true } }));
  });
}

export async function resetMediaSettings(page) {
  await page.evaluate(() => localStorage.removeItem('fv:settings:global'));
}

export function hhmmssToSeconds(t) {
  const p = (t || '').split(':').map((n) => Number(n));
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null;
  return p[0] * 3600 + p[1] * 60 + p[2];
}

export async function assertAudioTopViewport({ page, pass, fail }, label) {
  const geometry = await page.$eval('#previewHost .media-doc.media-audio', (host) => {
    const workspace = host.querySelector('.media-audio-workspace');
    const modeTabs = host.querySelector('.media-mode-tabs');
    const media = host.querySelector('.media-audio-surface .media-listen-surface');
    const title = host.querySelector('.media-workspace-title');
    const time = host.querySelector('.media-workspace-time');
    const waveform = host.querySelector('.media-waveform-surface');
    if (!workspace || !modeTabs || !media || !title || !time || !waveform) return null;
    const hostRect = host.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const modeRect = modeTabs.getBoundingClientRect();
    const waveformRect = waveform.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const docEl = document.documentElement;
    return {
      topInset: Math.round(workspaceRect.top - hostRect.top),
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      hostLeft: Math.round(hostRect.left),
      hostRight: Math.round(hostRect.right),
      workspaceLeft: Math.round(workspaceRect.left),
      workspaceRight: Math.round(workspaceRect.right),
      overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      titleVisible: title.textContent.trim().length > 0 && title.getBoundingClientRect().height > 0,
      timeVisible: time.textContent.trim().length > 0 && time.getBoundingClientRect().height > 0,
      mediaControlVisible: mediaRect.height > 0 && getComputedStyle(media).display !== 'none',
      waveformVisible: waveformRect.height > 0,
      modeTabsVisible: modeRect.height > 0 && getComputedStyle(modeTabs).display !== 'none',
    };
  });
  if (!geometry) return fail('audio first-viewport geometry unavailable (' + label + ')');
  const topLimit = Math.min(72, Math.floor(geometry.viewportH * 0.2));
  if (geometry.titleVisible && geometry.timeVisible && geometry.mediaControlVisible && geometry.waveformVisible && geometry.modeTabsVisible) pass('audio first-viewport core surfaces are visible (' + label + ')');
  else fail('audio first-viewport core surface missing (' + label + '): ' + JSON.stringify({
    titleVisible: geometry.titleVisible,
    timeVisible: geometry.timeVisible,
    mediaControlVisible: geometry.mediaControlVisible,
    waveformVisible: geometry.waveformVisible,
    modeTabsVisible: geometry.modeTabsVisible,
  }));
  if (geometry.topInset >= 0 && geometry.topInset <= topLimit) pass('audio first viewport begins near top (workspace inset ' + geometry.topInset + 'px <= ' + topLimit + 'px)');
  else fail('audio first-viewport top inset too large (' + geometry.topInset + 'px > ' + topLimit + 'px) for ' + label);
  if (geometry.overflowX === 0 && geometry.workspaceLeft >= geometry.hostLeft - 1 && geometry.workspaceRight <= geometry.hostRight + 1)
    pass('audio first-viewport has no horizontal overflow (' + label + ')');
  else fail('audio first-viewport overflow/width issue (' + label + '): ' + JSON.stringify(geometry));
}

export async function assertMixViewport({ page, pass, fail }, label) {
  const geometry = await page.$eval('#previewHost .media-mode-panel[data-mode="mix"] .mmx-audio-multi', (el) => {
    const host = document.querySelector('#previewHost');
    const hostRect = host?.getBoundingClientRect();
    const wrapRect = el.getBoundingClientRect();
    const ruler = el.querySelector('.mmx-ruler');
    const playhead = el.querySelector('.mmx-playhead');
    const lanes = el.querySelector('.mmx-lanes');
    const timeline = el.querySelector('.mmx-body');
    const context = el.querySelector('.mmx-mix-context');
    if (!hostRect || !ruler || !playhead || !lanes || !timeline || !context) return null;
    const docEl = document.documentElement;
    const rulerRect = ruler.getBoundingClientRect();
    const playheadRect = playhead.getBoundingClientRect();
    return {
      wrapLeft: Math.round(wrapRect.left),
      wrapRight: Math.round(wrapRect.right),
      hostLeft: Math.round(hostRect.left),
      hostRight: Math.round(hostRect.right),
      overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      rulerVisible: rulerRect.height > 0 && rulerRect.width > 0,
      playheadVisible: playheadRect.height > 0 && playheadRect.width > 0,
      lanesVisible: lanes.getBoundingClientRect().height > 0,
      timelineScroll: timeline.scrollWidth > Math.round(timeline.clientWidth),
      contextVisible: getComputedStyle(context).display !== 'none' && context.textContent.includes('Context'),
      activeViewportW: window.innerWidth,
    };
  });
  if (!geometry) return fail('audio mixer geometry unavailable (' + label + ')');
  if (geometry.rulerVisible && geometry.playheadVisible && geometry.lanesVisible && geometry.contextVisible)
    pass('audio mixer: timeline grammar visible in mix panel (' + label + ')');
  else fail('audio mixer geometry visibility (' + label + '): ' + JSON.stringify({
    rulerVisible: geometry?.rulerVisible,
    playheadVisible: geometry?.playheadVisible,
    lanesVisible: geometry?.lanesVisible,
    contextVisible: geometry?.contextVisible,
  }));
  if (geometry.timelineScroll) pass('audio mixer: timeline is horizontally scrollable when needed');
  if (geometry.overflowX === 0) pass('audio mixer: no horizontal overflow in mix (' + label + ')');
  else fail('audio mixer: horizontal overflow while in mix (' + label + '): ' + geometry.overflowX);
  if (geometry.wrapLeft >= geometry.hostLeft - 1 && geometry.wrapRight <= geometry.hostRight + 1)
    pass('audio mixer: mix workspace fits host width (' + label + ')');
  else fail('audio mixer workspace width issue (' + label + '): ' + JSON.stringify({
    wrapLeft: geometry.wrapLeft,
    wrapRight: geometry.wrapRight,
    hostLeft: geometry.hostLeft,
    hostRight: geometry.hostRight,
  }));
}

export async function assertVideoTopViewport({ page, pass, fail }, label) {
  const geometry = await page.$eval('#previewHost .media-doc.media-video', (host) => {
    const workspace = host.querySelector('.media-video-workspace');
    const modeTabs = host.querySelector('.media-mode-tabs');
    const media = host.querySelector('.media-video-surface video.media-view');
    const title = host.querySelector('.media-workspace-title');
    const time = host.querySelector('.media-workspace-time');
    const watchPanel = host.querySelector('.media-mode-panel[data-mode="watch"]');
    const panelVisible = watchPanel && getComputedStyle(watchPanel).display !== 'none' && !watchPanel.hidden;
    if (!workspace || !modeTabs || !media || !title || !time || !watchPanel) return null;
    const hostRect = host.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const docEl = document.documentElement;
    return {
      topInset: Math.round(workspaceRect.top - hostRect.top),
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      hostLeft: Math.round(hostRect.left),
      hostRight: Math.round(hostRect.right),
      workspaceLeft: Math.round(workspaceRect.left),
      workspaceRight: Math.round(workspaceRect.right),
      overflowX: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      titleVisible: title.textContent.trim().length > 0 && title.getBoundingClientRect().height > 0,
      timeVisible: time.textContent.trim().length > 0 && time.getBoundingClientRect().height > 0,
      mediaVisible: mediaRect.height > 0 && getComputedStyle(media).display !== 'none',
      modeTabsVisible: modeTabs.getBoundingClientRect().height > 0 && getComputedStyle(modeTabs).display !== 'none',
      watchModeVisible: panelVisible,
    };
  });
  if (!geometry) return fail('video first-viewport geometry unavailable (' + label + ')');
  const topLimit = Math.min(72, Math.floor(geometry.viewportH * 0.2));
  if (geometry.titleVisible && geometry.timeVisible && geometry.mediaVisible && geometry.modeTabsVisible && geometry.watchModeVisible)
    pass('video first-viewport core surfaces are visible (' + label + ')');
  else fail('video first-viewport core surface missing (' + label + '): ' + JSON.stringify({
    titleVisible: geometry.titleVisible,
    timeVisible: geometry.timeVisible,
    mediaVisible: geometry.mediaVisible,
    modeTabsVisible: geometry.modeTabsVisible,
    watchModeVisible: geometry.watchModeVisible,
  }));
  if (geometry.topInset >= 0 && geometry.topInset <= topLimit)
    pass('video first-viewport begins near top (workspace inset ' + geometry.topInset + 'px <= ' + topLimit + 'px)');
  else fail('video first viewport top inset too large (' + geometry.topInset + 'px > ' + topLimit + 'px) for ' + label);
  if (geometry.overflowX === 0 && geometry.workspaceLeft >= geometry.hostLeft - 1 && geometry.workspaceRight <= geometry.hostRight + 1)
    pass('video first-viewport has no horizontal overflow (' + label + ')');
  else fail('video first-viewport overflow/width issue (' + label + '): ' + JSON.stringify(geometry));
}
