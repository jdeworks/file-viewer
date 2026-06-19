export default {
  id: 'vscode-tasks',
  label: 'VS Code tasks',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const p = (intake.filename || '').toLowerCase().replace(/\\/g, '/');
    const name = p.split('/').pop();
    return (p.includes('/.vscode/') && name === 'tasks.json') || name === 'vscode-tasks.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VS Code tasks configuration — automates build, test, lint, and other shell commands from within the editor.',
    usedFor: [{ label: 'Task automation', description: 'VS Code integrated task runner', href: 'https://code.visualstudio.com/docs/editor/tasks' }],
  },
};
