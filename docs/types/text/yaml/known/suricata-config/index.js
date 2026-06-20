export const plugin = {
  id: 'suricata-config',
  label: 'Suricata Config',
  tags: ['suricata', 'ids', 'ips', 'security', 'yaml'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'suricata.yaml' || n === 'suricata.yml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Suricata IDS/IPS configuration defining network variables, capture interfaces, rule files, and output settings.',
    usedFor: [{ label: 'Suricata IDS/IPS', description: 'Configure Suricata network threat detection: HOME_NET, capture interfaces, rule-files, and alert outputs.', href: 'https://suricata.io/documentation/' }],
  },
};
export default plugin;
