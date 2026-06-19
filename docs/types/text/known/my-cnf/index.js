export default {
  id: 'my-cnf',
  label: 'MySQL config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'my.cnf' || name === 'mysql.cnf' || name === 'my.ini' || name === 'mysql.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'MySQL / MariaDB server configuration — port, buffer sizes, networking, and character sets.',
    usedFor: [{ label: 'MySQL config', description: 'Configure MySQL port, InnoDB buffer pool, max connections, and character set.', href: 'https://dev.mysql.com/doc/refman/8.0/en/server-configuration.html' }],
  },
};
