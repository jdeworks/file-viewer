const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#39457e;color:#fff;vertical-align:middle;margin-right:8px;}
.pm-pkg{font-family:ui-monospace,monospace;font-size:13px;color:#39457e;font-weight:700;}
.pm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:96px;}
.pm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pm-list{margin:0;padding:0;list-style:none;}
.pm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.pm-list li:last-child{border-bottom:none;}
.pm-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.pm-tag-pkg{background:#e8eaf6;color:#39457e;}
.pm-tag-use{background:#dcfce7;color:#166534;}
.pm-tag-no{background:#fee2e2;color:#991b1b;}
.pm-tag-req{background:#dbeafe;color:#1d4ed8;}
.pm-tag-sub{background:#ede9fe;color:#7c3aed;}
.pm-tag-var{background:#fef9c3;color:#854d0e;}
.pm-name{font-weight:600;}
.pm-param{color:#005cc5;}
.pm-rest{color:var(--fg-2,#666);}
.pm-scope{color:var(--fg-2,#888);font-size:10px;}
.pm-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;max-height:360px;}
`;

// Pull variable names (sigil + identifier) out of a fragment like "$a, $b = 5" or "($x, @rest)".
function sigilVars(frag) {
  const out = [];
  const re = /[$@%][\w:]+/g;
  let m;
  while ((m = re.exec(frag)) !== null) out.push(m[0]);
  return out;
}

// Recover parameter names for a sub whose declaration has no signature: scan the body for the
// idiomatic `my ($a, $b) = @_;` (preferred) or a run of `my $x = shift;` lines.
function recoverParams(lines, start) {
  const shifts = [];
  for (let j = start; j < lines.length && j < start + 12; j++) {
    const t = lines[j].trim();
    if (t.startsWith('#')) continue;
    const listM = t.match(/\bmy\s*\(([^)]*)\)\s*=\s*@_/);
    if (listM) return sigilVars(listM[1]);
    const shiftM = t.match(/\bmy\s+([$@%][\w:]+)\s*=\s*shift\b/);
    if (shiftM) { shifts.push(shiftM[1]); continue; }
    // stop once we leave the sub or hit a nested sub
    if (j > start && /^sub\b/.test(t)) break;
    if (j > start && t === '}') break;
  }
  return shifts;
}

// Parse a signature paren group `($a, $b = 5, @rest)` into bare variable names.
function parseSignature(sig) {
  const inner = sig.replace(/^\(/, '').replace(/\)$/, '');
  return inner.split(',').map((tok) => {
    const v = tok.trim().match(/[$@%][\w:]+/);
    return v ? v[0] : null;
  }).filter(Boolean);
}

// Parse Perl source into structured facts. Exported (pure, DOM-free) for unit testing.
export function analyzePerl(text) {
  const lines = String(text || '').split(/\r?\n/);
  const packages = [];
  const uses = [];
  const subs = [];
  const variables = [];
  let hasPod = false;
  let inPod = false;
  let currentPkg = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // POD blocks: a line starting with =word begins POD; =cut ends it.
    if (!inPod && /^=[a-zA-Z]\w*/.test(trimmed)) {
      hasPod = true;
      inPod = trimmed !== '=cut';
      continue;
    }
    if (inPod) { if (trimmed === '=cut') inPod = false; continue; }

    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // package Foo::Bar;  (or block form: package Foo { ... })
    let m = trimmed.match(/^package\s+([\w:]+)/);
    if (m) { currentPkg = m[1]; if (!packages.includes(m[1])) packages.push(m[1]); continue; }

    // use / no / require imports
    m = trimmed.match(/^(use|no|require)\s+([\w:.]+)\b(.*)$/);
    if (m) {
      const rest = m[3].replace(/;\s*$/, '').trim();
      uses.push({ kind: m[1], name: m[2], rest });
      continue;
    }

    // sub name ($a, $b) { ... }  — optional signature/prototype, optional brace
    m = trimmed.match(/^sub\s+([\w:]+)\s*(\([^)]*\))?/);
    if (m) {
      let params = m[2] ? parseSignature(m[2]) : [];
      if (params.length === 0) params = recoverParams(lines, i);
      subs.push({ name: m[1], params, package: currentPkg });
      continue;
    }

    // my / our / local variable declarations
    m = trimmed.match(/^(my|our|local|state)\s+(.+)$/);
    if (m) {
      const decl = m[2].split('=')[0];
      for (const v of sigilVars(decl)) variables.push({ name: v, kind: m[1] });
      continue;
    }
  }

  return { packages, uses, subs, variables, hasPod };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'pm-section';
  const hd = document.createElement('div');
  hd.className = 'pm-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}
function makeList(sec) { const ul = document.createElement('ul'); ul.className = 'pm-list'; sec.appendChild(ul); return ul; }
function tag(cls, t) { return `<span class="pm-tag ${cls}">${esc(t)}</span>`; }
function row(ul, html) { const li = document.createElement('li'); li.innerHTML = html; ul.appendChild(li); }

const USE_TAG = { use: 'pm-tag-use', no: 'pm-tag-no', require: 'pm-tag-req' };

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const ext = filename.split('.').pop();

  let badgeLabel = 'Perl Script';
  if (ext === 'pm') badgeLabel = 'Perl Module';
  else if (ext === 'pod') badgeLabel = 'Perl POD';

  const { packages, uses, subs, variables, hasPod } = analyzePerl(text);
  const multiPkg = packages.length > 1;

  const host = document.createElement('div');
  host.className = 'pm-doc';
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'pm-title';
  const badge = document.createElement('span');
  badge.className = 'pm-badge';
  badge.textContent = badgeLabel;
  title.appendChild(badge);
  if (packages.length) {
    const n = document.createElement('span');
    n.className = 'pm-pkg';
    n.textContent = packages[0];
    title.appendChild(n);
  }
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'pm-sub';
  sub.textContent = [
    packages.length && `${packages.length} package${packages.length !== 1 ? 's' : ''}`,
    uses.length && `${uses.length} import${uses.length !== 1 ? 's' : ''}`,
    subs.length && `${subs.length} sub${subs.length !== 1 ? 's' : ''}`,
    variables.length && `${variables.length} variable${variables.length !== 1 ? 's' : ''}`,
    hasPod && 'POD',
  ].filter(Boolean).join(' · ') || 'Perl source';
  host.appendChild(sub);

  const cards = document.createElement('div');
  cards.className = 'pm-cards';
  for (const { value, label } of [
    { value: packages.length, label: 'Packages' },
    { value: uses.length, label: 'Imports' },
    { value: subs.length, label: 'Subs' },
    { value: variables.length, label: 'Variables' },
    { value: hasPod ? 'Yes' : '—', label: 'POD' },
  ]) {
    const card = document.createElement('div');
    card.className = 'pm-card';
    const s = document.createElement('strong'); s.textContent = value;
    const sp = document.createElement('span'); sp.textContent = label;
    card.appendChild(s); card.appendChild(sp); cards.appendChild(card);
  }
  host.appendChild(cards);

  if (packages.length) {
    const ul = makeList(makeSection(host, `Packages (${packages.length})`));
    for (const p of packages) row(ul, `${tag('pm-tag-pkg', 'package')} <span class="pm-name">${esc(p)}</span>`);
  }

  if (uses.length) {
    const MAX = 30;
    const ul = makeList(makeSection(host, `Imports (${uses.length})`));
    for (const u of uses.slice(0, MAX)) {
      const cls = USE_TAG[u.kind] || 'pm-tag-use';
      const rest = u.rest ? ` <span class="pm-rest">${esc(u.rest)}</span>` : '';
      row(ul, `${tag(cls, u.kind)} <span class="pm-name">${esc(u.name)}</span>${rest}`);
    }
    if (uses.length > MAX) row(ul, `<span class="pm-rest">… and ${uses.length - MAX} more</span>`);
  }

  if (subs.length) {
    const ul = makeList(makeSection(host, `Subroutines (${subs.length})`));
    for (const s of subs) {
      const params = s.params.map((p) => `<span class="pm-param">${esc(p)}</span>`).join(', ');
      const scope = multiPkg && s.package ? ` <span class="pm-scope">${esc(s.package)}</span>` : '';
      row(ul, `${tag('pm-tag-sub', 'sub')} <span class="pm-name">${esc(s.name)}</span>(${params})${scope}`);
    }
  }

  if (variables.length) {
    const MAX = 30;
    const ul = makeList(makeSection(host, `Variables (${variables.length})`));
    for (const v of variables.slice(0, MAX)) {
      row(ul, `${tag('pm-tag-var', v.kind)} <span class="pm-param">${esc(v.name)}</span>`);
    }
    if (variables.length > MAX) row(ul, `<span class="pm-rest">… and ${variables.length - MAX} more</span>`);
  }

  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'pm-pre';
  pre.textContent = text.length > 20000 ? text.slice(0, 20000) + '\n…' : text;
  srcSec.appendChild(pre);

  return { parentNode: host };
}
