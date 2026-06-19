const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tox-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-tox{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#009fe3;color:#fff;vertical-align:middle;margin-right:8px;}
.tox-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tox-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.tox-sec{margin:12px 0;}
.tox-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tox-pills{display:flex;flex-wrap:wrap;gap:6px;}
.tox-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.tox-env{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:5px 0;}
.tox-env-hd{padding:5px 10px;background:var(--bg-2,#f6f8fa);font-size:13px;font-weight:600;font-family:ui-monospace,monospace;}
.tox-cmd{font:11px/1.5 ui-monospace,monospace;padding:2px 10px;border-top:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1]; secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (secs[cur][key] == null) {
          secs[cur][key] = val;
        } else {
          secs[cur][key] += '\n' + val;
        }
      } else if (secs[cur]) {
        const lastKey = Object.keys(secs[cur]).pop();
        if (lastKey) secs[cur][lastKey] += '\n' + line;
      }
    }
  }
  return secs;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const toxSection = ini['tox'] || {};
  const envlistRaw = toxSection['envlist'] || toxSection['envlist\n'] || '';
  const envlist = envlistRaw
    .replace(/\\\n/g, '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const envSections = Object.keys(ini).filter((k) => k.startsWith('testenv'));
  const isolated = toxSection['isolated_build'] || '';

  const envHtml = envSections.slice(0, 6).map((sec) => {
    const data = ini[sec] || {};
    const cmds = (data['commands'] || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const envName = sec === 'testenv' ? '(default)' : sec.replace('testenv:', '');
    return `<div class="tox-env">
      <div class="tox-env-hd">${esc(envName)}</div>
      ${cmds.slice(0, 3).map((c) => `<div class="tox-cmd">${esc(c)}</div>`).join('')}
      ${cmds.length > 3 ? `<div class="tox-cmd">…and ${cmds.length - 3} more</div>` : ''}
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'tox-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tox-title"><span class="badge-tox">tox</span>tox.ini</div>
<div class="tox-sub">${envlist.length ? `${envlist.length} environment${envlist.length !== 1 ? 's' : ''}` : 'no envlist'}${isolated ? ' · isolated build' : ''}</div>
${envlist.length ? `<div class="tox-sec"><h3>Environments</h3><div class="tox-pills">${envlist.map((e) => `<span class="tox-pill">${esc(e)}</span>`).join('')}</div></div>` : ''}
${envHtml ? `<div class="tox-sec"><h3>Test envs</h3>${envHtml}</div>` : ''}`;
  return { parentNode: host };
}
