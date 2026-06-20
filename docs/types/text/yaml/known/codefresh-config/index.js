export default {
  id: 'codefresh-config',
  label: 'Codefresh config',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'codefresh.yml' || name === 'codefresh.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Codefresh pipeline — shows version, steps, triggers, and variables.',
    usedFor: [{ label: 'CI/CD', description: 'Codefresh GitOps CD platform pipeline definition', href: 'https://codefresh.io/docs/docs/configure-ci-cd-pipeline/introduction-to-codefresh-pipelines/' }],
  },
};
