export default {
  id: 'semgrep-config',
  label: 'Semgrep config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.semgrep.yml' || n === '.semgrep.yaml' || n === 'semgrep.yml' || n === 'semgrep.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Semgrep static analysis configuration — rules with severity, language targets, and pattern definitions.',
    usedFor: [{ label: 'Semgrep', description: 'Static analysis tool for finding bugs and security issues', href: 'https://semgrep.dev/docs/writing-rules/rule-syntax/' }],
  },
};
