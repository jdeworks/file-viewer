export default {
  id: 'cal-com-config',
  label: 'Cal.com Config',
  match(intake) {
    const text = intake.text || '';
    return text.includes('CALENDSO_ENCRYPTION_KEY') || text.includes('NEXT_PUBLIC_WEBAPP_URL');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cal.com self-hosted scheduling platform environment configuration — server URL, auth secrets, database, email, storage, and Stripe integration.',
    tags: ['cal.com', 'calendso', 'scheduling', 'self-hosted', 'nextjs', 'env'],
  },
};
