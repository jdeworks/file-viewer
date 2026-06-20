// .node-version plugin: shows the pinned Node.js version for volta, nvm, fnm, and other tools.
export default {
  id: 'node-version-file',
  label: '.node-version',
  match: (intake) => {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === '.node-version';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.node-version — pins a Node.js version for fnm, volta, and other version managers (alternative to .nvmrc).',
    usedFor: [
      { label: 'Node version pin', description: 'fnm, volta, and other tools read this file to auto-switch Node.js versions', href: 'https://github.com/jdx/mise#tool-version-files' },
    ],
  },
};
