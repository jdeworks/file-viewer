export const plugin = {
  id: 'perl-lang',
  label: 'Perl',
  tags: ['perl', 'scripting', 'pl', 'pm', 'pod'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.pm') || name.endsWith('.pod')) return true;
    if (name.endsWith('.pl')) {
      // Content guard: avoid false-positives with Prolog .pl files
      const sample = (intake.text || '').slice(0, 2000);
      if (!sample.includes('use ') && !sample.includes('my ') && !sample.includes('sub ')) return null;
      return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Perl is a high-level, general-purpose, interpreted, dynamic programming language. .pl files are Perl scripts, .pm files are Perl modules, .pod files contain Plain Old Documentation.',
    usedFor: [
      { label: 'perldoc.perl.org', description: 'Official Perl documentation', href: 'https://perldoc.perl.org/' },
      { label: 'CPAN', description: 'Comprehensive Perl Archive Network', href: 'https://www.cpan.org/' },
    ],
  },
};
export default plugin;
