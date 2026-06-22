export default {
  id: 'artifactory-system',
  label: 'Artifactory system config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const t = intake.text || '';
    return n === 'system.yaml' && (t.includes('artifactory') || t.includes('jfrog'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'JFrog Artifactory system.yaml configuration — database, security, router, and service ports.',
    usedFor: [{ label: 'JFrog Artifactory', description: 'Universal artifact repository manager supporting all major package formats.', href: 'https://jfrog.com/help/r/jfrog-installation-setup-documentation/system-yaml-configuration-parameters' }],
  },
};
