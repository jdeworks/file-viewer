export default {
  id: 'searxng-config',
  label: 'SearXNG Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'settings.yml' && n !== 'searxng-settings.yml') return false;
    const text = intake.text || '';
    return text.includes('instance_name:') || (text.includes('engines:') && text.includes('searx'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'SearXNG privacy-respecting metasearch engine configuration — server, search, engines, UI, and outgoing settings.',
    usedFor: [{ label: 'SearXNG', description: 'SearXNG is a free internet metasearch engine which aggregates results from various search services and databases.', href: 'https://docs.searxng.org/' }],
  },
};
