export default {
  id: 'biome',
  label: 'Biome config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'biome.json' || name === 'biome.jsonc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Biome unified toolchain configuration — formatter, linter, and import organizer for JavaScript, TypeScript, and CSS.',
    usedFor: [{ label: 'Code formatting & linting', description: 'Fast formatter and linter replacing Prettier and ESLint', href: 'https://biomejs.dev/reference/configuration/' }],
  },
};
