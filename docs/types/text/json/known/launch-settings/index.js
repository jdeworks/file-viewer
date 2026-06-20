// launchSettings.json enhancement: ASP.NET Core launch profiles.
export default {
  id: 'launch-settings',
  label: 'ASP.NET Core Launch Settings',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    return (intake.filename || intake.name || '').split('/').pop().toLowerCase() === 'launchsettings.json';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'launchSettings.json — defines launch profiles for ASP.NET Core applications. Controls how the app starts during development (URLs, environment variables, command name).',
    usedFor: [{ label: 'ASP.NET Core', description: 'Configure development launch profiles for ASP.NET Core apps', href: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments' }],
  },
};
