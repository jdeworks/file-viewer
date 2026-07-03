export default {
  id: 'vikunja-config',
  label: 'Vikunja Config',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.yml' && n !== 'vikunja.yml') return false;
    const text = intake.text || '';
    return text.includes('jwtttl') || (text.includes('frontendurl') && text.includes('database:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Vikunja task management server configuration — service, database, Redis, mail, and file storage settings.',
    usedFor: [{ label: 'Vikunja', description: 'Vikunja is an open-source, self-hosted task management server (Todoist/TickTick alternative).', href: 'https://vikunja.io/' }],
  },
};
