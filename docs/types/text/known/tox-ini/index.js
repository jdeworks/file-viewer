export const plugin = {
  id: 'tox-ini',
  label: 'tox Config',
  tags: ['tox', 'python', 'testing', 'virtualenv'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'tox.ini') return true;
    const t = intake.text || '';
    return /^\[tox\]/m.test(t) && /^envlist/m.test(t);
  },
  renderer: () => import('./renderer.js'),
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'tox.ini — Python test automation: defines test environments, dependencies, and commands across multiple Python versions.',
    usedFor: [{ label: 'tox', description: 'Automated Python testing across multiple interpreters and environments', href: 'https://tox.wiki' }],
  },
};
export default plugin;
