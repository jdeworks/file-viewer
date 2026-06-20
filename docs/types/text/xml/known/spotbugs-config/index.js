export default {
  id: 'spotbugs-config',
  label: 'SpotBugs Filter',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const nameOk = n === 'spotbugs.xml' || n === 'findbugs.xml' || n === 'spotbugs-exclude.xml' || n === 'spotbugs-include.xml' || n === 'findbugs-exclude.xml';
    const text = intake.text || '';
    const contentOk = text.includes('<FindBugsFilter') || text.includes('<BugPattern') || (text.includes('<Match') && (text.includes('<Bug') || text.includes('<Class')));
    return nameOk && contentOk;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SpotBugs/FindBugs filter — rules that include or exclude specific bug patterns, classes, and methods from analysis.',
    usedFor: [{ label: 'SpotBugs', description: 'Static analysis tool that finds bugs in Java programs.', href: 'https://spotbugs.github.io/' }],
  },
};
