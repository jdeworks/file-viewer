const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pm-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.pm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#39457e;color:#fff;vertical-align:middle;margin-right:8px;}
.pm-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e8eaf6;color:#39457e;vertical-align:middle;margin-left:6px;}
.pm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pm-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.pm-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.pm-card strong{display:block;font-size:1.2rem;font-weight:700;}
.pm-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.pm-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.pm-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.pm-list{margin:0;padding:0;list-style:none;}
.pm-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;}
.pm-list li:last-child{border-bottom:none;}
.pm-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e8eaf6;color:#39457e;font-weight:700;}
.pm-tag-use{background:#dcfce7;color:#166534;}
.pm-tag-export{background:#fef3c7;color:#92400e;}
.pm-tag-pod{background:#ede9fe;color:#7f52ff;}
.pm-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.pm-kw{color:#39457e;font-weight:600;}
.pm-str{color:#0a6640;}
.pm-comment{color:#6e7781;font-style:italic;}
.pm-pod{color:#7f52ff;font-style:italic;}
.pm-var{color:#005cc5;}
.pm-num{color:#b45309;}
`;

const PERL_KEYWORDS = new Set([
  'use', 'no', 'package', 'sub', 'my', 'our', 'local', 'return', 'if', 'else',
  'elsif', 'unless', 'while', 'until', 'for', 'foreach', 'do', 'last', 'next',
  'redo', 'goto', 'die', 'warn', 'print', 'say', 'push', 'pop', 'shift', 'unshift',
  'splice', 'join', 'split', 'map', 'grep', 'sort', 'reverse', 'keys', 'values',
  'each', 'defined', 'undef', 'ref', 'bless', 'require', 'eval', 'BEGIN', 'END',
  'DESTROY', 'wantarray', 'caller', 'scalar', 'length', 'chomp', 'chop', 'open',
  'close', 'read', 'write', 'binmode', 'chmod', 'chown', 'unlink', 'rename',
]);

function analyzePerl(text, ext) {
  const lines = text.split(/\r?\n/);
  let pkg = null;
  const uses = [];
  const subs = [];
  const exports = [];
  const exportOks = [];
  const vars = [];
  const podSections = [];
  let inPod = false;
  let podSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // POD
    if (/^=head\d+\s+(.+)/.test(trimmed)) {
      podSection = trimmed.match(/^=head\d+\s+(.+)/)[1];
      podSections.push(podSection);
      inPod = true;
      continue;
    }
    if (/^=(pod|over|item|begin|end|cut)/.test(trimmed)) {
      if (trimmed === '=cut') inPod = false;
      else inPod = true;
      continue;
    }
    if (inPod) continue;

    // Comments
    if (trimmed.startsWith('#')) continue;

    // Package
    const pkgM = trimmed.match(/^package\s+([\w:]+)/);
    if (pkgM && !pkg) { pkg = pkgM[1]; continue; }

    // Use
    const useM = trimmed.match(/^use\s+([\w:]+)(.*)?;/);
    if (useM) {
      uses.push({ mod: useM[1], rest: (useM[2] || '').trim().slice(0, 60) });
      continue;
    }

    // Sub
    const subM = trimmed.match(/^sub\s+(\w+)(?:\s*\(([^)]*)\))?/);
    if (subM) { subs.push({ name: subM[1], proto: subM[2] || null }); continue; }

    // Exports
    const expM = trimmed.match(/^(?:our\s+)?@EXPORT\s*=\s*(?:qw\(([^)]+)\)|(.+))/);
    if (expM) {
      const list = (expM[1] || expM[2] || '').trim().split(/\s+/).filter(Boolean);
      exports.push(...list);
      continue;
    }
    const expOkM = trimmed.match(/^(?:our\s+)?@EXPORT_OK\s*=\s*(?:qw\(([^)]+)\)|(.+))/);
    if (expOkM) {
      const list = (expOkM[1] || expOkM[2] || '').trim().split(/\s+/).filter(Boolean);
      exportOks.push(...list);
      continue;
    }

    // Package-scope our/my vars
    const varM = trimmed.match(/^(?:our|my)\s+(\$[\w:]+|\@[\w:]+|%[\w:]+)/);
    if (varM) vars.push(varM[1]);
  }

  return { pkg, uses, subs, exports, exportOks, vars, podSections };
}

function highlightPerl(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inPod = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // POD toggle
    if (/^=(?:head\d+|pod|over|item|begin|end|for|encoding|attr)/.test(trimmed)) {
      inPod = true;
    }
    if (trimmed === '=cut') {
      result.push('<span class="pm-pod">' + esc(line) + '</span>');
      inPod = false;
      continue;
    }
    if (inPod) {
      result.push('<span class="pm-pod">' + esc(line) + '</span>');
      continue;
    }

    if (trimmed.startsWith('#')) {
      result.push('<span class="pm-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      // Inline comment
      if (line[i] === '#') {
        out += '<span class="pm-comment">' + esc(line.slice(i)) + '</span>';
        break;
      }
      // Variables $, @, %
      if ((line[i] === '$' || line[i] === '@' || line[i] === '%') && i + 1 < line.length && /[\w{]/.test(line[i + 1])) {
        const sigil = line[i];
        let j = i + 1;
        while (j < line.length && /[\w:']/.test(line[j])) j++;
        out += '<span class="pm-var">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String double-quoted
      if (line[i] === '"') {
        let j = i + 1;
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="pm-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // String single-quoted
      if (line[i] === "'") {
        let j = i + 1;
        while (j < line.length && line[j] !== "'") { if (line[j] === '\\') j++; j++; }
        j++;
        out += '<span class="pm-str">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Numbers
      if (/[0-9]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
        out += '<span class="pm-num">' + esc(line.slice(i, j)) + '</span>';
        i = j; continue;
      }
      // Identifiers / keywords
      if (/[A-Za-z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /\w/.test(line[j])) j++;
        const word = line.slice(i, j);
        if (PERL_KEYWORDS.has(word)) {
          out += '<span class="pm-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j; continue;
      }
      out += esc(line[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
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

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'pm-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
  const ext = filename.split('.').pop();

  // Badge
  let badgeLabel = 'Perl Script';
  if (ext === 'pm') badgeLabel = 'Perl Module';
  else if (ext === 'pod') badgeLabel = 'Perl POD';

  const { pkg, uses, subs, exports, exportOks, vars, podSections } = analyzePerl(text, ext);

  const host = document.createElement('div');
  host.className = 'pm-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'pm-title';
  title.innerHTML = '<span class="pm-badge">Perl</span><span class="pm-badge-sub">' + esc(badgeLabel) + '</span>';
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'pm-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${uses.length} use${uses.length !== 1 ? 's' : ''}`);
  parts.push(`${subs.length} sub${subs.length !== 1 ? 's' : ''}`);
  if (podSections.length) parts.push(`${podSections.length} POD section${podSections.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'pm-cards';
  const cardItems = [
    { value: pkg || '—', label: 'Package' },
    { value: uses.length, label: 'Uses' },
    { value: subs.length, label: 'Subs' },
    { value: exports.length + exportOks.length, label: 'Exports' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'pm-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Use declarations
  if (uses.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Use Declarations (${uses.length})`);
    const ul = makeList(sec);
    for (const { mod, rest } of uses.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'pm-tag pm-tag-use';
      tag.textContent = 'use';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + mod + (rest ? ' ' + rest : '')));
      ul.appendChild(li);
    }
    if (uses.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${uses.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Subs
  if (subs.length > 0) {
    const sec = makeSection(host, `Subroutines (${subs.length})`);
    const ul = makeList(sec);
    for (const { name, proto } of subs) {
      const li = document.createElement('li');
      li.textContent = 'sub ' + name + (proto !== null ? '(' + proto + ')' : '');
      ul.appendChild(li);
    }
  }

  // Exports
  if (exports.length > 0 || exportOks.length > 0) {
    const total = exports.length + exportOks.length;
    const sec = makeSection(host, `Exports (${total})`);
    const ul = makeList(sec);
    for (const name of exports) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'pm-tag pm-tag-export';
      tag.textContent = '@EXPORT';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    for (const name of exportOks) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'pm-tag pm-tag-export';
      tag.textContent = '@EXPORT_OK';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // POD sections
  if (podSections.length > 0) {
    const sec = makeSection(host, `Documentation Sections (${podSections.length})`);
    const ul = makeList(sec);
    for (const s of podSections) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'pm-tag pm-tag-pod';
      tag.textContent = 'POD';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + s));
      ul.appendChild(li);
    }
  }

  // Package-scope vars
  if (vars.length > 0) {
    const MAX = 8;
    const sec = makeSection(host, `Package Variables (${vars.length})`);
    const ul = makeList(sec);
    for (const v of vars.slice(0, MAX)) {
      const li = document.createElement('li');
      li.textContent = v;
      ul.appendChild(li);
    }
    if (vars.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${vars.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Source
  const srcSec = makeSection(host, 'Source');
  const pre = document.createElement('pre');
  pre.className = 'pm-pre';
  pre.innerHTML = highlightPerl(text);
  srcSec.appendChild(pre);

  return { parentNode: host };
}
