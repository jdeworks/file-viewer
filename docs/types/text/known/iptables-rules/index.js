export default {
  id: 'iptables-rules',
  label: 'iptables Rules',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'iptables.rules' || n === 'rules.v4' || n === 'rules.v6' || n === 'iptables') return true;
    if (text.includes('*filter') && text.includes('-A INPUT') && text.includes('COMMIT')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'iptables firewall rules — packet filter rules saved in iptables-save format.',
    usedFor: [{ label: 'iptables', description: 'Linux kernel firewall rule management', href: 'https://man7.org/linux/man-pages/man8/iptables.8.html' }],
  },
};
