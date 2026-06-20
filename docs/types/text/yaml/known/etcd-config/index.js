export default {
  id: 'etcd-config',
  label: 'etcd Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'etcd.yml' || n === 'etcd.yaml' || n === 'etcd.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'etcd distributed key-value store configuration — member identity, peer/client endpoints, TLS settings, and cluster initialization.' },
};
