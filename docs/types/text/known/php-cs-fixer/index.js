// PHP CS Fixer configuration (.php-cs-fixer.php / .php-cs-fixer.dist.php).
export default {
  id: 'php-cs-fixer',
  label: 'PHP CS Fixer Config',
  match(intake) {
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === '.php-cs-fixer.php' || n === '.php-cs-fixer.dist.php';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHP CS Fixer configuration file — defines coding standards, finder paths, and fixers for automatic PHP code style correction.',
    usedFor: [{ label: 'PHP code style', description: 'PHP CS Fixer automatically fixes PHP coding standards issues', href: 'https://cs.symfony.com/' }],
  },
};
