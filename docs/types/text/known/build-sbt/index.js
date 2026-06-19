export default {
  id: 'build-sbt',
  label: 'Scala/SBT',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop();
    return n === 'build.sbt';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'SBT build definition for a Scala project — project name, version, Scala version, organization, and library dependencies.' },
};
