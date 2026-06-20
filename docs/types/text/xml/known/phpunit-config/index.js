export default {
  id: 'phpunit-config',
  label: 'PHPUnit Config',
  match(intake, baseType) {
    if (baseType?.id !== 'xml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'phpunit.xml' && n !== 'phpunit.xml.dist') return false;
    // Content-check: root element must be <phpunit>
    const text = intake.text || '';
    return /<phpunit[\s>]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PHPUnit configuration — test suites, bootstrap file, PHP ini settings, coverage source paths, and extensions.',
    usedFor: [{ label: 'PHPUnit testing', description: 'PHPUnit is the de-facto standard testing framework for PHP.', href: 'https://phpunit.de/documentation.html' }],
  },
};
