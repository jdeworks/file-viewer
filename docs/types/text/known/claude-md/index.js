export default {
  id: 'claude-md',
  label: 'Claude Code config',
  match(intake) {
    const path = (intake.filename || '');
    const name = path.split('/').pop().toLowerCase();
    return name === 'claude.md';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Claude Code CLAUDE.md — project-specific instructions, conventions, and context for the Claude Code AI assistant.',
    usedFor: [{ label: 'AI coding assistant', description: 'System prompt and instructions for Claude Code', href: 'https://docs.anthropic.com/en/docs/claude-code/overview' }],
  },
};
