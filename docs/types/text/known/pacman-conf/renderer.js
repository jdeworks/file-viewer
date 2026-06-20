const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pacmancfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pacmancfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1793d1;color:#fff;vertical-align:middle;margin-right:8px;}
.pacmancfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pacmancfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pacmancfg-sec{margin:12px 0;}
.pacmancfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pacmancfg-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.pacmancfg-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.pacmancfg-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.pacmancfg-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.pacmancfg-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.pacmancfg-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.pacmancfg-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.pacmancfg-chip-candy{background:#fce4ec;border-color:#e91e63;color:#880e4f;}
.pacmancfg-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.pacmancfg-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.pacmancfg-val{font-family:ui-monospace,monospace;font-size:12px;}
.pacmancfg-repo{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin-bottom:6px;}
.pacmancfg-repo-name{font-weight:700;font-size:13px;margin-bottom:4px;}
.pacmancfg-chips{display:flex;flex-wrap:wrap;gap:3px;}
`;

/** Parse pacman.conf INI: sections + key = value pairs */
function parsePacmanConf(text) {
  const options = {};
  const repos = [];
  let currentSection = null;
  let currentRepo = null;
  // flags without values (e.g. Color, VerbosePkgLists, ILoveCandy, CheckSpace)
  const flags = new Set();

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Section header
    const secMatch = line.match(/^\[([^\]]+)\]$/);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      if (currentSection.toLowerCase() === 'options') {
        currentRepo = null;
      } else {
        currentRepo = { name: currentSection, include: null, server: null, siglevel: null, usage: null };
        repos.push(currentRepo);
      }
      continue;
    }

    // key = value
    const kvMatch = line.match(/^([\w]+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();
      if (currentSection && currentSection.toLowerCase() === 'options') {
        if (!(key in options)) options[key] = val;
      } else if (currentRepo) {
        const lk = key.toLowerCase();
        if (lk === 'include' && !currentRepo.include) currentRepo.include = val;
        else if (lk === 'server' && !currentRepo.server) currentRepo.server = val;
        else if (lk === 'siglevel' && !currentRepo.siglevel) currentRepo.siglevel = val;
        else if (lk === 'usage' && !currentRepo.usage) currentRepo.usage = val;
      }
      continue;
    }

    // Bare flags (no = sign)
    if (/^[A-Za-z]/.test(line) && currentSection && currentSection.toLowerCase() === 'options') {
      flags.add(line);
    }
  }

  return { options, repos, flags };
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="pacmancfg-chip${cls ? ' pacmancfg-chip-' + cls : ''}">${esc(val)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="pacmancfg-row"><span class="pacmancfg-key">${esc(label)}</span><span class="pacmancfg-val">${html}</span></div>`;
}

function archChip(val) {
  if (!val) return '';
  const cls = val === 'auto' ? 'blue' : val === 'x86_64' ? 'green' : val === 'aarch64' ? 'orange' : '';
  return chip(val, cls);
}

function sigLevelChip(val) {
  if (!val) return '';
  const cls = val.includes('Required') ? (val.includes('Optional') ? 'green' : 'orange') : 'gray';
  return chip(val, cls);
}

function repoNameChip(name) {
  const lname = name.toLowerCase();
  const cls = lname === 'core' || lname === 'extra' || lname === 'community' ? 'blue'
    : lname === 'multilib' ? 'purple'
    : 'green';
  return `<span class="pacmancfg-chip pacmancfg-chip-${cls}">${esc(name)}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'pacmancfg-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const { options: o, repos, flags } = parsePacmanConf(text);

  // Header
  const header = document.createElement('div');
  const repoCount = repos.length;
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="pacmancfg-badge">pacman</span>
      <span class="pacmancfg-title">pacman Config</span>
    </div>
    <p class="pacmancfg-sub">Arch Linux pacman package manager configuration${repoCount ? ' — ' + repoCount + ' repositor' + (repoCount === 1 ? 'y' : 'ies') + ' enabled' : ''}</p>
  `;
  host.appendChild(header);

  let body = '';

  // [options] card
  const holdPkgPkgs = o['HoldPkg'] ? o['HoldPkg'].split(/\s+/).filter(Boolean) : [];
  const parallelDl = o['ParallelDownloads'];
  const architecture = o['Architecture'];
  const siglevel = o['SigLevel'];
  const localFileSig = o['LocalFileSigLevel'];
  const hasColor = flags.has('Color');
  const hasCandy = flags.has('ILoveCandy');
  const hasVerbose = flags.has('VerbosePkgLists');
  const hasCheckSpace = flags.has('CheckSpace');

  const optRows = [
    holdPkgPkgs.length ? row('HoldPkg', holdPkgPkgs.map((p) => chip(p)).join('')) : '',
    architecture ? row('Architecture', archChip(architecture)) : '',
    hasColor ? row('Color', chip('enabled', 'green')) : '',
    hasCandy ? row('ILoveCandy', chip('enabled', 'candy') + ' 🍬') : '',
    hasVerbose ? row('VerbosePkgLists', chip('enabled', 'green')) : '',
    parallelDl ? row('ParallelDownloads', chip(parallelDl, 'blue')) : '',
    hasCheckSpace ? row('CheckSpace', chip('enabled', 'green')) : '',
    siglevel ? row('SigLevel', sigLevelChip(siglevel)) : '',
    localFileSig ? row('LocalFileSigLevel', sigLevelChip(localFileSig)) : '',
  ].filter(Boolean).join('');

  if (optRows) {
    body += `<div class="pacmancfg-sec"><h3>Options</h3><div class="pacmancfg-card">${optRows}</div></div>`;
  }

  // Repository sections
  if (repos.length > 0) {
    body += `<div class="pacmancfg-sec"><h3>Repositories (${repos.length})</h3>`;
    for (const repo of repos) {
      body += `<div class="pacmancfg-repo">`;
      body += `<div class="pacmancfg-repo-name">${repoNameChip(repo.name)}</div>`;
      if (repo.include) {
        body += `<div class="pacmancfg-row"><span class="pacmancfg-key">Include</span><span class="pacmancfg-val">${chip(repo.include)}</span></div>`;
      }
      if (repo.server) {
        body += `<div class="pacmancfg-row"><span class="pacmancfg-key">Server</span><span class="pacmancfg-val">${chip(repo.server)}</span></div>`;
      }
      if (repo.siglevel) {
        body += `<div class="pacmancfg-row"><span class="pacmancfg-key">SigLevel</span><span class="pacmancfg-val">${sigLevelChip(repo.siglevel)}</span></div>`;
      }
      if (repo.usage) {
        const usages = repo.usage.split(/\s+/).filter(Boolean);
        body += `<div class="pacmancfg-row"><span class="pacmancfg-key">Usage</span><span class="pacmancfg-val pacmancfg-chips">${usages.map((u) => chip(u, 'blue')).join('')}</span></div>`;
      }
      body += `</div>`;
    }
    body += `</div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
