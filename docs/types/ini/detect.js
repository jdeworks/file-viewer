import { hasExtension } from '../../core/detect.js';

// INI / .env / .properties / .cfg / .conf key-value config files.
export function detect(intake) {
  if (intake.isBinary) return 0;
  const name = (intake.filename || '').toLowerCase().split('/').pop();
  if (/^\.env(\.|$)/.test(name) || name === '.editorconfig') return 0.9;
  if (hasExtension(intake, 'ini', 'env', 'cfg', 'conf', 'properties')) return 0.85;
  // Weak sniff: several `key=value` / `key: value` lines and/or a [section] header.
  const t = intake.textSample || '';
  const kvLines = (t.match(/^[ \t]*[\w.-]+\s*[=:]\s*\S/gm) || []).length;
  if (/^\s*\[[^\]]+\]\s*$/m.test(t) && kvLines >= 1) return 0.45;
  return 0;
}
