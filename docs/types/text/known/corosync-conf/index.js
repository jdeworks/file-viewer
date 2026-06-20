export default {
  id: 'corosync-conf',
  label: 'Corosync Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'corosync.conf') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('totem {') && text.includes('quorum {')) return true;
    if (text.includes('cluster_name:') && (text.includes('transport:') || text.includes('provider:'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Corosync cluster messaging layer configuration — defines totem ring settings, quorum policy, node list, and logging for high-availability Linux clusters.',
    usedFor: [{ label: 'Corosync', description: 'Cluster messaging layer implementing the Totem Single-Ring Ordering and Membership protocol', href: 'https://corosync.github.io/corosync/' }],
  },
};
