const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tfl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tfl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2563EB;color:#fff;vertical-align:middle;margin-right:8px}
.tfl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tfl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px}
.tfl-section{margin:0 0 20px}
.tfl-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px}
.tfl-table{width:100%;border-collapse:collapse;font-size:13px}
.tfl-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tfl-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.tfl-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tfl-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.tfl-pill{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600}
.tfl-pill-on{background:#dcfce7;color:#166534}
.tfl-pill-off{background:#fee2e2;color:#991b1b}
.tfl-kv{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 8px}
.tfl-kv-item{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:4px 10px;font-size:13px}
.tfl-kv-key{font-weight:600;margin-right:4px}
.tfl-rule-list{display:flex;flex-wrap:wrap;gap:6px}
.tfl-rule-chip{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 7px}
`;

function extractBlock(text, keyword) {
  const results = [];
  const re = new RegExp(`(?:^|\\n)${keyword}\\s*(?:"([^"]*)")?\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1] || null;
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    results.push({ name, body: text.slice(start, i - 1) });
  }
  return results;
}

function extractAttr(body, attr) {
  const m = body.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`));
  if (m) return m[1];
  const m2 = body.match(new RegExp(`${attr}\\s*=\\s*(true|false|\\S+)`));
  return m2 ? m2[1] : null;
}

function parseTflint(text) {
  // config block
  let configModule = null;
  let configForce = null;
  const configBlocks = extractBlock(text, 'config');
  if (configBlocks.length > 0) {
    configModule = extractAttr(configBlocks[0].body, 'module');
    configForce = extractAttr(configBlocks[0].body, 'force');
  }

  // plugins
  const pluginBlocks = extractBlock(text, 'plugin');
  const plugins = pluginBlocks.map((b) => ({
    name: b.name || '(unnamed)',
    enabled: extractAttr(b.body, 'enabled'),
    version: extractAttr(b.body, 'version'),
    source: extractAttr(b.body, 'source'),
  }));

  // rules
  const ruleBlocks = extractBlock(text, 'rule');
  const rules = ruleBlocks.map((b) => ({
    name: b.name || '(unnamed)',
    enabled: extractAttr(b.body, 'enabled'),
  }));

  return { configModule, configForce, plugins, rules };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const { configModule, configForce, plugins, rules } = parseTflint(text);

  const enabledRules = rules.filter((r) => r.enabled !== 'false');
  const disabledRules = rules.filter((r) => r.enabled === 'false');

  const sections = [];

  // Config settings
  if (configModule !== null || configForce !== null) {
    const items = [];
    if (configModule !== null) items.push(`<span class="tfl-kv-item"><span class="tfl-kv-key">module</span>${esc(configModule)}</span>`);
    if (configForce !== null) items.push(`<span class="tfl-kv-item"><span class="tfl-kv-key">force</span>${esc(configForce)}</span>`);
    sections.push(`<div class="tfl-section">
  <div class="tfl-section-title">Config</div>
  <div class="tfl-kv">${items.join('')}</div>
</div>`);
  }

  // Plugins
  if (plugins.length > 0) {
    const rows = plugins.map((p) => {
      const pill = p.enabled === 'false'
        ? `<span class="tfl-pill tfl-pill-off">disabled</span>`
        : `<span class="tfl-pill tfl-pill-on">enabled</span>`;
      return `<tr>
        <td><span class="tfl-name">${esc(p.name)}</span></td>
        <td>${esc(p.version || '—')}</td>
        <td>${pill}</td>
        <td><span class="tfl-mono">${esc(p.source || '')}</span></td>
      </tr>`;
    }).join('');
    sections.push(`<div class="tfl-section">
  <div class="tfl-section-title">Plugins (${plugins.length})</div>
  <table class="tfl-table"><thead><tr><th>Name</th><th>Version</th><th>Status</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  // Rules
  if (rules.length > 0) {
    let rulesHtml = `<div class="tfl-section">
  <div class="tfl-section-title">Rules — ${enabledRules.length} enabled · ${disabledRules.length} disabled</div>`;
    if (enabledRules.length > 0) {
      const chips = enabledRules.map((r) => `<span class="tfl-rule-chip" style="border-color:#86efac">${esc(r.name)}</span>`).join('');
      rulesHtml += `<div style="margin-bottom:8px"><span style="font-size:12px;color:var(--fg-2,#888);display:block;margin-bottom:4px">Enabled</span><div class="tfl-rule-list">${chips}</div></div>`;
    }
    if (disabledRules.length > 0) {
      const chips = disabledRules.map((r) => `<span class="tfl-rule-chip" style="border-color:#fca5a5">${esc(r.name)}</span>`).join('');
      rulesHtml += `<div><span style="font-size:12px;color:var(--fg-2,#888);display:block;margin-bottom:4px">Disabled</span><div class="tfl-rule-list">${chips}</div></div>`;
    }
    rulesHtml += `</div>`;
    sections.push(rulesHtml);
  }

  const host = document.createElement('div');
  host.className = 'tfl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tfl-title"><span class="badge-tfl">TFLint</span>${esc(filename)}</div>
<div class="tfl-sub">${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} · ${rules.length} rule${rules.length !== 1 ? 's' : ''}</div>
${sections.join('\n')}`;
  return { parentNode: host };
}
