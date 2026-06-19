export default {
  id: 'parcelrc',
  label: 'Parcel Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.parcelrc';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Parcel bundler configuration — defines transformers, resolvers, packagers, optimizers, and reporters as named plugins.' },
};
