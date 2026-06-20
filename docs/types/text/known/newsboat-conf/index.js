export default {
  id: 'newsboat-conf',
  label: 'newsboat Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'config') {
      const text = intake.textSample || intake.text || '';
      if (text.includes('auto-reload') && text.includes('refresh-on-startup') && text.includes('reload-time')) return true;
      if (text.includes('bind-key') && text.includes('newsboat')) return true;
    }
    if (n === 'newsboat.conf') return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'newsboat RSS/Atom feed reader configuration — auto-reload, display, and key bindings.',
    tags: ['newsboat', 'rss', 'atom', 'news', 'cli', 'config'],
  },
};
