export default {
  id: 'prettierrc',
  label: 'Prettier config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return ['.prettierrc', '.prettierrc.json', '.prettierrc.jsonc', 'prettier.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prettier code formatter configuration — controls indentation, quotes, trailing commas, and per-file-type overrides.',
    usedFor: [{ label: 'Code formatting', description: 'Opinionated code formatter for JS/TS/CSS/HTML/JSON and more', href: 'https://prettier.io/docs/en/configuration.html' }],
  },
};
