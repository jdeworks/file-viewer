export default {
  id: 'drone-config',
  label: 'Drone CI Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'drone.env') return true;
    return (intake.text || '').includes('DRONE_RPC_SECRET');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Drone CI server environment-variable configuration — server, RPC, OAuth providers, database, S3, and logging settings.',
    tags: ['drone', 'drone-ci', 'ci', 'cd', 'continuous-integration', 'config'],
  },
};
