// PHPUnit configuration file enhancement (phpunit.xml / phpunit.xml.dist).
export default {
  id: 'phpunit',
  label: 'PHPUnit Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    return n === 'phpunit.xml' || n === 'phpunit.xml.dist' || n === 'phpunit.dist.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHPUnit configuration file — defines test suites, coverage settings, and PHP environment for the PHPUnit testing framework.',
    usedFor: [{ label: 'PHP testing', description: 'PHPUnit is the de-facto standard testing framework for PHP', href: 'https://phpunit.de/documentation.html' }],
  },
};
