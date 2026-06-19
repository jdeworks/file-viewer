export default {
  id: 'growthbook',
  label: 'GrowthBook config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.growthbook.json' || n === 'growthbook.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GrowthBook feature flag SDK configuration — API host, client key, and feature definitions.',
    usedFor: [{ label: 'Feature flags', description: 'Configure GrowthBook SDK for feature flag and A/B test management.', href: 'https://docs.growthbook.io/lib/js' }],
  },
};
