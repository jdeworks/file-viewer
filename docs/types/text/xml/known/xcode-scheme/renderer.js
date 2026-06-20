const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.xs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-xs{display:inline-block;background:#1574F5;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.xs-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xs-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.xs-sec{margin:12px 0;}
.xs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.xs-list{list-style:none;margin:0;padding:0;}
.xs-list li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.xs-name{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.xs-tag{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
.xs-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0 12px;}
.xs-k{font-size:12px;color:var(--fg-2,#888);}
.xs-v{font:12px ui-monospace,monospace;}
.xs-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin-right:4px;}
`;

function attrOf(el, attr) {
  return el ? (el.getAttribute(attr) || '') : '';
}

export function render(intake) {
  const filename = (intake.filename || '').split('/').pop();
  const schemeName = filename.replace(/\.xcscheme$/, '');

  let doc;
  try {
    doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('parse error');
  } catch {
    const errEl = document.createElement('div');
    errEl.className = 'xs-doc';
    errEl.innerHTML = `<style>${CSS}</style><span class="badge-xs">Xcode Scheme</span><p style="color:var(--fg-2)">Could not parse .xcscheme as XML.</p>`;
    return { parentNode: errEl };
  }

  // Build targets
  const buildAction = doc.getElementsByTagName('BuildAction')[0];
  const buildEntries = buildAction ? [...buildAction.getElementsByTagName('BuildActionEntry')] : [];
  const buildTargets = buildEntries.map((entry) => {
    const ref = entry.getElementsByTagName('BuildableReference')[0];
    return ref ? {
      name: attrOf(ref, 'BlueprintName') || attrOf(ref, 'BuildableName'),
      config: attrOf(ref, 'BuildableName'),
    } : null;
  }).filter(Boolean);

  // Test targets
  const testAction = doc.getElementsByTagName('TestAction')[0];
  const testConfig = testAction ? attrOf(testAction, 'buildConfiguration') : '';
  const testEntries = testAction ? [...testAction.getElementsByTagName('TestableReference')] : [];
  const testTargets = testEntries.map((entry) => {
    const ref = entry.getElementsByTagName('BuildableReference')[0];
    return ref ? attrOf(ref, 'BlueprintName') || attrOf(ref, 'BuildableName') : null;
  }).filter(Boolean);

  // Run (launch) action
  const runAction = doc.getElementsByTagName('LaunchAction')[0];
  const runConfig = runAction ? attrOf(runAction, 'buildConfiguration') : '';
  const runRef = runAction ? runAction.getElementsByTagName('BuildableReference')[0] : null;
  const runExecutable = runRef ? (attrOf(runRef, 'BlueprintName') || attrOf(runRef, 'BuildableName')) : '';

  // Archive action
  const archiveAction = doc.getElementsByTagName('ArchiveAction')[0];
  const archiveConfig = archiveAction ? attrOf(archiveAction, 'buildConfiguration') : '';

  const host = document.createElement('div');
  host.className = 'xs-doc';

  let html = `<style>${CSS}</style>
<span class="badge-xs">Xcode Scheme</span>
<div class="xs-title">${esc(schemeName || filename)}</div>`;

  if (runConfig || archiveConfig || testConfig) {
    html += `<div class="xs-kv">`;
    if (runConfig) html += `<span class="xs-k">Run config</span><span class="xs-v">${esc(runConfig)}</span>`;
    if (testConfig) html += `<span class="xs-k">Test config</span><span class="xs-v">${esc(testConfig)}</span>`;
    if (archiveConfig) html += `<span class="xs-k">Archive config</span><span class="xs-v">${esc(archiveConfig)}</span>`;
    html += `</div>`;
  }

  if (buildTargets.length) {
    html += `<div class="xs-sec"><h3>Build targets (${buildTargets.length})</h3><ul class="xs-list">`;
    html += buildTargets.map((t) => `<li><span class="xs-name">${esc(t.name)}</span><span class="xs-tag">${esc(t.config)}</span></li>`).join('');
    html += '</ul></div>';
  }

  if (testTargets.length) {
    html += `<div class="xs-sec"><h3>Test targets (${testTargets.length})</h3><ul class="xs-list">`;
    html += testTargets.map((t) => `<li><span class="xs-name">${esc(t)}</span></li>`).join('');
    html += '</ul></div>';
  }

  if (runExecutable) {
    html += `<div class="xs-sec"><h3>Run executable</h3><span class="xs-pill">${esc(runExecutable)}</span></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
