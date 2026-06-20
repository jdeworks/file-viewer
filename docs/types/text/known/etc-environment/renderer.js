const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.etcenv-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-etcenv{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#374151;color:#fff;vertical-align:middle;margin-right:8px;}
.etcenv-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.etcenv-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.etcenv-sec{margin:14px 0;}
.etcenv-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.etcenv-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.etcenv-row{padding:4px 0;border-top:1px solid var(--border,#e0e0e0);font-size:12px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;}
.etcenv-row:first-child{border-top:none;}
.etcenv-key{font-family:ui-monospace,monospace;font-weight:700;color:var(--fg,#24292f);min-width:160px;word-break:break-all;}
.etcenv-val{font-family:ui-monospace,monospace;color:var(--fg-2,#555);word-break:break-all;}
.etcenv-val.masked{color:#888;letter-spacing:.1em;}
.etcenv-cat{font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);margin-left:4px;}
.etcenv-pills{display:flex;flex-wrap:wrap;gap:6px;}
.etcenv-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

// Keys that look sensitive — mask value
const SENSITIVE_RE = /PASSWORD|SECRET|KEY|TOKEN|PASS|CRED/i;

// Categorise common environment variable prefixes
function categorise(key) {
  if (/^(LANG|LANGUAGE|LC_|LOCALE)/.test(key)) return 'locale';
  if (/^(PATH|LD_LIBRARY|PKG_CONFIG|MANPATH|INFOPATH)/.test(key)) return 'path';
  if (/^(JAVA|JDK|JRE|MAVEN|GRADLE)/.test(key)) return 'java';
  if (/^(PYTHON|PYTHONPATH|VIRTUAL_ENV)/.test(key)) return 'python';
  if (/^(NODE|NPM|NVM)/.test(key)) return 'node';
  if (/^(GOPATH|GOROOT|GOBIN|GO)/.test(key)) return 'go';
  if (/^(RUST|CARGO)/.test(key)) return 'rust';
  if (/^(TZ|TIMEZONE)/.test(key)) return 'timezone';
  if (/^(HTTP|HTTPS|FTP|NO)_PROXY$/.test(key) || /PROXY/.test(key)) return 'proxy';
  if (SENSITIVE_RE.test(key)) return 'secret';
  return '';
}

function parseEnvironmentFile(text) {
  const vars = [];
  const categories = new Set();

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // KEY=VALUE or KEY="VALUE" or KEY='VALUE'
    const m = line.match(/^([A-Za-z_][A-Za-z_0-9]*)=(.*)$/);
    if (!m) continue;

    const key = m[1];
    let value = m[2].trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    const cat = categorise(key);
    if (cat) categories.add(cat);

    const masked = SENSITIVE_RE.test(key);
    vars.push({ key, value, cat, masked });
  }

  return { vars, categories: [...categories] };
}

export function render(intake) {
  const name = (intake.name || intake.filename || '').split('/').pop();
  const text = intake.text || '';
  const { vars, categories } = parseEnvironmentFile(text);

  // Group vars by category
  const groups = {};
  const uncategorised = [];
  for (const v of vars) {
    if (v.cat) {
      if (!groups[v.cat]) groups[v.cat] = [];
      groups[v.cat].push(v);
    } else {
      uncategorised.push(v);
    }
  }

  function renderVarRows(list) {
    return list.map((v) => {
      const valHtml = v.masked
        ? `<span class="etcenv-val masked" title="Value masked">••••••••</span>`
        : `<span class="etcenv-val">${esc(v.value || '(empty)')}</span>`;
      return `<div class="etcenv-row"><span class="etcenv-key">${esc(v.key)}</span>${valHtml}</div>`;
    }).join('');
  }

  let sectionsHtml = '';

  // Render categorised groups first
  const groupOrder = ['locale', 'path', 'timezone', 'proxy', 'java', 'python', 'node', 'go', 'rust', 'secret'];
  for (const cat of groupOrder) {
    if (!groups[cat] || !groups[cat].length) continue;
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    sectionsHtml += `<div class="etcenv-sec"><h3>${esc(label)}</h3><div class="etcenv-card">${renderVarRows(groups[cat])}</div></div>`;
  }
  // Remaining uncategorised
  if (uncategorised.length) {
    sectionsHtml += `<div class="etcenv-sec"><h3>Other</h3><div class="etcenv-card">${renderVarRows(uncategorised)}</div></div>`;
  }

  if (!vars.length) {
    sectionsHtml = '<p style="color:var(--fg-2,#888);font-size:13px;">No environment variables found.</p>';
  }

  const subParts = [`${vars.length} variable${vars.length !== 1 ? 's' : ''}`];
  if (categories.length) subParts.push(categories.join(', '));

  const host = document.createElement('div');
  host.className = 'etcenv-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-etcenv">System Env</span>
  <span class="etcenv-title">${esc(name)}</span>
</div>
<div class="etcenv-sub">${esc(subParts.join(' · '))}</div>
${sectionsHtml}`;
  return { parentNode: host };
}
