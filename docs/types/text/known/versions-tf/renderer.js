const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vtf-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vtf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5C4EE5;color:#fff;vertical-align:middle;margin-right:8px}
.vtf-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vtf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px}
.vtf-section{margin:0 0 20px}
.vtf-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px}
.vtf-version-req{font:14px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 12px;display:inline-block}
.vtf-table{width:100%;border-collapse:collapse;font-size:13px}
.vtf-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.vtf-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.vtf-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.vtf-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.vtf-constraint{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px}
`;

function extractBlock(text, keyword) {
  const results = [];
  const re = new RegExp(`(?:^|\\n)\\s*${keyword}\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    results.push(text.slice(start, i - 1));
  }
  return results;
}

function parseVersionsTf(text) {
  // required_version
  let requiredVersion = null;
  const rvMatch = text.match(/required_version\s*=\s*"([^"]*)"/);
  if (rvMatch) requiredVersion = rvMatch[1];

  // required_providers block
  const providers = [];
  const rpBlocks = extractBlock(text, 'required_providers');
  if (rpBlocks.length > 0) {
    const body = rpBlocks[0];
    // Each provider: name = { source = "..." version = "..." }
    const re = /(\w[\w-]*)\s*=\s*\{([^}]*)\}/gs;
    let m;
    while ((m = re.exec(body)) !== null) {
      const name = m[1];
      const attrs = m[2];
      const sourceM = attrs.match(/source\s*=\s*"([^"]*)"/);
      const versionM = attrs.match(/version\s*=\s*"([^"]*)"/);
      providers.push({
        name,
        source: sourceM ? sourceM[1] : '—',
        version: versionM ? versionM[1] : '—',
      });
    }
  }

  return { requiredVersion, providers };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const { requiredVersion, providers } = parseVersionsTf(text);

  const sections = [];

  // Required version
  sections.push(`<div class="vtf-section">
  <div class="vtf-section-title">Required Terraform Version</div>
  ${requiredVersion
    ? `<div class="vtf-version-req">${esc(requiredVersion)}</div>`
    : '<div style="color:var(--fg-2,#888);font-size:13px">No version constraint specified</div>'}
</div>`);

  // Providers
  if (providers.length > 0) {
    const rows = providers.map((p) => `<tr>
      <td><span class="vtf-name">${esc(p.name)}</span></td>
      <td><span class="vtf-mono">${esc(p.source)}</span></td>
      <td><span class="vtf-constraint">${esc(p.version)}</span></td>
    </tr>`).join('');
    sections.push(`<div class="vtf-section">
  <div class="vtf-section-title">Required Providers (${providers.length})</div>
  <table class="vtf-table"><thead><tr><th>Provider</th><th>Source</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  const host = document.createElement('div');
  host.className = 'vtf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vtf-title"><span class="badge-vtf">Terraform</span>${esc(filename)}</div>
<div class="vtf-sub">${requiredVersion ? `v${esc(requiredVersion)}` : 'no version constraint'} · ${providers.length} provider${providers.length !== 1 ? 's' : ''}</div>
${sections.join('\n')}`;
  return { parentNode: host };
}
