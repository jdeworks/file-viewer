export default {
  id: 'patroni-config',
  label: 'Patroni Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'patroni.yml' || n === 'patroni.yaml' || n === 'patroni.conf') return true;
    if (text.includes('bootstrap:') && text.includes('dcs:') && (text.includes('postgresql:') || text.includes('etcd:') || text.includes('consul:'))) return true;
    if (text.includes('restapi:') && text.includes('listen:') && text.includes('bootstrap:') && text.includes('postgresql:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Patroni HA configuration — defines PostgreSQL high-availability cluster settings including DCS backend, bootstrap, and replication.',
    usedFor: [{ label: 'Patroni', description: 'Template for PostgreSQL HA with automatic failover', href: 'https://patroni.readthedocs.io/' }],
  },
};
