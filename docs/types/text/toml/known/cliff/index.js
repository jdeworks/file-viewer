export const plugin = {
  id: 'cliff-toml',
  label: 'cliff.toml',
  tags: ['git-cliff', 'changelog', 'toml'],
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'cliff.toml';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'git-cliff changelog generator configuration — defines templates, commit parsers, and output format.',
    usedFor: [{ label: 'Changelog generation', description: 'Highly customizable changelog generator', href: 'https://git-cliff.org/docs/configuration' }],
  },
};

export default plugin;
