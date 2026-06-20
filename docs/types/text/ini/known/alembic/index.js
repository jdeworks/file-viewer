export default {
  id: 'alembic',
  label: 'Alembic Migrations',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return n === 'alembic.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Alembic configuration file — defines the migration script location, database URL, and logging settings for SQLAlchemy database migrations.',
    usedFor: [{ label: 'Alembic', description: 'Database migration tool for SQLAlchemy', href: 'https://alembic.sqlalchemy.org/en/latest/tutorial.html' }],
  },
};
