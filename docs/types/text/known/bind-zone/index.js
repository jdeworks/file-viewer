export default {
  id: 'bind-zone',
  label: 'DNS Zone File',
  tags: ['dns', 'zone', 'bind', 'config'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = (intake.textSample || intake.text || '').slice(0, 2000);
    // Explicit zone/db extension or db.* prefix
    if (n.endsWith('.zone') || n.endsWith('.db') || n.startsWith('db.')) {
      // Content guard: must contain DNS record indicators
      if (/\bSOA\b/.test(text) || /\bIN\s+NS\b/.test(text) || /\bIN\tNS\b/.test(text)) return true;
      if (n.endsWith('.zone')) return true; // .zone extension is strong signal
    }
    // Generic: must have SOA or IN SOA
    if (text.includes('IN SOA') || text.includes('\tSOA\t') || /^\s*@\s+IN\s+SOA/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'DNS zone file — defines resource records (SOA, NS, A, MX, TXT, CNAME, SRV) for a DNS zone managed by BIND or compatible nameservers.',
    usedFor: [{ label: 'BIND DNS zone', description: 'Zone data file containing DNS resource records for a domain', href: 'https://www.isc.org/bind/' }],
  },
};
