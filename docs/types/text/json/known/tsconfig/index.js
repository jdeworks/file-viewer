// tsconfig.json enhancement: annotate the compilerOptions with short human descriptions and
// link to the TS docs, so a config is readable without looking each flag up.
export default {
  id: 'tsconfig',
  label: 'tsconfig.json',
  match: (intake, baseType) => baseType.id === 'json' && /(^|\/)tsconfig(\.\w+)?\.json$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
