// gradle.properties enhancement: shows JVM config, Kotlin/Android SDK versions, build settings.
export default {
  id: 'gradle-props',
  label: 'Gradle properties',
  match: (intake) => (intake.name || '').toLowerCase() === 'gradle.properties',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Gradle project properties — JVM args, parallel builds, daemon settings, Kotlin/Android SDK versions, and custom project properties.' },
};
