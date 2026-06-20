export default {
  id: 'pg-hba',
  label: 'PostgreSQL pg_hba',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'pg_hba.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PostgreSQL host-based authentication — defines which database users can connect to which databases from which hosts.',
  },
};
