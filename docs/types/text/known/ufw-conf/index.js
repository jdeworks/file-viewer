export default {
  id: 'ufw-conf',
  label: 'UFW Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'ufw.conf' || n === 'before.rules' || n === 'before6.rules' || n === 'after.rules') {
      if (text.includes('DEFAULT_INPUT_POLICY') || text.includes('ufw') || text.includes('*filter')) return true;
    }
    if (n === 'user.rules' && text.includes('### tuple ###')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'UFW (Uncomplicated Firewall) configuration — manages iptables rules through a simplified interface.',
    usedFor: [{ label: 'UFW', description: 'Ubuntu Uncomplicated Firewall', href: 'https://help.ubuntu.com/community/UFW' }],
  },
};
