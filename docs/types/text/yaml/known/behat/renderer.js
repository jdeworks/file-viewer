// Enhanced Behat config view. Parses behat.yml with js-yaml and shows
// test suites, contexts, formatters, and base URL.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.bh-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-bh{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#16a34a;color:#fff;vertical-align:middle;}
.bh-title{font-size:18px;font-weight:700;margin:0;}
.bh-sub{font-size:12px;color:var(--fg-2,#888);margin:2px 0 0;}
.bh-sec{margin-top:16px;}
.bh-sec h3{font-size:12px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;}
.bh-suite{border:1px solid var(--border,#e8eaed);border-radius:6px;padding:8px 12px;margin-bottom:8px;}
.bh-suite-name{font-weight:700;font-size:13px;color:#16a34a;margin-bottom:4px;}
.bh-suite-row{font-size:12px;display:flex;gap:8px;margin-top:2px;}
.bh-suite-row-k{font-family:ui-monospace,monospace;font-weight:600;min-width:80px;color:var(--fg-2,#888);}
.bh-suite-row-v{font-family:ui-monospace,monospace;}
.bh-pills{display:flex;flex-wrap:wrap;gap:6px;}
.bh-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.bh-pill.ctx{background:#f0fdf4;border-color:#86efac;color:#166534;}
.bh-pill.fmt{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.bh-kv{display:flex;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaecef);}
.bh-kv:last-child{border-bottom:none;}
.bh-kv-k{font-family:ui-monospace,monospace;font-weight:600;min-width:120px;flex-shrink:0;}
.bh-kv-v{font-family:ui-monospace,monospace;color:var(--fg-2,#888);word-break:break-all;}
`;

function asArray(v) { return Array.isArray(v) ? v : (v != null ? [v] : []); }

function renderContext(ctx) {
  if (typeof ctx === 'string') return ctx.split('\\').pop();
  if (ctx && typeof ctx === 'object') {
    const key = Object.keys(ctx)[0] || '';
    return key.split('\\').pop();
  }
  return String(ctx);
}

export async function render(intake) {
  const host = document.createElement('div');
  host.className = 'bh-doc';

  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p style="color:#c62828;font-size:13px;">Failed to parse YAML: ${esc(String(e))}</p>`;
    return { parentNode: host };
  }

  // Top-level: default / extensions keys
  const defaultSection = cfg.default || {};
  const suiteMap = defaultSection.suites || cfg.suites || {};

  // Gherkin extensions
  const extensions = defaultSection.extensions || cfg.extensions || {};
  const minkExtension = extensions['Behat\\MinkExtension'] || extensions['mink'] || null;
  const baseUrl = minkExtension ? (minkExtension.base_url || minkExtension.baseUrl || null) : null;
  const browserName = minkExtension ? (minkExtension.browser_name || null) : null;

  // Formatters
  const formatters = Object.keys(defaultSection.formatters || cfg.formatters || {});

  // Suites
  const suiteNames = Object.keys(suiteMap);
  const suites = suiteNames.map((name) => {
    const s = suiteMap[name] || {};
    const contexts = asArray(s.contexts).map(renderContext);
    const paths = asArray(s.paths || s.path || s.features);
    return { name, contexts, paths };
  });

  // All contexts across suites (deduped)
  const allContexts = [...new Set(suites.flatMap((s) => s.contexts))];

  const subtitle = [
    suites.length ? `${suites.length} suite${suites.length !== 1 ? 's' : ''}` : '',
    allContexts.length ? `${allContexts.length} context${allContexts.length !== 1 ? 's' : ''}` : '',
    baseUrl ? baseUrl : '',
  ].filter(Boolean).join(' · ') || 'Behat BDD test configuration';

  const settingsRows = [
    baseUrl ? `<div class="bh-kv"><span class="bh-kv-k">base_url</span><span class="bh-kv-v">${esc(baseUrl)}</span></div>` : '',
    browserName ? `<div class="bh-kv"><span class="bh-kv-k">browser_name</span><span class="bh-kv-v">${esc(browserName)}</span></div>` : '',
  ].filter(Boolean).join('');

  const suitesHtml = suites.map((s) => `
    <div class="bh-suite">
      <div class="bh-suite-name">${esc(s.name)}</div>
      ${s.paths.length ? `<div class="bh-suite-row"><span class="bh-suite-row-k">paths</span><span class="bh-suite-row-v">${s.paths.map(esc).join(', ')}</span></div>` : ''}
      ${s.contexts.length ? `<div class="bh-suite-row"><span class="bh-suite-row-k">contexts</span><span class="bh-suite-row-v">${s.contexts.map(esc).join(', ')}</span></div>` : ''}
    </div>`).join('');

  const contextsHtml = allContexts.length ? `<div class="bh-sec"><h3>Contexts (${allContexts.length})</h3><div class="bh-pills">
    ${allContexts.map((c) => `<span class="bh-pill ctx">${esc(c)}</span>`).join('')}
  </div></div>` : '';

  const formattersHtml = formatters.length ? `<div class="bh-sec"><h3>Formatters</h3><div class="bh-pills">
    ${formatters.map((f) => `<span class="bh-pill fmt">${esc(f)}</span>`).join('')}
  </div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="bh-head">
  <span class="badge-bh">Behat</span>
  <div>
    <div class="bh-title">behat.yml</div>
    <div class="bh-sub">${esc(subtitle)}</div>
  </div>
</div>
${settingsRows ? `<div class="bh-sec"><h3>Settings</h3>${settingsRows}</div>` : ''}
${suites.length ? `<div class="bh-sec"><h3>Test Suites (${suites.length})</h3>${suitesHtml}</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No test suites defined.</p>'}
${contextsHtml}${formattersHtml}`;

  return { parentNode: host };
}
