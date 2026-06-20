export default {
  id: 'apisix-config',
  label: 'APISIX config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'apisix.yaml' || n === 'apisix.yml' || (n === 'config.yaml' && (intake.text || '').includes('apisix'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache APISIX API gateway configuration — deployment mode, listeners, plugins, and etcd settings.',
    usedFor: [{ label: 'Apache APISIX', description: 'Cloud-native API gateway configuration', href: 'https://apisix.apache.org/docs/apisix/configuration-guide/' }],
  },
};
