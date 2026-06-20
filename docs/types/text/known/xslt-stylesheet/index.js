export const plugin = {
  id: 'xslt-stylesheet',
  label: 'XSLT Stylesheet',
  tags: ['xslt', 'xsl', 'xml', 'transform', 'stylesheet'],
  match(intake) {
    const name = (intake.name || intake.filename || '').toLowerCase();
    if (name.endsWith('.xsl') || name.endsWith('.xslt')) return true;
    const text = intake.text || '';
    return /<xsl:stylesheet[\s>]/.test(text) || /<xsl:transform[\s>]/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'XSLT (Extensible Stylesheet Language Transformations) is a language for transforming XML documents into other XML, HTML, or plain-text formats. It uses template rules matched against source nodes.',
    usedFor: [
      { label: 'XSLT spec (W3C)', description: 'XSLT 2.0 specification from W3C', href: 'https://www.w3.org/TR/xslt20/' },
      { label: 'MDN XSLT', description: 'XSLT reference on MDN', href: 'https://developer.mozilla.org/en-US/docs/Web/XSLT' },
    ],
  },
};
export default plugin;
