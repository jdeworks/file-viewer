export default {
  id: 'jekyll-config',
  label: 'Jekyll Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '_config.yml' || n === '_config.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Jekyll static site configuration — defines site title, URL, theme, plugins, and content settings.',
    usedFor: [
      { label: 'Static sites', description: 'Build static websites with Jekyll on GitHub Pages or self-hosted servers' },
    ],
  },
};
