export default {
  id: 'redis-conf',
  label: 'Redis config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'redis.conf' || n === 'redis.conf.example';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Redis server configuration — port, bind addresses, memory limits, persistence settings, and security.',
    usedFor: [{ label: 'Redis config', description: 'Configure Redis port, memory policy, persistence (RDB/AOF), and access control.', href: 'https://redis.io/docs/latest/operate/oss_and_stack/management/config/' }],
  },
};
