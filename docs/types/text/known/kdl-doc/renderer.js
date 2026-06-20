const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kdl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.kdl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2b7a4b;color:#fff;vertical-align:middle;margin-right:8px}
.kdl-title{font-size:18px;font-weight:700;margin:0 0 4px}
.kdl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.kdl-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.kdl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.kdl-card strong{display:block;font-size:1.2rem;font-weight:700}
.kdl-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.kdl-section{margin:16px 0;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden}
.kdl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0)}
.kdl-kind-badge{display:inline-block;background:#e8f5ec;color:#2b7a4b;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;margin-bottom:8px}
.kdl-tree{padding:8px 14px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.7}
.kdl-node{display:flex;align-items:baseline;gap:4px}
.kdl-node-name{color:var(--fg,#24292f);font-weight:600}
.kdl-node-args{color:#1a7f37}
.kdl-node-props{color:#7c3aed}
.kdl-node-children{color:var(--fg-2,#888);font-size:11px}
.kdl-indent{padding-left:1.2em;border-left:2px solid var(--border,#e8eaed);margin-left:4px}
.kdl-more{color:var(--fg-2,#888);font-size:11px;padding:2px 0}
.kdl-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:14px 16px;overflow:auto;font:12px/1.6 ui-monospace,monospace;white-space:pre;tab-size:2;margin:16px 0}
`;

function stripComments(text) {
  // Remove // line comments (but not inside strings)
  // Remove /* */ block comments
  // Remove /- node comments (just strip the marker, the node itself will be parsed)
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/-\s*/g, '// DISABLED: ');
}

function detectKdlKind(text, filename) {
  const fn = (filename || '').split('/').pop().toLowerCase();
  if (fn === 'package.kdl') return 'Package manifest';
  if (/keybinds/.test(text) && /plugins/.test(text)) return 'Zellij config';
  if (/themes/.test(text) && /plugins/.test(text)) return 'Zellij config';
  if (/kdl-script/.test(text) || /extern/.test(text)) return 'KDL Script';
  return 'KDL document';
}

// Very lightweight KDL parser — extracts node names, args (count), and children at depth 0-2
function parseKdlNodes(text, maxNodes = 50) {
  const nodes = [];
  let nodeCount = 0;
  let childCount = 0;

  const clean = stripComments(text);
  const lines = clean.split('\n');
  let depth = 0;
  const stack = [nodes]; // stack of arrays
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line || line.startsWith('//')) continue;
    if (line === '{') { depth++; continue; }
    if (line.startsWith('}')) {
      depth--;
      if (stack.length > 1) stack.pop();
      continue;
    }

    // Parse node line: name args... key=val... { or ;
    // Very simplified: extract node name (first token)
    const nodeLine = line.replace(/\{.*$/, '').replace(/;$/, '').trim();
    if (!nodeLine) { if (line.includes('{')) { depth++; } continue; }

    // Skip disabled nodes
    if (nodeLine.startsWith('// DISABLED:')) { i++; continue; }

    // Extract node name (first token, possibly quoted)
    let nameMatch;
    if (nodeLine.startsWith('"')) {
      nameMatch = nodeLine.match(/^"([^"]+)"/);
    } else {
      nameMatch = nodeLine.match(/^([-a-zA-Z0-9_:.+#?@$!%^&*|<>=~/\\]+)/);
    }
    if (!nameMatch) continue;
    const name = nameMatch[1];

    // Count args (rough: tokens after name that aren't key=val)
    const rest = nodeLine.slice(nameMatch[0].length).trim();
    const argTokens = (rest.match(/(?:"[^"]*"|\S+)/g) || []).filter((t) => !t.includes('='));
    const propTokens = (rest.match(/\w+=\S+/g) || []);

    const node = { name, argCount: argTokens.length, propCount: propTokens.length, children: [] };

    const currentList = stack[stack.length - 1];
    currentList.push(node);

    if (depth === 0) nodeCount++;
    else childCount++;

    // If line ends with {, push children
    if (line.includes('{')) {
      depth++;
      if (stack.length < 4) { // limit depth for rendering
        stack.push(node.children);
      }
    }

    if (nodeCount + childCount >= maxNodes) break;
  }

  return { topNodes: nodes, nodeCount, childCount };
}

function highlight(text) {
  const escaped = esc(text);
  return escaped
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6e7781;font-style:italic">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#0a7d27">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span style="color:#8250df">$1</span>')
    .replace(/(\b\d+(?:\.\d+)?\b)/g, '<span style="color:#0550ae">$1</span>')
    .replace(/(\w+)=/g, '<span style="color:#953800">$1</span>=');
}

function renderTreeNode(node, depth, truncateAt) {
  const container = document.createElement('div');
  container.className = depth > 0 ? 'kdl-indent' : '';

  const row = document.createElement('div');
  row.className = 'kdl-node';

  const nameEl = document.createElement('span');
  nameEl.className = 'kdl-node-name';
  nameEl.textContent = node.name;
  row.appendChild(nameEl);

  if (node.argCount) {
    const argsEl = document.createElement('span');
    argsEl.className = 'kdl-node-args';
    argsEl.textContent = ` (${node.argCount} arg${node.argCount !== 1 ? 's' : ''})`;
    row.appendChild(argsEl);
  }

  if (node.propCount) {
    const propsEl = document.createElement('span');
    propsEl.className = 'kdl-node-props';
    propsEl.textContent = ` ${node.propCount} prop${node.propCount !== 1 ? 's' : ''}`;
    row.appendChild(propsEl);
  }

  if (node.children && node.children.length) {
    const childEl = document.createElement('span');
    childEl.className = 'kdl-node-children';
    childEl.textContent = ` { ${node.children.length} }`;
    row.appendChild(childEl);
  }

  container.appendChild(row);

  // Recurse children up to depth 3
  if (node.children && node.children.length && depth < 2) {
    const shown = node.children.slice(0, 8);
    for (const child of shown) {
      container.appendChild(renderTreeNode(child, depth + 1, truncateAt));
    }
    if (node.children.length > 8) {
      const more = document.createElement('div');
      more.className = 'kdl-more kdl-indent';
      more.textContent = `… ${node.children.length - 8} more`;
      container.appendChild(more);
    }
  }

  return container;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = intake.name || intake.filename || '';

  const kind = detectKdlKind(text, filename);
  const { topNodes, nodeCount, childCount } = parseKdlNodes(text, 50);

  const host = document.createElement('div');
  host.className = 'kdl-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Title
  const title = document.createElement('div');
  title.className = 'kdl-title';
  const badge = document.createElement('span');
  badge.className = 'kdl-badge';
  badge.textContent = 'KDL';
  title.appendChild(badge);
  title.appendChild(document.createTextNode('Document'));
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'kdl-sub';
  sub.textContent = `${kind} · ${nodeCount} top-level node${nodeCount !== 1 ? 's' : ''} · ${childCount} child node${childCount !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'kdl-summary';
  const cardData = [
    { value: nodeCount, label: 'Top-level nodes' },
    { value: childCount, label: 'Child nodes' },
  ];
  for (const { value, label } of cardData) {
    const card = document.createElement('div');
    card.className = 'kdl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Kind
  if (kind !== 'KDL document') {
    const kindDiv = document.createElement('div');
    kindDiv.style.cssText = 'margin-bottom:12px';
    const kindBadge = document.createElement('span');
    kindBadge.className = 'kdl-kind-badge';
    kindBadge.textContent = kind;
    kindDiv.appendChild(kindBadge);
    host.appendChild(kindDiv);
  }

  // Node tree outline
  if (topNodes.length) {
    const sec = document.createElement('div');
    sec.className = 'kdl-section';
    const hd = document.createElement('div');
    hd.className = 'kdl-section-hd';
    hd.textContent = 'Node outline';
    sec.appendChild(hd);
    const tree = document.createElement('div');
    tree.className = 'kdl-tree';
    const shown = topNodes.slice(0, 20);
    for (const node of shown) {
      tree.appendChild(renderTreeNode(node, 0, 50));
    }
    if (topNodes.length > 20) {
      const more = document.createElement('div');
      more.className = 'kdl-more';
      more.textContent = `… ${topNodes.length - 20} more top-level nodes`;
      tree.appendChild(more);
    }
    sec.appendChild(tree);
    host.appendChild(sec);
  }

  // Syntax-highlighted source
  const preHd = document.createElement('div');
  preHd.style.cssText = 'font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:16px 0 6px';
  preHd.textContent = 'Source';
  host.appendChild(preHd);
  const pre = document.createElement('pre');
  pre.className = 'kdl-pre';
  pre.innerHTML = highlight(text);
  host.appendChild(pre);

  return { parentNode: host };
}
