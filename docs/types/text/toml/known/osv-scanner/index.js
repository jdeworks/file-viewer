export default {
  id: 'osv-scanner',
  label: 'OSV-Scanner config',
  match(intake, baseType) {
    if (baseType?.id !== 'toml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'osv-scanner.toml' || n === '.osv-scanner.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'OSV-Scanner vulnerability scanner configuration — ignored vulnerabilities, Go version overrides, and Maven settings.',
    usedFor: [{ label: 'OSV-Scanner', description: "Google's open source vulnerability scanner using the OSV database", href: 'https://google.github.io/osv-scanner/configuration/' }],
  },
};
