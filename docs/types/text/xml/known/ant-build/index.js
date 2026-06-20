export default {
  id: 'ant-build',
  label: 'Ant Build',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'build.xml') {
      if (text.includes('<project') && (text.includes('<target') || text.includes('<property'))) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache Ant build file — defines build targets, properties, and task sequences for Java projects.',
    usedFor: [{ label: 'Apache Ant', description: 'Java build system', href: 'https://ant.apache.org/manual/' }],
  },
};
