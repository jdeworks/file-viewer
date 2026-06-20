export default {
  id: 'stryker',
  label: 'Stryker mutation testing',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'stryker.conf.json' || n === '.stryker.conf.json' || n === 'stryker.config.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stryker mutation testing configuration — defines mutate globs, test runner, thresholds, reporters, and timeouts.',
    usedFor: [{ label: 'Mutation testing', description: 'Stryker is a mutation testing framework for JavaScript, TypeScript, and more.', href: 'https://stryker-mutator.io/docs/stryker-js/configuration/' }],
  },
};
