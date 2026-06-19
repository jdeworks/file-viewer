export default {
  id: 'cliff',
  label: 'git-cliff config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'cliff.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'git-cliff changelog generator configuration — defines templates, commit parsers, and output format.',
    usedFor: [{ label: 'Changelog generation', description: 'Highly customizable changelog generator', href: 'https://git-cliff.org/docs/configuration' }],
  },
};
