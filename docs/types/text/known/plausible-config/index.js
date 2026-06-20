export default {
  id: 'plausible-config',
  label: 'Plausible Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'plausible.env') return true;
    const text = intake.text || intake.textSample || '';
    return text.includes('SECRET_KEY_BASE') && text.includes('BASE_URL') && text.includes('CLICKHOUSE_DATABASE_URL');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Plausible Analytics self-hosted server environment configuration — server, security, database, email, and OAuth settings.',
    usedFor: [
      { label: 'Plausible Analytics', description: 'Privacy-friendly open-source web analytics, self-hosted edition.', href: 'https://plausible.io/docs/self-hosting-configuration' },
    ],
  },
};
