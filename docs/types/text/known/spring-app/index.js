// application.properties enhancement for Spring Boot projects.
// Uses a content heuristic so it only activates on Spring Boot files, not generic .properties.
export default {
  id: 'spring-app',
  label: 'Spring Boot config',
  match: (intake) => {
    if ((intake.name || '').toLowerCase() !== 'application.properties') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 2000)) : '');
    return /^spring\.|^server\.port|^management\.|^logging\.level/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Spring Boot application configuration — server port, active profiles, application name, datasource, cache, and logging settings.' },
};
