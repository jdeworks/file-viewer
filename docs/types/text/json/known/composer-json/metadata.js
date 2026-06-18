function parse(text) {
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

function count(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).length : 0;
}

function platformCount(obj) {
  return Object.keys(obj && typeof obj === 'object' ? obj : {}).filter((n) => /^(php(-64bit)?|hhvm|ext-|lib-|composer(-.*)?)/i.test(n)).length;
}

export function extract(intake) {
  const pkg = parse(intake.text);
  const req = pkg.require && typeof pkg.require === 'object' ? pkg.require : {};
  return [
    ...(pkg.name ? [{ label: 'Package', value: pkg.name }] : []),
    ...(pkg.type ? [{ label: 'Type', value: String(pkg.type) }] : []),
    ...(pkg.license ? [{ label: 'License', value: Array.isArray(pkg.license) ? pkg.license.join(', ') : String(pkg.license) }] : []),
    { label: 'Requirements', value: String(count(pkg.require)) },
    { label: 'Dev requirements', value: String(count(pkg['require-dev'])) },
    { label: 'Platform requirements', value: String(platformCount(req)) },
    { label: 'Autoload sections', value: String(count(pkg.autoload)) },
    { label: 'Scripts', value: String(count(pkg.scripts)) },
  ];
}
