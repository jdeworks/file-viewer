export const plugin = {
  id: 'pulsar-conf',
  label: 'Apache Pulsar Config',
  tags: ['pulsar', 'messaging', 'streaming', 'broker'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'standalone.conf' && n !== 'broker.conf' && n !== 'pulsar.conf') return false;
    // content heuristic: Pulsar-specific keys
    const t = intake.text || '';
    return t.includes('zookeeperServers=') || t.includes('managedLedgerDefaultEnsembleSize=')
      || t.includes('brokerServicePort=') || t.includes('pulsarMetadataStoreUrl=');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache Pulsar broker configuration — cluster, ports, BookKeeper storage, authentication, TLS, and tiered storage offload settings.',
    usedFor: [{ label: 'Messaging', description: 'Apache Pulsar distributed messaging platform', href: 'https://pulsar.apache.org/docs/administration-configuration/' }],
  },
};
export default plugin;
