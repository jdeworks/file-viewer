export default {
  id: 'consul-config',
  label: 'Consul Config',
  match(intake) {
    const name = (intake.filename || '').split('/').pop();
    return name === 'consul.hcl' || name === 'consul.json' || name === 'consul-server.hcl' || name === 'consul-agent.hcl';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Consul agent/server configuration — datacenter, networking, TLS, and retry-join settings.',
    usedFor: [{ label: 'Consul service mesh', description: 'Configure Consul agents and servers for service discovery and service mesh.', href: 'https://developer.hashicorp.com/consul/docs/agent/config' }],
  },
};
