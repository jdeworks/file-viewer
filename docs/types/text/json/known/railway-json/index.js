export default {
  id: 'railway-json',
  label: 'Railway config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'railway.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Railway deployment configuration — build system, start command, restart policy, and cron schedule.',
    usedFor: [{ label: 'Railway', description: 'Deploy apps to Railway cloud platform', href: 'https://docs.railway.com/reference/config-as-code' }],
  },
};
