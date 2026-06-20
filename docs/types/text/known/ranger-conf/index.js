export default {
  id: 'ranger-conf',
  label: 'Ranger Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'rc.conf') {
      const text = intake.textSample || intake.text || '';
      if (text.includes('set preview_images') || text.includes('set column_ratios')) return true;
      if (text.includes('set vcs_aware') || text.includes('map <C-f> fzf_select')) return true;
    }
    if (n === 'ranger.conf') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ranger terminal file manager configuration — settings, key mappings, and preview options.',
    tags: ['ranger', 'filemanager', 'terminal', 'config'],
  },
};
