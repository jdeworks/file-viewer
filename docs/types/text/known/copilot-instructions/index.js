export default {
  id: 'copilot-instructions',
  label: 'GitHub Copilot instructions',
  match(intake) {
    const path = (intake.filename || '');
    const name = path.split('/').pop().toLowerCase();
    return name === 'copilot-instructions.md';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'GitHub Copilot instructions file — custom guidelines and context for GitHub Copilot in this repository.',
    usedFor: [{ label: 'AI coding assistant', description: 'Custom instructions for GitHub Copilot', href: 'https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot' }],
  },
};
