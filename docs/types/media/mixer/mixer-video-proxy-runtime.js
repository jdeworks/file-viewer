import { updateAsset } from './mixer-model.js';
import { renderVideoProxiesWithFfmpeg } from './mixer-video-export.js';

export function applyVideoProxyResults(project, runtimeFiles, proxies = []) {
  let next = project;
  for (const proxy of proxies) {
    const file = new File([proxy.blob], proxy.filename, { type: 'video/mp4', lastModified: Date.now() });
    runtimeFiles.set(proxy.assetId, file);
    next = updateAsset(next, proxy.assetId, (asset) => ({
      ...asset,
      mime: 'video/mp4',
      size: proxy.bytes,
      status: 'available',
      capabilities: {
        ...asset.capabilities,
        needsFfmpegForPreview: false,
        proxyGenerated: true,
      },
      media: {
        ...asset.media,
        proxyName: proxy.filename,
        proxyBytes: proxy.bytes,
      },
    }));
  }
  return next;
}

export async function runVideoProxyRender({
  root,
  runtime,
  runtimeFiles,
  buildPlan,
  setPlan,
  applyProxies,
  render,
}) {
  let plan = buildPlan();
  setPlan(plan);
  root.dataset.lastVideoProxyPlan = JSON.stringify(plan.provenance);
  if (!runtime.ffmpegEnabled) {
    root.dataset.videoProxyRunState = 'opt-in-required';
    render();
    return;
  }
  root.dataset.videoProxyRunState = 'loading';
  root.dataset.videoProxyError = '';
  render();
  try {
    const { loadFfmpeg } = await import('../transcoder.js');
    const ff = await loadFfmpeg(({ ratio }) => {
      root.dataset.videoProxyProgress = String(Math.round((ratio || 0) * 100));
    });
    runtime.ffmpegLoaded = true;
    plan = buildPlan();
    setPlan(plan);
    root.dataset.lastVideoProxyPlan = JSON.stringify(plan.provenance);
    root.dataset.videoProxyRunState = 'rendering';
    render();
    const result = await renderVideoProxiesWithFfmpeg(ff, plan, runtimeFiles);
    applyProxies(result.proxies);
    root.dataset.videoProxyRunState = 'complete';
    root.dataset.lastVideoProxyCount = String(result.proxies.length);
  } catch (error) {
    const { formatFfmpegError } = await import('../transcoder.js')
      .catch(() => ({ formatFfmpegError: (err) => err?.message || String(err) }));
    root.dataset.videoProxyRunState = 'error';
    root.dataset.videoProxyError = formatFfmpegError(error);
  } finally {
    render();
  }
}
