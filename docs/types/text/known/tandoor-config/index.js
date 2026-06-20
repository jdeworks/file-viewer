export default {
  id: 'tandoor-config',
  label: 'Tandoor Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'tandoor.env') return true;
    const text = intake.text || '';
    if (text.includes('TANDOOR_PORT')) return true;
    if (text.includes('SECRET_KEY') && text.includes('POSTGRES_DB') && text.includes('POSTGRES_USER') && text.includes('TANDOOR')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Tandoor self-hosted recipe manager environment configuration — app, database, Django, storage, and email settings.',
    usedFor: [{ label: 'Tandoor', description: 'Self-hosted recipe manager and meal planner.', href: 'https://tandoor.dev' }],
  },
};
