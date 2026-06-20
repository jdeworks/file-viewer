export default {
  id: 'zookeeper-config',
  label: 'ZooKeeper Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'zoo.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Apache ZooKeeper configuration — data directory, client ports, tick time, session timeouts, and ensemble server addresses.' },
};
