export default {
  id: 'checkstyle-xml',
  label: 'Checkstyle Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const nameOk = n === 'checkstyle.xml' || n.includes('checkstyle');
    const text = intake.text || '';
    const contentOk = text.includes('<module name="Checker"') || text.includes('DOCTYPE module PUBLIC') || text.includes('checkstyle');
    return nameOk && contentOk;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Checkstyle configuration — module tree of code-style rules applied to Java source files.',
    usedFor: [{ label: 'Checkstyle', description: 'Static analysis tool that checks Java source code for style issues.', href: 'https://checkstyle.org/' }],
  },
};
