export default {
  id: 'aws-credentials',
  label: 'AWS Credentials',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    const text = intake.textSample || intake.text || '';
    return name === 'credentials' && text.includes('aws_access_key_id');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'AWS credentials file — profiles with access key IDs and masked secret access keys.',
    usedFor: [{ label: 'AWS CLI', description: 'Configure AWS credentials for CLI and SDK access', href: 'https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html' }],
  },
};
