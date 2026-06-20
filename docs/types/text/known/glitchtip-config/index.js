export default {
  id: 'glitchtip-config',
  label: 'GlitchTip Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'glitchtip.env';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GlitchTip open-source error tracking (Sentry alternative) environment configuration — server, security, database, Redis, email, and OAuth settings.',
    usedFor: [{ label: 'GlitchTip', description: 'GlitchTip is an open-source Sentry-alternative error tracking platform.', href: 'https://glitchtip.com/' }],
  },
};
