export default {
  id: 'pylintrc',
  label: 'Pylint config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === '.pylintrc' || n === 'pylintrc' || n === '.pylint';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pylint static analysis configuration — controls which checks run, naming conventions, line length, and output scoring.',
    usedFor: [{ label: 'Pylint', description: 'Static analysis tool for Python code', href: 'https://pylint.readthedocs.io/en/stable/user_guide/configuration/index.html' }],
  },
};
