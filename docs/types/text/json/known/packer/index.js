export default {
  id: 'packer',
  label: 'HashiCorp Packer',
  match: (intake, baseType) => {
    if (baseType.id !== 'json') return false;
    const name = (intake.filename || '').split('/').pop().toLowerCase();
    if (name !== 'packer.json' && name !== 'template.json') return false;
    const text = intake.textSample || intake.text || '';
    // Must have a builders array
    return /"builders"\s*:\s*\[/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'HashiCorp Packer machine image template — builders, provisioners, and variables.',
    usedFor: [{ label: 'Machine image automation', description: 'Build identical machine images for multiple platforms from a single source config.', href: 'https://developer.hashicorp.com/packer/docs/templates/legacy_json_templates' }],
  },
};
