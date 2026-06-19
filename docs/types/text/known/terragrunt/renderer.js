const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tgr-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-tgr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5C4EE5;color:#fff;vertical-align:middle;margin-right:8px}
.tgr-title{font-size:18px;font-weight:700;margin:0 0 4px}
.tgr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px}
.tgr-section{margin:0 0 20px}
.tgr-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-2,#888);margin:0 0 8px}
.tgr-source{font:13px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;word-break:break-all;color:var(--fg,#24292f)}
.tgr-table{width:100%;border-collapse:collapse;font-size:13px}
.tgr-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.tgr-table td{padding:6px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.tgr-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888)}
.tgr-name{font:13px/1.4 ui-monospace,monospace;font-weight:600}
.tgr-empty{color:var(--fg-2,#888);font-size:13px;font-style:italic}
`;

function extractBlock(text, keyword) {
  // Find keyword { ... } blocks (handles nested braces)
  const results = [];
  const re = new RegExp(`${keyword}\\s*(?:"([^"]*)"\\s*)?\\{`, 'g');
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
  const m = body.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`) );
  if (m) return m[1];
  const m2 = body.match(new RegExp(`${attr}\\s*=\\s*([^\\s\\n]+)`));
  return m2 ? m2[1] : null;
}

function parseTerragrunt(text) {
  // Module source
  let source = null;
  const tfBlock = extractBlock(text, 'terraform');
  if (tfBlock.length > 0) {
    source = extractAttr(tfBlock[0].body, 'source');
  }

  // includes
  const includeBlocks = extractBlock(text, 'include');
  const includes = includeBlocks.map((b) => {
    const path = extractAttr(b.body, 'path');
    return { name: b.name || '(unnamed)', path };
  });

  // dependencies
  const depBlocks = extractBlock(text, 'dependency');
  const dependencies = depBlocks.map((b) => {
    const configPath = extractAttr(b.body, 'config_path');
    return { name: b.name || '(unnamed)', configPath };
  });

  // remote_state
  let remoteBackend = null;
  const rsBlocks = extractBlock(text, 'remote_state');
  if (rsBlocks.length > 0) {
    remoteBackend = extractAttr(rsBlocks[0].body, 'backend');
  }

  // inputs block
  const inputsMatch = text.match(/^inputs\s*=\s*\{/m);
  let inputs = [];
  if (inputsMatch) {
    const start = inputsMatch.index + inputsMatch[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const body = text.slice(start, i - 1);
    // Parse top-level key = value pairs (skip nested blocks)
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (/^\w/.test(key)) {
        let val = trimmed.slice(eqIdx + 1).trim();
        if (/^".*"$/.test(val)) val = val.slice(1, -1);
        else if (val.startsWith('{') || val.startsWith('[')) val = '(complex)';
        inputs.push({ key, val });
      }
    }
  }

  return { source, includes, dependencies, remoteBackend, inputs };
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop();
  const { source, includes, dependencies, remoteBackend, inputs } = parseTerragrunt(text);

  const sections = [];

  // Source
  sections.push(`<div class="tgr-section">
  <div class="tgr-section-title">Module Source</div>
  ${source ? `<div class="tgr-source">${esc(source)}</div>` : '<div class="tgr-empty">No source defined</div>'}
</div>`);

  // Includes
  if (includes.length > 0) {
    const rows = includes.map((inc) => `<tr>
      <td><span class="tgr-name">${esc(inc.name)}</span></td>
      <td><span class="tgr-mono">${esc(inc.path || '')}</span></td>
    </tr>`).join('');
    sections.push(`<div class="tgr-section">
  <div class="tgr-section-title">Includes (${includes.length})</div>
  <table class="tgr-table"><thead><tr><th>Name</th><th>Path</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  // Dependencies
  if (dependencies.length > 0) {
    const rows = dependencies.map((dep) => `<tr>
      <td><span class="tgr-name">${esc(dep.name)}</span></td>
      <td><span class="tgr-mono">${esc(dep.configPath || '')}</span></td>
    </tr>`).join('');
    sections.push(`<div class="tgr-section">
  <div class="tgr-section-title">Dependencies (${dependencies.length})</div>
  <table class="tgr-table"><thead><tr><th>Name</th><th>Config Path</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  // Remote state
  if (remoteBackend) {
    sections.push(`<div class="tgr-section">
  <div class="tgr-section-title">Remote State</div>
  <div>Backend: <span class="tgr-name">${esc(remoteBackend)}</span></div>
</div>`);
  }

  // Inputs
  if (inputs.length > 0) {
    const rows = inputs.map((inp) => `<tr>
      <td><span class="tgr-name">${esc(inp.key)}</span></td>
      <td><span class="tgr-mono">${esc(inp.val)}</span></td>
    </tr>`).join('');
    sections.push(`<div class="tgr-section">
  <div class="tgr-section-title">Inputs (${inputs.length})</div>
  <table class="tgr-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  const host = document.createElement('div');
  host.className = 'tgr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="tgr-title"><span class="badge-tgr">Terragrunt</span>${esc(filename)}</div>
<div class="tgr-sub">${includes.length} include${includes.length !== 1 ? 's' : ''} · ${dependencies.length} dependenc${dependencies.length !== 1 ? 'ies' : 'y'} · ${inputs.length} input${inputs.length !== 1 ? 's' : ''}</div>
${sections.join('\n')}`;
  return { parentNode: host };
}
