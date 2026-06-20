export default {
  id: 'sysctl-conf',
  label: 'sysctl Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'sysctl.conf' || n === 'sysctl.d' || (n.endsWith('.conf') && n.includes('sysctl'))) return true;
    if (text.match(/^(net\.|vm\.|kernel\.|fs\.|dev\.)\S+\s*=/m)) return true;
    if (text.includes('net.ipv4.ip_forward') || text.includes('vm.swappiness') || text.includes('kernel.sysrq')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'sysctl configuration — sets Linux kernel parameters for networking, memory management, security, and system behavior.',
    usedFor: [{ label: 'sysctl', description: 'Linux kernel parameter runtime configuration', href: 'https://www.kernel.org/doc/html/latest/admin-guide/sysctl/' }],
  },
};
