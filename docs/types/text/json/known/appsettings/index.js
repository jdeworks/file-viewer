// appsettings.json enhancement: ASP.NET Core application configuration.
export default {
  id: 'appsettings',
  label: 'ASP.NET Core appsettings',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (!(n === 'appsettings.json' || /^appsettings\.[a-z]+\.json$/.test(n))) return false;
    const text = intake.text || intake.textSample || '';
    return /Logging|ConnectionStrings|AllowedHosts/.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'appsettings.json — ASP.NET Core application configuration file. Controls logging levels, connection strings, feature flags, and environment-specific settings.',
    usedFor: [{ label: 'ASP.NET Core', description: 'Application settings for ASP.NET Core apps', href: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration' }],
  },
};
