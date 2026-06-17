// build.gradle / build.gradle.kts enhancement: list the declared dependencies (group:artifact:
// version) by configuration, each linked to mvnrepository. Handles both Groovy and Kotlin DSL.
export default {
  id: 'build-gradle',
  label: 'build.gradle',
  match: (intake) => /(^|\/)build\.gradle(\.kts)?$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
