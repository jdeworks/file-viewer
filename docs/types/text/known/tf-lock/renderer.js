const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tfl-lock-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tfl-lock{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5C4EE5;color:#fff;vertical-align:middle;margin-right:8px}
.tfl-lock-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tfl-lock-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px}
.tfl-lock-table{width:100%;border-collapse:collapse;font-size:13px}
.tfl-lock-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tfl-lock-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.tfl-lock-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tfl-lock-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.tfl-lock-badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0)}
`;

function parseLockFile(text) {
  const providers = [];
  const re = /provider\s+"([^"]+)"\s*\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const fullAddr = m[1];
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(start, i - 1);

    const versionMatch = body.match(/version\s*=\s*"([^"]*)"/);
    const constraintsMatch = body.match(/constraints\s*=\s*"([^"]*)"/);
    const hashMatches = [...body.matchAll(/"[^"]+"/g)];
    // hashes = [ "...", "..." ] — count the entries inside the hashes array
    const hashesBlockMatch = body.match(/hashes\s*=\s*\[([\s\S]*?)\]/);
    let hashCount = 0;
    if (hashesBlockMatch) {
      hashCount = (hashesBlockMatch[1].match(/"[^"]+"/g) || []).length;
    }

    // Shorten address: strip registry.terraform.io/ prefix
    const shortAddr = fullAddr.replace(/^registry\.terraform\.io\//, '');

    providers.push({
      fullAddr,
      shortAddr,
      version: versionMatch ? versionMatch[1] : '—',
      constraints: constraintsMatch ? constraintsMatch[1] : '—',
      hashCount,
    });
  }
  return providers;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const providers = parseLockFile(text);

  const rows = providers.map((p) => `<tr>
    <td><span class="tfl-lock-name">${esc(p.shortAddr)}</span></td>
    <td><span class="tfl-lock-badge">${esc(p.version)}</span></td>
    <td><span class="tfl-lock-mono">${esc(p.constraints)}</span></td>
    <td><span class="tfl-lock-mono">${p.hashCount} hash${p.hashCount !== 1 ? 'es' : ''}</span></td>
  </tr>`).join('');

  const tableHtml = providers.length
    ? `<table class="tfl-lock-table"><thead><tr><th>Provider</th><th>Version</th><th>Constraints</th><th>Hashes</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No providers found</div>';

  const host = document.createElement('div');
  host.className = 'tfl-lock-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tfl-lock-title"><span class="badge-tfl-lock">Terraform Lock</span>.terraform.lock.hcl</div>
<div class="tfl-lock-sub">${providers.length} provider${providers.length !== 1 ? 's' : ''} pinned</div>
${tableHtml}`;
  return { parentNode: host };
}
