export const plugin = {
  id: 'scalafix-conf',
  label: '.scalafix.conf',
  tags: ['scala', 'scalafix', 'linting', 'rewriting'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.scalafix.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Scalafix linter and rewriter configuration — defines rules for automated Scala code linting and refactoring.',
    usedFor: [{ label: 'Scalafix', description: 'Linting and rewriting tool for Scala', href: 'https://scalacenter.github.io/scalafix/' }],
  },
};
export default plugin;
