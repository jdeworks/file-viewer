// PHPUnit configuration file enhancement (phpunit.xml / phpunit.xml.dist).
// NOTE: phpunit.xml and phpunit.xml.dist are handled by the newer phpunit-config plugin
// (puc-doc); return null here so the KNOWN loop continues to find it. Only phpunit.dist.xml
// falls through to this legacy renderer.
export default {
  id: 'phpunit',
  label: 'PHPUnit Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.filename || '').split('/').pop().toLowerCase();
    // Yield phpunit.xml and phpunit.xml.dist to phpunit-config (comes later in KNOWN).
    if (n === 'phpunit.xml' || n === 'phpunit.xml.dist') return null;
    return n === 'phpunit.dist.xml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHPUnit configuration file — defines test suites, coverage settings, and PHP environment for the PHPUnit testing framework.',
    usedFor: [{ label: 'PHP testing', description: 'PHPUnit is the de-facto standard testing framework for PHP', href: 'https://phpunit.de/documentation.html' }],
  },
};
