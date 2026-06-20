export default {
  id: 'tailscale-acl',
  label: 'Tailscale ACL',
  match(intake, baseType) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Filename matches
    if (['acls.hujson', 'acls.json', 'policy.hujson', 'tailscale-acl.json'].includes(n)) return true;
    // Any .hujson file
    if (n.endsWith('.hujson')) {
      const text = intake.text || '';
      if (text.includes('"acls"')) return true;
    }
    // acls.json with Tailscale-specific content
    if (n === 'acls.json') {
      const text = intake.text || '';
      if (text.includes('"tagOwners"') || (text.includes('"groups"') && text.includes('"tag:'))) return true;
    }
    // JSON base type with Tailscale ACL content heuristic
    if (baseType?.id === 'json') {
      const text = intake.text || '';
      if (text.includes('"acls"') && text.includes('"action"') && text.includes('"src"') && text.includes('"dst"')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Tailscale network ACL policy — access control rules, groups, hosts, tag owners, and SSH access rules.',
    usedFor: [{ label: 'Tailscale', description: 'ACL policy file controlling network access in a Tailscale tailnet', href: 'https://tailscale.com/kb/1018/acls/' }],
  },
};
