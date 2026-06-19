export default {
  id: 'snyk-config',
  label: 'Snyk',
  match(intake) {
    return (intake.name || '').toLowerCase() === '.snyk';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.snyk policy file — Snyk vulnerability and license ignore rules, patches, and language settings.',
    usedFor: [{ label: 'Vulnerability management', description: 'Snyk policy for ignoring false positives and applying patches', href: 'https://docs.snyk.io/manage-risk/policies/the-.snyk-file' }],
  },
};
