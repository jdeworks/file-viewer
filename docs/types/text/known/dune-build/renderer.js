const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dunebuild-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dunebuild-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EC6B00;color:#fff;vertical-align:middle;margin-right:8px;}
.dunebuild-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dunebuild-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dunebuild-sec{margin:12px 0;}
.dunebuild-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dunebuild-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;font-size:13px;}
.dunebuild-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.dunebuild-kv-key{color:var(--fg-2,#888);min-width:110px;flex-shrink:0;}
.dunebuild-kv-val{font-family:ui-monospace,monospace;}
.dunebuild-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
`;

function parseDune(text) {
  const info = { lang: null, name: null, libraries: [], executables: [], packages: [] };
  // Extract lang version
  const langM = /\(lang dune\s+([\d.]+)\)/.exec(text);
  if (langM) info.lang = langM[1];
  // Extract name
  const nameM = /\(name\s+(\S+)\)/.exec(text);
  if (nameM) info.name = nameM[1];
  // Extract libraries
  const libRe = /\(library[\s\S]*?\(name\s+(\S+)\)/g;
  let m;
  while ((m = libRe.exec(text)) !== null) info.libraries.push(m[1]);
  // Extract executables
  const exeRe = /\(executable[\s\S]*?\(name\s+(\S+)\)/g;
  while ((m = exeRe.exec(text)) !== null) info.executables.push(m[1]);
  // Extract packages
  const pkgRe = /\(package[\s\S]*?\(name\s+(\S+)\)/g;
  while ((m = pkgRe.exec(text)) !== null) info.packages.push(m[1]);
  return info;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'dunebuild-doc';
  const text = intake.text || '';
  const info = parseDune(text);

  const summaryParts = [];
  if (info.libraries.length) summaryParts.push(`${info.libraries.length} librar${info.libraries.length === 1 ? 'y' : 'ies'}`);
  if (info.executables.length) summaryParts.push(`${info.executables.length} executable${info.executables.length !== 1 ? 's' : ''}`);
  if (info.packages.length) summaryParts.push(`${info.packages.length} package${info.packages.length !== 1 ? 's' : ''}`);

  const kvs = [
    ['lang dune', info.lang],
    ['name', info.name],
  ].filter(([, v]) => v);

  const detailsHtml = kvs.length ? `<div class="dunebuild-sec"><h3>Project</h3><div class="dunebuild-card">${kvs.map(([k, v]) => `<div class="dunebuild-kv"><span class="dunebuild-kv-key">${esc(k)}</span><span class="dunebuild-kv-val">${esc(v)}</span></div>`).join('')}</div></div>` : '';
  const libsHtml = info.libraries.length ? `<div class="dunebuild-sec"><h3>Libraries</h3><div class="dunebuild-card">${info.libraries.map((l) => `<span class="dunebuild-chip">${esc(l)}</span>`).join('')}</div></div>` : '';
  const exesHtml = info.executables.length ? `<div class="dunebuild-sec"><h3>Executables</h3><div class="dunebuild-card">${info.executables.map((e) => `<span class="dunebuild-chip">${esc(e)}</span>`).join('')}</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="dunebuild-title"><span class="dunebuild-badge">Dune</span>Dune Build System</div>
<div class="dunebuild-sub">${esc(summaryParts.join(' · ') || 'OCaml Dune project')}</div>
${detailsHtml}${libsHtml}${exesHtml}`;

  return { parentNode: host };
}
