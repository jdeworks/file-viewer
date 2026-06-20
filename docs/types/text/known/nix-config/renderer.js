const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nix-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.nix-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5277c3;color:#fff;vertical-align:middle;margin-right:8px}
.nix-title{font-size:18px;font-weight:700;margin:0 0 4px}
.nix-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.nix-sec{margin:14px 0}
.nix-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.nix-pills{display:flex;flex-wrap:wrap;gap:6px}
.nix-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.nix-pill-key{font-size:12px;padding:3px 10px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-family:ui-monospace,monospace}
.nix-table{width:100%;border-collapse:collapse;font-size:13px}
.nix-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.nix-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px}
.nix-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#777)}
`;

function parseDescription(text) {
  const m = /description\s*=\s*"([^"]+)"/.exec(text);
  return m ? m[1] : null;
}

function parseFlakeInputs(text) {
  const inputs = [];
  // Match inputs.NAME.url = "..."
  const re1 = /inputs\.([\w-]+)\.url\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re1.exec(text)) !== null) {
    inputs.push({ name: m[1], url: m[2] });
  }
  // Match NAME = { url = "..." } block style
  const re2 = /([\w-]+)\s*=\s*\{[^}]*url\s*=\s*"([^"]+)"/g;
  const seen = new Set(inputs.map((i) => i.name));
  while ((m = re2.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name) && name !== 'inputs') {
      seen.add(name);
      inputs.push({ name, url: m[2] });
    }
  }
  return inputs;
}

function parseFlakeOutputKeys(text) {
  const keys = [];
  // Detect top-level output attribute sets like devShells, packages, nixosConfigurations
  const OUTPUT_KEYS = ['packages', 'devShells', 'nixosConfigurations', 'homeConfigurations', 'apps', 'overlays', 'checks', 'formatter', 'lib'];
  for (const key of OUTPUT_KEYS) {
    const re = new RegExp(`\\b${key}\\s*[.={]`);
    if (re.test(text)) keys.push(key);
  }
  return keys;
}

function parseBuildInputs(text) {
  const items = [];
  // Match: buildInputs = [ ... ] or nativeBuildInputs = [ ... ] or with pkgs; [ ... ]
  const re = /(?:buildInputs|nativeBuildInputs)\s*=\s*(?:with\s+\w+;\s*)?\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    const names = block.split(/[\s\n]+/).map((s) => s.trim()).filter((s) => s && !/^#/.test(s));
    items.push(...names);
  }
  // Also match standalone: with pkgs; [ ... ]
  const re2 = /with\s+pkgs;\s*\[([^\]]+)\]/g;
  while ((m = re2.exec(text)) !== null) {
    const block = m[1];
    const names = block.split(/[\s\n]+/).map((s) => s.trim()).filter((s) => s && !/^#/.test(s));
    items.push(...names);
  }
  return [...new Set(items)];
}

function parsePackageName(text) {
  const m = /(?:pname|name)\s*=\s*"([^"]+)"/.exec(text);
  return m ? m[1] : null;
}

function parseServiceEnables(text) {
  const services = [];
  const re = /services\.([\w.-]+)\.enable\s*=\s*true/g;
  let m;
  while ((m = re.exec(text)) !== null) services.push(m[1]);
  return [...new Set(services)];
}

function parseProgramEnables(text) {
  const programs = [];
  const re = /programs\.([\w.-]+)\.enable\s*=\s*true/g;
  let m;
  while ((m = re.exec(text)) !== null) programs.push(m[1]);
  return [...new Set(programs)];
}

function parseInstalledPackages(text) {
  const pkgs = [];
  // environment.systemPackages = with pkgs; [ ... ]
  const re = /(?:systemPackages|packages\.home|home\.packages)\s*=\s*(?:with\s+pkgs;\s*)?\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    const names = block.split(/[\s\n]+/).map((s) => s.trim()).filter((s) => s && !/^#/.test(s));
    pkgs.push(...names);
  }
  return [...new Set(pkgs)];
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();

  let summaryParts = [];
  let sectionsHtml = '';

  const description = parseDescription(text);

  if (filename === 'flake.nix') {
    const inputs = parseFlakeInputs(text);
    const outputKeys = parseFlakeOutputKeys(text);

    if (description) summaryParts.push(`"${description}"`);
    if (inputs.length) summaryParts.push(`${inputs.length} input${inputs.length !== 1 ? 's' : ''}`);
    if (outputKeys.length) summaryParts.push(`outputs: ${outputKeys.join(', ')}`);

    if (description) {
      sectionsHtml += `<div class="nix-sec"><h3>Description</h3><div class="nix-mono">${esc(description)}</div></div>`;
    }

    if (inputs.length) {
      const rows = inputs.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.url)}</td></tr>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Inputs (${inputs.length})</h3><table class="nix-table"><thead><tr><th>Name</th><th>URL</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    if (outputKeys.length) {
      const pills = outputKeys.map((k) => `<span class="nix-pill">${esc(k)}</span>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Outputs</h3><div class="nix-pills">${pills}</div></div>`;
    }
  } else if (filename === 'shell.nix' || filename === 'default.nix') {
    const pkgName = parsePackageName(text);
    const buildInputs = parseBuildInputs(text);

    if (pkgName) summaryParts.push(`package: ${pkgName}`);
    if (description) summaryParts.push(`"${description}"`);
    if (buildInputs.length) summaryParts.push(`${buildInputs.length} build input${buildInputs.length !== 1 ? 's' : ''}`);

    if (pkgName || description) {
      sectionsHtml += `<div class="nix-sec"><h3>Package Info</h3><div class="nix-pills">`;
      if (pkgName) sectionsHtml += `<span class="nix-pill-key">${esc(pkgName)}</span>`;
      if (description) sectionsHtml += `<span class="nix-mono" style="padding:3px 8px">${esc(description)}</span>`;
      sectionsHtml += `</div></div>`;
    }

    if (buildInputs.length) {
      const pills = buildInputs.map((p) => `<span class="nix-pill">${esc(p)}</span>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Build Inputs (${buildInputs.length})</h3><div class="nix-pills">${pills}</div></div>`;
    }
  } else if (filename === 'configuration.nix' || filename === 'home.nix') {
    const services = parseServiceEnables(text);
    const programs = parseProgramEnables(text);
    const packages = parseInstalledPackages(text);

    if (services.length) summaryParts.push(`${services.length} service${services.length !== 1 ? 's' : ''}`);
    if (programs.length) summaryParts.push(`${programs.length} program${programs.length !== 1 ? 's' : ''}`);
    if (packages.length) summaryParts.push(`${packages.length} package${packages.length !== 1 ? 's' : ''}`);

    if (services.length) {
      const pills = services.map((s) => `<span class="nix-pill">${esc(s)}</span>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Enabled Services (${services.length})</h3><div class="nix-pills">${pills}</div></div>`;
    }
    if (programs.length) {
      const pills = programs.map((p) => `<span class="nix-pill">${esc(p)}</span>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Enabled Programs (${programs.length})</h3><div class="nix-pills">${pills}</div></div>`;
    }
    if (packages.length) {
      const pills = packages.map((p) => `<span class="nix-pill">${esc(p)}</span>`).join('');
      sectionsHtml += `<div class="nix-sec"><h3>Installed Packages (${packages.length})</h3><div class="nix-pills">${pills}</div></div>`;
    }
  }

  const subLine = summaryParts.length ? summaryParts.join(' · ') : 'Nix expression file';

  const host = document.createElement('div');
  host.className = 'nix-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nix-title"><span class="nix-badge">Nix</span>${esc(filename)}</div>
<div class="nix-sub">${esc(subLine)}</div>
${sectionsHtml}`;
  return { parentNode: host };
}
