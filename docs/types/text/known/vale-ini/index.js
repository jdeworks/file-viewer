export const plugin = {
  id: 'vale-ini',
  label: 'vale.ini',
  tags: ['vale', 'prose', 'linting', 'writing'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'vale.ini' || n === '.vale.ini';
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vale prose linter configuration — StylesPath, MinAlertLevel, Packages, and per-glob style rules for enforcing writing standards.',
    usedFor: [{ label: 'Vale prose linter', description: 'Enforce prose style and grammar rules in documentation', href: 'https://vale.sh/docs/topics/config/' }],
  },
};
export default plugin;
