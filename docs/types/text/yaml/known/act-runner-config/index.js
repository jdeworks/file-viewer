export default {
  id: 'act-runner-config',
  label: 'Act Runner Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'act_runner.yaml' || n === 'act-runner.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Gitea Act Runner configuration — the GitHub Actions-compatible CI runner for Gitea. Controls log level, runner capacity, labels, cache, container networking, and host workdir settings.',
    usedFor: [{ label: 'Gitea CI', description: 'Act Runner for Gitea GitHub Actions-compatible pipelines', href: 'https://gitea.com/gitea/act_runner' }],
  },
};
