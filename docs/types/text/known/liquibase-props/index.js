export default {
  id: 'liquibase-props',
  label: 'Liquibase Config',
  match(intake) {
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return name === 'liquibase.properties';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Liquibase database migration configuration — defines the changelog file, JDBC URL, credentials, driver class, and output settings for the Liquibase migration tool.',
    usedFor: [{ label: 'Liquibase', description: 'Database schema change management and versioning tool', href: 'https://docs.liquibase.com/concepts/connections/creating-config-properties.html' }],
  },
};
