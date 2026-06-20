export default {
  id: 'homarr-config',
  label: 'Homarr dashboard config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'homarr.yaml' || n === 'homarr.yml') return true;
    const t = intake.text || '';
    // Homarr-specific: apps array + widgets array + sections + name
    return (
      t.includes('apps:') &&
      t.includes('widgets:') &&
      t.includes('sections:') &&
      t.includes('name:')
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Homarr self-hosted application dashboard configuration — defines apps, widgets, integrations, and board layout.',
    usedFor: [
      { label: 'Homarr dashboard', description: 'Configure a Homarr startpage with application tiles, widgets, and service integrations.', href: 'https://homarr.dev/docs/getting-started/after-the-installation/' },
    ],
  },
};
