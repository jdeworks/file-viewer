export default {
  id: 'spring-profiles',
  label: 'Spring Boot profiles',
  match(intake, baseType) {
    if (baseType?.id !== 'yaml') return false;
    const rawName = (intake.name || intake.filename || '').split('/').pop();
    // Profile-suffixed files only (application-{profile}.yml) — the bare application.yml is
    // owned by the spring-app-yml plugin; matching it here would shadow that plugin since this
    // one registers earlier in the known-file registry (first match wins).
    const nameMatch = /^application-[^/]+\.ya?ml$/.test(rawName);
    if (!nameMatch) return false;
    const text = intake.textSample || intake.text || '';
    return text.includes('spring:')
      && (text.includes('datasource:') || text.includes('server:') || text.includes('profiles:'));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Spring Boot profile YAML — active profiles, server port, datasource (password masked), security, Redis, and logging levels.',
    usedFor: [{ label: 'Spring Boot', description: 'Externalised application configuration for Spring Boot', href: 'https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html' }],
  },
};
