const SPARQL_CONTENT_KWS = ['prefix', 'select', 'construct', 'ask', 'describe'];

function hasSparqlContent(text) {
  if (!text) return false;
  // Strip leading comments / whitespace lines, then check for keyword
  const lines = text.split(/\r?\n/);
  let first = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    first = trimmed.toLowerCase();
    break; // First non-comment, non-blank line doesn't match — stop
  }
  if (!SPARQL_CONTENT_KWS.some((kw) => first.startsWith(kw))) return false;
  if (first.startsWith('prefix')) return true;
  const lower = text.toLowerCase();
  const hasWhereBlock = /\bwhere\s*\{/.test(lower);
  const hasVar = /\?[a-z_][\w-]*/i.test(text);
  const hasRdfName = /(?:^|\s)[a-z_][\w-]*:[\w-]+/i.test(text) || /<https?:\/\//i.test(text);
  return hasWhereBlock && hasVar && hasRdfName;
}

export const plugin = {
  id: 'sparql-query',
  label: 'SPARQL Query',
  tags: ['rdf', 'sparql', 'semantic-web', 'query'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'sparql' || ext === 'rq') return true;
    return hasSparqlContent(intake.text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SPARQL query file — a W3C standard query language for RDF data, supporting SELECT, CONSTRUCT, ASK, and DESCRIBE query forms with PREFIX declarations, triple patterns, FILTER, OPTIONAL, and aggregation.',
    usedFor: [
      { label: 'SPARQL 1.1 Spec', description: 'W3C specification for the SPARQL RDF query language', href: 'https://www.w3.org/TR/sparql11-query/' },
      { label: 'Wikidata SPARQL', description: 'Run live SPARQL queries against Wikidata', href: 'https://query.wikidata.org/' },
    ],
  },
};
export default plugin;
