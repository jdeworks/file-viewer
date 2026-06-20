export default {
  id: 'render-yaml',
  label: 'Render.com config',
  match: (intake, baseType) => {
    if (!['yaml', 'docker-compose', 'github-actions'].includes(baseType.id)) return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'render.yaml') return false;
    // Require Render-specific keys to avoid false positives on generic render.yaml files
    const text = intake.text || '';
    return /services\s*:/m.test(text) && /(type|runtime|startCommand|buildCommand)\s*:/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Render.com deployment configuration — services (web, worker, cron), databases, and environment variables.',
    usedFor: [{ label: 'Render.com', description: 'Cloud platform for web services, workers, and managed databases', href: 'https://render.com/docs/yaml-spec' }],
  },
};
