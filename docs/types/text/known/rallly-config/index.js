export default {
  id: 'rallly-config',
  label: 'Rallly Config',
  match(intake) {
    const text = intake.text || '';
    return (
      text.includes('SECRET_PASSWORD') &&
      text.includes('NEXT_PUBLIC_BASE_URL') &&
      (text.includes('NOREPLY_EMAIL') || text.includes('SMTP_HOST'))
    );
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Rallly open-source scheduling and poll app environment configuration — base URL, auth, database, email/SMTP, and access control.',
    tags: ['rallly', 'scheduling', 'doodle', 'polls', 'self-hosted', 'nextjs', 'env'],
  },
};
