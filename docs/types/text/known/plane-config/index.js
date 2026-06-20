export default {
  id: 'plane-config',
  label: 'Plane Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'plane.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Plane project management .env — server, security, database, Redis, S3/MinIO storage, email, and auth settings.',
    tags: ['plane', 'project-management', 'jira-alternative', 'linear-alternative', 'env'],
  },
};
