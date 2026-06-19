export default {
  id: 'tsup-config',
  label: 'tsup Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'tsup.config.ts' || n === 'tsup.config.js' || n === 'tsup.config.mts' || n === 'tsup.config.mjs';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'tsup bundler configuration — defines entry points, output formats, TypeScript declarations, and build options.' },
};
