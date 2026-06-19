export default {
  id: 'cursor-rules',
  label: 'Cursor AI Rules',
  match(intake) {
    const path = (intake.filename || '');
    const name = path.split('/').pop().toLowerCase();
    return name === '.cursorrules' || (path.toLowerCase().includes('.cursor/rules/') && name.endsWith('.mdc'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Cursor AI rules file — project-specific instructions and context for the Cursor AI code editor.',
    usedFor: [{ label: 'AI coding assistant', description: 'Rules and context for Cursor AI', href: 'https://docs.cursor.com/context/rules-for-ai' }],
  },
};
