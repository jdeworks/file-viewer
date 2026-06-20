export default {
  id: 'aws-config',
  label: 'AWS Config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    return name === 'config' && (text.includes('[default]') || text.includes('[profile ')) && text.includes('region');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS CLI config file — per-profile region, output format, role chains, and MFA configuration.',
    usedFor: [{ label: 'AWS CLI', description: 'Configure AWS CLI behaviour and default settings per profile', href: 'https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html' }],
  },
};
