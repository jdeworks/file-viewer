export default {
  id: 'photoprism-config',
  label: 'PhotoPrism Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'options.yml' && n !== 'photoprism-options.yml') return false;
    const text = intake.text || '';
    return text.includes('AdminPassword') || text.includes('OriginalsPath') || text.includes('ThumbnailsPath');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PhotoPrism photo management configuration — server, storage, database, and content settings.',
    tags: ['photoprism', 'photos', 'gallery', 'config'],
  },
};
