export default {
  id: 'nvmrc',
  label: '.nvmrc',
  match: (intake) => /(^|\/)\.?nvmrc$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: '.nvmrc — pins the Node.js version for the project, used by nvm and compatible tooling.',
    usedFor: [{ label: 'Node version pin', description: 'Automatically switch to the correct Node.js version', href: 'https://github.com/nvm-sh/nvm#nvmrc' }],
  },
};
