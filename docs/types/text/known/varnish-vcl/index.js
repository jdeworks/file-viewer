export default {
  id: 'varnish-vcl',
  label: 'Varnish VCL',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n.endsWith('.vcl')) return true;
    if (n === 'default.vcl' || n === 'varnish.vcl') return true;
    if (text.includes('vcl 4') || text.includes('vcl 4.1')) return true;
    if (text.includes('sub vcl_recv') || text.includes('sub vcl_backend_response') || text.includes('sub vcl_hash')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Varnish Configuration Language (VCL) — defines caching logic, backend routing, and HTTP manipulation for the Varnish HTTP accelerator.',
    usedFor: [{ label: 'Varnish Cache', description: 'High-performance HTTP accelerator / caching reverse proxy', href: 'https://varnish-cache.org/' }],
  },
};
