function isPgpArmored(text) {
  return /^-----BEGIN PGP/.test((text || '').trimStart());
}

export const plugin = {
  id: 'asciidoc',
  label: 'AsciiDoc',
  tags: ['documentation', 'markup', 'asciidoc'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (['adoc', 'asciidoc', 'ad'].includes(ext)) return true;
    // .asc but NOT PGP armored
    if (ext === 'asc' && !isPgpArmored(intake.text)) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AsciiDoc is a lightweight markup language for writing documentation, books, and articles. It supports sections, tables, code blocks, attributes, includes, and rich formatting.',
    usedFor: [
      { label: 'AsciiDoc', description: 'Lightweight markup language for technical documentation', href: 'https://asciidoc.org/' },
      { label: 'Asciidoctor', description: 'Convert AsciiDoc documents to HTML, PDF, DocBook and more', href: 'https://asciidoctor.org/' },
    ],
  },
};
export default plugin;
