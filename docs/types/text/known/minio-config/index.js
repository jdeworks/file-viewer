export default {
  id: 'minio-config',
  label: 'MinIO Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'minio.env') return true;
    const text = intake.text || '';
    return text.includes('MINIO_ROOT_USER') && text.includes('MINIO_ROOT_PASSWORD');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MinIO object storage environment-variable configuration (key=value style).',
    tags: ['minio', 'object-storage', 's3', 'self-hosted', 'config'],
  },
};
