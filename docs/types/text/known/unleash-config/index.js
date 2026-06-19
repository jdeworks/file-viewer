export default {
  id: 'unleash-config',
  label: 'Unleash config',
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'unleash.config.js' || n === 'unleash.config.ts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Unleash feature toggle client configuration — app name, URL, environment, and toggle settings.',
    usedFor: [{ label: 'Feature toggles', description: 'Configure the Unleash SDK for feature flag evaluation.', href: 'https://docs.getunleash.io/reference/sdks/javascript-browser' }],
  },
};
