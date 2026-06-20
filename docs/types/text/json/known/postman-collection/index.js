export default {
  id: 'postman-collection',
  label: 'Postman Collection',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Named *.postman_collection.json or has Postman collection structure
    if (n.endsWith('.postman_collection.json')) return true;
    const text = intake.text || intake.textSample || '';
    if (/"_postman_id"/.test(text) && /"item"\s*:/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Postman collection — a group of API requests with environments, pre-request scripts, and test assertions.',
    usedFor: [{ label: 'Postman', description: 'API platform for building and using APIs', href: 'https://learning.postman.com/docs/collections/collections-overview/' }],
  },
};
