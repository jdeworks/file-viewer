export default {
  id: 'gleam-toml',
  label: 'Gleam Package',
  match: (intake, baseType) => {
    if (baseType?.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'gleam.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gleam language package manifest — defines the package name, version, target (Erlang/JavaScript), and dependencies.',
    usedFor: [
      { label: 'Gleam packages', description: 'Libraries and applications built with the Gleam language', href: 'https://gleam.run/' },
    ],
  },
};
