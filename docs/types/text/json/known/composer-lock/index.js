// composer.lock enhancement: show package count, platform requirements, content-hash.
export default {
  id: 'composer-lock',
  label: 'composer.lock',
  match: (intake, baseType) => baseType.id === 'json' && /(^|\/)composer\.lock$/i.test(intake.filename || ''),
  loadRenderer: () => import('./renderer.js'),
};
