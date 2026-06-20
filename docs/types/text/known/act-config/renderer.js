// Enhanced .actrc viewer — parses act local GitHub Actions runner config flags.
// Sections: platform mappings (-P), env vars (--env), secrets (--secret),
// workflows path (--workflows), and other flags.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);

  const platforms = [];  // { runner, image }
  const envVars = [];    // { key, value }
  const secrets = [];    // { name }
  let workflowsPath = null;
  const otherFlags = []; // raw flag strings

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Platform mapping: -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-latest
    const platformMatch = line.match(/^-P\s+(.+)=(.+)$/);
    if (platformMatch) {
      platforms.push({ runner: platformMatch[1].trim(), image: platformMatch[2].trim() });
      continue;
    }

    // Env var: --env KEY=VALUE or --env KEY
    const envMatch = line.match(/^--env(?:=|\s+)(\S+)$/);
    if (envMatch) {
      const eq = envMatch[1].indexOf('=');
      if (eq !== -1) {
        envVars.push({ key: envMatch[1].slice(0, eq), value: envMatch[1].slice(eq + 1) });
      } else {
        envVars.push({ key: envMatch[1], value: '' });
      }
      continue;
    }

    // Secret: --secret NAME or --secret NAME=VALUE (show name only, not value)
    const secretMatch = line.match(/^--secret(?:=|\s+)(\S+)$/);
    if (secretMatch) {
      const eq = secretMatch[1].indexOf('=');
      const name = eq !== -1 ? secretMatch[1].slice(0, eq) : secretMatch[1];
      secrets.push({ name });
      continue;
    }

    // Workflows path: --workflows .github/workflows
    const workflowsMatch = line.match(/^--workflows(?:=|\s+)(\S+)$/);
    if (workflowsMatch) {
      workflowsPath = workflowsMatch[1].trim();
      continue;
    }

    // Everything else
    otherFlags.push(line);
  }

  const el = document.createElement('div');
  el.className = 'act-doc';

  let html = '<header class="pj-head">'
    + '<div class="pj-title"><span class="badge-act">act</span> act config (.actrc)</div>'
    + '<div class="pj-meta">';

  const counts = [];
  if (platforms.length) counts.push('<span class="pj-tag">' + platforms.length + ' platform' + (platforms.length === 1 ? '' : 's') + '</span>');
  if (envVars.length) counts.push('<span class="pj-tag">' + envVars.length + ' env var' + (envVars.length === 1 ? '' : 's') + '</span>');
  if (secrets.length) counts.push('<span class="pj-tag">' + secrets.length + ' secret' + (secrets.length === 1 ? '' : 's') + '</span>');
  html += counts.join('') + '</div></header>';

  // Platform mappings table
  if (platforms.length) {
    html += '<section class="pj-sec"><h3>Platform Mappings <span class="pj-count">' + platforms.length + '</span></h3>'
      + '<table class="act-table"><thead><tr><th>Runner</th><th>Docker Image</th></tr></thead><tbody>';
    for (const p of platforms) {
      html += '<tr><td><code class="act-runner">' + esc(p.runner) + '</code></td><td><code class="act-image">' + esc(p.image) + '</code></td></tr>';
    }
    html += '</tbody></table></section>';
  }

  // Env vars table
  if (envVars.length) {
    html += '<section class="pj-sec"><h3>Environment Variables <span class="pj-count">' + envVars.length + '</span></h3>'
      + '<table class="act-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
    for (const e of envVars) {
      html += '<tr><td><code class="ts-key">' + esc(e.key) + '</code></td><td>'
        + (e.value ? '<code>' + esc(e.value) + '</code>' : '<span class="kf-note">(from environment)</span>')
        + '</td></tr>';
    }
    html += '</tbody></table></section>';
  }

  // Secrets section (names only)
  if (secrets.length) {
    html += '<section class="pj-sec"><h3>Secrets <span class="pj-count">' + secrets.length + '</span></h3>'
      + '<ul class="kf-list">';
    for (const s of secrets) {
      html += '<li class="kf-pat"><code class="ts-key">' + esc(s.name) + '</code>'
        + '<span class="act-secret-note">value hidden</span></li>';
    }
    html += '</ul></section>';
  }

  // Workflows path
  if (workflowsPath) {
    html += '<section class="pj-sec"><h3>Workflows Path</h3>'
      + '<p class="act-workflows-path"><code>' + esc(workflowsPath) + '</code></p></section>';
  }

  // Other flags
  if (otherFlags.length) {
    html += '<section class="pj-sec"><h3>Other Flags <span class="pj-count">' + otherFlags.length + '</span></h3>'
      + '<ul class="kf-list">';
    for (const f of otherFlags) {
      html += '<li class="kf-pat"><code>' + esc(f) + '</code></li>';
    }
    html += '</ul></section>';
  }

  if (!platforms.length && !envVars.length && !secrets.length && !workflowsPath && !otherFlags.length) {
    html += '<p class="kf-note">Empty config file.</p>';
  }

  // Inline styles for act-specific elements
  html += '<style>'
    + '.act-doc .act-table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }'
    + '.act-doc .act-table th, .act-doc .act-table td { text-align: left; padding: 0.3em 0.75em; border-bottom: 1px solid var(--border, #e0e0e0); }'
    + '.act-doc .act-table th { font-size: 0.8em; text-transform: uppercase; opacity: 0.6; font-weight: 600; }'
    + '.act-doc .act-runner { color: var(--accent, #0969da); }'
    + '.act-doc .act-image { font-size: 0.85em; word-break: break-all; }'
    + '.act-doc .act-secret-note { margin-left: 0.75em; font-size: 0.8em; opacity: 0.5; font-style: italic; }'
    + '.act-doc .act-workflows-path { margin: 0.25em 0; }'
    + '.badge-act { display: inline-block; background: #666; color: #fff; font-size: 0.7em; font-weight: 700; padding: 0.15em 0.45em; border-radius: 3px; vertical-align: middle; margin-right: 0.4em; letter-spacing: 0.02em; text-transform: uppercase; }'
    + '</style>';

  el.innerHTML = html;
  return { parentNode: el };
}
