function hasDotContent(text) {
  if (!text) return false;
  // Strip leading whitespace/comments, check for graph/digraph keyword
  const stripped = (text || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').trimStart();
  return /^(strict\s+)?(di)?graph\b/i.test(stripped);
}

export const plugin = {
  id: 'graphviz-dot',
  label: 'Graphviz DOT',
  tags: ['graph', 'visualization', 'dot', 'graphviz'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'dot' || ext === 'gv') return true;
    return hasDotContent(intake.text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Graphviz DOT language file — defines directed and undirected graphs with nodes, edges, attributes, and subgraphs for automatic layout and visualization.',
    usedFor: [
      { label: 'Graphviz', description: 'Open-source graph visualization software', href: 'https://graphviz.org/' },
      { label: 'Graphviz Online', description: 'Render DOT graphs interactively in the browser', href: 'https://dreampuf.github.io/GraphvizOnline/' },
    ],
  },
};
export default plugin;
