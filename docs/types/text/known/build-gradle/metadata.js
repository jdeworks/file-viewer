const CONFIGS = 'implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor|kapt|ksp|classpath|androidTestImplementation|debugImplementation';
const DEP_RE = new RegExp('\\b(' + CONFIGS + ')\\b[\\s(]+["\\\']([^"\\\':]+):([^"\\\':]+):([^"\\\'@]+)', 'g');

export function extract(intake) {
  const text = intake.text || '';
  const configs = new Set();
  let deps = 0;
  let m;
  while ((m = DEP_RE.exec(text))) {
    configs.add(m[1]);
    deps++;
  }
  return [
    { label: 'Build file', value: /\.kts$/i.test(intake.filename || '') ? 'Gradle Kotlin DSL' : 'Gradle Groovy DSL' },
    { label: 'Dependencies', value: String(deps) },
    { label: 'Configurations', value: String(configs.size) },
  ];
}
