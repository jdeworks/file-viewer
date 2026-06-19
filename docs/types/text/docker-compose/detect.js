export function detect(intake) {
  const { filename, text, textSample } = intake;
  const name = (filename || '').toLowerCase();
  const isComposeName = name === 'docker-compose.yml' || name === 'docker-compose.yaml'
    || name === 'compose.yml' || name === 'compose.yaml'
    || /docker-compose[.-]/.test(name);
  const src = (text || textSample || '').trimStart();
  const hasServices = /^services\s*:/m.test(src);
  const hasVersion = /^version\s*:/m.test(src);
  if (isComposeName && hasServices) return 0.99;
  if (isComposeName && (hasVersion || hasServices)) return 0.92;
  if (hasServices && (hasVersion || /^\s+image\s*:/m.test(src))) return 0.8;
  if (isComposeName) return 0.5;
  return 0;
}
