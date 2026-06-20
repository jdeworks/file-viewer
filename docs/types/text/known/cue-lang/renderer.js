const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cue-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cue-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.cue-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cue-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cue-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.cue-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.cue-card strong{display:block;font-size:1.2rem;font-weight:700;}
.cue-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.cue-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.cue-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.cue-list{margin:0;padding:0;list-style:none;}
.cue-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;}
.cue-list li:last-child{border-bottom:none;}
.cue-pre{margin:0;background:var(--bg,#fff);padding:14px 16px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.cue-kw{color:#059669;font-weight:600;}
.cue-str{color:#0369a1;}
.cue-comment{color:#6e7781;font-style:italic;}
.cue-num{color:#b45309;}
.cue-def{color:#9333ea;font-weight:600;}
.cue-pkg{font-family:ui-monospace,monospace;font-size:12px;color:#059669;font-weight:600;}
`;

const KEYWORDS = ['package', 'import', 'let', 'if', 'for', 'in', 'with', 'null', 'true', 'false'];

function analyzeCue(text) {
  const lines = (text || '').split(/\r?\n/);
  let pkg = null;
  const imports = [];
  const definitions = [];
  let fieldCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;

    // Package
    const pkgMatch = trimmed.match(/^package\s+(\w+)/);
    if (pkgMatch) { pkg = pkgMatch[1]; continue; }

    // Imports — single: import "path" or multi-line import block
    const impMatch = trimmed.match(/^import\s+"([^"]+)"/);
    if (impMatch) { imports.push(impMatch[1]); continue; }
    const impBareMatch = trimmed.match(/^"([^"]+)"$/);
    if (impBareMatch) { imports.push(impBareMatch[1]); continue; }

    // Definitions: #Name: or #Name ::
    const defMatch = trimmed.match(/^#(\w+)\s*[:=]/);
    if (defMatch) { definitions.push('#' + defMatch[1]); continue; }

    // Field: FieldName: type/value (not inside a nested block — count top-level)
    const fieldMatch = trimmed.match(/^(\w+)\s*:/);
    if (fieldMatch && !trimmed.startsWith('//') && !trimmed.startsWith('package') && !trimmed.startsWith('import')) {
      fieldCount++;
    }
  }

  return { pkg, imports, definitions, fieldCount };
}

function highlightCue(text) {
  const lines = (text || '').split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      result.push('<span class="cue-comment">' + esc(line) + '</span>');
      continue;
    }

    let out = '';
    let i = 0;
    const chars = line;
    while (i < chars.length) {
      // String literals
      if (chars[i] === '"') {
        let j = i + 1;
        while (j < chars.length && chars[j] !== '"') {
          if (chars[j] === '\\') j++;
          j++;
        }
        j++;
        out += '<span class="cue-str">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Definition names (#Name)
      if (chars[i] === '#' && i + 1 < chars.length && /[A-Z_a-z]/.test(chars[i + 1])) {
        let j = i + 1;
        while (j < chars.length && /\w/.test(chars[j])) j++;
        out += '<span class="cue-def">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Keywords
      if (/[a-z]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /\w/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (KEYWORDS.includes(word)) {
          out += '<span class="cue-kw">' + esc(word) + '</span>';
        } else {
          out += esc(word);
        }
        i = j;
        continue;
      }
      // Numbers
      if (/[0-9]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[0-9._]/.test(chars[j])) j++;
        out += '<span class="cue-num">' + esc(chars.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      out += esc(chars[i]);
      i++;
    }
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const { pkg, imports, definitions, fieldCount } = analyzeCue(text);

  const host = document.createElement('div');
  host.className = 'cue-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'cue-title';
  title.innerHTML = '<span class="cue-badge">CUE</span>';
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'cue-sub';
  const parts = [];
  if (pkg) parts.push('package ' + pkg);
  parts.push(`${imports.length} import${imports.length !== 1 ? 's' : ''}`);
  parts.push(`${definitions.length} definition${definitions.length !== 1 ? 's' : ''}`);
  parts.push(`${fieldCount} field${fieldCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'cue-cards';
  const cardItems = [
    { value: pkg || '—', label: 'Package' },
    { value: imports.length, label: 'Imports' },
    { value: definitions.length, label: 'Definitions' },
    { value: fieldCount, label: 'Fields' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'cue-card';
    const strong = document.createElement('strong');
    if (label === 'Package' && pkg) {
      strong.className = 'cue-pkg';
    }
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Imports list
  if (imports.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cue-section';
    const hd = document.createElement('div');
    hd.className = 'cue-section-hd';
    hd.textContent = 'Imports';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'cue-list';
    for (const imp of imports) {
      const li = document.createElement('li');
      li.textContent = imp;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Definitions list
  if (definitions.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'cue-section';
    const hd = document.createElement('div');
    hd.className = 'cue-section-hd';
    hd.textContent = 'Definitions';
    sec.appendChild(hd);
    const ul = document.createElement('ul');
    ul.className = 'cue-list';
    for (const def of definitions) {
      const li = document.createElement('li');
      li.textContent = def;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const srcSec = document.createElement('div');
  srcSec.className = 'cue-section';
  const srcHd = document.createElement('div');
  srcHd.className = 'cue-section-hd';
  srcHd.textContent = 'Source';
  srcSec.appendChild(srcHd);
  const pre = document.createElement('pre');
  pre.className = 'cue-pre';
  pre.innerHTML = highlightCue(text);
  srcSec.appendChild(pre);
  host.appendChild(srcSec);

  return { parentNode: host };
}
