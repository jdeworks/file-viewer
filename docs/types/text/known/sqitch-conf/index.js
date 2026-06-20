export default {
  id: 'sqitch-conf',
  label: 'Sqitch Config',
  match(intake) {
    const name = (intake.filename || intake.name || '').split('/').pop().toLowerCase();
    return name === 'sqitch.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Sqitch database change management configuration — defines the core engine, plan file, top directory, and target database connection settings with engine-specific options.',
    usedFor: [{ label: 'Sqitch', description: 'Sensible database change management tool', href: 'https://sqitch.org/docs/manual/sqitch-config/' }],
  },
};
