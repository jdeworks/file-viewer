// Docker Bake renderer: parses HCL (regex) or JSON, shows targets with tags, platforms, cache.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chip = (text, cls = '') => `<span class="bk-chip${cls ? ' ' + cls : ''}">${esc(text)}</span>`;

const CSS = `
.bk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d63ed;color:#fff;vertical-align:middle;margin-right:8px;}
.bk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bk-cards{display:flex;flex-direction:column;gap:12px;margin:10px 0;}
.bk-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);border-radius:8px;padding:12px 14px;}
.bk-card-name{font:14px/1.4 ui-monospace,monospace;font-weight:700;margin:0 0 8px;color:var(--fg,#24292f);}
.bk-field{display:flex;align-items:flex-start;gap:8px;margin:3px 0;font-size:12px;}
.bk-flabel{min-width:90px;color:var(--fg-2,#888);font-weight:600;flex-shrink:0;}
.bk-fval{font:12px/1.4 ui-monospace,monospace;color:var(--fg,#24292f);word-break:break-all;}
.bk-chips{display:flex;flex-wrap:wrap;gap:4px;}
.bk-chip{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-2,#eef2f7);border:1px solid var(--border,#d0d7de);color:var(--fg,#24292f);}
.bk-chip.tag{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.bk-chip.plat{background:#f3e5f5;border-color:#ce93d8;color:#4a148c;}
.bk-chip.cache{background:#fff8e1;border-color:#ffe082;color:#f57f17;}
.bk-stat{font-size:12px;color:var(--fg-2,#888);}
.bk-group-name{font-size:12px;font-weight:600;color:var(--fg-2,#666);font-family:ui-monospace,monospace;}
.bk-group-targets{font-size:12px;color:var(--fg-2,#888);}
`;

// Parse HCL bake file with regex to extract target/group blocks
function parseHcl(text) {
  const targets = {};
  const groups = {};

  // Match target "name" { ... } blocks
  const blockRe = /(target|group)\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const kind = m[1];
    const name = m[2];
    const body = m[3];
    if (kind === 'target') {
      targets[name] = parseTargetBody(body);
    } else {
      groups[name] = parseGroupBody(body);
    }
  }
  return { targets, groups };
}

function extractHclList(body, key) {
  // Match key = ["a", "b", ...]  or key = ["a",\n  "b"]
  const re = new RegExp(key + '\\s*=\\s*\\[([^\\]]+)\\]');
  const m = re.exec(body);
  if (!m) return [];
  return m[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, '')) || [];
}

function extractHclScalar(body, key) {
  const re = new RegExp(key + '\\s*=\\s*"([^"]*)"');
  const m = re.exec(body);
  return m ? m[1] : null;
}

function parseTargetBody(body) {
  return {
    context: extractHclScalar(body, 'context'),
    dockerfile: extractHclScalar(body, 'dockerfile'),
    tags: extractHclList(body, 'tags'),
    platforms: extractHclList(body, 'platforms'),
    cacheFrom: extractHclList(body, 'cache-from'),
    cacheTo: extractHclList(body, 'cache-to'),
    target: extractHclScalar(body, 'target'),
    inherits: extractHclList(body, 'inherits'),
  };
}

function parseGroupBody(body) {
  return { targets: extractHclList(body, 'targets') };
}

function parseJson(text) {
  try {
    const obj = JSON.parse(text);
    const targets = {};
    const groups = {};
    for (const [name, val] of Object.entries(obj.target || {})) {
      targets[name] = {
        context: val.context || null,
        dockerfile: val.dockerfile || null,
        tags: Array.isArray(val.tags) ? val.tags : [],
        platforms: Array.isArray(val.platforms) ? val.platforms : [],
        cacheFrom: Array.isArray(val['cache-from']) ? val['cache-from'] : [],
        cacheTo: Array.isArray(val['cache-to']) ? val['cache-to'] : [],
        target: val.target || null,
        inherits: Array.isArray(val.inherits) ? val.inherits : [],
      };
    }
    for (const [name, val] of Object.entries(obj.group || {})) {
      groups[name] = { targets: Array.isArray(val.targets) ? val.targets : [] };
    }
    return { targets, groups };
  } catch {
    return { targets: {}, groups: {} };
  }
}

export function render(intake) {
  const filename = (intake.name || intake.filename || 'docker-bake.hcl').split('/').pop();
  const isJson = filename.endsWith('.json');
  const text = intake.text || '';

  const { targets, groups } = isJson ? parseJson(text) : parseHcl(text);

  const targetNames = Object.keys(targets);
  const groupNames = Object.keys(groups);

  const targetCards = targetNames.map((name) => {
    const t = targets[name];
    let fields = '';
    if (t.context) fields += `<div class="bk-field"><span class="bk-flabel">context</span><span class="bk-fval">${esc(t.context)}</span></div>`;
    if (t.dockerfile) fields += `<div class="bk-field"><span class="bk-flabel">dockerfile</span><span class="bk-fval">${esc(t.dockerfile)}</span></div>`;
    if (t.target) fields += `<div class="bk-field"><span class="bk-flabel">target</span><span class="bk-fval">${esc(t.target)}</span></div>`;
    if (t.tags.length) fields += `<div class="bk-field"><span class="bk-flabel">tags</span><div class="bk-chips">${t.tags.map((tg) => chip(tg, 'tag')).join('')}</div></div>`;
    if (t.platforms.length) fields += `<div class="bk-field"><span class="bk-flabel">platforms</span><div class="bk-chips">${t.platforms.map((p) => chip(p, 'plat')).join('')}</div></div>`;
    if (t.cacheFrom.length) fields += `<div class="bk-field"><span class="bk-flabel">cache-from</span><div class="bk-chips">${t.cacheFrom.map((c) => chip(c, 'cache')).join('')}</div></div>`;
    if (t.cacheTo.length) fields += `<div class="bk-field"><span class="bk-flabel">cache-to</span><div class="bk-chips">${t.cacheTo.map((c) => chip(c, 'cache')).join('')}</div></div>`;
    if (t.inherits.length) fields += `<div class="bk-field"><span class="bk-flabel">inherits</span><div class="bk-chips">${t.inherits.map((i) => chip(i)).join('')}</div></div>`;
    return `<div class="bk-card"><div class="bk-card-name">target "${esc(name)}"</div>${fields || '<div class="bk-stat">No fields.</div>'}</div>`;
  }).join('');

  const groupCards = groupNames.map((name) => {
    const g = groups[name];
    return `<div class="bk-card"><div class="bk-card-name"><span class="bk-group-name">group "${esc(name)}"</span></div>
<div class="bk-field"><span class="bk-flabel">targets</span><div class="bk-chips">${g.targets.map((t) => chip(t)).join('')}</div></div></div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'bk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bk-title"><span class="badge-bk">Docker Bake</span>${esc(filename)}</div>
<div class="bk-sub">Docker Buildx Bake build definition · ${targetNames.length} target${targetNames.length !== 1 ? 's' : ''}${groupNames.length ? ` · ${groupNames.length} group${groupNames.length !== 1 ? 's' : ''}` : ''}</div>
${groupCards ? `<div style="margin-bottom:8px">${groupCards}</div>` : ''}
<div class="bk-cards">${targetCards || '<div class="bk-stat">No targets found.</div>'}</div>`;

  return { parentNode: host };
}
