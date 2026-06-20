export default {
  id: 'nfs-exports',
  label: 'NFS Exports',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'exports') return true;
    if (text.includes('(rw,') || text.includes('(ro,')) {
      if (text.includes('no_root_squash') || text.includes('sync') || text.includes('subtree_check') || text.includes('no_subtree_check')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'NFS export configuration — defines which directories are shared over NFS and the access permissions for each client.',
    usedFor: [{ label: 'NFS', description: 'Network File System — protocol for sharing filesystems over a network', href: 'https://linux.die.net/man/5/exports' }],
  },
};
