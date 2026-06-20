export const plugin = {
  id: 'tex-doc',
  label: 'LaTeX',
  tags: ['latex', 'tex', 'typesetting', 'document'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.tex')) return false;
    const text = intake.text || '';
    return /\\documentclass|\\begin\{document\}|\\usepackage|\\section/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'LaTeX/TeX document — a high-quality typesetting system widely used for scientific, academic, and technical documents.',
    usedFor: [
      { label: 'LaTeX project', description: 'Official LaTeX documentation and resources', href: 'https://www.latex-project.org/' },
      { label: 'Overleaf documentation', description: 'LaTeX guides and tutorials on Overleaf', href: 'https://www.overleaf.com/learn' },
    ],
  },
};
export default plugin;
