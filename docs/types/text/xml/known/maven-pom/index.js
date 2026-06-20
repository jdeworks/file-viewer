export default {
  id: 'maven-pom',
  label: 'Maven POM',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'pom.xml') return false;
    // Content-check: must have <groupId> and <artifactId>
    const text = intake.text || '';
    return text.includes('<groupId>') && text.includes('<artifactId>');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Maven Project Object Model — project coordinates, dependencies, plugins, and parent POM.',
    usedFor: [{ label: 'Maven build', description: 'Java/JVM project build config for Apache Maven.', href: 'https://maven.apache.org/guides/introduction/introduction-to-the-pom.html' }],
  },
};
