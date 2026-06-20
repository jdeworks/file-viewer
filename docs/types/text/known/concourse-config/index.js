export default {
  id: 'concourse-config',
  label: 'Concourse CI Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'concourse.env') return true;
    const text = intake.text || '';
    return text.includes('CONCOURSE_') && (text.includes('CONCOURSE_POSTGRES_HOST') || text.includes('CONCOURSE_EXTERNAL_URL'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Concourse CI server environment configuration — external URL, database, authentication, keys, workers, and TLS settings.',
    tags: ['concourse', 'ci', 'pipeline', 'devops', 'config'],
  },
};
