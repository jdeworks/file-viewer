export default {
  id: 'matchfile',
  label: 'Matchfile',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return name === 'Matchfile';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Fastlane Match configuration — manages Apple code-signing certificates and provisioning profiles centrally.',
    usedFor: [
      { label: 'Code signing', description: 'Syncs certificates and provisioning profiles via a shared git/S3/Google Cloud repo', href: 'https://docs.fastlane.tools/actions/match/' },
    ],
  },
};
