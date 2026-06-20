export const plugin = {
  id: 'mediawiki-markup',
  label: 'MediaWiki',
  tags: ['mediawiki', 'wiki', 'markup', 'wikipedia'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.mediawiki')) return true;
    if (name.endsWith('.wiki')) {
      const preview = (intake.text || '').slice(0, 1000);
      return /\[\[/.test(preview) || /\{\{/.test(preview) || /==/.test(preview);
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MediaWiki markup is the wikitext language used by Wikipedia, Wikimedia projects, and MediaWiki installations. .wiki and .mediawiki files contain structured text with templates, links, and headings.',
    usedFor: [
      { label: 'MediaWiki', description: 'The wiki engine powering Wikipedia', href: 'https://www.mediawiki.org/' },
      { label: 'Help:Wikitext', description: 'Wikipedia wikitext formatting guide', href: 'https://en.wikipedia.org/wiki/Help:Wikitext' },
    ],
  },
};
export default plugin;
