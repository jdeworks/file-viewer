export default {
  id: 'paperless-conf',
  label: 'Paperless-ngx Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'paperless.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Paperless-ngx document management configuration — database, OCR, storage, and admin settings.',
    tags: ['paperless', 'paperless-ngx', 'documents', 'ocr', 'config'],
  },
};
