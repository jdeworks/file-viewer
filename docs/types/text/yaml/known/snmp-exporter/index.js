export const plugin = {
  id: 'snmp-exporter',
  label: 'SNMP Exporter',
  tags: ['prometheus', 'monitoring', 'snmp', 'network'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'snmp.yml' || n === 'snmp.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prometheus SNMP Exporter configuration — modules defining OID walks, metric mappings, and auth profiles.',
    usedFor: [{ label: 'SNMP metrics collection', description: 'Configure SNMP modules with OID walks, metric definitions, and authentication for network device monitoring.', href: 'https://github.com/prometheus/snmp_exporter' }],
  },
};
export default plugin;
