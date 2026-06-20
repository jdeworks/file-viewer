export default {
  id: 'radicale-config',
  label: 'Radicale Config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'radicale.conf') return true;
    if (n === 'config') {
      const text = intake.textSample || intake.text || '';
      return text.includes('[server]') && text.includes('[auth]') && text.includes('[storage]');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Radicale CalDAV/CardDAV server configuration — defines server binding, authentication, storage backend, and logging settings.',
    usedFor: [{ label: 'Radicale', description: 'Free and open-source CalDAV and CardDAV server.', href: 'https://radicale.org/v3.html#configuration' }],
  },
};
