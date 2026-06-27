import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

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
.kdl-node{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap}
.kdl-node-name{color:var(--fg,#24292f);font-weight:600}
.kdl-node-args{color:#1a7f37}
.kdl-node-props{color:#7c3aed}
.kdl-node-children{color:var(--fg-2,#888);font-size:11px}
.kdl-indent{padding-left:1.2em;border-left:2px solid var(--border,#e8eaed);margin-left:4px}
.kdl-more{color:var(--fg-2,#888);font-size:11px;padding:2px 0}
.kdl-details{margin:0}
.kdl-details>summary{cursor:pointer;list-style:none}
.kdl-details>summary::-webkit-details-marker{display:none}
.kdl-list{margin:0;padding:0;list-style:none}
.kdl-list li{padding:6px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:7px;align-items:baseline;flex-wrap:wrap}
.kdl-list li:last-child{border-bottom:none}
.kdl-comment{color:#6e7781;font-style:italic}
.kdl-str{color:#0a7d27}
.kdl-lit{color:#8250df}
.kdl-num{color:#0550ae}
.kdl-prop{color:#953800}
`;

function detectKdlKind(text, filename) {
  const fn = (filename || '').split('/').pop().toLowerCase();
  if (fn === 'package.kdl') return 'Package manifest';
  if (/keybinds/.test(text) && /plugins/.test(text)) return 'Zellij config';
  if (/themes/.test(text) && /plugins/.test(text)) return 'Zellij config';
  if (/kdl-script/.test(text) || /extern/.test(text)) return 'KDL Script';
  return 'KDL document';
}

function parseKdlNodes(text, maxNodes = 80) {
  const topNodes = [];
  const disabledNodes = [];
  const issues = [];
  const stack = [{ name: '<root>', line: 0, children: topNodes, names: new Map() }];
  const commentState = { block: false };
  let nodeCount = 0;
  let childCount = 0;
  let truncated = false;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    let line = stripComments(lines[i], commentState).trim();
    if (!line) continue;

    while (line.startsWith('}')) {
      if (stack.length === 1) {
        issues.push({ severity: 'warning', label: 'brace imbalance', line: lineNo, message: 'Closing brace has no matching open node block.' });
      } else {
        stack.pop();
      }
      line = line.slice(1).trim();
    }
    if (!line) continue;

    const disabled = line.startsWith('/-');
    if (disabled) line = line.replace(/^\/-\s*/, '').trim();

    const nodeLine = line.slice(0, firstControlIndex(line)).trim();
    if (!nodeLine) continue;
    const node = parseNodeLine(nodeLine, lineNo);
    if (!node) continue;

    if (disabled) {
      disabledNodes.push(node);
      issues.push({ severity: 'info', label: 'disabled node', line: lineNo, message: `Node "${node.name}" is disabled with /- and will not be part of the parsed KDL document.` });
      continue;
    }

    const scope = stack[stack.length - 1];
    const previousLine = scope.names.get(node.name);
    if (previousLine) {
      issues.push({ severity: 'info', label: 'duplicate sibling', line: lineNo, message: `Sibling node "${node.name}" also appears at line ${previousLine}.` });
    } else {
      scope.names.set(node.name, lineNo);
    }

    scope.children.push(node);
    if (stack.length === 1) nodeCount++;
    else childCount++;

    if (line.includes('{')) {
      stack.push({ name: node.name, line: lineNo, children: node.children, names: new Map() });
    }

    if (nodeCount + childCount >= maxNodes) {
      truncated = true;
      break;
    }
  }

  for (let i = stack.length - 1; i > 0; i--) {
    const open = stack[i];
    issues.push({ severity: 'warning', label: 'brace imbalance', line: open.line, message: `Node "${open.name}" opens a child block that is not closed.` });
  }

  return { topNodes, nodeCount, childCount, disabledNodes, issues, truncated };
}

function stripComments(line, state) {
  let out = '';
  let quote = '';
  let escape = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (state.block) {
      if (ch === '*' && next === '/') {
        state.block = false;
        i++;
      }
      continue;
    }
    if (!quote && ch === '/' && next === '*') {
      state.block = true;
      i++;
      continue;
    }
    if (!quote && ch === '/' && next === '/') break;
    out += ch;
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    }
  }
  return out;
}

function firstControlIndex(line) {
  let quote = '';
  let escape = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{' || ch === ';') return i;
  }
  return line.length;
}

function parseNodeLine(line, lineNo) {
  let nameMatch;
  if (line.startsWith('"')) nameMatch = line.match(/^"([^"]+)"/);
  else nameMatch = line.match(/^([-a-zA-Z0-9_:.+#?@$!%^&*|<>=~/\\]+)/);
  if (!nameMatch) return null;
  const name = nameMatch[1];
  const rest = line.slice(nameMatch[0].length).trim();
  const tokens = rest.match(/(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+)/g) || [];
  const props = tokens.filter((token) => /^[\w.-]+=/.test(token));
  const args = tokens.filter((token) => !/^[\w.-]+=/.test(token));
  return { name, argCount: args.length, propCount: props.length, children: [], line: lineNo };
}

function highlightLine(line) {
  let out = esc(line);
  out = out.replace(/(\/\/.*)$/g, '<span class="kdl-comment">$1</span>');
  out = out.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="kdl-str">$1</span>');
  out = out.replace(/\b(true|false|null)\b/g, '<span class="kdl-lit">$1</span>');
  out = out.replace(/(\b\d+(?:\.\d+)?\b)/g, '<span class="kdl-num">$1</span>');
  out = out.replace(/([\w.-]+)=/g, '<span class="kdl-prop">$1</span>=');
  return out;
}

function renderTreeNode(node, depth) {
  const container = document.createElement('div');
  container.className = depth > 0 ? 'kdl-indent' : '';

  const row = document.createElement('div');
  row.className = 'kdl-node';
  row.appendChild(chip(`line ${node.line}`, 'muted'));
  row.appendChild(sourceButton(node.name, node.line, 'Open node in source'));

  if (node.argCount) {
    const argsEl = document.createElement('span');
    argsEl.className = 'kdl-node-args';
    argsEl.textContent = `(${node.argCount} arg${node.argCount !== 1 ? 's' : ''})`;
    argsEl.title = 'KDL positional arguments after the node name.';
    row.appendChild(argsEl);
  }

  if (node.propCount) {
    const propsEl = document.createElement('span');
    propsEl.className = 'kdl-node-props';
    propsEl.textContent = `${node.propCount} prop${node.propCount !== 1 ? 's' : ''}`;
    propsEl.title = 'KDL properties in key=value form.';
    row.appendChild(propsEl);
  }

  if (node.children?.length) {
    const childEl = document.createElement('span');
    childEl.className = 'kdl-node-children';
    childEl.textContent = `{ ${node.children.length} }`;
    childEl.title = 'Child nodes nested inside this node block.';
    row.appendChild(childEl);

    const details = document.createElement('details');
    details.className = 'kdl-details';
    details.open = depth < 1;
    const summary = document.createElement('summary');
    summary.appendChild(row);
    details.appendChild(summary);
    for (const child of node.children.slice(0, 10)) {
      details.appendChild(renderTreeNode(child, depth + 1));
    }
    if (node.children.length > 10) {
      const more = document.createElement('div');
      more.className = 'kdl-more kdl-indent';
      more.textContent = `... ${node.children.length - 10} more`;
      details.appendChild(more);
    }
    container.appendChild(details);
    return container;
  }

  container.appendChild(row);
  return container;
}

function section(title) {
  const sec = document.createElement('div');
  sec.className = 'kdl-section';
  const hd = document.createElement('div');
  hd.className = 'kdl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  return sec;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const filename = intake.name || intake.filename || '';

  const kind = detectKdlKind(text, filename);
  const { topNodes, nodeCount, childCount, disabledNodes, issues, truncated } = parseKdlNodes(text, 80);

  const host = document.createElement('div');
  host.className = 'kdl-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

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

  const summary = document.createElement('div');
  summary.className = 'kdl-summary';
  for (const { value, label } of [
    { value: nodeCount, label: 'Top-level nodes' },
    { value: childCount, label: 'Child nodes' },
    { value: disabledNodes.length, label: 'Disabled nodes' },
    { value: issues.length, label: 'Review notes' },
  ]) {
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

  if (kind !== 'KDL document') {
    const kindDiv = document.createElement('div');
    kindDiv.style.cssText = 'margin-bottom:12px';
    const kindBadge = document.createElement('span');
    kindBadge.className = 'kdl-kind-badge';
    kindBadge.textContent = kind;
    kindDiv.appendChild(kindBadge);
    host.appendChild(kindDiv);
  }

  if (topNodes.length) {
    const sec = section(`Node Outline (${topNodes.length})`);
    const tree = document.createElement('div');
    tree.className = 'kdl-tree';
    for (const node of topNodes.slice(0, 25)) tree.appendChild(renderTreeNode(node, 0));
    if (topNodes.length > 25 || truncated) {
      const more = document.createElement('div');
      more.className = 'kdl-more';
      more.textContent = truncated ? '... outline truncated after 80 nodes' : `... ${topNodes.length - 25} more top-level nodes`;
      tree.appendChild(more);
    }
    sec.appendChild(tree);
    host.appendChild(sec);
  }

  if (disabledNodes.length) {
    const sec = section(`Disabled Nodes (${disabledNodes.length})`);
    const ul = document.createElement('ul');
    ul.className = 'kdl-list';
    for (const node of disabledNodes) {
      const li = document.createElement('li');
      li.appendChild(chip('/-', 'warn', 'KDL node comment marker. The node is disabled.'));
      li.appendChild(sourceButton(node.name, node.line, 'Open disabled node in source'));
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  const issueEl = issueList(issues, { title: 'Structure Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'kdl-line', highlighter: highlightLine }));
  wireSourceLinks(host, { idPrefix: 'kdl-line' });

  return { parentNode: host };
}
