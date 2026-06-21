export const plugin = {
  id: 'php-lang',
  label: 'PHP',
  tags: ['php', 'web', 'scripting', 'phtml'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.php') && !name.endsWith('.phtml') && !name.endsWith('.php5') && !name.endsWith('.php8')) return false;
    // Yield to more-specific config plugins that come later in the KNOWN array.
    // rector.php / config.php → rector-config
    if (name === 'rector.php' || name === 'config.php') return null;
    // Content guard: must have PHP opening tag
    const sample = (intake.text || '').slice(0, 500);
    if (!sample.includes('<?php') && !sample.includes('<?')) return null;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHP is a server-side scripting language designed for web development. .php files are PHP source files; .phtml files mix PHP and HTML templates.',
    usedFor: [
      { label: 'php.net', description: 'Official PHP documentation', href: 'https://www.php.net/' },
      { label: 'Packagist', description: 'PHP package repository', href: 'https://packagist.org/' },
    ],
  },
};
export default plugin;
