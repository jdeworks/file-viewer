export const plugin = {
  id: 'lex-yacc',
  label: 'Lex/Yacc Grammar',
  tags: ['lex', 'flex', 'yacc', 'bison', 'parser', 'lexer', 'grammar'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.l') || name.endsWith('.ll') || name.endsWith('.lex') ||
        name.endsWith('.y') || name.endsWith('.yy') || name.endsWith('.ypp') ||
        name.endsWith('.yacc')) return true;
    const text = intake.text || '';
    // The %% section separator is the strongest signal
    const hits = [
      /^%%$/m.test(text),
      /^%\{/.test(text),
      /^%token\b/m.test(text),
      /^%union\b/m.test(text),
      /^%lex-param\b/m.test(text),
      /\byylval\b/.test(text),
      /\byylex\b/.test(text),
      /\byyparse\b/.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Lex (or Flex) defines lexical analyzers via regular expression rules. Yacc (or Bison) defines parsers via grammar rules in BNF form. These tools generate C/C++ source for compilers and interpreters.',
    usedFor: [
      { label: 'GNU Flex', description: 'The Fast Lexical Analyzer generator', href: 'https://www.gnu.org/software/flex/manual/' },
      { label: 'GNU Bison', description: 'Parser generator compatible with Yacc', href: 'https://www.gnu.org/software/bison/manual/bison.html' },
    ],
  },
};
export default plugin;
