// application.yml / application.yaml enhancement for Spring Boot projects.
// Uses a content heuristic to avoid false positives on generic YAML files.
export default {
  id: 'spring-app-yml',
  label: 'Spring Boot config (YAML)',
  match: (intake, baseType) => {
    if (baseType?.id !== 'yaml') return false;
    const n = (intake.name || '').toLowerCase();
    if (n !== 'application.yml' && n !== 'application.yaml') return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 2000)) : '');
    return /\bspring\b|\bserver:\s*$|\bmanagement\b|\blogging\b/m.test(text);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Spring Boot YAML application configuration — server port, active profiles, datasource, logging, and other Spring properties.' },
};
