// Enhanced waypoint.hcl viewer — parses project, apps, build/deploy/release plugins, URL config.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.waypoint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-wp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7B42BC;color:#fff;vertical-align:middle;margin-right:8px}
.wp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.wp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.wp-sec{margin:14px 0}
.wp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.wp-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:10px}
.wp-card-title{font-size:14px;font-weight:700;margin:0 0 10px;color:var(--fg,#24292f)}
.wp-phases{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:4px}
.wp-phase{background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 10px}
.wp-phase-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;margin-bottom:4px}
.wp-phase-plugin{font-size:13px;font-family:ui-monospace,monospace;font-weight:600;color:#7B42BC}
.wp-phase-empty{font-size:12px;color:var(--fg-2,#bbb);font-style:italic}
.wp-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.wp-row:last-child{border-bottom:none}
.wp-key{color:var(--fg-2,#888);min-width:120px;flex-shrink:0;font-size:12px}
.wp-val{font-family:ui-monospace,monospace;word-break:break-all}
.wp-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:#f3e8ff;border:1px solid #c084fc;color:#6b21a8;margin:1px 3px 1px 0}
.wp-badge-on{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534}
.wp-badge-off{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
.wp-vars{margin-top:4px}
.wp-var-row{display:flex;gap:8px;font-size:12px;padding:2px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.wp-var-row:last-child{border-bottom:none}
.wp-var-name{font-family:ui-monospace,monospace;min-width:140px;font-weight:600}
.wp-var-type{color:var(--fg-2,#888);min-width:60px}
.wp-var-default{color:var(--fg-2,#666);font-family:ui-monospace,monospace}
`;

/** Strip line comments from HCL text */
function stripComments(text) {
  return text
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '');
}

/** Extract a simple string value: key = "value" */
function extractStr(text, key) {
  const m = text.match(new RegExp(key + '\\s*=\\s*"([^"]*)"'));
  return m ? m[1] : null;
}

/** Extract a boolean-ish value: key = true/false */
function extractBool(text, key) {
  const m = text.match(new RegExp(key + '\\s*=\\s*(true|false)'));
  return m ? m[1] === 'true' : null;
}

/**
 * Parse app blocks from cleaned HCL text.
 * Returns array of { name, build, deploy, release, urlManaged }
 */
function parseWaypointHcl(text) {
  const clean = stripComments(text);

  // Extract project name
  const project = extractStr(clean, 'project');

  // Extract variable blocks
  const variables = [];
  const varRe = /variable\s+"([^"]+)"\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let vm;
  while ((vm = varRe.exec(clean)) !== null) {
    const name = vm[1];
    const body = vm[2];
    const type = extractStr(body, 'type') || 'string';
    const def = extractStr(body, 'default');
    variables.push({ name, type, default: def });
  }

  // Extract app blocks (may contain nested blocks)
  const apps = [];
  const appRe = /app\s+"([^"]+)"\s*\{/g;
  let am;
  while ((am = appRe.exec(clean)) !== null) {
    const appName = am[1];
    // Find matching closing brace by counting depth
    let depth = 1;
    let i = am.index + am[0].length;
    const start = i;
    while (i < clean.length && depth > 0) {
      if (clean[i] === '{') depth++;
      else if (clean[i] === '}') depth--;
      i++;
    }
    const appBody = clean.slice(start, i - 1);

    // Extract build plugin
    const buildPlugin = extractPhasePlugin(appBody, 'build');
    // Extract deploy plugin
    const deployPlugin = extractPhasePlugin(appBody, 'deploy');
    // Extract release plugin
    const releasePlugin = extractPhasePlugin(appBody, 'release');
    // Extract url managed
    const urlBlock = extractBlock(appBody, 'url');
    const urlManaged = urlBlock != null ? extractBool(urlBlock, 'managed') : null;

    apps.push({ name: appName, build: buildPlugin, deploy: deployPlugin, release: releasePlugin, urlManaged });
  }

  return { project, apps, variables };
}

/** Extract the first `use "plugin-name"` from a phase block (build/deploy/release) */
function extractPhasePlugin(appBody, phase) {
  const phaseRe = new RegExp(phase + '\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}');
  const m = appBody.match(phaseRe);
  if (!m) return null;
  const phaseBody = m[1];
  const useM = phaseBody.match(/use\s+"([^"]+)"/);
  return useM ? useM[1] : null;
}

/** Extract first occurrence of a named block's inner text */
function extractBlock(text, blockName) {
  const re = new RegExp(blockName + '\\s*\\{([^{}]*)\\}');
  const m = text.match(re);
  return m ? m[1] : null;
}

function phaseHtml(label, plugin) {
  if (!plugin) {
    return `<div class="wp-phase"><div class="wp-phase-label">${esc(label)}</div><div class="wp-phase-empty">not set</div></div>`;
  }
  return `<div class="wp-phase"><div class="wp-phase-label">${esc(label)}</div><div class="wp-phase-plugin">${esc(plugin)}</div></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { project, apps, variables } = parseWaypointHcl(text);

  const projectHtml = project
    ? `<div class="wp-sec"><h3>Project</h3><div class="wp-card"><div class="wp-row"><span class="wp-key">name</span><span class="wp-val">${esc(project)}</span></div></div></div>`
    : '';

  const appsHtml = apps.length
    ? `<div class="wp-sec"><h3>Apps (${apps.length})</h3>${apps.map((app) => {
        const urlBadge = app.urlManaged === true
          ? `<span class="wp-badge-on">managed URL</span>`
          : app.urlManaged === false
            ? `<span class="wp-badge-off">unmanaged URL</span>`
            : '';
        return `<div class="wp-card">
          <div class="wp-card-title">${esc(app.name)} ${urlBadge}</div>
          <div class="wp-phases">
            ${phaseHtml('Build', app.build)}
            ${phaseHtml('Deploy', app.deploy)}
            ${phaseHtml('Release', app.release)}
          </div>
        </div>`;
      }).join('')}</div>`
    : '';

  const varsHtml = variables.length
    ? `<div class="wp-sec"><h3>Variables (${variables.length})</h3><div class="wp-card"><div class="wp-vars">${variables.map((v) =>
        `<div class="wp-var-row"><span class="wp-var-name">${esc(v.name)}</span><span class="wp-var-type">${esc(v.type)}</span>${v.default != null ? `<span class="wp-var-default">= ${esc(v.default)}</span>` : ''}</div>`
      ).join('')}</div></div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'waypoint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wp-title"><span class="badge-wp">HashiCorp Waypoint</span>waypoint.hcl</div>
<div class="wp-sub">Application deployment configuration${project ? ' — ' + esc(project) : ''}</div>
${projectHtml}${appsHtml}${varsHtml}`;
  return { parentNode: host };
}
