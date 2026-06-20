export default {
  id: 'dozzle-config',
  label: 'Dozzle Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'dozzle.yaml' || n === 'dozzle.yml') return true;
    const text = intake.textSample || intake.text || '';
    // Dozzle-specific combination: level + auth + addr
    return text.includes('level:') && text.includes('auth:') && text.includes('addr:');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Dozzle Docker log viewer configuration — controls listen address, authentication, log level, analytics, hostname, and remote agent hosts.',
    usedFor: [
      { label: 'Dozzle', description: 'Real-time Docker log viewer', href: 'https://dozzle.dev/' },
    ],
  },
};
