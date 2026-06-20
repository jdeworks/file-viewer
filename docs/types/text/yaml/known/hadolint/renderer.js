import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hadolint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hadolint-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#384D54;color:#fff;vertical-align:middle;margin-right:8px;}
.hadolint-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.hadolint-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.hadolint-sec{margin:12px 0;}
.hadolint-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.hadolint-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.hadolint-pill.warn{background:#fff7ed;border-color:#fdba74;color:#c2410c;}
.hadolint-pill.info{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.hadolint-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.hadolint-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.hadolint-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
`;

const SEVERITY_LEVELS = ['error', 'warning', 'info', 'style', 'ignore', 'none'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const ignored = Array.isArray(cfg.ignore) ? cfg.ignore.slice(0, 15) : [];
  const overrides = cfg.override || {};
  const trustedRegistries = Array.isArray(cfg['trusted-registries']) ? cfg['trusted-registries'].slice(0, 8) : [];
  const failureThreshold = cfg['failure-threshold'] || cfg.failureThreshold || null;
  const format = cfg.format || null;
  const noFail = cfg['no-fail'] || cfg.noFail || false;

  const overrideEntries = Object.entries(overrides).filter(([, rules]) => Array.isArray(rules) && rules.length);

  const settingsHtml = `<div class="hadolint-sec"><h3>Settings</h3><div class="hadolint-kv">
    ${failureThreshold != null ? `<span class="hadolint-k">failure-threshold</span><span class="hadolint-v hadolint-pill">${esc(failureThreshold)}</span>` : ''}
    ${format ? `<span class="hadolint-k">format</span><span class="hadolint-v">${esc(format)}</span>` : ''}
    ${noFail ? `<span class="hadolint-k">no-fail</span><span class="hadolint-v">true</span>` : ''}
    ${trustedRegistries.length ? `<span class="hadolint-k">trusted registries</span><span class="hadolint-v">${trustedRegistries.map(esc).join(', ')}</span>` : ''}
  </div></div>`;

  const ignoredHtml = ignored.length
    ? `<div class="hadolint-sec"><h3>Ignored rules (${ignored.length})</h3><div style="display:flex;flex-wrap:wrap;gap:4px;">${ignored.map((r) => `<span class="hadolint-pill warn">${esc(r)}</span>`).join('')}</div></div>`
    : '';

  const overrideHtml = overrideEntries.length
    ? `<div class="hadolint-sec"><h3>Rule overrides (${overrideEntries.length} severity levels)</h3>${overrideEntries.map(([sev, rules]) => {
        const arr = Array.isArray(rules) ? rules : [];
        return arr.length ? `<div style="margin:4px 0;"><span style="font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;">${esc(sev)}</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;">${arr.map((r) => `<span class="hadolint-pill info">${esc(r)}</span>`).join('')}</div></div>` : '';
      }).join('')}</div>`
    : '';

  const sub = [
    ignored.length ? `${ignored.length} ignored rule${ignored.length !== 1 ? 's' : ''}` : '',
    failureThreshold ? `threshold: ${failureThreshold}` : '',
    trustedRegistries.length ? `${trustedRegistries.length} trusted registr${trustedRegistries.length !== 1 ? 'ies' : 'y'}` : '',
  ].filter(Boolean).join(' · ') || 'Hadolint Dockerfile linter config';

  const host = document.createElement('div');
  host.className = 'hadolint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="hadolint-title"><span class="hadolint-badge">Hadolint</span>Hadolint config</div>
<div class="hadolint-sub">${esc(sub)}</div>
${settingsHtml}${ignoredHtml}${overrideHtml}`;

  return { parentNode: host };
}
