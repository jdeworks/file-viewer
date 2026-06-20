export default {
  id: 'ncmpcpp-conf',
  label: 'ncmpcpp Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // ncmpcpp config filename is typically just 'config' in ~/.config/ncmpcpp/
    if (n === 'config') {
      const text = intake.textSample || intake.text || '';
      if (text.includes('ncmpcpp_directory') || (text.includes('mpd_host') && text.includes('lyrics_directory'))) return true;
      if (text.includes('media_library_primary_tag') || text.includes('visualizer_data_source')) return true;
    }
    if (n === 'ncmpcpp.conf' || n === '.ncmpcpprc') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'ncmpcpp MPD music player client configuration — display, colors, visualizer, and keybindings.',
    tags: ['ncmpcpp', 'mpd', 'music', 'cli', 'config'],
  },
};
