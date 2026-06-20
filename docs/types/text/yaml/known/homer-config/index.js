export default {
  id: 'homer-config',
  label: 'Homer Dashboard',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.yml' && n !== 'homer.yml') return false;
    const text = intake.text || '';
    // Homer-specific heuristic
    return text.includes('services:') && (text.includes('subtitle:') || text.includes('logo:') || text.includes('header:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homer self-hosted dashboard configuration — defines title, services, links, and appearance settings.',
    usedFor: [
      { label: 'Self-hosted dashboards', description: 'Configure a Homer startpage with service groups, links, and theme settings.', href: 'https://github.com/bastienwirtz/homer' },
    ],
  },
};
