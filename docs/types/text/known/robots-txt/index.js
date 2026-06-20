export const plugin = {
  id: 'robots-txt',
  label: 'robots.txt',
  tags: ['web', 'seo', 'crawl'],
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'robots.txt';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Web crawler access control file — instructs search engine bots which pages to crawl or skip, and references XML sitemaps.',
    usedFor: [{ label: 'robots.txt spec', description: 'The Robots Exclusion Protocol for search engine crawlers', href: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro' }],
  },
};
export default plugin;
