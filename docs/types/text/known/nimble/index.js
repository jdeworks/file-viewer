export default {
  id: 'nimble',
  label: 'Nim Package',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name.endsWith('.nimble');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Nimble package specification for the Nim language — defines package metadata and dependencies using a NimScript-based DSL.',
    usedFor: [
      { label: 'Nim packages', description: 'Libraries and applications built with the Nim language', href: 'https://nimble.directory/' },
    ],
  },
};
