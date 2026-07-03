export default {
  id: 'buildkite',
  label: 'Buildkite pipeline',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const fn = intake.filename || '';
    const name = fn.split('/').pop().toLowerCase();
    if (name === 'buildkite.yml' || name === 'buildkite.yaml') return true;
    return (name === 'pipeline.yml' || name === 'pipeline.yaml') && /\.buildkite[\\/]/i.test(fn);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Buildkite CI pipeline — shows steps, agents, and environment configuration.',
    usedFor: [{ label: 'CI/CD', description: 'Buildkite pipeline configuration', href: 'https://buildkite.com/docs/pipelines' }],
  },
};
