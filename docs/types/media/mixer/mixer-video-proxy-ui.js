export function renderVideoProxyPlanPanel(plan, runtime = {}) {
  const panel = document.createElement('section');
  panel.className = 'mmx-video-proxy-status';
  panel.dataset.status = plan.status;
  panel.dataset.canRender = plan.canRender ? 'true' : 'false';
  panel.dataset.proxyCount = String(plan.provenance?.assets?.length || 0);
  const title = document.createElement('strong');
  title.textContent = plan.canRender
    ? 'Preview proxy conversion ready'
    : (plan.provenance?.assets?.length ? 'Preview proxy needs Media Transcoding' : 'No preview proxy needed');
  const summary = document.createElement('span');
  summary.className = 'mmx-video-proxy-summary';
  summary.textContent = `${plan.provenance?.assets?.length || 0} asset(s) · ${plan.provenance?.renderBudget?.totalInputBytes || 0} bytes`;
  const note = document.createElement('p');
  note.className = 'mmx-video-proxy-note';
  note.textContent = plan.warnings?.[0] || plan.statusMessage || 'Proxy conversion creates a browser-playable MP4 preview without changing project settings media bytes.';
  const run = document.createElement('button');
  run.type = 'button';
  run.className = 'mmx-video-proxy-run';
  run.textContent = 'Create preview proxy';
  run.disabled = !runtime.ffmpegEnabled || !(plan.provenance?.assets?.length);
  run.title = runtime.ffmpegEnabled ? 'Load Media Transcoding and create preview proxies' : 'Enable Media Transcoding to create preview proxies';
  panel.append(title, summary, note, run);
  return panel;
}
