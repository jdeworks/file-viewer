// settings.gradle / settings.gradle.kts enhancement: root project name, included subprojects, plugin repos.
export default {
  id: 'settings-gradle',
  label: 'Gradle Settings',
  match: (intake) => {
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'settings.gradle' || n === 'settings.gradle.kts';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Gradle multi-project settings — root project name, included subprojects, plugin management repositories, and dependency resolution settings.' },
};
