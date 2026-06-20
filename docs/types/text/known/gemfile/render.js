// Enhanced Gemfile view (parent pane, trusted DOM). Parses gem directives, groups, and
// platform blocks. Groups shown as individual cards. require:false gems get a chip.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rubygemsUrl = (name) => 'https://rubygems.org/gems/' + encodeURIComponent(name);

const CSS = `
.gemfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gemfile-doc .gf-head{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.gemfile-doc .gf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cc342d;color:#fff;vertical-align:middle}
.gemfile-doc .gf-title{font-size:18px;font-weight:700}
.gemfile-doc .gf-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.gemfile-doc .gf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px}
.gemfile-doc .gf-source{margin-bottom:12px;font-size:13px}
.gemfile-doc .gf-source a{color:var(--accent,#0969da);text-decoration:none}
.gemfile-doc .gf-source a:hover{text-decoration:underline}
.gemfile-doc .gf-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin-bottom:10px;overflow:hidden}
.gemfile-doc .gf-card-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#666)}
.gemfile-doc .gf-card-head .gf-platform-chip{font-size:11px;padding:1px 7px;border-radius:8px;background:#6f4e37;color:#fff;font-weight:700}
.gemfile-doc table{width:100%;border-collapse:collapse}
.gemfile-doc table tr{border-bottom:1px solid var(--border,#e8eaed)}
.gemfile-doc table tr:last-child{border-bottom:none}
.gemfile-doc table td{padding:5px 12px;vertical-align:middle;font-size:13px}
.gemfile-doc .gf-gem-name{font-family:ui-monospace,monospace;font-weight:600}
.gemfile-doc .gf-gem-name a{color:var(--accent,#0969da);text-decoration:none}
.gemfile-doc .gf-gem-name a:hover{text-decoration:underline}
.gemfile-doc .gf-gem-name .gf-ext{font-size:10px;opacity:.6;margin-left:2px}
.gemfile-doc .gf-ver{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888)}
.gemfile-doc .gf-req-false{font-size:11px;padding:1px 6px;border-radius:8px;background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);white-space:nowrap}
.gemfile-doc .gf-any{font-size:12px;color:var(--fg-2,#aaa);font-style:italic}
.gemfile-doc .gf-empty{font-size:13px;color:var(--fg-2,#888);padding:8px 12px}
`;

function parseGemfile(text) {
  const lines = text.split(/\r?\n/);
  let source = '';
  let ruby = '';
  const groupStack = [];   // [{type:'group',name:string}|{type:'platform',name:string}]
  const coreGems = [];
  const groupGems = {};    // groupKey -> [{name, version, requireFalse}]
  const platformGems = {}; // platformKey -> [{name, version, requireFalse}]

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;

    if ((m = line.match(/^source\s+['"]([^'"]+)['"]/))) { source = m[1]; continue; }
    if ((m = line.match(/^ruby\s+['"]([^'"]+)['"]/))) { ruby = m[1]; continue; }

    // group :development, :test do
    if ((m = line.match(/^group\s+(.+?)\s+do\s*$/))) {
      const names = m[1].split(',').map((g) => g.replace(/[:'"]/g, '').trim()).filter(Boolean);
      groupStack.push({ type: 'group', name: names.join(', ') });
      continue;
    }
    // platforms :jruby do
    if ((m = line.match(/^platforms?\s+(.+?)\s+do\s*$/))) {
      const names = m[1].split(',').map((g) => g.replace(/[:'"]/g, '').trim()).filter(Boolean);
      groupStack.push({ type: 'platform', name: names.join(', ') });
      continue;
    }
    if (/^end\b/.test(line)) { groupStack.pop(); continue; }

    // gem 'name', '~> 1.2', require: false
    if ((m = line.match(/^gem\s+['"]([^'"]+)['"]\s*(.*)$/))) {
      const name = m[1];
      const rest = m[2];
      const vers = [...rest.matchAll(/['"]([<>=~!\d][^'"]*)['"]/g)].map((x) => x[1]);
      const requireFalse = /require:\s*false/.test(rest);
      const entry = { name, version: vers.join(', '), requireFalse };

      const ctx = groupStack[groupStack.length - 1];
      if (!ctx) {
        coreGems.push(entry);
      } else if (ctx.type === 'group') {
        if (!groupGems[ctx.name]) groupGems[ctx.name] = [];
        groupGems[ctx.name].push(entry);
      } else {
        if (!platformGems[ctx.name]) platformGems[ctx.name] = [];
        platformGems[ctx.name].push(entry);
      }
    }
  }

  return { source, ruby, coreGems, groupGems, platformGems };
}

function gemRow(g) {
  const nameCell = `<a href="${esc(rubygemsUrl(g.name))}" target="_blank" rel="noopener noreferrer" class="gf-gem-name-link">${esc(g.name)} <span class="gf-ext">↗</span></a>`;
  const verCell = g.version
    ? `<span class="gf-ver">${esc(g.version)}</span>`
    : `<span class="gf-any">any</span>`;
  const reqCell = g.requireFalse ? `<span class="gf-req-false">require: false</span>` : '';
  return `<tr><td class="gf-gem-name">${nameCell}</td><td>${verCell}</td><td>${reqCell}</td></tr>`;
}

function gemTable(gems) {
  if (!gems.length) return `<div class="gf-empty">No gems.</div>`;
  return `<table>${gems.map(gemRow).join('')}</table>`;
}

export function render(intake) {
  const text = intake.text || '';
  const { source, ruby, coreGems, groupGems, platformGems } = parseGemfile(text);

  const totalGems = coreGems.length
    + Object.values(groupGems).reduce((s, g) => s + g.length, 0)
    + Object.values(platformGems).reduce((s, g) => s + g.length, 0);

  const chips = [
    ruby ? `<span class="gf-chip">ruby ${esc(ruby)}</span>` : '',
    `<span class="gf-chip">${totalGems} gem${totalGems !== 1 ? 's' : ''}</span>`,
  ].filter(Boolean).join(' ');

  const sourceHtml = source
    ? `<div class="gf-source"><span class="gf-chip" style="background:none;border:none;padding:0">Source:</span> <a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${esc(source.replace(/^https?:\/\//, ''))}</a></div>`
    : '';

  // Core gems card
  const coreCard = `<div class="gf-card">
<div class="gf-card-head">Core gems <span class="gf-chip" style="font-size:11px">${coreGems.length}</span></div>
${gemTable(coreGems)}
</div>`;

  // Group cards
  const groupCards = Object.entries(groupGems).map(([grpName, gems]) => `<div class="gf-card">
<div class="gf-card-head">group :${esc(grpName)} <span class="gf-chip" style="font-size:11px">${gems.length}</span></div>
${gemTable(gems)}
</div>`).join('');

  // Platform cards
  const platformCards = Object.entries(platformGems).map(([platName, gems]) => `<div class="gf-card">
<div class="gf-card-head"><span class="gf-platform-chip">${esc(platName)}</span> platform gems <span class="gf-chip" style="font-size:11px">${gems.length}</span></div>
${gemTable(gems)}
</div>`).join('');

  const host = document.createElement('div');
  host.className = 'gemfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gf-head">
  <span class="gf-badge">Gemfile</span>
  <span class="gf-title">Gemfile</span>
  ${chips}
</div>
<div class="gf-sub">${totalGems} gem${totalGems !== 1 ? 's' : ''} defined</div>
${sourceHtml}
${coreGems.length ? coreCard : ''}
${groupCards}
${platformCards}
${!totalGems ? '<div class="gf-empty">No gem declarations found.</div>' : ''}
`;
  return { parentNode: host };
}
