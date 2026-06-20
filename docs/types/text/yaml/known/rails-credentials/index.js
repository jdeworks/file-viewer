export default {
  id: 'rails-credentials',
  label: 'Rails Credentials',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const name = (intake.name || intake.filename || '').split('/').pop();
    if (name === 'credentials.yml.enc') return true;
    if (name === 'credentials.yml') {
      const text = intake.textSample || intake.text || '';
      return text.includes('secret_key_base:');
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rails encrypted credentials file — shows structure for plaintext credentials.yml, or an info message for encrypted .yml.enc files.',
    usedFor: [{ label: 'Rails Credentials', description: 'Rails encrypted credentials management', href: 'https://guides.rubyonrails.org/security.html#custom-credentials' }],
  },
};
