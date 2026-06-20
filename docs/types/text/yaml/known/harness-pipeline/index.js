export default {
  id: 'harness-pipeline',
  label: 'Harness Pipeline',
  match: (intake, baseType) => {
    if (baseType.id !== 'yaml') return false;
    const text = intake.textSample || intake.text || '';
    return (
      text.includes('pipeline:') &&
      text.includes('identifier:') &&
      (text.includes('stages:') || text.includes('stage:')) &&
      (text.includes('type: CI') || text.includes('type: CD'))
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Harness pipeline — shows pipeline name, identifier, stages, and execution steps.',
    usedFor: [{ label: 'CI/CD', description: 'Enterprise CI/CD with Harness Platform', href: 'https://developer.harness.io/docs/platform/pipelines/pipeline-settings' }],
  },
};
