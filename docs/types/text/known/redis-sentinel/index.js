// Redis Sentinel configuration: sentinel.conf
export default {
  id: 'redis-sentinel',
  label: 'Redis Sentinel config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'sentinel.conf') return true;
    if (n.endsWith('sentinel.conf')) {
      const t = intake.text || intake.textSample || '';
      return t.includes('sentinel monitor');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Redis Sentinel configuration — sentinel port, monitored masters, quorum, failover timeouts, and notification scripts.',
    usedFor: [{ label: 'Redis Sentinel', description: 'Configure Redis Sentinel for high-availability monitoring and automatic failover.', href: 'https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/' }],
  },
};
