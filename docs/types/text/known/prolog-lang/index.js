export const plugin = {
  id: 'prolog-lang',
  label: 'Prolog',
  tags: ['prolog', 'logic', 'pl', 'pro', 'dcg'],
  match(intake) {
    const name = (intake.name || intake.filename || '');
    const lower = name.toLowerCase();
    const text = intake.text || '';

    // .pro and .P are Prolog-specific extensions — no content guard needed
    // Exception: proguard-rules.pro and consumer-rules.pro are Android ProGuard config files
    const basename = lower.split('/').pop();
    if (basename === 'proguard-rules.pro' || basename === 'consumer-rules.pro' || basename === 'proguard-rules.txt') return false;
    if (lower.endsWith('.pro')) return true;
    if (name.endsWith('.P')) return true;

    // .pl is shared with Perl — require neck operator AND no Perl markers
    if (lower.endsWith('.pl')) {
      if (!text.includes(':-')) return false;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const t = line.trimStart();
        if (t.startsWith('use ') || t.startsWith('sub ') || t.startsWith('my ')) return false;
      }
      return true;
    }

    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Prolog is a logic programming language. Programs consist of facts, rules, and queries. The :- operator (neck) separates a rule head from its body. DCG (Definite Clause Grammars) use --> for grammar rules.',
    usedFor: [
      { label: 'SWI-Prolog', description: 'Popular open-source Prolog implementation', href: 'https://www.swi-prolog.org/' },
      { label: 'GNU Prolog', description: 'GNU Prolog compiler and interpreter', href: 'http://www.gprolog.org/' },
    ],
  },
};
export default plugin;
