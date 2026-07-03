export default {
  id: 'mpv-conf',
  label: 'mpv Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'mpv.conf') return true;
    if (n === 'input.conf') {
      const text = intake.textSample || intake.text || '';
      // input.conf has lines like: KEY command arg
      if (text.match(/^[A-Z_]+\s+\w/m) && (text.includes('seek') || text.includes('playlist'))) return true;
    }
    const text = intake.textSample || intake.text || '';
    if (text.includes('video-output') || text.includes('vo=') || text.includes('hwdec=')) return true;
    if (text.includes('profile=') && (text.includes('sub-font') || text.includes('audio-channels'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'mpv media player configuration — video output, audio, subtitles, and profiles.',
    tags: ['mpv', 'video', 'media', 'config'],
  },
};
