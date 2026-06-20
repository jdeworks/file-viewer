export const plugin = {
  id: 'unbound-conf',
  label: 'Unbound DNS',
  tags: ['dns', 'unbound', 'resolver', 'networking'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'unbound.conf') return true;
    // content heuristic: unbound uses server: section with typical keys
    const t = intake.textSample || intake.text || '';
    return /^server:\s*$/m.test(t) && /^\s+(verbosity|interface|access-control|root-hints):/m.test(t);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Unbound DNS resolver configuration — defines server settings, access controls, forwarders, and DNSSEC validation for the NLnet Labs Unbound resolver.',
    usedFor: [{ label: 'Unbound', description: 'NLnet Labs validating, recursive, caching DNS resolver', href: 'https://nlnetlabs.nl/projects/unbound/about/' }],
  },
};
export default plugin;
