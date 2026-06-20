export default {
  id: 'komga-config',
  label: 'Komga Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'application.yml' && n !== 'komga.yml') return false;
    const text = intake.text || '';
    return text.includes('komga:') || text.includes('komga.');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Komga comic/manga server (Spring Boot YAML) configuration — server port, library scan schedule, database backup, and OAuth2 client registrations.',
    tags: ['komga', 'comics', 'manga', 'media-server', 'spring-boot', 'self-hosted', 'config'],
  },
};
