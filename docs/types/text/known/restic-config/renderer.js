const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = new Set([
  'password', 'aws-secret-access-key', 'aws-access-key-id',
  'azure-account-key', 'google-credentials-file',
  'b2-account-key', 'b2-account-id',
]);

const CSS = `
.resticcfg-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.resticcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#008080;color:#fff;vertical-align:middle;margin-right:8px;}
.resticcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.resticcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.resticcfg-global{margin:0 0 14px;padding:10px 14px;border:1px solid var(--border,#e0e0e0);border-radius:8px;background:var(--bg-2,#f6f8fa);}
.resticcfg-global-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;}
.resticcfg-profile{margin:10px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.resticcfg-profile-hd{padding:8px 14px;background:var(--bg-2,#f6f8fa);display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;}
.resticcfg-profile-hd:hover{background:var(--bg-3,#eaeef2);}
.resticcfg-profile-name{font-size:13px;font-weight:600;font-family:ui-monospace,monospace;flex:1;}
.resticcfg-arrow{font-size:10px;color:var(--fg-2,#888);transition:transform .15s;}
.resticcfg-arrow.open{transform:rotate(90deg);}
.resticcfg-chip{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:500;background:var(--bg-3,#eaeef2);color:var(--fg,#24292f);margin:1px 2px;}
.resticcfg-chip.green{background:#e6f4ea;color:#137333;}
.resticcfg-body{padding:10px 14px;}
.resticcfg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;padding:3px 0;font-size:12px;}
.resticcfg-key{font-family:ui-monospace,monospace;color:var(--fg-2,#888);min-width:160px;}
.resticcfg-val{font-family:ui-monospace,monospace;word-break:break-all;}
.resticcfg-redacted{color:var(--fg-2,#888);font-style:italic;}
.resticcfg-section{margin:6px 0 2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);}
.resticcfg-divider{border:none;border-top:1px solid var(--border,#e0e0e0);margin:6px 0;}
.resticcfg-sources{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0;}
.resticcfg-source{font-family:ui-monospace,monospace;font-size:11px;padding:1px 6px;background:var(--bg-3,#eaeef2);border-radius:4px;}
`;

// Simple TOML parser for the subset used by resticprofile
// Returns flat structure: { sectionPath: { key: value } }
function parseTomlSections(text) {
  const sections = {};
  let current = '';
  sections[''] = {};

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Section header like [foo] or [foo.bar]
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      current = secMatch[1].trim();
      if (!sections[current]) sections[current] = {};
      continue;
    }

    // Key = value
    const kv = line.match(/^([\w-]+)\s*=\s*(.*)/);
    if (kv) {
      const key = kv[1];
      let val = kv[2].trim();
      // Strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      sections[current][key] = val;
    }
  }
  return sections;
}

function parseSourceArray(text, sectionName) {
  // Extract array value for "source" from raw text within a section context
  const lines = text.split('\n');
  let inSection = false;
  let collecting = false;
  let bracketDepth = 0;
  const sources = [];

  for (const raw of lines) {
    const line = raw.trim();
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      if (collecting) break;
      inSection = secMatch[1].trim() === sectionName;
      continue;
    }
    if (!inSection) continue;

    if (!collecting) {
      const srcMatch = line.match(/^source\s*=\s*(.*)/);
      if (srcMatch) {
        const rest = srcMatch[1].trim();
        if (rest.startsWith('[')) {
          collecting = true;
          bracketDepth = 0;
          const content = rest;
          // Extract strings from this line
          const strs = content.match(/"([^"]+)"/g) || [];
          sources.push(...strs.map((s) => s.slice(1, -1)));
          if (content.includes(']')) collecting = false;
        }
      }
    } else {
      const strs = line.match(/"([^"]+)"/g) || [];
      sources.push(...strs.map((s) => s.slice(1, -1)));
      if (line.includes(']')) { collecting = false; }
    }
  }
  return sources;
}

function chip(label, cls = '') {
  return `<span class="resticcfg-chip${cls ? ' ' + cls : ''}">${esc(label)}</span>`;
}

