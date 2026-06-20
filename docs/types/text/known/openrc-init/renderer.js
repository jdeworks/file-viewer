const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.orc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-orc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#54487A;color:#fff;vertical-align:middle;margin-right:8px;}
.orc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.orc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.orc-sec{margin:14px 0;}
.orc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.orc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.orc-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.orc-kv-k{color:var(--fg-2,#888);min-width:140px;font-family:ui-monospace,monospace;}
.orc-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.orc-pills{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0;}
.orc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.orc-pill.dep{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.orc-pill.fn{background:#f0f9ff;border-color:#bae6fd;color:#0369a1;}
.orc-fn-block{margin:4px 0;padding:6px 10px;background:var(--bg-2,#f6f8fa);border-radius:6px;font-family:ui-monospace,monospace;font-size:12px;}
.orc-fn-name{font-weight:700;color:var(--fg,#24292f);}
.orc-fn-body{color:var(--fg-2,#888);white-space:pre-wrap;margin-top:2px;font-size:11px;}
`;

function extractFunctionBody(text, fnName) {
  // Find function body: fnName() { ... }
  const startRe = new RegExp(`${fnName}\\s*\\(\\s*\\)\\s*\\{`, 'm');
  const m = startRe.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  let i = start;
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  return text.slice(start, i - 1).trim();
}

function parseDependLine(line) {
  // e.g. "need net" or "use logger" or "after firewall"
  const parts = line.trim().split(/\s+/);
  return parts.filter(Boolean);
}

function parseOpenRC(text) {
  const result = {
    name: '',
    description: '',
    supervisor: false,
    command: '',
    commandArgs: '',
    pidfile: '',
    user: '',
    group: '',
    functions: [],
    deps: { need: [], use: [], after: [], before: [], provide: [] },
    confVars: [],
    shebang: '',
  };

  const lines = text.split('\n');

  // Shebang
  if (lines[0] && lines[0].startsWith('#!')) result.shebang = lines[0].slice(2).trim();

  // description=
  const descMatch = text.match(/^(?:description|DESC)\s*=\s*["']?([^"'\n]+?)["']?\s*$/m);
  if (descMatch) result.description = descMatch[1].trim();

  // supervisor / command / pidfile / user / group
  const cmdMatch = text.match(/^command\s*=\s*["']?(.+?)["']?\s*$/m);
  if (cmdMatch) result.command = cmdMatch[1].trim();
  const cmdArgsMatch = text.match(/^command_args\s*=\s*["']?(.+?)["']?\s*$/m);
  if (cmdArgsMatch) result.commandArgs = cmdArgsMatch[1].trim();
  const pidMatch = text.match(/^pidfile\s*=\s*["']?(.+?)["']?\s*$/m);
  if (pidMatch) result.pidfile = pidMatch[1].trim();
  const userMatch = text.match(/^command_user\s*=\s*["']?([^"'\n]+)["']?\s*$/m);
  if (userMatch) result.user = userMatch[1].trim();
  const groupMatch = text.match(/^(?:group|command_group)\s*=\s*["']?([^"'\n]+)["']?\s*$/m);
  if (groupMatch) result.group = groupMatch[1].trim();

  // confvars (optional config variables)
  const confMatch = text.match(/^extra_commands\s*=\s*["']?([^"'\n]+)["']?\s*$/m);
  if (confMatch) result.confVars = confMatch[1].trim().split(/\s+/);

  // Functions: depend, start, stop, start_pre, start_post, stop_pre, stop_post
  const FNS = ['depend', 'start', 'stop', 'start_pre', 'start_post', 'stop_pre', 'stop_post', 'status'];
  for (const fn of FNS) {
    const body = extractFunctionBody(text, fn);
    if (body !== null) {
      result.functions.push(fn);
      // Parse depend() body for need/use/after/before/provide
      if (fn === 'depend') {
        for (const dline of body.split('\n')) {
          const t = dline.trim();
          const needM = t.match(/^need\s+(.+)/);
          if (needM) result.deps.need.push(...parseDependLine(needM[1]));
          const useM = t.match(/^use\s+(.+)/);
          if (useM) result.deps.use.push(...parseDependLine(useM[1]));
          const afterM = t.match(/^after\s+(.+)/);
          if (afterM) result.deps.after.push(...parseDependLine(afterM[1]));
          const beforeM = t.match(/^before\s+(.+)/);
          if (beforeM) result.deps.before.push(...parseDependLine(beforeM[1]));
          const provM = t.match(/^provide\s+(.+)/);
          if (provM) result.deps.provide.push(...parseDependLine(provM[1]));
        }
      }
    }
  }

  return result;
}

export function render(intake) {
  const name = (intake.name || intake.filename || '').split('/').pop();
  const text = intake.text || '';
  const rc = parseOpenRC(text);

  // Overview card
  const overviewLines = [];
  if (rc.description) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">description</span><span class="orc-kv-v">${esc(rc.description)}</span></div>`);
  if (rc.shebang) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">interpreter</span><span class="orc-kv-v">${esc(rc.shebang)}</span></div>`);
  if (rc.command) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">command</span><span class="orc-kv-v">${esc(rc.command)}</span></div>`);
  if (rc.commandArgs) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">command_args</span><span class="orc-kv-v">${esc(rc.commandArgs)}</span></div>`);
  if (rc.user) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">user</span><span class="orc-kv-v">${esc(rc.user)}</span></div>`);
  if (rc.group) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">group</span><span class="orc-kv-v">${esc(rc.group)}</span></div>`);
  if (rc.pidfile) overviewLines.push(`<div class="orc-kv"><span class="orc-kv-k">pidfile</span><span class="orc-kv-v">${esc(rc.pidfile)}</span></div>`);

  const overviewHtml = overviewLines.length ? `<div class="orc-sec"><h3>Overview</h3><div class="orc-card">${overviewLines.join('')}</div></div>` : '';

  // Functions
  let fnHtml = '';
  if (rc.functions.length) {
    const pills = rc.functions.map((fn) => `<span class="orc-pill fn">${esc(fn)}()</span>`).join('');
    fnHtml = `<div class="orc-sec"><h3>Functions</h3><div class="orc-pills">${pills}</div></div>`;
  }

  // Dependencies
  let depsHtml = '';
  const depParts = [];
  if (rc.deps.need.length) depParts.push(`<div class="orc-kv"><span class="orc-kv-k">need</span><span class="orc-pills">${rc.deps.need.map((d) => `<span class="orc-pill dep">${esc(d)}</span>`).join('')}</span></div>`);
  if (rc.deps.use.length) depParts.push(`<div class="orc-kv"><span class="orc-kv-k">use</span><span class="orc-pills">${rc.deps.use.map((d) => `<span class="orc-pill">${esc(d)}</span>`).join('')}</span></div>`);
  if (rc.deps.after.length) depParts.push(`<div class="orc-kv"><span class="orc-kv-k">after</span><span class="orc-pills">${rc.deps.after.map((d) => `<span class="orc-pill">${esc(d)}</span>`).join('')}</span></div>`);
  if (rc.deps.before.length) depParts.push(`<div class="orc-kv"><span class="orc-kv-k">before</span><span class="orc-pills">${rc.deps.before.map((d) => `<span class="orc-pill">${esc(d)}</span>`).join('')}</span></div>`);
  if (rc.deps.provide.length) depParts.push(`<div class="orc-kv"><span class="orc-kv-k">provide</span><span class="orc-pills">${rc.deps.provide.map((d) => `<span class="orc-pill">${esc(d)}</span>`).join('')}</span></div>`);
  if (depParts.length) depsHtml = `<div class="orc-sec"><h3>Dependencies</h3><div class="orc-card">${depParts.join('')}</div></div>`;

  const subParts = [];
  if (rc.functions.length) subParts.push(`${rc.functions.length} function${rc.functions.length !== 1 ? 's' : ''}`);
  const totalDeps = rc.deps.need.length + rc.deps.use.length + rc.deps.after.length + rc.deps.before.length;
  if (totalDeps) subParts.push(`${totalDeps} dep${totalDeps !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'orc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-orc">OpenRC</span>
  <span class="orc-title">${esc(name)}</span>
</div>
<div class="orc-sub">${esc(subParts.join(' · ') || 'OpenRC init script')}</div>
${overviewHtml}${fnHtml}${depsHtml}`;
  return { parentNode: host };
}
