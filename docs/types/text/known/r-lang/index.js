export const plugin = {
  id: 'r-lang',
  label: 'R',
  tags: ['r', 'rlang', 'statistics', 'datascience'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop();
    if (name.toLowerCase() !== name.replace(/\.r$/i, '') + '.r' && !name.toLowerCase().endsWith('.r')) return false;
    // Accept only .r / .R (case-insensitive)
    if (!/\.r$/i.test(name)) return false;
    const text = intake.text || '';
    // Content guard: must have some R-specific content in first 3000 chars
    const preview = text.slice(0, 3000);
    if (!/<-/.test(preview) && !/library\(/.test(preview) && !/function\(/.test(preview)) return false;
    return true;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'R is a language and environment for statistical computing and graphics, widely used in data science, bioinformatics, and academic research. .R files are R source scripts.',
    usedFor: [
      { label: 'r-project.org', description: 'Official R language home', href: 'https://www.r-project.org/' },
      { label: 'CRAN', description: 'Comprehensive R Archive Network — packages', href: 'https://cran.r-project.org/' },
    ],
  },
};
export default plugin;
