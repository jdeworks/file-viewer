export default {
  id: 'hatch',
  label: 'Hatch (Python build)',
  match: (intake, baseType) => baseType?.id === 'toml' && (intake.filename || '').split('/').pop().toLowerCase() === 'hatch.toml',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Hatch Python build system config — build targets, environments, scripts, and versioning.' },
};
