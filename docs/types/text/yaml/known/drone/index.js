export default {
  id: 'drone',
  label: 'Drone CI config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === '.drone.yml' || name === 'drone.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Drone CI pipeline — shows kind, steps, services, and trigger configuration.',
    usedFor: [{ label: 'CI/CD', description: 'Container-native CI/CD with Drone', href: 'https://docs.drone.io/' }],
  },
};
