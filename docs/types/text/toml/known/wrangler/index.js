export default {
  id: 'wrangler',
  label: 'Wrangler config',
  match: (intake, baseType) => {
    if (baseType.id !== 'toml') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    return name === 'wrangler.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cloudflare Workers configuration — defines your Worker name, bindings, routes, and deployment settings.',
    usedFor: [{ label: 'Cloudflare Workers', description: 'Serverless compute at the edge', href: 'https://developers.cloudflare.com/workers/wrangler/configuration/' }],
  },
};
