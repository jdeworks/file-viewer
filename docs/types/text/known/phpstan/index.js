// PHPStan static analysis configuration (phpstan.neon / phpstan.dist.neon).
export default {
  id: 'phpstan',
  label: 'PHPStan Config',
  match(intake) {
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'phpstan.neon' || n === 'phpstan.dist.neon' || n === 'phpstan.neon.dist';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHPStan configuration file (NEON format) — static analysis level, analysed paths, ignored errors, and extensions.',
    usedFor: [{ label: 'PHP static analysis', description: 'PHPStan finds bugs in PHP code without running it', href: 'https://phpstan.org/config-reference' }],
  },
};
