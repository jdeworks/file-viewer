const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rprof-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-rprof{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#276dc2;color:#fff;vertical-align:middle;margin-right:8px}
.rprof-title{font-size:18px;font-weight:700;margin:0 0 12px}
.rprof-sec{margin:14px 0}
.rprof-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.rprof-table{width:100%;border-collapse:collapse;font-size:12px}
.rprof-table td{padding:4px 10px;border-top:1px solid var(--border,#e0e0e0);vertical-align:top}
.rprof-table td:first-child{font-family:ui-monospace,monospace;color:var(--fg-2,#888);width:40%;white-space:nowrap}
.rprof-table td:last-child{font-family:ui-monospace,monospace;word-break:break-word}
.rprof-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.rprof-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.rprof-empty{font-size:12px;color:var(--fg-2,#888);padding:4px 0}
`;

// Extract all options() calls and their key=value pairs.
function parseOptions(text) {
  const opts = {};
  // Match options(...) blocks, including multi-line
  const re = /\boptions\s*\(([\s\S]*?)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    // Match key = value pairs (value may be quoted string, number, or identifier)
    const kvRe = /(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,\n)]+)/g;
    let kv;
    while ((kv = kvRe.exec(block)) !== null) {
      const key = kv[1].trim();
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      opts[key] = val;
    }
  }
  return opts;
}

// Extract library() / require() calls.
function parseLibraries(text) {
  const libs = new Set();
  const re = /\b(?:library|require)\s*\(\s*["']?([A-Za-z][A-Za-z0-9._]*)["']?\s*(?:,|\))/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    libs.add(m[1]);
  }
  return [...libs];
}

// Extract Sys.setenv() calls.
function parseSysSetenv(text) {
  const envs = {};
  const re = /\bSys\.setenv\s*\(([\s\S]*?)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    const kvRe = /(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,\n)]+)/g;
    let kv;
    while ((kv = kvRe.exec(block)) !== null) {
      const key = kv[1].trim();
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      envs[key] = val;
    }
  }
  return envs;
}

// Extract .libPaths() calls with arguments (setting paths).
function parseLibPaths(text) {
  const paths = [];
  const re = /\.libPaths\s*\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|c\([^)]*\))\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    // Extract individual quoted paths from argument
    const pathRe = /["']([^"']+)["']/g;
    let pm;
    while ((pm = pathRe.exec(raw)) !== null) {
      paths.push(pm[1]);
    }
  }
  return paths;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  const options = parseOptions(text);
  const libraries = parseLibraries(text);
  const envVars = parseSysSetenv(text);
  const libPaths = parseLibPaths(text);

  const optEntries = Object.entries(options);
  const envEntries = Object.entries(envVars);

  const host = document.createElement('div');
  host.className = 'rprof-doc';

  let html = `<style>${CSS}</style>
<div class="rprof-title"><span class="badge-rprof">R Profile</span>.Rprofile</div>`;

  if (optEntries.length) {
    const rows = optEntries.map(([k, v]) =>
      `<tr><td>${esc(k)}</td><td>${esc(v.length > 80 ? v.slice(0, 80) + '…' : v)}</td></tr>`
    ).join('');
    html += `<div class="rprof-sec"><h3>Options (${optEntries.length})</h3>
<table class="rprof-table"><tbody>${rows}</tbody></table></div>`;
  }

  if (libraries.length) {
    const pills = libraries.map((l) => `<span class="rprof-pill">${esc(l)}</span>`).join('');
    html += `<div class="rprof-sec"><h3>Packages Loaded (${libraries.length})</h3><div class="rprof-pills">${pills}</div></div>`;
  }

  if (envEntries.length) {
    const rows = envEntries.map(([k, v]) =>
      `<tr><td>${esc(k)}</td><td>${esc(v.length > 80 ? v.slice(0, 80) + '…' : v)}</td></tr>`
    ).join('');
    html += `<div class="rprof-sec"><h3>Environment Variables (${envEntries.length})</h3>
<table class="rprof-table"><tbody>${rows}</tbody></table></div>`;
  }

  if (libPaths.length) {
    const pills = libPaths.map((p) => `<span class="rprof-pill">${esc(p)}</span>`).join('');
    html += `<div class="rprof-sec"><h3>Library Paths (${libPaths.length})</h3><div class="rprof-pills">${pills}</div></div>`;
  }

  if (!optEntries.length && !libraries.length && !envEntries.length && !libPaths.length) {
    html += `<p class="rprof-empty">No recognized R profile settings found.</p>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
