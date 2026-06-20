export const plugin = {
  id: 'netplan',
  label: 'Netplan',
  tags: ['network', 'netplan', 'ubuntu', 'networking'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // netplan files are typically in /etc/netplan/ and named NN-name.yaml
    if (/^\d{2}-.*\.ya?ml$/.test(n)) {
      const t = intake.text || '';
      return t.includes('network:') && (t.includes('ethernets:') || t.includes('wifis:') || t.includes('bonds:') || t.includes('bridges:') || t.includes('vlans:'));
    }
    return n === 'netplan.yaml' || n === 'netplan.yml' || n === '01-netcfg.yaml' || n === '00-installer-config.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Ubuntu Netplan network configuration — declarative YAML rendered to networkd or NetworkManager.',
    usedFor: [{ label: 'Netplan', description: 'The network configuration abstraction renderer for Ubuntu', href: 'https://netplan.io/' }],
  },
};
export default plugin;
