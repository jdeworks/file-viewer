const GNUPLOT_KEYWORDS = ['set terminal', 'set output', 'set xlabel', 'set ylabel', 'plot ', 'splot ', 'set title'];

export const plugin = {
  id: 'gnuplot-script',
  label: 'gnuplot',
  tags: ['gnuplot', 'plotting', 'visualization', 'data'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.text || '';
    if (name.endsWith('.gnuplot') || name.endsWith('.gp')) return true;
    if (name.endsWith('.plt')) {
      // .plt conflicts with Matplotlib — require gnuplot-specific keywords
      return /set terminal|^plot /m.test(text);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'gnuplot script — a portable command-line driven graphing utility for data visualization.',
    usedFor: [
      { label: 'gnuplot documentation', description: 'Official gnuplot documentation and tutorials', href: 'http://www.gnuplot.info/documentation.html' },
    ],
  },
};
export default plugin;
