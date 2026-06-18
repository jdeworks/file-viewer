import { parseJsonLike } from '../../jsonparse.js';

export function extract(intake) {
  let cfg;
  try { cfg = parseJsonLike(intake.text || '{}', '{}').data; } catch { cfg = {}; }
  const opts = cfg.compilerOptions && typeof cfg.compilerOptions === 'object' ? cfg.compilerOptions : {};
  const refs = Array.isArray(cfg.references) ? cfg.references.length : 0;
  return [
    ...(cfg.extends ? [{ label: 'Extends', value: String(cfg.extends) }] : []),
    { label: 'Compiler options', value: String(Object.keys(opts).length) },
    { label: 'Strict mode', value: opts.strict === true ? 'yes' : opts.strict === false ? 'no' : 'unspecified' },
    ...(opts.target ? [{ label: 'Target', value: String(opts.target) }] : []),
    ...(opts.module ? [{ label: 'Module', value: String(opts.module) }] : []),
    { label: 'Include patterns', value: String(Array.isArray(cfg.include) ? cfg.include.length : 0) },
    { label: 'Exclude patterns', value: String(Array.isArray(cfg.exclude) ? cfg.exclude.length : 0) },
    { label: 'Project references', value: String(refs) },
  ];
}
