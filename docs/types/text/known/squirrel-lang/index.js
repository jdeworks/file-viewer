export const plugin = {
  id: 'squirrel-lang',
  label: 'Squirrel',
  tags: ['squirrel', 'scripting', 'game', 'source-engine'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.nut')) return true;
    const text = intake.text || '';
    // Reject files with unambiguous other-language markers
    if (text.includes('<?php') || text.includes('<?=')) return false;
    if (/^\s*(namespace|use |require_once|declare\s*\()/m.test(text)) return false;
    if (/\$[a-zA-Z_]/.test(text)) return false; // PHP/Perl/Ruby $variables
    // Require at least two Squirrel-specific signals
    const signals = [
      text.includes('local '),
      /\bforeach\s*\(/.test(text) && !text.includes('for each'),
      /\b[A-Za-z_]\w*\s*<-\s/.test(text),  // Squirrel slot assignment
      text.includes('::') && text.includes('function '),
    ].filter(Boolean).length;
    return signals >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Squirrel script file — a high-level, imperative, object-oriented scripting language designed for embedding in games and applications.',
    usedFor: [
      { label: 'Squirrel language reference', description: 'Official Squirrel language documentation', href: 'http://squirrel-lang.org/doc/squirrel3.html' },
      { label: 'Squirrel on GitHub', description: 'Squirrel language source and examples', href: 'https://github.com/albertodemichelis/squirrel' },
    ],
  },
};
export default plugin;
