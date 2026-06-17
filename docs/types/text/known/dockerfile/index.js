// Dockerfile enhancement: break the file into its instructions (FROM/RUN/COPY/…) with a short
// note on each, and count build stages.
export default {
  id: 'dockerfile',
  label: 'Dockerfile',
  match: (intake, baseType) => /(^|\/)Dockerfile(\.\w+)?$/i.test(intake.filename || '') || /(\.|^)dockerfile$/i.test((intake.filename || '').split('/').pop() || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
