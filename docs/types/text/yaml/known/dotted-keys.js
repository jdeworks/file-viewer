// Elastic Beats (Filebeat/Heartbeat/Metricbeat…) configs use DOTTED keys as a shorthand for
// nested mappings: `output.elasticsearch:` means `output: { elasticsearch: ... }`, and
// `multiline.pattern:` means `multiline: { pattern: ... }`. js-yaml parses these literally as
// flat string keys ("output.elasticsearch"), so a renderer reading `cfg.output` finds nothing.
// expandDotted() rewrites every dotted key into its nested form, recursing through objects and
// arrays, merging when a parent already exists. Values are never touched (only keys split on `.`).
export function expandDotted(obj) {
  if (Array.isArray(obj)) return obj.map(expandDotted);
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const val = expandDotted(v);
    if (k.includes('.')) {
      const parts = k.split('.');
      let cur = out;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = val;
    } else if (out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) && val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out[k], val);
    } else {
      out[k] = val;
    }
  }
  return out;
}
