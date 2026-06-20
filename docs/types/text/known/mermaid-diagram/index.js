const MERMAID_KEYWORDS = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'erDiagram', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline',
  'xychart', 'quadrantChart',
];

function hasMermaidContent(text) {
  if (!text) return false;
  // Check each of the first few lines for a Mermaid keyword (skip comment lines starting with %%)
  const lines = text.split('\n').slice(0, 5);
  for (const line of lines) {
    const cleaned = line.replace(/^\s*%%[^\n]*/, '').trim().toLowerCase();
    if (!cleaned) continue;
    if (MERMAID_KEYWORDS.some((kw) => cleaned.startsWith(kw.toLowerCase()))) return true;
    // Stop at first non-comment non-empty line
    break;
  }
  return false;
}

export const plugin = {
  id: 'mermaid-diagram',
  label: 'Mermaid Diagram',
  tags: ['diagram', 'visualization', 'graph'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'mmd' || ext === 'mermaid') return true;
    return hasMermaidContent(intake.text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mermaid diagram DSL — define flowcharts, sequence diagrams, class diagrams, ER diagrams, Gantt charts, and more using plain text syntax.',
    usedFor: [
      { label: 'Mermaid.js', description: 'Generate diagrams from text using Mermaid DSL', href: 'https://mermaid.js.org/' },
      { label: 'Mermaid Live Editor', description: 'Paste your diagram and render it interactively', href: 'https://mermaid.live/' },
    ],
  },
};
export default plugin;
