export default {
  id: 'cpanfile',
  label: 'cpanfile',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'cpanfile' || n === 'cpanfile.snapshot') return true;
    if ((text.includes('requires ') || text.includes('recommends ') || text.includes('suggests ')) &&
        (text.match(/requires\s+['"][\w:]+['"]/))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Perl cpanfile — declares CPAN module dependencies with version constraints and optional/recommended requirements.',
    usedFor: [
      { label: 'Carton', description: 'Perl module dependency manager', href: 'https://metacpan.org/pod/Carton' },
      { label: 'cpanm', description: 'CPAN module installer', href: 'https://metacpan.org/pod/App::cpanminus' },
    ],
  },
};
