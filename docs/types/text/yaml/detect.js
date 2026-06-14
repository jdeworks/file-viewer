import { hasExtension, mimeMatches } from '../../../core/detect.js';

// YAML by extension/MIME; weak content sniff for extensionless pasted YAML.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'yaml', 'yml')) return 0.95;
  if (mimeMatches(intake, 'yaml', 'x-yaml')) return 0.9;
  const t = intake.textSample || '';
  if (/^---\s*$/m.test(t) && /^\s*[\w-]+:\s/m.test(t)) return 0.5;   // doc marker + a mapping
  return 0;
}
