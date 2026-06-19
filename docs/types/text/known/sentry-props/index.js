export default {
  id: 'sentry-props',
  label: 'Sentry',
  match(intake) {
    return (intake.name || intake.filename || '').split('/').pop().toLowerCase() === 'sentry.properties';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Sentry SDK configuration — DSN, release, environment, and source upload settings for Android/Java.',
    usedFor: [{ label: 'Error tracking', description: 'Configure Sentry DSN, release, environment, and native symbol upload options.', href: 'https://docs.sentry.io/platforms/android/configuration/options/' }],
  },
};
