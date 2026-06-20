const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.toxini-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.toxini-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9c4191;color:#fff;vertical-align:middle;margin-right:8px;}
.toxini-chip-ver{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#f3e8ff;border:1px solid #d8b4fe;color:#7e22ce;font-family:ui-monospace,monospace;margin-left:8px;vertical-align:middle;}
.toxini-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.toxini-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.toxini-sec{margin:14px 0;}
.toxini-sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:var(--fg-2,#888);margin:0 0 8px;}
.toxini-envlist{display:flex;flex-wrap:wrap;gap:6px;}
.toxini-env-chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 11px;border-radius:12px;font-family:ui-monospace,monospace;border:1px solid;}
.toxini-env-chip.py{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
.toxini-env-chip.other{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg,#24292f);}
.toxini-table{width:100%;border-collapse:collapse;font-size:13px;}
.toxini-table th{text-align:left;font-size:11px;font-weight:600;color:var(--fg-2,#888);padding:4px 10px;border-bottom:2px solid var(--border,#e0e0e0);}
.toxini-table td{padding:5px 10px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.toxini-table td:first-child{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;white-space:nowrap;}
.toxini-table td .toxini-desc{color:var(--fg-2,#888);font-size:12px;}
.toxini-table td .toxini-deps{color:#059669;font-size:11px;}
.toxini-table td .toxini-cmd-preview{font-family:ui-monospace,monospace;font-size:11px;color:var(--fg-2,#666);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;}
.toxini-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.toxini-kv{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.toxini-kv-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.toxini-kv-val{font-family:ui-monospace,monospace;word-break:break-all;}
.toxini-markers{display:flex;flex-wrap:wrap;gap:4px;}
.toxini-marker{font-size:11px;padding:2px 8px;border-radius:8px;background:#fdf4ff;border:1px solid #e9d5ff;color:#7e22ce;font-family:ui-monospace,monospace;}
`;

function parseIni(text) {
  const secs = {};
  const secOrder = [];
  let cur = null;
  let lastKey = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const sec = trimmed.match(/^\[([^\]]+)\]/);
    if (sec) {
      cur = sec[1].trim();
      if (!secs[cur]) { secs[cur] = {}; secOrder.push(cur); }
      lastKey = null;
      continue;
    }
    if (cur) {
      const kv = trimmed.match(/^([^=:]+)[=:](.*)/);
      if (kv) {
        lastKey = kv[1].trim();
        if (secs[cur][lastKey] == null) secs[cur][lastKey] = kv[2].trim();
        else secs[cur][lastKey] += '\n' + kv[2].trim();
      } else if (lastKey && (line.match(/^\s+/) || trimmed.startsWith('\\'))) {
        // continuation line
        secs[cur][lastKey] = (secs[cur][lastKey] || '') + '\n' + trimmed;
      }
    }
  }
  return { secs, secOrder };
}

// Expand generative envlist entries like py{310,311,312} -> ['py310','py311','py312']
function expandEnv(raw) {
  const results = [];
  const entry = raw.trim();
  if (!entry) return results;
  const brace = entry.match(/^(.*?)\{([^}]+)\}(.*)$/);
  if (brace) {
    const prefix = brace[1];
    const options = brace[2].split(',').map((s) => s.trim()).filter(Boolean);
    const suffix = brace[3];
    for (const opt of options) {
      results.push(...expandEnv(prefix + opt + suffix));
    }
  } else {
    results.push(entry);
  }
  return results;
}

function parseEnvlist(raw) {
  const cleaned = raw.replace(/\\\s*\n/g, ' ').replace(/\n/g, ' ');
  const tokens = cleaned.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const expanded = [];
  for (const tok of tokens) {
    expanded.push(...expandEnv(tok));
  }
  return expanded;
}

export function render(intake) {
  const { secs, secOrder } = parseIni(intake.text || '');
  const toxSec = secs['tox'] || {};
  const envlistRaw = toxSec['envlist'] || '';
  const envlist = parseEnvlist(envlistRaw);
  const minversion = toxSec['minversion'] || '';
  const isolated = (toxSec['isolated_build'] || '').toLowerCase() === 'true';
  const skipMissing = (toxSec['skip_missing_interpreters'] || '').toLowerCase() === 'true';

  // Categorize envlist entries
  const envChipsHtml = envlist.map((e) => {
    const isPy = /^py\d/.test(e);
    return `<span class="toxini-env-chip ${isPy ? 'py' : 'other'}">${esc(e)}</span>`;
  }).join('');

  // Env table: [testenv], [testenv:*]
  const envSecs = secOrder.filter((k) => k === 'testenv' || k.startsWith('testenv:'));
  const envRowsHtml = envSecs.map((sec) => {
    const data = secs[sec] || {};
    const name = sec === 'testenv' ? 'default' : sec.replace(/^testenv:/, '');
    const desc = data['description'] || '';
    const depsRaw = data['deps'] || '';
    const deps = depsRaw.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const cmdsRaw = data['commands'] || '';
    const firstCmd = cmdsRaw.split(/\n/).map((s) => s.trim().replace(/\\$/, '')).filter(Boolean)[0] || '';
    return `<tr>
      <td>${esc(name)}</td>
      <td>${desc ? `<span class="toxini-desc">${esc(desc)}</span>` : ''}</td>
      <td>${deps.length ? `<span class="toxini-deps">${deps.length} dep${deps.length !== 1 ? 's' : ''}</span>` : ''}</td>
      <td>${firstCmd ? `<span class="toxini-cmd-preview">${esc(firstCmd)}</span>` : ''}</td>
    </tr>`;
  }).join('');

  const envTableHtml = envSecs.length ? `
<div class="toxini-sec"><h3>Environments (${envSecs.length})</h3>
<table class="toxini-table">
  <thead><tr><th>Name</th><th>Description</th><th>Deps</th><th>Command</th></tr></thead>
  <tbody>${envRowsHtml}</tbody>
</table></div>` : '';

  // [pytest] section card (if present)
  const pytestSec = secs['pytest'] || null;
  let pytestCardHtml = '';
  if (pytestSec) {
    const testpaths = (pytestSec['testpaths'] || '').split(/[\n\s,]+/).map((s) => s.trim()).filter(Boolean);
    const addopts = pytestSec['addopts'] || '';
    const markersRaw = pytestSec['markers'] || '';
    const markers = markersRaw.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const addoptsShort = addopts.replace(/\n/g, ' ').slice(0, 120) + (addopts.length > 120 ? '…' : '');
    pytestCardHtml = `
<div class="toxini-sec"><h3>[pytest] Section</h3><div class="toxini-card">
  ${testpaths.length ? `<div class="toxini-kv"><span class="toxini-kv-key">testpaths</span><span class="toxini-kv-val">${testpaths.map(esc).join(', ')}</span></div>` : ''}
  ${addopts ? `<div class="toxini-kv"><span class="toxini-kv-key">addopts</span><span class="toxini-kv-val">${esc(addoptsShort)}</span></div>` : ''}
  ${markers.length ? `<div style="margin-top:6px"><div class="toxini-kv-key" style="font-size:11px;font-family:ui-monospace,monospace;color:var(--fg-2,#888);margin-bottom:4px">markers</div><div class="toxini-markers">${markers.map((m) => `<span class="toxini-marker">${esc(m.split(':')[0])}</span>`).join('')}</div></div>` : ''}
</div></div>`;
  }

  const subParts = [];
  if (envlist.length) subParts.push(`${envlist.length} env${envlist.length !== 1 ? 's' : ''}`);
  if (isolated) subParts.push('isolated build');
  if (skipMissing) subParts.push('skip missing');
  const sub = subParts.join(' · ') || 'tox configuration';

  const host = document.createElement('div');
  host.className = 'toxini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="toxini-title">
  <span class="toxini-badge">tox</span>tox.ini${minversion ? `<span class="toxini-chip-ver">v${esc(minversion)}+</span>` : ''}
</div>
<div class="toxini-sub">${esc(sub)}</div>
${envlist.length ? `<div class="toxini-sec"><h3>Envlist</h3><div class="toxini-envlist">${envChipsHtml}</div></div>` : ''}
${envTableHtml}
${pytestCardHtml}`;
  return { parentNode: host };
}
