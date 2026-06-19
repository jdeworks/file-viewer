// Enhanced Git config view: parse INI-style [section] blocks and surface key settings.
// Highlights [user], [remote], [branch], [core], [alias] and other common sections.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECTION_NOTES = {
  user: 'Author identity for commits',
  core: 'Core repository settings',
  remote: 'Remote repository URLs and fetch refs',
  branch: 'Branch tracking configuration',
  alias: 'Git command shortcuts',
  pull: 'Pull behavior (rebase vs merge)',
  push: 'Push defaults and settings',
  merge: 'Merge strategy settings',
  diff: 'Diff tool configuration',
  color: 'Color output settings',
  credential: 'Credential helper settings',
  init: 'Repository initialization defaults',
  fetch: 'Fetch behavior settings',
  rebase: 'Rebase settings',
  submodule: 'Submodule configuration',
  filter: 'Object filter (e.g., LFS)',
  http: 'HTTP transport settings',
  url: 'URL rewriting rules',
  gpg: 'GPG signing settings',
  commit: 'Commit behavior settings',
  log: 'Log output settings',
  tag: 'Tag settings',
};

const IMPORTANT_SECTIONS = new Set(['user', 'remote', 'branch', 'core', 'alias']);

function parseGitConfig(text) {
  const lines = (text || '').split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    // Section header: [section] or [section "subsection"]
    const sectionMatch = line.match(/^\[([^\s\]"]+)(?:\s+"([^"]*)")?\]$/);
    if (sectionMatch) {
      current = {
        name: sectionMatch[1].toLowerCase(),
        subsection: sectionMatch[2] || null,
        props: [],
      };
      sections.push(current);
      continue;
    }

    // Key = value
    const kvMatch = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (kvMatch && current) {
      current.props.push({ key: kvMatch[1].trim(), val: kvMatch[2].trim() });
    }
  }
  return sections;
}

function redact(key, val) {
  // Redact sensitive values (tokens, passwords in URLs)
  if (/password|token|secret/i.test(key)) return '••••••••';
  // Redact credentials embedded in URLs
  if (/url/i.test(key) && /:[^@]+@/.test(val)) {
    return val.replace(/:[^@]+@/, ':••••••••@');
  }
  return val;
}

function sectionTitle(sec) {
  return sec.subsection
    ? `<span class="gcf-sname">${esc(sec.name)}</span> <span class="gcf-sub">"${esc(sec.subsection)}"</span>`
    : `<span class="gcf-sname">${esc(sec.name)}</span>`;
}

const CSS = `
.gcf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gcf-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.gcf-title{font-size:18px;font-weight:700;margin:0;}
.gcf-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F05133;color:#fff;vertical-align:middle;}
.gcf-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.gcf-tag{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#666);}
.gcf-sec{margin:12px 0;background:var(--bg-2,#f9fafb);border:1px solid var(--border,#e8eaed);border-radius:8px;overflow:hidden;}
.gcf-sec-head{padding:8px 14px;background:var(--bg-3,#f1f3f5);border-bottom:1px solid var(--border,#e8eaed);font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;}
.gcf-sname{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.gcf-sub{font-family:ui-monospace,monospace;color:var(--accent,#0969da);font-weight:400;}
.gcf-note{font-size:11px;color:var(--fg-2,#888);font-weight:400;font-family:system-ui,sans-serif;}
.kf-list{list-style:none;margin:0;padding:0;}
.kf-item{display:flex;align-items:baseline;gap:8px;padding:5px 14px;border-bottom:1px solid var(--border,#f0f0f0);font-size:13px;}
.kf-item:last-child{border-bottom:none;}
.gcf-key{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#666);min-width:140px;flex-shrink:0;}
.gcf-val{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.gcf-valnote{font-size:11px;color:var(--fg-2,#888);flex:1;}
.gcf-empty{color:var(--fg-2,#888);font-size:13px;padding:16px;text-align:center;}
.gcf-important{border-left:3px solid #F05133;}
`;

export async function render(intake, _ctx) {
  const sections = parseGitConfig(intake.text);

  if (!sections.length) {
    const el = document.createElement('div');
    el.className = 'gcf-doc';
    el.innerHTML = `<style>${CSS}</style><div class="gcf-head"><h1 class="gcf-title"><span class="gcf-badge">Git</span> Git config</h1></div><p class="gcf-empty">No configuration sections found.</p>`;
    return { parentNode: el };
  }

  // Count stats
  const remotes = sections.filter((s) => s.name === 'remote');
  const branches = sections.filter((s) => s.name === 'branch');
  const hasUser = sections.some((s) => s.name === 'user');
  const aliasSection = sections.find((s) => s.name === 'alias');
  const aliasCount = aliasSection ? aliasSection.props.length : 0;

  const tags = [
    hasUser ? '<span class="gcf-tag">user identity</span>' : '',
    remotes.length ? `<span class="gcf-tag">${remotes.length} remote${remotes.length !== 1 ? 's' : ''}</span>` : '',
    branches.length ? `<span class="gcf-tag">${branches.length} branch${branches.length !== 1 ? 'es' : ''}</span>` : '',
    aliasCount ? `<span class="gcf-tag">${aliasCount} alias${aliasCount !== 1 ? 'es' : ''}</span>` : '',
    `<span class="gcf-tag">${sections.length} section${sections.length !== 1 ? 's' : ''}</span>`,
  ].filter(Boolean).join('');

  const sectionsHtml = sections.map((sec) => {
    const isImportant = IMPORTANT_SECTIONS.has(sec.name);
    const note = SECTION_NOTES[sec.name];
    const rows = sec.props.map((p) => {
      const displayVal = redact(p.key, p.val);
      return `<li class="kf-item"><span class="gcf-key">${esc(p.key)}</span><span class="gcf-val">${esc(displayVal)}</span></li>`;
    }).join('');
    return `<div class="gcf-sec${isImportant ? ' gcf-important' : ''}">
      <div class="gcf-sec-head">${sectionTitle(sec)}${note ? `<span class="gcf-note"> — ${esc(note)}</span>` : ''}</div>
      ${rows ? `<ul class="kf-list">${rows}</ul>` : '<p style="padding:6px 14px;font-size:12px;color:var(--fg-2,#888);margin:0">No properties</p>'}
    </div>`;
  }).join('');

  const el = document.createElement('div');
  el.className = 'gcf-doc';
  el.innerHTML = `<style>${CSS}</style>
<div class="gcf-head">
  <h1 class="gcf-title"><span class="gcf-badge">Git</span> Git config</h1>
  <div class="gcf-meta">${tags}</div>
</div>
${sectionsHtml}`;
  return { parentNode: el };
}
