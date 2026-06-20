export const plugin = {
  id: 'harbor',
  label: 'Harbor registry',
  tags: ['container', 'registry', 'docker'],
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'harbor.yml' || n === 'harbor.yaml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Harbor container registry configuration — hostname, TLS, storage, database, auth, and security settings.',
    usedFor: [{ label: 'Container registry', description: 'Harbor is an open-source container registry that secures artifacts with policies and role-based access control.', href: 'https://goharbor.io/' }],
  },
};
export default plugin;
