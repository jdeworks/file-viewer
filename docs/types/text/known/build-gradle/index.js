// build.gradle / build.gradle.kts plugin — Gradle build script viewer.
// Parses plugins, dependencies, repositories, tasks, and project metadata.
export default {
  id: 'build-gradle',
  label: 'Gradle Build',
  tags: ['gradle', 'build', 'java', 'kotlin'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'build.gradle' || n === 'build.gradle.kts';
  },
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  about: {
    description: 'Gradle build script — applied plugins, project coordinates, repositories, dependencies by configuration, and defined tasks.',
  },
};
