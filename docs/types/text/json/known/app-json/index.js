export const plugin = {
  id: 'app-json',
  label: 'app.json',
  tags: ['heroku', 'deploy', 'paas'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'app.json') return false;
    // Distinguish from Expo: Heroku app.json has a top-level "name" without "expo" key
    try {
      const parsed = intake.parsed ?? JSON.parse(intake.text || '{}');
      if (parsed && typeof parsed.expo === 'object' && parsed.expo !== null) return false;
      return parsed && typeof parsed.name === 'string';
    } catch { return false; }
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Heroku app manifest — app metadata, buildpacks, formation, addons, environment variables, and deploy scripts.',
    usedFor: [{ label: 'Heroku', description: 'Deploy apps to Heroku PaaS', href: 'https://devcenter.heroku.com/articles/app-json-schema' }],
  },
};
export default plugin;
