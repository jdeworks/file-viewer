export default {
  id: 'gradle-version-catalog',
  label: 'Gradle Version Catalog',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'libs.versions.toml') return false;
    // Content-check: must have [versions] and [libraries] sections
    const text = intake.text || '';
    return text.includes('[versions]') && text.includes('[libraries]');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gradle version catalog — centralised dependency versions, library aliases, bundles, and plugin aliases.',
    usedFor: [{ label: 'Gradle build', description: 'Centralise and share dependency versions across Gradle multi-project builds.', href: 'https://docs.gradle.org/current/userguide/version_catalogs.html' }],
  },
};
