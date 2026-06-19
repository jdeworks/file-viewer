export default {
  id: 'vscode-launch',
  label: 'VS Code launch config',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const p = (intake.filename || '').toLowerCase().replace(/\\/g, '/');
    const name = p.split('/').pop();
    return (p.includes('/.vscode/') && name === 'launch.json') || name === 'vscode-launch.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'VS Code debug launch configurations — defines how to start and attach the debugger for different scenarios.',
    usedFor: [{ label: 'Debugging', description: 'VS Code debugger launch and attach configs', href: 'https://code.visualstudio.com/docs/editor/debugging#_launch-configurations' }],
  },
};
