export default {
  id: 'kong-config',
  label: 'Kong Gateway config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'kong.yaml' || n === 'kong.yml' || n === 'kong.conf.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kong API Gateway declarative configuration — services, routes, plugins, and consumers.',
    usedFor: [{ label: 'Kong API Gateway', description: 'Declarative config for Kong services, routes, plugins, and upstreams.', href: 'https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/' }],
  },
};
