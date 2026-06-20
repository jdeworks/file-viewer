const STATA_KEYWORDS = ['use ', 'keep ', 'drop ', 'gen ', 'reg ', 'summarize', 'merge', 'reshape', 'xtset'];

export const plugin = {
  id: 'stata-do',
  label: 'Stata',
  tags: ['stata', 'statistics', 'econometrics', 'data-analysis'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    if (name.endsWith('.ado')) return true;
    if (name.endsWith('.do')) {
      // .do is also used by shell-like scripts — require at least 2 Stata-specific keywords
      const hits = STATA_KEYWORDS.filter((kw) => text.includes(kw));
      return hits.length >= 2;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stata do-file or ado-file — scripts for the Stata statistical analysis software.',
    usedFor: [
      { label: 'Stata documentation', description: 'Official Stata documentation and command reference', href: 'https://www.stata.com/features/documentation/' },
    ],
  },
};
export default plugin;
