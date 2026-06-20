const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5277C3;color:#fff;vertical-align:middle;margin-right:8px;}
.nf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nf-desc{font-size:13px;color:var(--fg,#24292f);margin:0 0 4px;font-style:italic;}
.nf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nf-sec{margin:14px 0;}
.nf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.nf-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.nf-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px;}
.nf-kv-k{color:var(--fg-2,#888);min-width:140px;font-family:ui-monospace,monospace;}
.nf-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.nf-pills{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0;}
.nf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nf-pill-in{background:#e0f0ff;border-color:#90c0f8;color:#0055aa;}
.nf-pill-out{background:#f0ffe8;border-color:#a8e090;color:#226600;}
.nf-input-row{padding:5px 0;border-top:1px solid var(--border,#e0e0e0);font-size:12px;font-family:ui-monospace,monospace;}
.nf-input-row:first-child{border-top:none;}
.nf-input-name{font-weight:700;color:var(--fg,#24292f);}
.nf-input-url{color:var(--fg-2,#888);margin-left:8px;word-break:break-all;}
`;

const KNOWN_OUTPUTS = ['packages', 'devShells', 'nixosModules', 'overlays', 'apps', 'checks', 'formatter', 'templates', 'nixosConfigurations', 'homeConfigurations', 'darwinConfigurations', 'hydraJobs'];

function parseFlake(text) {
  const result = {
    description: '',
    inputs: [],
    outputTypes: [],
    systems: [],
    nixpkgsRef: '',
  };

  // description = "..."
  const descMatch = text.match(/description\s*=\s*"([^"]+)"/);
  if (descMatch) result.description = descMatch[1];

  // Parse inputs block (naive but effective for common patterns)
  const inputsBlock = text.match(/inputs\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (inputsBlock) {
    const block = inputsBlock[1];
    // Match name.url = "..." or name = { url = "..."; }
    const urlPattern = /(\w[\w-]*)\.url\s*=\s*"([^"]+)"/g;
    let m;
    while ((m = urlPattern.exec(block)) !== null) {
      result.inputs.push({ name: m[1], url: m[2], follows: '' });
    }
    // Also find follows: name.inputs.X.follows = "..."
    const followsPattern = /(\w[\w-]*)\.inputs\.\w+\.follows\s*=\s*"([^"]+)"/g;
    while ((m = followsPattern.exec(block)) !== null) {
      const existing = result.inputs.find((i) => i.name === m[1]);
      if (existing) existing.follows = m[2];
    }
    // Inline follows without url: just .follows
    const simpleFollows = /(\w[\w-]*)\.follows\s*=\s*"([^"]+)"/g;
    while ((m = simpleFollows.exec(block)) !== null) {
      if (!result.inputs.find((i) => i.name === m[1])) {
        result.inputs.push({ name: m[1], url: '', follows: m[2] });
      }
    }
  }

  // Detect nixpkgs reference
  const nixpkgsInput = result.inputs.find((i) => /nixpkgs/i.test(i.name));
  if (nixpkgsInput) {
    result.nixpkgsRef = nixpkgsInput.follows || nixpkgsInput.url || '';
    // Extract branch from github URL: github:NixOS/nixpkgs/nixos-24.05
    const branchMatch = result.nixpkgsRef.match(/nixpkgs\/([^"'\s]+)/);
    if (branchMatch) result.nixpkgsBranch = branchMatch[1];
  }

  // Detect outputs: look for known output attribute names
  for (const out of KNOWN_OUTPUTS) {
    if (new RegExp(`\\b${out}\\b`).test(text)) {
      result.outputTypes.push(out);
    }
  }

  // Detect systems: "x86_64-linux", "aarch64-darwin", etc.
  const sysPattern = /"((?:x86_64|aarch64|armv7l|i686|riscv64)-(?:linux|darwin|windows|freebsd|netbsd|openbsd))"/g;
  const sysSeen = new Set();
  let sm;
  while ((sm = sysPattern.exec(text)) !== null) {
    if (!sysSeen.has(sm[1])) { sysSeen.add(sm[1]); result.systems.push(sm[1]); }
  }
  // Also detect eachDefaultSystem / eachSystem (implies multiple systems)
  if (!result.systems.length && /eachDefaultSystem|eachSystem/.test(text)) {
    result.systems = ['(all default systems)'];
  }

  return result;
}

export function render(intake) {
  const text = intake.text || '';
  const flake = parseFlake(text);

  // Inputs section
  let inputsHtml = '';
  if (flake.inputs.length) {
    const rows = flake.inputs.map((inp) => {
      const urlPart = inp.url ? `<span class="nf-input-url">${esc(inp.url)}</span>` : '';
      const followsPart = inp.follows ? `<span class="nf-input-url">follows: ${esc(inp.follows)}</span>` : '';
      return `<div class="nf-input-row"><span class="nf-input-name">${esc(inp.name)}</span>${urlPart}${followsPart}</div>`;
    }).join('');
    inputsHtml = `<div class="nf-sec"><h3>Inputs (${flake.inputs.length})</h3><div class="nf-card">${rows}</div></div>`;
  }

  // Outputs section
  let outputsHtml = '';
  if (flake.outputTypes.length) {
    const pills = flake.outputTypes.map((o) => `<span class="nf-pill nf-pill-out">${esc(o)}</span>`).join('');
    outputsHtml = `<div class="nf-sec"><h3>Outputs</h3><div class="nf-pills">${pills}</div></div>`;
  }

  // Systems section
  let systemsHtml = '';
  if (flake.systems.length) {
    const pills = flake.systems.map((s) => `<span class="nf-pill">${esc(s)}</span>`).join('');
    systemsHtml = `<div class="nf-sec"><h3>Systems</h3><div class="nf-pills">${pills}</div></div>`;
  }

  // Nixpkgs
  let nixpkgsHtml = '';
  if (flake.nixpkgsBranch) {
    nixpkgsHtml = `<div class="nf-sec"><h3>Nixpkgs</h3><div class="nf-card"><div class="nf-kv"><span class="nf-kv-k">branch</span><span class="nf-kv-v">${esc(flake.nixpkgsBranch)}</span></div></div></div>`;
  } else if (flake.nixpkgsRef) {
    nixpkgsHtml = `<div class="nf-sec"><h3>Nixpkgs</h3><div class="nf-card"><div class="nf-kv"><span class="nf-kv-k">ref</span><span class="nf-kv-v">${esc(flake.nixpkgsRef)}</span></div></div></div>`;
  }

  const subParts = [];
  if (flake.inputs.length) subParts.push(`${flake.inputs.length} input${flake.inputs.length !== 1 ? 's' : ''}`);
  if (flake.outputTypes.length) subParts.push(`${flake.outputTypes.length} output type${flake.outputTypes.length !== 1 ? 's' : ''}`);
  if (flake.systems.length && flake.systems[0] !== '(all default systems)') subParts.push(`${flake.systems.length} system${flake.systems.length !== 1 ? 's' : ''}`);

  const host = document.createElement('div');
  host.className = 'nf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-nf">Nix Flake</span>
  <span class="nf-title">flake.nix</span>
</div>
${flake.description ? `<div class="nf-desc">${esc(flake.description)}</div>` : ''}
<div class="nf-sub">${esc(subParts.join(' · '))}</div>
${inputsHtml}${nixpkgsHtml}${outputsHtml}${systemsHtml}`;
  return { parentNode: host };
}