function renderRow(key, valHtml) {
  return `<div class="resticcfg-row"><span class="resticcfg-key">${esc(key)}</span><span class="resticcfg-val">${valHtml}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const sections = parseTomlSections(text);

  // Identify profile names: top-level sections that are not 'global' and don't contain a dot
  const globalSec = sections['global'] || {};
  const profileNames = Object.keys(sections).filter(
    (k) => k && k !== 'global' && !k.includes('.')
  );

  // Global section HTML
  let globalHtml = '';
  const globalPairs = [];
  if (globalSec['priority']) globalPairs.push(['priority', chip(globalSec['priority'])]);
  if (globalSec['ionice']) globalPairs.push(['ionice', chip(globalSec['ionice'])]);
  if (globalSec['ionice-class']) globalPairs.push(['ionice-class', chip(globalSec['ionice-class'])]);
  if (globalSec['ionice-level']) globalPairs.push(['ionice-level', chip(globalSec['ionice-level'])]);
  if (globalSec['scheduler']) globalPairs.push(['scheduler', chip(globalSec['scheduler'])]);

  if (globalPairs.length) {
    globalHtml = `<div class="resticcfg-global">
  <div class="resticcfg-global-title">Global</div>
  ${globalPairs.map(([k, v]) => renderRow(k, v)).join('')}
</div>`;
  }

  // Profile cards
  const profilesHtml = profileNames.map((name, idx) => {
    const prof = sections[name] || {};
    const backupSec = sections[`${name}.backup`] || {};
    const retentionSec = sections[`${name}.retention`] || {};
    const checkSec = sections[`${name}.check`] || {};

    const rows = [];

    // Repository (redact embedded credentials in URL)
    if (prof['repository']) {
      let repo = prof['repository'];
      // Redact credentials in URLs like s3://key:SECRET@host
      repo = repo.replace(/(:\w+:)[^@]+(@)/, '$1[configured]$2');
      rows.push(renderRow('repository', `<span>${esc(repo)}</span>`));
    }

    if (prof['password-file']) rows.push(renderRow('password-file', esc(prof['password-file'])));
    if (prof['password-command']) rows.push(renderRow('password-command', esc(prof['password-command'])));
    if (prof['initialize']) rows.push(renderRow('initialize', chip(prof['initialize'], prof['initialize'] === 'true' ? 'green' : '')));

    // Redacted keys
    const redactedInProf = Object.keys(prof).filter((k) => REDACT_KEYS.has(k));
    if (redactedInProf.length) {
      rows.push(`<hr class="resticcfg-divider">${renderRow(redactedInProf.join(', '), '<span class="resticcfg-redacted">[configured]</span>')}`);
    }

    // Backup sub-section
    const backupRows = [];
    const sources = parseSourceArray(text, `${name}.backup`);
    if (sources.length) {
      backupRows.push(`<div class="resticcfg-row"><span class="resticcfg-key">source</span><span class="resticcfg-val"><div class="resticcfg-sources">${sources.map((s) => `<span class="resticcfg-source">${esc(s)}</span>`).join('')}</div></span></div>`);
    }
    if (backupSec['schedule']) backupRows.push(renderRow('schedule', chip(backupSec['schedule'])));
    if (backupSec['schedule-permission']) backupRows.push(renderRow('schedule-permission', chip(backupSec['schedule-permission'])));
    const excludeKeys = Object.keys(backupSec).filter((k) => k.startsWith('exclude'));
    if (excludeKeys.length) backupRows.push(renderRow('exclude patterns', chip(excludeKeys.length + ' exclude rule(s)')));

    // Retention sub-section
    const retRows = [];
    const retKeys = ['keep-daily', 'keep-weekly', 'keep-monthly', 'keep-yearly'];
    const retChips = retKeys.filter((k) => retentionSec[k]).map((k) => chip(`${k}: ${retentionSec[k]}`));
    if (retChips.length) {
      retRows.push(`<div class="resticcfg-row"><span class="resticcfg-key">retention</span><span class="resticcfg-val">${retChips.join('')}</span></div>`);
    }
    if (retentionSec['prune']) retRows.push(renderRow('prune', chip(retentionSec['prune'], retentionSec['prune'] === 'true' ? 'green' : '')));

    // Check sub-section
    const checkRows = [];
    if (checkSec['schedule']) checkRows.push(renderRow('check schedule', chip(checkSec['schedule'])));

    const subSections = [
      backupRows.length ? `<div class="resticcfg-section">Backup</div>${backupRows.join('')}` : '',
      retRows.length ? `<div class="resticcfg-section">Retention</div>${retRows.join('')}` : '',
      checkRows.length ? `<div class="resticcfg-section">Check</div>${checkRows.join('')}` : '',
    ].filter(Boolean).join('<hr class="resticcfg-divider">');

    const openClass = idx === 0 ? ' open' : '';
    const bodyStyle = idx === 0 ? '' : ' style="display:none"';

    return `<div class="resticcfg-profile">
  <div class="resticcfg-profile-hd" onclick="(function(el){var b=el.nextElementSibling;var a=el.querySelector('.resticcfg-arrow');var o=b.style.display==='none';b.style.display=o?'':'none';a.classList.toggle('open',o);})(this)">
    <span class="resticcfg-profile-name">[${esc(name)}]</span>
    <span class="resticcfg-arrow${openClass}">▶</span>
  </div>
  <div class="resticcfg-body"${bodyStyle}>
    ${rows.join('') || '<span style="color:var(--fg-2,#888);font-size:12px;">No settings.</span>'}
    ${subSections ? `<hr class="resticcfg-divider">${subSections}` : ''}
  </div>
</div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'resticcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="resticcfg-title"><span class="resticcfg-badge">restic</span>resticprofile Config</div>
<div class="resticcfg-sub">${profileNames.length} profile${profileNames.length !== 1 ? 's' : ''}${globalPairs.length ? ' · global settings' : ''}</div>
${globalHtml}
${profilesHtml || '<p style="color:var(--fg-2,#888);font-size:13px;">No profiles found.</p>'}`;
  return { parentNode: host };
}
