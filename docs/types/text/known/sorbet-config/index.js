export default {
  id: 'sorbet-config',
  label: 'Sorbet config',
  match: (intake) => {
    const n = (intake.filename || '').split('/').pop();
    const p = intake.filename || '';
    const t = intake.text || '';
    // Match sorbet/config file, or any file named 'config' in a sorbet/ directory
    return (n === 'config' && p.includes('sorbet')) ||
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
