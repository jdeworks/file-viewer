export default {
  id: 'dashy-config',
  label: 'Dashy Dashboard',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicit dashy filenames
    if (n === 'dashy.yml' || n === 'dashy.yaml') {
      const text = intake.text || '';
      return text.includes('pageInfo') && text.includes('sections');
    }
    // Generic conf.yml — require parsed YAML structure
    if (n === 'conf.yml') {
      const parsed = intake.parsed || {};
      return typeof parsed.pageInfo === 'object' && parsed.pageInfo !== null && Array.isArray(parsed.sections);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dashy self-hosted personal dashboard configuration — defines pages, sections, items, and app settings.',
    usedFor: [
      { label: 'Self-hosted dashboards', description: 'Configure a Dashy startpage with service sections, items, theming, and appearance settings.', href: 'https://dashy.to' },
    ],
  },
};
