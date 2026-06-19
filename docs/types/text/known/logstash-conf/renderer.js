const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ls-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ls{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f5a623;color:#fff;vertical-align:middle;margin-right:8px;}
.ls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ls-sec{margin:14px 0;}
.ls-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ls-stage{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.ls-stage-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin-bottom:6px;}
.ls-plugin{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.ls-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.ls-kv-k{color:var(--fg-2,#888);min-width:110px;font-family:ui-monospace,monospace;}
.ls-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ls-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
`;

/**
 * Parse top-level blocks from a Logstash pipeline config.
 * Returns an array of { type: 'input'|'filter'|'output', plugins: [{name, settings}] }
 */
function parseLogstash(text) {
  const stages = [];
  // Match top-level input/filter/output blocks
  const topBlockRe = /\b(input|filter|output)\s*\{/gi;
  let m;
  while ((m = topBlockRe.exec(text)) !== null) {
    const stageType = m[1].toLowerCase();
    const startIdx = m.index + m[0].length;
    // Find matching closing brace
    let depth = 1;
    let i = startIdx;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(startIdx, i - 1);
    const plugins = extractPlugins(body);
    stages.push({ type: stageType, plugins });
  }
  return stages;
}

/**
 * Extract plugin blocks (name { ... }) from a stage body.
 */
function extractPlugins(body) {
  const plugins = [];
  // Match plugin names like: elasticsearch { ... } or ruby { ... }
  const pluginRe = /\b([a-z_][a-z0-9_-]*)\s*\{/gi;
  let m;
  while ((m = pluginRe.exec(body)) !== null) {
    const name = m[1].toLowerCase();
    // Skip known non-plugin keywords
    if (['if', 'else', 'and', 'or', 'not'].includes(name)) continue;
    const startIdx = m.index + m[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < body.length && depth > 0) {
      if (body[i] === '{') depth++;
      else if (body[i] === '}') depth--;
      i++;
    }
    const pluginBody = body.slice(startIdx, i - 1);
    const settings = extractSettings(pluginBody);
    plugins.push({ name, settings });
  }
  return plugins;
}

/**
 * Extract key => value settings from a plugin body.
 */
function extractSettings(body) {
  const settings = [];
  const lineRe = /^\s*([a-z_][a-z0-9_.]*)\s*=>\s*(.+?)(?:\s*#.*)?$/gim;
  let m;
  let count = 0;
  while ((m = lineRe.exec(body)) !== null && count < 6) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    settings.push({ key, val });
    count++;
  }
  return settings;
}

export function render(intake) {
  const text = intake.text || '';
  const stages = parseLogstash(text);

  const stageColors = { input: '#16a34a', filter: '#2563eb', output: '#dc2626' };

  const stagesHtml = stages.map((stage) => {
    const color = stageColors[stage.type] || '#888';
    const pluginsHtml = stage.plugins.length
      ? stage.plugins.map((p) => {
          const settingsHtml = p.settings.length
            ? p.settings.map((s) => `<div class="ls-kv"><span class="ls-kv-k">${esc(s.key)}</span><span class="ls-kv-v">${esc(s.val)}</span></div>`).join('')
            : '';
          return `<div style="margin:6px 0 8px;padding:8px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);">
<div style="font:700 13px/1.4 ui-monospace,monospace;color:${esc(color)};margin-bottom:4px;">${esc(p.name)}</div>
${settingsHtml}
</div>`;
        }).join('')
      : '<div style="font-size:12px;color:var(--fg-2,#888);">No plugins detected</div>';

    return `<div class="ls-stage">
<div class="ls-stage-label" style="color:${esc(color)};">${esc(stage.type)}</div>
${pluginsHtml}
</div>`;
  }).join('');

  const pluginCount = stages.reduce((n, s) => n + s.plugins.length, 0);
  const sub = stages.map((s) => `${s.plugins.length} ${s.type} plugin${s.plugins.length !== 1 ? 's' : ''}`).join(' · ');

  const host = document.createElement('div');
  host.className = 'ls-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ls">Logstash</span>
  <span class="ls-title">Pipeline Config</span>
  ${pluginCount ? `<span class="ls-tag">${pluginCount} plugin${pluginCount !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="ls-sub">${esc(sub)}</div>
${stages.length ? `<div class="ls-sec"><h3>Pipeline Stages</h3>${stagesHtml}</div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No pipeline stages detected.</div>'}`;

  return { parentNode: host };
}
