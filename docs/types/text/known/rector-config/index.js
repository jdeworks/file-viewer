export default {
  id: 'rector-config',
  label: 'Rector Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'rector.php' && n !== 'config.php') return false;
    const text = intake.text || '';
    return text.includes('->withRules(') || text.includes('RectorConfig') || text.includes('->withPhpSets(');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rector automated PHP refactoring configuration — upgrade rules, PHP version target, dead code removal, and rule sets.',
    usedFor: [{ label: 'Rector PHP upgrader', description: 'Rector automatically upgrades PHP code to newer versions and applies coding standard rules.', href: 'https://getrector.com/documentation' }],
  },
};
