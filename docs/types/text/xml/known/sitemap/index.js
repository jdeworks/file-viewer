export default {
  id: 'sitemap-xml',
  label: 'XML Sitemap',
  tags: ['web', 'seo', 'crawl'],
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'xml') return false;
    const t = intake.textSample || intake.text || '';
    return t.includes('<urlset') || t.includes('<sitemapindex');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'XML sitemap or sitemap index — lists URLs for search engine crawlers, with optional metadata about change frequency, priority, and last modification.',
    usedFor: [{ label: 'Sitemap protocol', description: 'sitemaps.org specification for search engine submissions', href: 'https://www.sitemaps.org/protocol.html' }],
  },
};
