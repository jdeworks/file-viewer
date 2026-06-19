export default {
  id: 'mongod-conf',
  label: 'MongoDB config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'mongod.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MongoDB server configuration — storage path, networking, replication set, security, and system log.',
    usedFor: [{ label: 'MongoDB config', description: 'Configure MongoDB storage engine, network bindings, replica set, and access control.', href: 'https://www.mongodb.com/docs/manual/reference/configuration-options/' }],
  },
};
