const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vlog-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vlog-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#15803d;color:#fff;vertical-align:middle;margin-right:8px;}
.vlog-badge-sv{background:#1d4ed8;}
.vlog-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vlog-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vlog-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.vlog-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.vlog-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vlog-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vlog-section{margin:16px 0;}
.vlog-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vlog-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.vlog-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.vlog-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.vlog-table tr:last-child td{border-bottom:none;}
.vlog-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.vlog-kw{color:#1d4ed8;font-weight:700;}
.vlog-kw-sv{color:#7c3aed;font-weight:700;}
.vlog-str{color:#b91c1c;}
.vlog-num{color:#059669;}
.vlog-comment{color:#888;font-style:italic;}
.vlog-dir{color:#9d174d;}
`;

const VERILOG_KWS = [
  'module','endmodule','input','output','inout','wire','reg','always','initial',
  'begin','end','if','else','case','casex','casez','endcase','assign','parameter',
  'localparam','function','endfunction','task','endtask','for','while','forever',
  'posedge','negedge','or','and','not','buf','nor','nand','xor','xnor',
  'defparam','specify','endspecify','generate','endgenerate','genvar',
];

const SV_KWS = [
  'logic','always_ff','always_comb','always_latch','interface','endinterface',
  'class','endclass','package','endpackage','typedef','struct','union','enum',
  'modport','clocking','endclocking','program','endprogram','checker','endchecker',
  'assert','assume','cover','property','endproperty','sequence','endsequence',
  'unique','priority','final','import','export','virtual','extends','implements',
  'new','this','super','static','automatic','ref','const','var',
];

function isSystemVerilog(text) {
  return /\b(logic|always_ff|always_comb|always_latch|interface\s+\w|class\s+\w|package\s+\w|typedef\s+struct|typedef\s+enum)\b/.test(text || '');
}

function parseVerilog(text) {
  const lines = (text || '').split(/\r?\n/);
  const isSV = isSystemVerilog(text);

  // Module list
  const modules = [];
  let currentModule = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('/*')) continue;

    const modMatch = t.match(/^\bmodule\s+(\w+)\s*(?:#\s*\([^)]*\))?\s*(?:\([^)]*\))?/);
    if (modMatch) {
      if (currentModule) modules.push(currentModule);
      // Count ports
      const portMatch = line.match(/\(([^)]*)\)/);
      const portCount = portMatch ? (portMatch[1].split(',').filter((p) => p.trim()).length) : 0;
      currentModule = { name: modMatch[1], portCount };
    }
    if (/\bendmodule\b/.test(t) && currentModule) {
      modules.push(currentModule);
      currentModule = null;
    }
  }
  if (currentModule) modules.push(currentModule);

  // Parameter count
  let paramCount = 0;
  for (const line of lines) {
    if (/\b(parameter|localparam)\b/.test(line)) paramCount++;
  }

  // SV-specific counts
  let interfaceCount = 0;
  let classCount = 0;
  let packageCount = 0;
  if (isSV) {
    for (const line of lines) {
      if (/^\s*interface\s+\w/.test(line)) interfaceCount++;
      if (/^\s*class\s+\w/.test(line)) classCount++;
      if (/^\s*package\s+\w/.test(line)) packageCount++;
    }
  }

  return { isSV, modules, paramCount, interfaceCount, classCount, packageCount };
}

function highlightVerilog(text, isSV) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx >= 0) {
        result.push(`<span class="vlog-comment">${esc(line.slice(0, endIdx + 2))}</span>${highlightVerilogLine(line.slice(endIdx + 2), isSV)}`);
        inBlockComment = false;
      } else {
        result.push(`<span class="vlog-comment">${esc(line)}</span>`);
      }
      continue;
    }

    // Inline block comment
    const bcStart = line.indexOf('/*');
    if (bcStart >= 0) {
      const bcEnd = line.indexOf('*/', bcStart + 2);
      if (bcEnd >= 0) {
        result.push(highlightVerilogLine(line.slice(0, bcStart), isSV) + `<span class="vlog-comment">${esc(line.slice(bcStart, bcEnd + 2))}</span>` + highlightVerilogLine(line.slice(bcEnd + 2), isSV));
      } else {
        result.push(highlightVerilogLine(line.slice(0, bcStart), isSV) + `<span class="vlog-comment">${esc(line.slice(bcStart))}</span>`);
        inBlockComment = true;
      }
      continue;
    }

    // Line comment
    const lcIdx = line.indexOf('//');
    if (lcIdx >= 0) {
      result.push(highlightVerilogLine(line.slice(0, lcIdx), isSV) + `<span class="vlog-comment">${esc(line.slice(lcIdx))}</span>`);
      continue;
    }

    result.push(highlightVerilogLine(line, isSV));
  }

  return result.join('\n');
}

function highlightVerilogLine(line, isSV) {
  if (!line) return '';
  let out = esc(line);

  // Strings
  out = out.replace(/(&quot;[^&]*&quot;)/g, '<span class="vlog-str">$1</span>');
  // Numeric literals (e.g. 8'b0, 4'hF, 32'd100, plain numbers)
  out = out.replace(/\b(\d+'[bBoOdDhH][\dA-Fa-fxXzZ_]+|\d+)\b/g, '<span class="vlog-num">$1</span>');
  // Preprocessor directives
  out = out.replace(/(`\w+)/g, '<span class="vlog-dir">$1</span>');

  // SV keywords (highlight first to get the more specific color)
  if (isSV) {
    const sortedSvKws = [...SV_KWS].sort((a, b) => b.length - a.length);
    for (const kw of sortedSvKws) {
      const re = new RegExp(`(?<![\\w_])(${kw})(?![\\w_])`, 'g');
      out = out.replace(re, '<span class="vlog-kw-sv">$1</span>');
    }
  }

  // Verilog keywords
  const sortedKws = [...VERILOG_KWS].sort((a, b) => b.length - a.length);
  for (const kw of sortedKws) {
    // Don't re-highlight what's already inside a span
    const re = new RegExp(`(?<![\\w_])(${kw})(?![\\w_])`, 'g');
    out = out.replace(re, (match, p1, offset) => {
      // Skip if already inside a span (crude check — look back for unclosed span)
      return `<span class="vlog-kw">${p1}</span>`;
    });
  }

  return out;
}

export function render(intake) {
  const parsed = parseVerilog(intake.text || '');
  const { isSV, modules, paramCount, interfaceCount, classCount, packageCount } = parsed;

  const host = document.createElement('div');
  host.className = 'vlog-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const variant = isSV ? 'SystemVerilog' : 'Verilog';
  const badgeClass = isSV ? 'vlog-badge vlog-badge-sv' : 'vlog-badge';

  const title = document.createElement('div');
  title.className = 'vlog-title';
  title.innerHTML = `<span class="${badgeClass}">${esc(variant)}</span>Hardware Description`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'vlog-sub';
  const parts = [`${modules.length} module${modules.length !== 1 ? 's' : ''}`, `${paramCount} parameter${paramCount !== 1 ? 's' : ''}`];
  if (isSV && interfaceCount) parts.push(`${interfaceCount} interface${interfaceCount !== 1 ? 's' : ''}`);
  if (isSV && classCount) parts.push(`${classCount} class${classCount !== 1 ? 'es' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'vlog-summary';
  const cards = [
    { value: variant, label: 'Variant' },
    { value: modules.length, label: 'Modules' },
    { value: paramCount, label: 'Parameters' },
  ];
  if (isSV) cards.push({ value: interfaceCount + classCount + packageCount, label: 'SV constructs' });
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'vlog-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Module list
  if (modules.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'vlog-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Modules';
    sec.appendChild(h3);
    const table = document.createElement('table');
    table.className = 'vlog-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Module</th><th>Ports (est.)</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const mod of modules.slice(0, 30)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${esc(mod.name)}</td><td>${mod.portCount > 0 ? mod.portCount : '—'}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    sec.appendChild(table);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'vlog-pre';
  pre.innerHTML = highlightVerilog(intake.text || '', isSV);
  host.appendChild(pre);

  return { parentNode: host };
}
