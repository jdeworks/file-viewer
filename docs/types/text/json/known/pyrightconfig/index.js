export default {
  id: 'pyrightconfig',
  label: 'pyrightconfig.json',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'pyrightconfig.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pyright configuration — strict Python static type checking settings for VS Code and language servers.',
    usedFor: [{ label: 'Python type checking', description: 'Static type analysis for Python with Pyright', href: 'https://github.com/microsoft/pyright/blob/main/docs/configuration.md' }],
  },
};
