const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pwcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pwcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0078d7;color:#fff;vertical-align:middle;margin-right:8px;}
.pwcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pwcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pwcfg-sec{margin:12px 0;}
.pwcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pwcfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.pwcfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.pwcfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.pwcfg-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.pwcfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.pwcfg-module-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px;}
.pwcfg-module-list li{font-family:ui-monospace,monospace;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;}
.pwcfg-exec-list{list-style:none;margin:4px 0 0;padding:0;}
.pwcfg-exec-list li{font-family:ui-monospace,monospace;font-size:12px;padding:1px 0;}
`;

/**
 * Extract a top-level block: `blockName = { ... }` or `blockName = [ ... ]`
 * Handles nested braces/brackets, ignores comments.
 */
function extractBlock(text, blockName) {
  const re = new RegExp(`${blockName}\\s*=\\s*([{\\[])`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const open = m[1];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let start = m.index + m[0].length - 1;
  let i = start;
  while (i < text.length) {
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
    i++;
  }
  return null;
}

/** Extract simple `key = value` pairs from a properties block */
function parseProperties(block) {
  if (!block) return {};
  const result = {};
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([\w.-]+)\s*=\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/\s*#.*$/, '');
    if (!(key in result)) result[key] = val;
  }
  return result;
}

/** Extract module names from context.modules block */
function parseModules(block) {
  if (!block) return [];
  const modules = [];
  const re = /name\s*=\s*(libpipewire-module-[\w-]+)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    modules.push(m[1]);
  }
  return modules;
}

/** Count top-level entries (items) in a block by counting opening { at depth 1 */
function countObjects(block) {
  if (!block) return 0;
  let count = 0;
  let depth = 0;
  for (const ch of block) {
    if (ch === '{') { depth++; if (depth === 1) count++; }
    else if (ch === '}') depth--;
  }
  return count;
}

/** Extract path values from context.exec block */
function parseExec(block) {
  if (!block) return [];
  const paths = [];
  const re = /path\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

function row(label, html) {
  return `<div class="pwcfg-row"><span class="pwcfg-key">${esc(label)}</span><span class="pwcfg-val">${html}</span></div>`;
}

function chip(val) {
  return `<span class="pwcfg-chip">${esc(val)}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'pwcfg-doc';

  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase() || 'pipewire.conf';

  // Parse blocks
  const propsBlock = extractBlock(text, 'context\\.properties');
  const modulesBlock = extractBlock(text, 'context\\.modules');
  const objectsBlock = extractBlock(text, 'context\\.objects');
  const execBlock = extractBlock(text, 'context\\.exec');

  const props = parseProperties(propsBlock);
  const modules = parseModules(modulesBlock);
  const objectCount = countObjects(objectsBlock);
  const execs = parseExec(execBlock);

  let bodyHtml = '';

  // context.properties
  if (Object.keys(props).length > 0) {
    const propRows = [
      props['default.clock.rate'] ? row('default.clock.rate', chip(props['default.clock.rate'] + ' Hz')) : '',
      props['default.clock.allowed-rates'] ? row('default.clock.allowed-rates', `<span class="pwcfg-val">${esc(props['default.clock.allowed-rates'])}</span>`) : '',
      props['default.clock.quantum'] ? row('default.clock.quantum', chip(props['default.clock.quantum'])) : '',
      props['default.clock.min-quantum'] ? row('default.clock.min-quantum', chip(props['default.clock.min-quantum'])) : '',
      props['default.clock.max-quantum'] ? row('default.clock.max-quantum', chip(props['default.clock.max-quantum'])) : '',
      props['core.daemon'] ? row('core.daemon', chip(props['core.daemon'])) : '',
      props['core.name'] ? row('core.name', chip(props['core.name'])) : '',
      props['link.max-buffers'] ? row('link.max-buffers', chip(props['link.max-buffers'])) : '',
      props['mem.warn-mlock'] ? row('mem.warn-mlock', chip(props['mem.warn-mlock'])) : '',
      props['mem.allow-mlock'] ? row('mem.allow-mlock', chip(props['mem.allow-mlock'])) : '',
    ].filter(Boolean).join('');

    if (propRows) {
      bodyHtml += `<div class="pwcfg-sec"><h3>context.properties</h3><div class="pwcfg-card">${propRows}</div></div>`;
    }
  }

  // context.modules
  if (modules.length > 0) {
    const strip = (name) => name.replace('libpipewire-module-', '');

    const protocol = modules.filter((m) => /protocol/.test(m));
    const rt = modules.filter((m) => /\brt\b|rtkit/.test(m));
    const device = modules.filter((m) => /alsa|device/.test(m));
    const ipc = modules.filter((m) => /client|adapter|link|access|portal|metadata|profiler|spa-node|spa-device|session/.test(m) && !protocol.includes(m) && !device.includes(m));
    const other = modules.filter((m) => !protocol.includes(m) && !rt.includes(m) && !device.includes(m) && !ipc.includes(m));

    function modGroup(label, items) {
      if (!items.length) return '';
      return `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">${esc(label)}</div>
        <ul class="pwcfg-module-list">${items.map((m) => `<li>${esc(strip(m))}</li>`).join('')}</ul>
      </div>`;
    }

    bodyHtml += `<div class="pwcfg-sec"><h3>context.modules <span style="font-weight:400;text-transform:none;font-size:11px;">(${modules.length} total)</span></h3><div class="pwcfg-card">
      ${modGroup('Protocol', protocol)}
      ${modGroup('Realtime', rt)}
      ${modGroup('Device', device)}
      ${modGroup('IPC / Session', ipc)}
      ${modGroup('Other', other)}
    </div></div>`;
  }

  // context.objects
  if (objectsBlock !== null) {
    bodyHtml += `<div class="pwcfg-sec"><h3>context.objects</h3><div class="pwcfg-card">
      <div class="pwcfg-row"><span class="pwcfg-key">Objects defined</span>${chip(String(objectCount))}</div>
    </div></div>`;
  }

  // context.exec
  if (execs.length > 0) {
    bodyHtml += `<div class="pwcfg-sec"><h3>context.exec</h3><div class="pwcfg-card">
      <ul class="pwcfg-exec-list">${execs.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div></div>`;
  }

  host.innerHTML = `<style>${CSS}</style>
<div class="pwcfg-title"><span class="pwcfg-badge">PipeWire</span>PipeWire Config</div>
<div class="pwcfg-sub">${esc(filename)}</div>
${bodyHtml}`;

  return { parentNode: host };
}
