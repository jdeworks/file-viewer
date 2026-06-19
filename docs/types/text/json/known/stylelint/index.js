export default {
  id: 'stylelint',
  label: 'Stylelint config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return ['.stylelintrc', '.stylelintrc.json', 'stylelint.config.json'].includes(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stylelint CSS/SCSS linter configuration — defines rules and plugins for stylesheet code quality.',
    usedFor: [{ label: 'CSS linting', description: 'Mighty CSS linter for avoiding errors and enforcing conventions', href: 'https://stylelint.io/user-guide/configure' }],
  },
};
