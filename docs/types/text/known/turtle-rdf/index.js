function hasTurtleContent(text) {
  if (!text) return false;
  return /@prefix\s+/i.test(text) || /^\s*@base\s+/im.test(text);
}

export const plugin = {
  id: 'turtle-rdf',
  label: 'Turtle RDF',
  tags: ['rdf', 'turtle', 'semantic-web', 'ontology', 'linked-data'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'ttl' || ext === 'n3') return true;
    return hasTurtleContent(intake.text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Turtle (Terse RDF Triple Language) file — a compact, human-friendly syntax for representing RDF data and ontologies, supporting namespace prefixes, blank nodes, and literal types.',
    usedFor: [
      { label: 'Turtle Spec (W3C)', description: 'W3C Recommendation for the Turtle RDF syntax', href: 'https://www.w3.org/TR/turtle/' },
      { label: 'Protégé', description: 'Open-source ontology editor with Turtle support', href: 'https://protege.stanford.edu/' },
    ],
  },
};
export default plugin;
