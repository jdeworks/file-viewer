export default {
  id: 'php-ini',
  label: 'PHP Configuration',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'php.ini' || n === 'php.ini-production' || n === 'php.ini-development';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHP runtime configuration — memory limits, execution timeouts, upload sizes, error reporting, date settings, and session handling.',
    usedFor: [{ label: 'PHP config', description: 'php.ini controls PHP runtime behaviour: memory, timeouts, uploads, errors, and extensions.', href: 'https://www.php.net/manual/en/configuration.file.php' }],
  },
};
