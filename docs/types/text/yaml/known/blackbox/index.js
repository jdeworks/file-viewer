export const plugin = {
  id: 'blackbox',
  label: 'Blackbox Exporter',
  tags: ['prometheus', 'monitoring', 'probes'],
  match(intake, baseType) {
    if (baseType && baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'blackbox.yml' || n === 'blackbox.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prometheus Blackbox Exporter configuration — probe modules for HTTP, TCP, DNS, ICMP, and gRPC endpoints.',
    usedFor: [{ label: 'Endpoint probing', description: 'Define probe modules to check external endpoints via HTTP, TCP, DNS, ICMP or gRPC.', href: 'https://github.com/prometheus/blackbox_exporter' }],
  },
};
export default plugin;
