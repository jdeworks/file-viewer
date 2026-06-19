const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sbt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-sbt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0392b;color:#fff;vertical-align:middle;margin-right:8px}
.sbt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sbt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.sbt-sec{margin:12px 0}
.sbt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.sbt-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.sbt-item{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa)}
.sbt-group{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.sbt-art{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.sbt-ver{font:12px ui-monospace,monospace;padding:1px 6px;border-radius:8px;background:#fce8e8;border:1px solid #f5b8b8;color:#9b1c1c}
.sbt-pills{display:flex;flex-wrap:wrap;gap:6px}
.sbt-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.sbt-meta{font-size:13px;color:var(--fg-2,#888);margin:4px 0}
`;

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);

  // Project name
  let projectName = null;
  const nameMatch = /name\s*:=\s*"([^"]+)"/.exec(text);
  if (nameMatch) projectName = nameMatch[1];

  // Version
  let version = null;
  const verMatch = /\bversion\s*:=\s*"([^"]+)"/.exec(text);
  if (verMatch) version = verMatch[1];

  // Scala version
  let scalaVersion = null;
  const svMatch = /scalaVersion\s*:=\s*"([^"]+)"/.exec(text);
  if (svMatch) scalaVersion = svMatch[1];

  // Organization
  let organization = null;
  const orgMatch = /organization\s*:=\s*"([^"]+)"/.exec(text);
  if (orgMatch) organization = orgMatch[1];

  // Library dependencies
  // Matches: "group" %% "artifact" % "version" or "group" % "artifact" % "version"
  const deps = [];
  const seenDeps = new Set();
  for (const m of text.matchAll(/"([^"]+)"\s*%%?\s*"([^"]+)"\s*%\s*"([^"]+)"/g)) {
    const key = `${m[1]}:${m[2]}`;
    if (!seenDeps.has(key)) {
      seenDeps.add(key);
      deps.push({ group: m[1], artifact: m[2], version: m[3] });
    }
  }
  // Also catch % Test / % Provided suffixes (already captured above through version group)

  const metaHtml = [
    scalaVersion ? `<div class="sbt-meta">Scala version: <strong>${esc(scalaVersion)}</strong></div>` : '',
    version ? `<div class="sbt-meta">Version: <strong>${esc(version)}</strong></div>` : '',
    organization ? `<div class="sbt-meta">Organization: <strong>${esc(organization)}</strong></div>` : '',
  ].join('');

  const depsHtml = deps.length
    ? `<div class="sbt-sec"><h3>Library Dependencies (${deps.length})</h3><ul class="sbt-list">${deps.map((d) => `<li class="sbt-item"><span class="sbt-group">${esc(d.group)}</span><span class="sbt-art">${esc(d.artifact)}</span><span class="sbt-ver">${esc(d.version)}</span></li>`).join('')}</ul></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'sbt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sbt-title"><span class="badge-sbt">Scala/SBT</span>${esc(projectName || 'build.sbt')}</div>
<div class="sbt-sub">SBT build definition</div>
${metaHtml}${depsHtml}`;
  return { parentNode: host };
}
