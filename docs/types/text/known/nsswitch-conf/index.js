const COMMON_DBS = ['passwd', 'group', 'shadow', 'hosts', 'networks', 'services', 'protocols',
  'rpc', 'ethers', 'netmasks', 'bootparams', 'automount', 'aliases', 'resolv', 'publickey', 'netgroup'];

export default {
  id: 'nsswitch-conf',
  label: 'nsswitch.conf',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name === 'nsswitch.conf') return true;
    // Exclude structured-data and markup extensions — their key: value syntax causes
    // false-positive matches against the nsswitch database patterns.
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (['yaml', 'yml', 'json', 'toml', 'xml', 'html', 'ini', 'cfg', 'conf', 'md', 'rst'].includes(ext)) return false;
    const text = intake.text || '';
    const lines = text.split(/\r?\n/).filter((l) => /^\w+:\s+\w+/.test(l.trim()));
    if (lines.length < 3) return false;
    const dbHits = COMMON_DBS.filter((db) => text.includes(db + ':')).length;
    return dbHits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Name Service Switch configuration — controls how the system resolves names for databases like passwd, hosts, and services.',
    usedFor: [
      { label: 'nsswitch.conf(5)', description: 'Manual page for Name Service Switch configuration', href: 'https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html' },
    ],
  },
};
