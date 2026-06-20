export default {
  id: 'thanos-config',
  label: 'Thanos Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'thanos.yml' || n === 'thanos-config.yml' || n === 'bucket.yml') return true;
    // Thanos object storage config: has a type field (S3/GCS/AZURE/etc.) and a bucket field
    if ((text.includes('type: GCS') || text.includes('type: S3') || text.includes('type: AZURE')) &&
        text.includes('bucket:')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Thanos object storage configuration — connects Prometheus data to long-term object storage (S3, GCS, etc.).',
    usedFor: [{ label: 'Thanos', description: 'Highly available Prometheus setup with long-term storage', href: 'https://thanos.io/tip/thanos/storage.md/' }],
  },
};
