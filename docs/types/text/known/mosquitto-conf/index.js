export default {
  id: 'mosquitto-conf',
  label: 'Mosquitto Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'mosquitto.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Eclipse Mosquitto MQTT broker configuration — listeners, TLS, authentication, persistence, and logging.' },
};
