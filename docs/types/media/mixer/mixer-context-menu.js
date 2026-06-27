export function createMixerContextMenuItems(hit, capabilities = {}) {
  const items = [];
  if (hit?.type === 'element') {
    items.push({ id: 'select', label: 'Select', enabled: true });
    items.push({ id: 'split-here', label: 'Split here', enabled: true });
    items.push({ id: 'set-cursor', label: 'Set cursor here', enabled: true });
    items.push({ id: 'use-compare-a', label: 'Use as Compare A', enabled: true });
    items.push({ id: 'use-compare-b', label: 'Use as Compare B', enabled: true });
  }
  if (hit?.type === 'lane') {
    items.push({ id: 'select-lane', label: 'Select lane', enabled: true });
    items.push({ id: 'set-cursor', label: 'Set cursor here', enabled: hit.region === 'empty-lane' });
  }
  if (capabilities.ffmpegRequired) {
    items.push({
      id: 'enable-ffmpeg',
      label: 'Enable Media Transcoding for conversion/export',
      enabled: !!capabilities.ffmpegEnabled,
    });
  }
  return items;
}

