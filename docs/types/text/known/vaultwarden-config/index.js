export default {
  id: 'vaultwarden-config',
  label: 'Vaultwarden Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'vaultwarden.env') return true;
    const text = intake.text || '';
    return text.includes('ADMIN_TOKEN') && text.includes('SIGNUPS_ALLOWED');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vaultwarden (self-hosted Bitwarden) environment configuration — server, admin, database, attachments, SMTP, push notifications, and security settings.',
    usedFor: [{ label: 'Self-hosted passwords', description: 'Vaultwarden Bitwarden-compatible self-hosted server', href: 'https://github.com/dani-garcia/vaultwarden' }],
  },
};
