export default {
  id: 'pgbackrest-conf',
  label: 'pgBackRest Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    if (n === 'pgbackrest.conf') return true;
    if (text.includes('[global]') && (text.includes('repo1-path') || text.includes('repo1-type') || text.includes('pg1-path'))) return true;
    if (text.includes('[stanza:') && text.includes('pg1-path')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'pgBackRest configuration — defines backup repositories, PostgreSQL instances (stanzas), and backup policies.',
    usedFor: [{ label: 'pgBackRest', description: 'Reliable PostgreSQL backup & restore solution', href: 'https://pgbackrest.org/' }],
  },
};
