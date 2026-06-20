// gradle-wrapper.properties enhancement: shows Gradle version, distribution type and URL.
export default {
  id: 'gradle-wrapper',
  label: 'Gradle Wrapper',
  match: (intake) => (intake.name || intake.filename || '').split('/').pop().toLowerCase() === 'gradle-wrapper.properties',
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Gradle Wrapper configuration — the Gradle version, distribution URL, and download settings used to bootstrap Gradle in the project.' },
};
