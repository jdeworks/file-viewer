export default {
  id: 'sorbet-config',
  label: 'Sorbet config',
  match: (intake) => {
    const n = (intake.filename || intake.name || '').split('/').pop();
    const p = intake.filename || intake.name || '';
    const t = intake.text || '';
    // Match sorbet/config file, or any file named 'config' in a sorbet/ directory,
    // or a file explicitly named 'sorbet.config'
    return n === 'sorbet.config' ||
           (n === 'config' && p.includes('sorbet')) ||
           (n === 'config' && t.includes('--dir') && t.includes('--ignore'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'sorbet/config — Sorbet type checker configuration: source dirs, ignore patterns, and feature flags.',
    usedFor: [
      { label: 'Type checking', description: 'Sorbet: gradual type checker for Ruby', href: 'https://sorbet.org/docs/cli' },
    ],
  },
};
