export default {
  id: 'coderabbit',
  label: 'CodeRabbit config',
  match(intake, baseType) {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType?.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.coderabbit.yaml' || name === '.coderabbit.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'CodeRabbit AI code review configuration — controls auto-review behavior, draft PR handling, path filters, language models, and integrated tools.',
    usedFor: [{ label: 'AI code review', description: 'Automated AI-powered pull request reviews with CodeRabbit', href: 'https://docs.coderabbit.ai/getting-started/configure-coderabbit/' }],
  },
};
