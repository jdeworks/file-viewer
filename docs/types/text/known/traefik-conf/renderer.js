const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.trkcfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.trkcfg-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#24a1c1;color:#fff;vertical-align:middle;margin-right:8px;}
.trkcfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.trkcfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.trkcfg-sec{margin:14px 0;}
.trkcfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.trkcfg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.trkcfg-card-name{font:600 13px/1.4 ui-monospace,monospace;margin-bottom:4px;}
.trkcfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.trkcfg-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.trkcfg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.trkcfg-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.trkcfg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.trkcfg-pill.off{background:#f3f4f6;border-color:#d1d5db;color:#6b7280;}
.trkcfg-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.trkcfg-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="trkcfg-kv"><span class="trkcfg-kv-k">${esc(label)}</span><span class="trkcfg-kv-v">${esc(value)}</span></div>`;
}

/**
 * Lightweight regex-based parser for Traefik static config (YAML or TOML).
 * Extracts entryPoints, providers, cert resolvers, log level, and dashboard state.
 */
function parseTraefik(text) {
  const lines = text.split('\n');
  const filename = '';
  const isTOML = /\[entryPoints\]/i.test(text) || /^\s*\[/.test(text);

  // Detect format
  const isYAML = !isTOML;

  // --- EntryPoints ---
  const entryPoints = [];
  if (isYAML) {
    // YAML: entryPoints:\n  <name>:\n    address: ":80"
    let inEntryPoints = false;
    let indent = 0;
    let currentEp = null;
    for (const line of lines) {
      const trimmed = line.trimStart();
      const lineIndent = line.length - trimmed.length;

      if (/^entrypoints?\s*:/i.test(trimmed)) {
        inEntryPoints = true;
        indent = lineIndent;
        continue;
      }
      if (inEntryPoints) {
        if (lineIndent <= indent && trimmed && !trimmed.startsWith('#')) {
          // Left the entryPoints block
          inEntryPoints = false;
          currentEp = null;
          continue;
        }
        // Detect a named entry point (2 more spaces than entryPoints key)
        const nameMatch = /^(\w[\w-]*)\s*:/.exec(trimmed);
        if (nameMatch && lineIndent === indent + 2) {
          if (currentEp) entryPoints.push(currentEp);
          currentEp = { name: nameMatch[1], address: '' };
          continue;
        }
        const addrMatch = /^address\s*:\s*["']?([^"'\s#]+)["']?/.exec(trimmed);
        if (addrMatch && currentEp) {
          currentEp.address = addrMatch[1];
        }
      }
    }
    if (currentEp) entryPoints.push(currentEp);
  } else {
    // TOML: [entryPoints.<name>]\n  address = ":80"
    let currentEp = null;
    for (const line of lines) {
      const trimmed = line.trim();
      const epHeader = /^\[entryPoints\.([^\]]+)\]/.exec(trimmed);
      if (epHeader) {
        if (currentEp) entryPoints.push(currentEp);
        currentEp = { name: epHeader[1], address: '' };
        continue;
      }
      if (currentEp) {
        const addrMatch = /^address\s*=\s*["']([^"']+)["']/.exec(trimmed);
        if (addrMatch) currentEp.address = addrMatch[1];
        if (trimmed.startsWith('[') && !trimmed.startsWith('[entryPoints.')) {
          entryPoints.push(currentEp);
          currentEp = null;
        }
      }
    }
    if (currentEp) entryPoints.push(currentEp);
  }

  // --- Providers ---
  const providerKeywords = ['docker', 'kubernetes', 'kubernetesCRD', 'kubernetesIngress', 'file', 'marathon', 'rancher', 'consulCatalog', 'nomad', 'ecs'];
  const providers = [];
  if (isYAML) {
    let inProviders = false;
    let providersIndent = 0;
    for (const line of lines) {
      const trimmed = line.trimStart();
      const lineIndent = line.length - trimmed.length;
      if (/^providers\s*:/i.test(trimmed)) {
        inProviders = true;
        providersIndent = lineIndent;
        continue;
      }
      if (inProviders) {
        if (lineIndent <= providersIndent && trimmed && !trimmed.startsWith('#')) {
          inProviders = false;
          continue;
        }
        if (lineIndent === providersIndent + 2) {
          const pMatch = /^(\w[\w]*)\s*:/.exec(trimmed);
          if (pMatch && providerKeywords.some((k) => k.toLowerCase() === pMatch[1].toLowerCase())) {
            if (!providers.includes(pMatch[1])) providers.push(pMatch[1]);
          }
        }
      }
    }
  } else {
    for (const kw of providerKeywords) {
      if (new RegExp(`\\[providers\\.${kw}`, 'i').test(text)) {
        providers.push(kw);
      }
    }
  }

  // --- Cert resolvers ---
  const certResolvers = [];
  if (isYAML) {
    const m = text.match(/^certificatesResolvers?\s*:\s*$/im);
    if (m) {
      // Extract resolver names from lines after certificatesResolvers:
      const idx = lines.findIndex((l) => /^certificatesResolvers?\s*:/i.test(l.trim()));
      if (idx >= 0) {
        const baseIndent = lines[idx].length - lines[idx].trimStart().length;
        for (let i = idx + 1; i < lines.length; i++) {
          const l = lines[i];
          const tr = l.trimStart();
          const li = l.length - tr.length;
          if (li <= baseIndent && tr && !tr.startsWith('#')) break;
          if (li === baseIndent + 2) {
            const nm = /^(\w[\w-]*)\s*:/.exec(tr);
            if (nm) certResolvers.push(nm[1]);
          }
        }
      }
    }
  } else {
    const re = /\[certificatesResolvers\.([^\]]+)\]/gi;
    let rm;
    while ((rm = re.exec(text)) !== null) {
      const name = rm[1].split('.')[0];
      if (!certResolvers.includes(name)) certResolvers.push(name);
    }
  }

  // --- Log level ---
  let logLevel = '';
  const logLevelMatch = /level\s*[=:]\s*["']?(\w+)["']?/.exec(text);
  if (logLevelMatch) logLevel = logLevelMatch[1];

  // --- Dashboard ---
  let dashboard = null;
  const dashMatch = /dashboard\s*[=:]\s*(true|false)/i.exec(text);
  if (dashMatch) dashboard = dashMatch[1].toLowerCase() === 'true';

  // --- API insecure ---
  let apiInsecure = false;
  const insecureMatch = /insecure\s*[=:]\s*(true)/i.exec(text);
  if (insecureMatch) apiInsecure = true;

  return { entryPoints, providers, certResolvers, logLevel, dashboard, apiInsecure };
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'traefik.yml';
  const { entryPoints, providers, certResolvers, logLevel, dashboard, apiInsecure } = parseTraefik(text);

  // EntryPoints section
  const epHtml = entryPoints.length ? `<div class="trkcfg-sec">
  <h3>EntryPoints (${entryPoints.length})</h3>
  ${entryPoints.map((ep) => `<div class="trkcfg-card">
    <div class="trkcfg-card-name">${esc(ep.name)}</div>
    ${kv('address', ep.address)}
  </div>`).join('')}
</div>` : '';

  // Providers section
  const providersHtml = providers.length ? `<div class="trkcfg-sec">
  <h3>Providers (${providers.length})</h3>
  <div class="trkcfg-card">
    ${providers.map((p) => `<div class="trkcfg-kv"><span class="trkcfg-kv-k">${esc(p)}</span><span class="trkcfg-pill on">enabled</span></div>`).join('')}
  </div>
</div>` : '';

  // Cert resolvers section
  const certHtml = certResolvers.length ? `<div class="trkcfg-sec">
  <h3>Certificate Resolvers (${certResolvers.length})</h3>
  <div class="trkcfg-card">
    ${certResolvers.map((r) => `<div class="trkcfg-kv"><span class="trkcfg-kv-k">${esc(r)}</span><span class="trkcfg-pill on">ACME</span></div>`).join('')}
  </div>
</div>` : '';

  // Misc section
  const miscItems = [];
  if (logLevel) miscItems.push(kv('log level', logLevel));
  if (dashboard != null) miscItems.push(`<div class="trkcfg-kv"><span class="trkcfg-kv-k">dashboard</span><span class="trkcfg-pill ${dashboard ? 'on' : 'off'}">${dashboard ? 'enabled' : 'disabled'}</span></div>`);
  if (apiInsecure) miscItems.push('<div class="trkcfg-kv"><span class="trkcfg-kv-k">api.insecure</span><span class="trkcfg-pill warn">true — dashboard exposed!</span></div>');
  const miscHtml = miscItems.length ? `<div class="trkcfg-sec"><h3>Logging &amp; API</h3><div class="trkcfg-card">${miscItems.join('')}</div></div>` : '';

  // Summary
  const subParts = [];
  if (entryPoints.length) subParts.push(`${entryPoints.length} entrypoint${entryPoints.length !== 1 ? 's' : ''}`);
  if (providers.length) subParts.push(`providers: ${providers.join(', ')}`);
  if (certResolvers.length) subParts.push(`${certResolvers.length} cert resolver${certResolvers.length !== 1 ? 's' : ''}`);
  const sub = subParts.join(' · ') || 'Traefik static configuration';

  const host = document.createElement('div');
  host.className = 'trkcfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="trkcfg-badge">Traefik</span>
  <span class="trkcfg-title">${esc(filename)}</span>
  ${providers.map((p) => `<span class="trkcfg-tag">${esc(p)}</span>`).join('')}
</div>
<div class="trkcfg-sub">${esc(sub)}</div>
${epHtml}${providersHtml}${certHtml}${miscHtml}`;

  return { parentNode: host };
}
