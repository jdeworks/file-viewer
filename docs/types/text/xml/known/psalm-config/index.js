export default {
  id: 'psalm-config',
  label: 'Psalm Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'psalm.xml' || n === 'psalm.xml.dist') return true;
    // Content-check: root element must be <psalm>
    const text = intake.text || '';
    return /<psalm[\s>]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Psalm static analysis configuration — error level, PHP version target, project roots, plugins, stubs, and per-issue suppressions.',
    usedFor: [{ label: 'Psalm static analyzer', description: 'Psalm finds type errors and bugs in PHP code without running it.', href: 'https://psalm.dev/docs/running_psalm/configuration/' }],
  },
};
