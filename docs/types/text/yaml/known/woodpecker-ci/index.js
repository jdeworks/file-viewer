export default {
  id: 'woodpecker-ci',
  label: 'Woodpecker CI',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const fn = intake.filename || '';
    const name = fn.split('/').pop().toLowerCase();
    return name === '.woodpecker.yml' || name === '.woodpecker.yaml' || fn.includes('.woodpecker/');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Woodpecker CI pipeline — shows steps, when conditions, matrix builds, and secrets used.',
    usedFor: [{ label: 'CI/CD', description: 'Lightweight CI/CD for Gitea and Forgejo with Woodpecker', href: 'https://woodpecker-ci.org/docs/usage/pipeline-syntax' }],
  },
};
