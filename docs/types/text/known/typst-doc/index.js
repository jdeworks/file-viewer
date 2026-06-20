export const plugin = {
  id: 'typst-doc',
  label: 'Typst Document',
  tags: ['typst', 'typ', 'markup', 'documentation', 'typesetting'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!name.endsWith('.typ')) return false;
    const text = (intake.text || '').slice(0, 2000);
    // Must have at least one # at line start to avoid plain text .typ files
    return /^#(import|let|set|show)\b/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Typst is a modern typesetting system and markup language for creating documents, papers, and presentations. .typ files contain Typst source with scripting, styling, and content.',
    usedFor: [
      { label: 'Typst', description: 'Modern typesetting system — alternative to LaTeX', href: 'https://typst.app/' },
      { label: 'Typst Docs', description: 'Typst language reference and tutorials', href: 'https://typst.app/docs/' },
    ],
  },
};
export default plugin;
