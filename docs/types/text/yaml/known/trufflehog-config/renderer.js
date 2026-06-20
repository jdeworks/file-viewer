import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tfh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tfh-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c2d12;color:#fff;vertical-align:middle;margin-right:8px;}
.tfh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tfh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tfh-sec{margin:12px 0;}
.tfh-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.tfh-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 10px;}
.tfh-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.tfh-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.tfh-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.tfh-chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;}
.tfh-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;font-weight:600;margin:2px 3px 2px 0;border:1px solid;font-family:ui-monospace,monospace;}
.tfh-chip.det{background:#fff1f2;border-color:#fda4af;color:#881337;}
.tfh-chip.path{background:#f0fdf4;border-color:#86efac;color:#14532d;}
.tfh-chip.exc{background:#fef3c7;border-color:#fde68a;color:#78350f;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const detectors = cfg.detectors || {};
  const includeDetectors = Array.isArray(detectors.include) ? detectors.include
    : (Array.isArray(cfg.include_detectors) ? cfg.include_detectors : []);
  const excludeDetectors = Array.isArray(detectors.exclude) ? detectors.exclude
    : (Array.isArray(cfg.exclude_detectors) ? cfg.exclude_detectors : []);
  const includePaths = Array.isArray(cfg.include_paths) ? cfg.include_paths
    : (Array.isArray(cfg['include-paths']) ? cfg['include-paths'] : []);
  const excludePaths = Array.isArray(cfg.exclude_paths) ? cfg.exclude_paths
    : (Array.isArray(cfg['exclude-paths']) ? cfg['exclude-paths'] : []);
  const concurrency = cfg.concurrency || cfg.workers || null;
  const onlyVerified = cfg.only_verified != null ? cfg.only_verified : cfg['only-verified'];
  const since = cfg.since_commit || cfg['since-commit'] || null;
  const source = cfg.source || null;

  const kvRow = (k, v) => v != null && v !== '' ? `<span class="tfh-k">${esc(k)}</span><span class="tfh-v">${esc(String(v))}</span>` : '';

  const settingsKvs = [
    kvRow('concurrency', concurrency),
    onlyVerified != null ? kvRow('only-verified', String(onlyVerified)) : '',
    kvRow('source', source),
    kvRow('since-commit', since),
  ].filter(Boolean).join('');

  const subParts = [
    includeDetectors.length ? `${includeDetectors.length} detector${includeDetectors.length !== 1 ? 's' : ''} included` : '',
    excludeDetectors.length ? `${excludeDetectors.length} excluded` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'tfh-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tfh-title"><span class="tfh-badge">TruffleHog</span>${esc(source || '.trufflehog.yaml')}</div>
<div class="tfh-sub">Secrets scanning configuration${subParts.length ? ' · ' + subParts.join(' · ') : ''}</div>
${settingsKvs ? `<div class="tfh-sec"><h3>Settings</h3><div class="tfh-card"><div class="tfh-kv">${settingsKvs}</div></div></div>` : ''}
${includeDetectors.length ? `<div class="tfh-sec"><h3>Include Detectors (${includeDetectors.length})</h3><div class="tfh-card"><div class="tfh-chips">${includeDetectors.map((d) => `<span class="tfh-chip det">${esc(d)}</span>`).join('')}</div></div></div>` : ''}
${excludeDetectors.length ? `<div class="tfh-sec"><h3>Exclude Detectors (${excludeDetectors.length})</h3><div class="tfh-card"><div class="tfh-chips">${excludeDetectors.map((d) => `<span class="tfh-chip exc">${esc(d)}</span>`).join('')}</div></div></div>` : ''}
${includePaths.length ? `<div class="tfh-sec"><h3>Include Paths</h3><div class="tfh-card"><div class="tfh-chips">${includePaths.map((p) => `<span class="tfh-chip path">${esc(p)}</span>`).join('')}</div></div></div>` : ''}
${excludePaths.length ? `<div class="tfh-sec"><h3>Exclude Paths</h3><div class="tfh-card"><div class="tfh-chips">${excludePaths.map((p) => `<span class="tfh-chip exc">${esc(p)}</span>`).join('')}</div></div></div>` : ''}`;
  return { parentNode: host };
}
