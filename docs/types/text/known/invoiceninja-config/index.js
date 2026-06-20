export default {
  id: 'invoiceninja-config',
  label: 'Invoice Ninja Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'invoiceninja.env') return true;
    const text = intake.text || '';
    return text.includes('APP_KEY') && text.includes('APP_URL') &&
      (text.toLowerCase().includes('ninja') || text.includes('NINJA_ENVIRONMENT'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Invoice Ninja self-hosted invoicing platform environment configuration — app, security, database, mail, storage, PDF, and queue settings.',
    tags: ['invoiceninja', 'invoice', 'invoicing', 'self-hosted', 'laravel', 'config'],
  },
};
