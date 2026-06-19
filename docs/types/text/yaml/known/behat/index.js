// Behat BDD testing configuration (behat.yml / behat.yaml).
export default {
  id: 'behat',
  label: 'Behat Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'behat.yml' || n === 'behat.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Behat configuration file — defines test suites, contexts, formatters, and step definitions for BDD (Behavior-Driven Development) testing in PHP.',
    usedFor: [{ label: 'PHP BDD testing', description: 'Behat is a BDD framework for PHP inspired by Cucumber', href: 'https://docs.behat.org/en/latest/userguide/configuration.html' }],
  },
};
