export default {
  id: 'taskfile',
  label: 'Taskfile (Task runner)',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'taskfile.yml' || name === 'taskfile.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Taskfile configuration — shows version, dotenv files, and all defined tasks with descriptions and dependencies.',
    usedFor: [{ label: 'Build tool', description: 'Task runner using Taskfile', href: 'https://taskfile.dev/usage/' }],
  },
};
