export default {
  id: 'logback',
  label: 'Logback',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'logback.xml' || n === 'logback-spring.xml' || n === 'logback-test.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Logback logging configuration — appenders, root log level, and named logger overrides.',
    usedFor: [{ label: 'Java logging', description: 'Configure Logback appenders, encoders, log levels, and Spring profile-based logging.', href: 'https://logback.qos.ch/manual/configuration.html' }],
  },
};
