export default {
  id: 'hydra-config',
  label: 'Hydra Config',
  match(intake, baseType) {
    if (!baseType || baseType.id !== 'yaml') return false;
    const text = intake.textSample || intake.text || '';
    // Hydra marker: _target_: in content, OR defaults: list that contains _self_
    if (text.includes('_target_:')) return true;
    if (text.includes('defaults:') && text.includes('_self_')) return true;
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Hydra configuration file — uses defaults lists, config groups, and _target_ for dynamic object instantiation in ML experiments.',
    usedFor: [{ label: 'Hydra', description: 'Framework for elegantly configuring complex applications', href: 'https://hydra.cc/docs/intro/' }],
  },
};
