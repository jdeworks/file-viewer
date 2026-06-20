const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dot-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dot-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ea580c;color:#fff;vertical-align:middle;margin-right:8px;}
.dot-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dot-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dot-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.dot-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.dot-card strong{display:block;font-size:1.2rem;font-weight:700;}
.dot-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.dot-section{margin:16px 0;}
.dot-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.dot-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
.dot-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:5px 10px;border-bottom:2px solid var(--border,#e0e0e0);background:var(--bg,#fff);}
.dot-table td{padding:5px 10px;border-bottom:1px solid var(--border,#eaecf0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.dot-table tr:last-child td{border-bottom:none;}
.dot-attr-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px;}
.dot-pill{background:var(--bg-2,#fff7ed);color:#ea580c;padding:2px 8px;border-radius:10px;font-family:ui-monospace,monospace;font-size:12px;}
.dot-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;margin-top:16px;white-space:pre-wrap;word-break:break-word;}
.dot-kw{color:#ea580c;font-weight:700;}
.dot-str{color:#b91c1c;}
.dot-attr{color:#0f6fba;}
.dot-node-id{color:#1a7f37;}
.dot-comment{color:#888;font-style:italic;}
`;

const KEYWORDS = ['digraph','graph','strict','subgraph','node','edge','rankdir','rank','label','shape','color','style','fontname','fontsize','arrowhead','arrowtail','dir','weight','width','height','margin','splines','concentrate','compound','newrank'];

function parseDot(text) {
  // Strip comments for analysis
  const stripped = (text || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '');

  // Graph type and name
  const headerMatch = stripped.match(/\b(strict\s+)?(di)?graph\s+("?[^"{]*"?)\s*\{/i);
  const isStrict = !!headerMatch?.[1];
  const isDigraph = !!(headerMatch?.[2]);
  const graphName = (headerMatch?.[3] || '').replace(/"/g, '').trim() || '(unnamed)';
  const graphType = (isStrict ? 'strict ' : '') + (isDigraph ? 'digraph' : 'graph');

  // Edge operator
  const edgeOp = isDigraph ? '->' : '--';
  const edgeRe = isDigraph ? /->/g : /--/g;

  // Count edges
  const edgeMatches = stripped.match(edgeRe) || [];
  const edgeCount = edgeMatches.length;

  // Count subgraphs
  const subgraphMatches = stripped.match(/\bsubgraph\b/gi) || [];
  const subgraphCount = subgraphMatches.length;

  // Collect node IDs (simple heuristic: identifiers before [ or ; or edge op or line end)
  const nodeSet = new Set();
  // Nodes declared explicitly: nodename [attrs] or nodename;
  const nodeRe = /\b([A-Za-z_][\w]*|"[^"]*")\s*(?:\[|;|$)/gm;
  let m;
  while ((m = nodeRe.exec(stripped)) !== null) {
    const id = m[1].replace(/"/g, '');
    if (!KEYWORDS.includes(id.toLowerCase())) nodeSet.add(id);
  }
  // Also pick up nodes from edge lines
  const edgeLineRe = new RegExp(`\\b([A-Za-z_][\\w]*|"[^"]*")\\s*(?:${edgeOp.replace('-', '\\-')})`, 'g');
  while ((m = edgeLineRe.exec(stripped)) !== null) {
    const id = m[1].replace(/"/g, '');
    if (!KEYWORDS.includes(id.toLowerCase())) nodeSet.add(id);
  }
  const edgeTargetRe = new RegExp(`(?:${edgeOp.replace('-', '\\-')})\\s*([A-Za-z_][\\w]*|"[^"]*")`, 'g');
  while ((m = edgeTargetRe.exec(stripped)) !== null) {
    const id = m[1].replace(/"/g, '');
    if (!KEYWORDS.includes(id.toLowerCase())) nodeSet.add(id);
  }

  // Collect unique attribute names used
  const attrSet = new Set();
  const attrRe = /\b(shape|color|label|style|fontname|fontsize|arrowhead|arrowtail|dir|weight|width|height|margin|rankdir|rank|splines|concentrate|compound|fillcolor|bgcolor|penwidth|lhead|ltail|URL|href|tooltip)\s*=/gi;
  while ((m = attrRe.exec(stripped)) !== null) attrSet.add(m[1].toLowerCase());

  return {
    graphType,
    graphName,
    nodeCount: Math.min(nodeSet.size, 200),
    edgeCount,
    subgraphCount,
    attrs: [...attrSet].slice(0, 20),
    edgeOp,
  };
}

function highlightDot(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inBlockComment = false;

  for (const line of lines) {
    // Handle block comments
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx >= 0) {
        result.push(`<span class="dot-comment">${esc(line.slice(0, endIdx + 2))}</span>${highlightDotLine(line.slice(endIdx + 2))}`);
        inBlockComment = false;
      } else {
        result.push(`<span class="dot-comment">${esc(line)}</span>`);
      }
      continue;
    }

    const startIdx = line.indexOf('/*');
    if (startIdx >= 0) {
      const endIdx = line.indexOf('*/', startIdx + 2);
      if (endIdx >= 0) {
        result.push(highlightDotLine(line.slice(0, startIdx)) + `<span class="dot-comment">${esc(line.slice(startIdx, endIdx + 2))}</span>` + highlightDotLine(line.slice(endIdx + 2)));
      } else {
        result.push(highlightDotLine(line.slice(0, startIdx)) + `<span class="dot-comment">${esc(line.slice(startIdx))}</span>`);
        inBlockComment = true;
      }
      continue;
    }

    // Line comments
    const lineCommentIdx = line.search(/\/\/|#/);
    if (lineCommentIdx >= 0) {
      result.push(highlightDotLine(line.slice(0, lineCommentIdx)) + `<span class="dot-comment">${esc(line.slice(lineCommentIdx))}</span>`);
      continue;
    }

    result.push(highlightDotLine(line));
  }

  return result.join('\n');
}

function highlightDotLine(line) {
  if (!line) return '';
  let out = esc(line);
  // Strings
  out = out.replace(/(&quot;[^&]*&quot;)/g, '<span class="dot-str">$1</span>');
  // Attributes (key=)
  out = out.replace(/\b(shape|color|label|style|fontname|fontsize|arrowhead|arrowtail|dir|weight|width|height|margin|rankdir|rank|splines|fillcolor|bgcolor|penwidth|URL|href|tooltip)\s*=/gi,
    '<span class="dot-attr">$1</span>=');
  // Keywords
  const sortedKws = [...KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sortedKws) {
    const re = new RegExp(`(?<![\\w-])(${kw})(?![\\w-])`, 'gi');
    out = out.replace(re, '<span class="dot-kw">$1</span>');
  }
  return out;
}

export function render(intake) {
  const parsed = parseDot(intake.text || '');
  const { graphType, graphName, nodeCount, edgeCount, subgraphCount, attrs, edgeOp } = parsed;

  const host = document.createElement('div');
  host.className = 'dot-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  const title = document.createElement('div');
  title.className = 'dot-title';
  title.innerHTML = `<span class="dot-badge">DOT</span>${esc(graphType)}: ${esc(graphName)}`;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'dot-sub';
  const parts = [`${nodeCount} node${nodeCount !== 1 ? 's' : ''}`, `${edgeCount} edge${edgeCount !== 1 ? 's' : ''} (${esc(edgeOp)})`];
  if (subgraphCount) parts.push(`${subgraphCount} subgraph${subgraphCount !== 1 ? 's' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'dot-summary';
  const cards = [
    { value: graphType, label: 'Graph type' },
    { value: nodeCount, label: 'Nodes' },
    { value: edgeCount, label: 'Edges' },
    { value: subgraphCount, label: 'Subgraphs' },
  ];
  for (const { value, label } of cards) {
    const card = document.createElement('div');
    card.className = 'dot-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Attributes used
  if (attrs.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'dot-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Attributes Used';
    sec.appendChild(h3);
    const pills = document.createElement('div');
    pills.className = 'dot-attr-pills';
    for (const a of attrs) {
      const span = document.createElement('span');
      span.className = 'dot-pill';
      span.textContent = a;
      pills.appendChild(span);
    }
    sec.appendChild(pills);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const pre = document.createElement('pre');
  pre.className = 'dot-pre';
  pre.innerHTML = highlightDot(intake.text || '');
  host.appendChild(pre);

  return { parentNode: host };
}
