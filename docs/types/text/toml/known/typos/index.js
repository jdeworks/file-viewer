export default {
  id: 'typos',
  label: 'typos spell checker config',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'typos.toml' || name === '_typos.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'typos source code spell checker configuration — word overrides, file ignores, and check settings.',
    usedFor: [{ label: 'Spell checking', description: 'Fast source code spell checker that finds common typos.', href: 'https://github.com/crate-ci/typos/blob/master/docs/reference.md' }],
  },
};
