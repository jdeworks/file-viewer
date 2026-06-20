export default {
  id: 'docker-stack',
  label: 'Docker Stack',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const t = intake.text || intake.textSample || '';
    if (!t.includes('deploy:') || !t.includes('replicas:')) return false;
    return t.includes('mode: replicated') || t.includes('mode: global') || t.includes('restart_policy:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Docker Swarm stack file — shows services with replica counts, update config, restart policy, placement constraints, and secrets/configs used.',
    usedFor: [{ label: 'Docker Swarm orchestration', description: 'Define multi-service stacks for deployment on Docker Swarm clusters using compose-format stack files.', href: 'https://docs.docker.com/engine/swarm/stack-deploy/' }],
  },
};
