const GROOVY_EXTS = new Set(['groovy', 'gvy', 'gy', 'gsh', 'gradle']);

export const plugin = {
  id: 'groovy-lang',
  label: 'Groovy',
  tags: ['groovy', 'gvy', 'gy', 'gsh', 'jvm', 'scripting'],
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    // Defer the Gradle build-script files to their dedicated build-gradle plugin (they're .gradle
    // but get a richer build-specific view). Generic *.gradle scripts still fall to Groovy below.
    if (name === 'build.gradle' || name === 'build.gradle.kts') return false;
    if (name.endsWith('.groovy') || name.endsWith('.gvy') || name.endsWith('.gy') || name.endsWith('.gsh') || name.endsWith('.gradle')) return true;
    // The content heuristic keys off def/class/import/package, which appear in many other
    // languages. Only content-match files with no/unknown extension (a bare extension guard).
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext && !GROOVY_EXTS.has(ext)) return false;
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
