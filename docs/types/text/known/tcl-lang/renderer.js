const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tcl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tcl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.tcl-badge-sub{display:inline-block;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;background:#e3f2fd;color:#1565c0;vertical-align:middle;margin-left:6px;}
.tcl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.tcl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.tcl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.tcl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.tcl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.tcl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.tcl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.tcl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.tcl-list{margin:0;padding:0;list-style:none;}
.tcl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.tcl-list li:last-child{border-bottom:none;}
.tcl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#e3f2fd;color:#1565c0;font-weight:700;}
.tcl-tag-ns{background:#e8f5e9;color:#1b5e20;}
.tcl-tag-pkg{background:#fff8e1;color:#f57f17;}
.tcl-tag-var{background:#fce4ec;color:#880e4f;}
`;

function analyzeTcl(text) {
  const lines = text.split(/\r?\n/);
  const packages = [];
  const namespaces = new Set();
  const procs = [];
  const variables = [];
  const sources = [];
  let isTk = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // Package require/provide
    const pkgM = trimmed.match(/^package\s+(require|provide)\s+([\w:.-]+)(?:\s+([\d.]+))?/);
    if (pkgM) {
      const kind = pkgM[1];
      const name = pkgM[2];
      const ver = pkgM[3] || '';
      packages.push({ kind, name, ver });
      if (name === 'Tk') isTk = true;
      continue;
    }

    // Namespace detection
    const nsM = trimmed.match(/^namespace\s+(?:eval\s+)?(::[\w:]+|\w[\w:]*)/);
    if (nsM) namespaces.add(nsM[1]);

    // proc definitions
    const procM = trimmed.match(/^proc\s+(::[\w:]+|\w[\w:]*)\s+\{([^}]*)\}/);
    if (procM) {
      const name = procM[1];
      const args = procM[2].trim().replace(/\s+/g, ' ');
      procs.push({ name, args });
    } else {
      const procM2 = trimmed.match(/^proc\s+(::[\w:]+|\w[\w:]*)\s+(\S+)/);
      if (procM2) procs.push({ name: procM2[1], args: procM2[2] });
    }

    // variable declarations
    const varM = trimmed.match(/^(?:set|variable)\s+([\w:]+)/);
    if (varM) variables.push(varM[1]);

    // source inclusions
    const srcM = trimmed.match(/^source\s+(\S+)/);
    if (srcM) sources.push(srcM[1].replace(/['"]/g, ''));

    // Tk widget creation patterns
    if (/^(?:button|label|frame|entry|canvas|text|listbox|scrollbar|menu|menubutton|scale|spinbox|ttk::)\s+\./.test(trimmed)) isTk = true;
    if (/\.\w+\s+configure\s+-/.test(trimmed)) isTk = true;
  }

  // Deduplicate variables
  const uniqueVars = [...new Set(variables)];

  return { packages, namespaces: [...namespaces], procs, variables: uniqueVars, sources, isTk };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'tcl-section';
  const hd = document.createElement('div');
  hd.className = 'tcl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'tcl-list';
  sec.appendChild(ul);
  return ul;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const name = (intake.name || intake.filename || '').split('/').pop();
  const { packages, namespaces, procs, variables, sources, isTk } = analyzeTcl(text);

  const host = document.createElement('div');
  host.className = 'tcl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'tcl-title';
  const badge = document.createElement('span');
  badge.className = 'tcl-badge';
  badge.textContent = isTk ? 'Tk GUI' : 'Tcl Script';
  title.appendChild(badge);
  const sub1 = document.createElement('span');
  sub1.className = 'tcl-badge-sub';
  sub1.textContent = name;
  title.appendChild(sub1);
  host.appendChild(title);

  // Sub line
  const sub = document.createElement('div');
  sub.className = 'tcl-sub';
  const parts = [];
  if (packages.length) parts.push(`${packages.length} package${packages.length !== 1 ? 's' : ''}`);
  if (namespaces.length) parts.push(`${namespaces.length} namespace${namespaces.length !== 1 ? 's' : ''}`);
  parts.push(`${procs.length} proc${procs.length !== 1 ? 's' : ''}`);
  if (sources.length) parts.push(`${sources.length} source${sources.length !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'tcl-cards';
  const cardItems = [
    { value: procs.length, label: 'Procs' },
    { value: packages.length, label: 'Packages' },
    { value: namespaces.length, label: 'Namespaces' },
    { value: variables.length, label: 'Variables' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'tcl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Packages
  if (packages.length > 0) {
    const sec = makeSection(host, `Packages (${packages.length})`);
    const ul = makeList(sec);
    for (const { kind, name: pname, ver } of packages) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'tcl-tag tcl-tag-pkg';
      tag.textContent = kind;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + pname + (ver ? ' ' + ver : '')));
      ul.appendChild(li);
    }
  }

  // Namespaces
  if (namespaces.length > 0) {
    const sec = makeSection(host, `Namespaces (${namespaces.length})`);
    const ul = makeList(sec);
    for (const ns of namespaces) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'tcl-tag tcl-tag-ns';
      tag.textContent = 'ns';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + ns));
      ul.appendChild(li);
    }
  }

  // Procs
  if (procs.length > 0) {
    const MAX = 20;
    const sec = makeSection(host, `Procedures (${procs.length})`);
    const ul = makeList(sec);
    for (const { name: pname, args } of procs.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'tcl-tag';
      tag.textContent = 'proc';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + pname));
      if (args && args !== '{}' && args !== '') {
        const argSpan = document.createElement('span');
        argSpan.style.cssText = 'color:var(--fg-2,#888);font-size:11px;';
        argSpan.textContent = '  {' + args + '}';
        li.appendChild(argSpan);
      }
      ul.appendChild(li);
    }
    if (procs.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${procs.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Variables
  if (variables.length > 0) {
    const MAX = 15;
    const sec = makeSection(host, `Variables (${variables.length})`);
    const ul = makeList(sec);
    for (const v of variables.slice(0, MAX)) {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'tcl-tag tcl-tag-var';
      tag.textContent = 'var';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' ' + v));
      ul.appendChild(li);
    }
    if (variables.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${variables.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Sources
  if (sources.length > 0) {
    const sec = makeSection(host, `Source Inclusions (${sources.length})`);
    const ul = makeList(sec);
    for (const s of sources) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
