export function buildMediaWorkspace(intake, info, mediaElement, options = {}) {
  const host = document.createElement('div');
  host.className = 'media-doc media-' + (info.kind || 'audio');
  const name = document.createElement('div');
  name.className = info.kind === 'audio' ? 'media-workspace-title' : 'media-workspace-title media-name';
  name.textContent = intake.filename;

  let workspaceTime = null;
  let audioWorkspace = null;
  let videoWorkspace = null;
  let waveformSurface = null;
  let audioModes = null;
  let videoModes = null;
  let modeTabs = null;
  let modePanelWrap = null;
  let videoWorkspaceBody = null;

  if (info.kind === 'audio') {
    workspaceTime = document.createElement('div');
    workspaceTime.className = 'media-workspace-time';
    workspaceTime.textContent = '0:00 / --:--';

    const workspaceHead = document.createElement('div');
    workspaceHead.className = 'media-workspace-head';
    workspaceHead.append(name, workspaceTime);

    const mediaSurface = document.createElement('div');
    mediaSurface.className = 'media-audio-surface';
    mediaSurface.append(mediaElement);
    if (options.audioListenSurface) mediaSurface.append(options.audioListenSurface);

    waveformSurface = document.createElement('div');
    waveformSurface.className = 'media-waveform-surface';

    const workspaceBody = document.createElement('div');
    workspaceBody.className = 'media-workspace-body';
    workspaceBody.append(mediaSurface, waveformSurface);

    audioWorkspace = document.createElement('div');
    audioWorkspace.className = 'media-workspace media-audio-workspace';
    audioWorkspace.append(workspaceHead, workspaceBody);

    audioModes = document.createElement('div');
    audioModes.className = 'media-audio-modes';
    modeTabs = document.createElement('div');
    modeTabs.className = 'media-mode-tabs';
    modePanelWrap = document.createElement('div');
    modePanelWrap.className = 'media-mode-panels';
    audioModes.append(modeTabs, modePanelWrap);
  }

  if (info.kind === 'video') {
    workspaceTime = document.createElement('div');
    workspaceTime.className = 'media-workspace-time';
    workspaceTime.textContent = '0:00 / --:--';

    const workspaceHead = document.createElement('div');
    workspaceHead.className = 'media-workspace-head';
    workspaceHead.append(name, workspaceTime);

    const mediaSurface = document.createElement('div');
    mediaSurface.className = 'media-video-surface';
    mediaSurface.append(mediaElement);

    videoWorkspaceBody = document.createElement('div');
    videoWorkspaceBody.className = 'media-workspace-body';
    videoWorkspaceBody.append(mediaSurface);

    videoWorkspace = document.createElement('div');
    videoWorkspace.className = 'media-workspace media-video-workspace';
    videoWorkspace.append(workspaceHead, videoWorkspaceBody);

    videoModes = document.createElement('div');
    videoModes.className = 'media-video-modes';
    modeTabs = document.createElement('div');
    modeTabs.className = 'media-mode-tabs';
    modePanelWrap = document.createElement('div');
    modePanelWrap.className = 'media-mode-panels';
    videoModes.append(modeTabs, modePanelWrap);
  }

  return {
    host,
    workspaceTime,
    waveformSurface,
    modeTabs,
    modePanelWrap,
    audioWorkspace,
    videoWorkspace,
    audioModes,
    videoModes,
  };
}
