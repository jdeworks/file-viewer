export default {
  id: 'taskrc',
  label: 'Taskwarrior Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === '.taskrc' || n === 'taskrc') return true;
    const text = intake.textSample || intake.text || '';
    if (text.includes('data.location=') && text.includes('dateformat=')) return true;
    if (text.includes('task.version.') || (text.includes('urgency.') && text.includes('coefficient'))) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Taskwarrior task manager configuration — data location, dates, colors, and urgency settings.',
    tags: ['taskwarrior', 'task', 'productivity', 'config'],
  },
};
