export default {
  id: 'hugo-config',
  label: 'Hugo config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Explicit Hugo filenames
    if (['hugo.toml', 'hugo.yaml', 'hugo.json'].includes(n)) return true;
    // config.toml/yaml/json that contains Hugo-specific keys
    if (['config.toml', 'config.yaml', 'config.json'].includes(n)) {
      const text = intake.text || '';
      return (text.includes('baseURL') || text.includes('baseUrl')) &&
             (text.includes('theme') || text.includes('languageCode') || text.includes('enableRobotsTXT'));
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hugo static site configuration — base URL, theme, languages, menu structure, taxonomy, and build settings.',
    usedFor: [{ label: 'Hugo', description: 'Fast static site generator', href: 'https://gohugo.io/documentation/' }],
  },
};
