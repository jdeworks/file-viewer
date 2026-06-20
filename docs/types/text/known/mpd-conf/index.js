export default {
  id: 'mpd-conf',
  label: 'MPD Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'mpd.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('music_directory') && text.includes('audio_output')) return true;
    if (text.includes('bind_to_address') && text.includes('music_directory') && text.includes('db_file')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Music Player Daemon (MPD) configuration — music library, audio outputs, and network settings.',
    tags: ['mpd', 'music', 'audio', 'config'],
  },
};
