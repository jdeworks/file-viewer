export default {
  id: 'pocket-id-config',
  label: 'Pocket ID Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'pocket-id.env') return true;
    if (n === '.env') {
      const t = intake.text || '';
      if (t.includes('PUBLIC_APP_URL') && t.includes('TRUST_PROXY')) return true;
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Pocket ID OIDC identity provider configuration — application URL, security, SMTP, and auth settings.',
    usedFor: [{ label: 'Pocket ID', description: 'Simple OIDC identity provider with passkey support', href: 'https://github.com/stonith404/pocket-id' }],
  },
};
