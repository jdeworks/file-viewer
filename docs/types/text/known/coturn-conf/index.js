export default {
  id: 'coturn-conf',
  label: 'coturn TURN/STUN server',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'coturn.conf' || n === 'turnserver.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Coturn TURN/STUN server configuration — relay ports, credentials, TLS settings, and networking.',
    usedFor: [{ label: 'coturn', description: 'Coturn TURN and STUN server for WebRTC relay', href: 'https://github.com/coturn/coturn/wiki/turnserver' }],
  },
};
