export default {
  id: 'polybar-conf',
  label: 'Polybar Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'config.ini' || n === 'polybar.ini' || n === 'polybar.conf' || n === 'config') {
      if (text.includes('[bar/') && (text.includes('modules-left') || text.includes('modules-right'))) return true;
    }
    if (text.includes('[bar/') && text.includes('[module/') && text.includes('type = ')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Polybar status bar configuration — defines bars and modules for a highly customizable Linux status bar.',
    usedFor: [{ label: 'Polybar', description: 'Fast and easy to use tool for creating status bars', href: 'https://polybar.readthedocs.io/' }],
  },
};
