export default {
  id: 'wandb-config',
  label: 'W&B Config',
  match(intake) {
    const fullPath = intake.filename || intake.name || '';
    const name = fullPath.split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    // Named "settings" inside .wandb/ or wandb/ directory
    const isWandbDir = name === 'settings' && (fullPath.includes('.wandb/') || fullPath.includes('wandb/'));
    // Or named wandb-settings with W&B content
    const isWandbNamed = (name === 'wandb-settings' || name === 'wandb_settings');
    // Or content has W&B specific markers (api.wandb.ai base_url or wandb entity/project combo)
    const hasWandbContent = text.includes('api.wandb.ai') || text.includes('wandb.ai') ||
      (text.includes('entity') && text.includes('project') && (text.includes('base_url') || text.includes('run_mode')));
    return (isWandbDir || isWandbNamed || hasWandbContent);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Weights & Biases settings file — stores entity, project, run mode, API base URL, and other W&B client configuration.',
    usedFor: [{ label: 'W&B', description: 'Weights & Biases — ML experiment tracking and collaboration', href: 'https://docs.wandb.ai/ref/python/init' }],
  },
};
