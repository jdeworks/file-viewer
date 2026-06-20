export const plugin = {
  id: 'groovy-lang',
  label: 'Groovy',
  tags: ['groovy', 'gvy', 'gy', 'gsh', 'jvm', 'scripting'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (name.endsWith('.groovy') || name.endsWith('.gvy') || name.endsWith('.gy') || name.endsWith('.gsh')) return true;
    // Rego policy files share import/package keywords but are not Groovy
    if (name.endsWith('.rego')) return false;
    const text = intake.text || '';
    const hits = [
      /^def\s+/m.test(text),
      /^class\s+/m.test(text),
      /^import\s+/m.test(text),
      /^package\s+/m.test(text),
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Groovy is a dynamic JVM language with optional typing, closures, and a concise syntax. .groovy and .gvy files are regular source; .gy is a shorthand extension; .gsh files are Groovy shell scripts.',
    usedFor: [
      { label: 'groovy-lang.org', description: 'Official Apache Groovy language home', href: 'https://groovy-lang.org/' },
      { label: 'Gradle + Groovy', description: 'Groovy DSL in Gradle build scripts', href: 'https://docs.gradle.org/current/userguide/groovy_build_script_primer.html' },
    ],
  },
};
export default plugin;
