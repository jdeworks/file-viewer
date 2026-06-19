const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.htc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.htc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#009485;color:#fff;vertical-align:middle;margin-right:8px}
.htc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.htc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.htc-sec{margin:14px 0}
.htc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.htc-pills{display:flex;flex-wrap:wrap;gap:6px}
.htc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.htc-env{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:0 0 8px}
.htc-env-name{font-weight:700;font-size:13px;margin:0 0 6px;font-family:ui-monospace,monospace}
.htc-script-list{margin:0;padding:0 0 0 18px;font-size:12px;font-family:ui-monospace,monospace;color:var(--fg-2,#555)}
.htc-script-list li{margin:2px 0}
.htc-kv{font-size:12px;color:var(--fg-2,#888);margin:0 0 4px}
`;

// Extract a named block (everything between [header] and the next top-level [section])
function extractBlock(text, header) {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\[' + escaped + '\\]([\\s\\S]*?)(?=\\n\\[|$)');
  const m = re.exec(text);
  return m ? m[1] : '';
}

// Find all unique names at [prefix.NAME] or [prefix.NAME.sub] — returns top-level names only
function findSubNames(text, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\[' + escaped + '\\.([^.\\]]+)', 'g');
  const seen = new Set();
  for (const m of text.matchAll(re)) seen.add(m[1]);
  return [...seen];
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  // --- Build targets ---
  // Find [build.targets.NAME] sections
  const buildTargets = findSubNames(text, 'build.targets');

  // --- Environments ---
  const envNames = findSubNames(text, 'envs');
  // For each env, extract scripts from [envs.NAME.scripts]
  const envs = envNames.map((name) => {
    const scriptBlock = extractBlock(text, `envs.${name}.scripts`);
    const scripts = [];
    for (const line of scriptBlock.split('\n')) {
      const m = /^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=/.exec(line);
      if (m) scripts.push(m[1]);
    }
    return { name, scripts };
  });

  // --- Version source ---
  const versionBlock = extractBlock(text, 'version');
  let versionSource = '';
  const vsm = /source\s*=\s*"?([^"\n]+)"?/.exec(versionBlock);
  if (vsm) versionSource = vsm[1].trim();

  // --- Publish index ---
  const publishBlock = extractBlock(text, 'publish.index');
  let publishRepo = '';
  const prm = /repo\s*=\s*"?([^"\n]+)"?/.exec(publishBlock);
  if (prm) publishRepo = prm[1].trim();

  const targetsHtml = buildTargets.length
    ? `<div class="htc-sec"><h3>Build Targets (${buildTargets.length})</h3><div class="htc-pills">${buildTargets.map((t) => `<span class="htc-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const envsHtml = envs.length
    ? `<div class="htc-sec"><h3>Environments (${envs.length})</h3>${envs.map((e) => {
        const scriptsHtml = e.scripts.length
          ? `<ul class="htc-script-list">${e.scripts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
          : '<span style="font-size:12px;color:var(--fg-2,#888)">no scripts</span>';
        return `<div class="htc-env"><div class="htc-env-name">${esc(e.name)}</div>${scriptsHtml}</div>`;
      }).join('')}</div>`
    : '';

  const metaHtml = [
    versionSource ? `<div class="htc-kv">Version source: <strong>${esc(versionSource)}</strong></div>` : '',
    publishRepo ? `<div class="htc-kv">Publish index: <strong>${esc(publishRepo)}</strong></div>` : '',
  ].filter(Boolean).join('');

  const subParts = [
    buildTargets.length ? `${buildTargets.length} target${buildTargets.length !== 1 ? 's' : ''}` : '',
    envs.length ? `${envs.length} env${envs.length !== 1 ? 's' : ''}` : '',
    versionSource ? `version: ${versionSource}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'htc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="htc-title"><span class="htc-badge">Hatch</span>hatch.toml</div>
<div class="htc-sub">${esc(subParts.join(' · ')) || 'Hatch Python build configuration'}</div>
${metaHtml}${targetsHtml}${envsHtml}`;
  return { parentNode: host };
}
