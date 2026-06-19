export default {
  id: 'log4j2',
  label: 'Log4j2',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'log4j2.xml' || n === 'log4j2-spring.xml' || n === 'log4j2-test.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Log4j2 logging configuration — appenders, root logger level, and logger overrides.',
    usedFor: [{ label: 'Java logging', description: 'Configure Log4j2 appenders, layouts, log levels, and async logging.', href: 'https://logging.apache.org/log4j/2.x/manual/configuration.html' }],
  },
};
