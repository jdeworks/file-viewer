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
    // Generic conf.yml — require the two distinguishing top-level Dashy keys.
    // match() is synchronous (js-yaml loads async) and intake.parsed is never populated at
    // detection time, so this has to be a text heuristic, not a parsed-object check.
    if (n === 'conf.yml') {
      const text = intake.text || intake.textSample || '';
      return /^pageInfo:/m.test(text) && /^sections:/m.test(text);
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
