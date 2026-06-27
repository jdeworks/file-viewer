import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.xsl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.xsl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.xsl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.xsl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.xsl-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.xsl-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.xsl-card strong{display:block;font-size:1.2rem;font-weight:700;}
.xsl-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.xsl-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.xsl-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.xsl-list{margin:0;padding:0;list-style:none;}
.xsl-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.xsl-list li:last-child{border-bottom:none;}
.xsl-tag{font-size:10px;padding:1px 5px;border-radius:4px;background:#ede9fe;color:#7c3aed;font-weight:700;}
.xsl-note{color:var(--fg-2,#5a6678);font-family:system-ui,sans-serif;font-size:12px;flex-basis:100%;}
.xsl-elem{color:#7c3aed;font-weight:600;}
.xsl-attr{color:#0369a1;}
.xsl-str{color:#0a6640;}
.xsl-comment{color:#6e7781;font-style:italic;}
.xsl-pi{color:#b45309;}
`;

function analyzeXslt(text) {
  let version = null;
  let outputMethod = null;
  const namedTemplates = [];
  const matchTemplates = [];
  const variables = [];
  const params = [];
  const calls = [];
  const applies = [];
  const issues = [];

  // Version from xsl:stylesheet or xsl:transform
  const versionM = text.match(/<xsl:(?:stylesheet|transform)[^>]*\sversion=["']([^"']+)["']/);
  if (versionM) version = versionM[1];

  // Output method
  const outputM = text.match(/<xsl:output[^>]*\smethod=["']([^"']+)["']/);
  if (outputM) outputMethod = outputM[1];

  const templateRe = /<xsl:template\b([^>]*)>([\s\S]*?)<\/xsl:template>/g;
  let m;
  while ((m = templateRe.exec(text)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const line = lineForIndex(text, m.index);
    const name = attr(attrs, 'name');
    const match = attr(attrs, 'match');
    const mode = attr(attrs, 'mode');
    if (name) namedTemplates.push({ name, mode, line, body });
    if (match) matchTemplates.push({ name: match, match, mode, line, body });
    for (const call of body.matchAll(/<xsl:call-template\b[^>]*\sname=["']([^"']+)["']/g)) {
      calls.push({ from: name || match || '(anonymous template)', to: call[1], line: lineForIndex(text, m.index + call.index) });
    }
    for (const apply of body.matchAll(/<xsl:apply-templates\b([^>]*)\/?>/g)) {
      applies.push({ from: name || match || '(anonymous template)', select: attr(apply[1], 'select') || 'node()', mode: attr(apply[1], 'mode') || '', line: lineForIndex(text, m.index + apply.index) });
    }
  }

  // Top-level variables (children of xsl:stylesheet/xsl:transform — approximate: single-line or first tag)
  const varRe = /<xsl:variable\b[^>]*\bname=["']([^"']+)["']/g;
  while ((m = varRe.exec(text)) !== null) {
    variables.push({ name: m[1], line: lineForIndex(text, m.index), used: variableUseCount(text, m[1]) > 0 });
  }

  // Top-level params
  const paramRe = /<xsl:param\b[^>]*\bname=["']([^"']+)["']/g;
  while ((m = paramRe.exec(text)) !== null) {
    params.push({ name: m[1], line: lineForIndex(text, m.index), used: variableUseCount(text, m[1]) > 0 });
  }

  const names = new Map();
  for (const tpl of namedTemplates) {
    if (!names.has(tpl.name)) names.set(tpl.name, []);
    names.get(tpl.name).push(tpl);
  }
  for (const [name, tpls] of names.entries()) {
    if (tpls.length > 1) issues.push({ severity: 'warning', label: 'duplicate template', line: tpls[1].line, message: `Named template "${name}" is declared ${tpls.length} times.` });
  }
  const namedSet = new Set(namedTemplates.map((tpl) => tpl.name));
  for (const call of calls) {
    if (!namedSet.has(call.to)) issues.push({ severity: 'warning', label: 'missing callee', line: call.line, message: `call-template target "${call.to}" is not declared in this stylesheet.` });
  }
  for (const item of [...variables, ...params]) {
    if (!item.used) issues.push({ severity: 'info', label: 'unused binding', line: item.line, message: `$${item.name} is declared but not referenced elsewhere in the stylesheet.` });
  }

  return { version, outputMethod, namedTemplates, matchTemplates, variables, params, calls, applies, issues };
}

function attr(attrs, name) {
  const m = String(attrs || '').match(new RegExp(`\\s${name}=["']([^"']+)["']`, 'i'));
  return m?.[1] || '';
}

function lineForIndex(text, idx) {
  return text.slice(0, idx).split(/\r?\n/).length;
}

function variableUseCount(text, name) {
  const re = new RegExp(`\\$${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
  return (text.match(re) || []).length;
}

function highlightXsltLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('<!--')) return `<span class="xsl-comment">${esc(line)}</span>`;
  if (trimmed.startsWith('<?')) return `<span class="xsl-pi">${esc(line)}</span>`;
  if (/<[^>]*xsl:/i.test(line)) return escTagHighlight(line);
  return esc(line);
}

function escTagHighlight(tag) {
  // Escape everything, then colorize xsl: element names and attribute names and string values
  let s = esc(tag);
  // xsl: element names (after &lt; or &lt;/)
  s = s.replace(/(&lt;\/?)(xsl:[a-zA-Z-]+)/g, (_, p, name) =>
    p + '<span class="xsl-elem">' + name + '</span>');
  // attribute names
  s = s.replace(/\s([a-zA-Z][\w-]*)=/g, (_, attr) =>
    ' <span class="xsl-attr">' + attr + '</span>=');
  // quoted attribute values
  s = s.replace(/&quot;([^&]*)&quot;/g, (_, v) =>
    '&quot;<span class="xsl-str">' + v + '</span>&quot;');
  return s;
}

function makeSection(title, items, renderItem) {
  if (!items || items.length === 0) return null;
  const sec = document.createElement('div');
  sec.className = 'xsl-section';
  const hd = document.createElement('div');
  hd.className = 'xsl-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  const ul = document.createElement('ul');
  ul.className = 'xsl-list';
  for (const item of items) {
    const li = document.createElement('li');
    renderItem(li, item);
    ul.appendChild(li);
  }
  sec.appendChild(ul);
  return sec;
}

export function render(intake) {
  const text = intake.text || '';
  const { version, outputMethod, namedTemplates, matchTemplates, variables, params, calls, applies, issues } = analyzeXslt(text);

  const host = document.createElement('div');
  host.className = 'xsl-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);
  ensureKnownUiStyle(host);

  const title = document.createElement('div');
  title.className = 'xsl-title';
  let titleHtml = '<span class="xsl-badge">XSLT</span>';
  if (version) titleHtml += `<span style="font-size:13px;font-weight:400;margin-left:4px;">v${esc(version)}</span>`;
  if (outputMethod) titleHtml += `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:10px;">output: <code style="background:var(--bg-2,#f6f8fa);padding:1px 6px;border-radius:4px;">${esc(outputMethod)}</code></span>`;
  title.innerHTML = titleHtml;
  host.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'xsl-sub';
  sub.textContent = `${matchTemplates.length} match template${matchTemplates.length !== 1 ? 's' : ''} · ${namedTemplates.length} named template${namedTemplates.length !== 1 ? 's' : ''} · ${variables.length} variable${variables.length !== 1 ? 's' : ''} · ${params.length} param${params.length !== 1 ? 's' : ''}`;
  host.appendChild(sub);

  // Summary cards
  const cards = document.createElement('div');
  cards.className = 'xsl-cards';
  for (const { value, label } of [
    { value: matchTemplates.length, label: 'Match templates' },
    { value: namedTemplates.length, label: 'Named templates' },
    { value: variables.length, label: 'Variables' },
    { value: params.length, label: 'Params' },
    { value: calls.length, label: 'Calls' },
    { value: applies.length, label: 'Applies' },
  ]) {
    const card = document.createElement('div');
    card.className = 'xsl-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  const matchEl = makeSection('Match Templates', matchTemplates, (li, item) => {
    li.appendChild(chip('match', 'info'));
    li.appendChild(sourceButton(item.match, item.line, 'Open match template in source'));
    if (item.mode) li.appendChild(chip(`mode ${item.mode}`, 'muted'));
  });
  if (matchEl) host.appendChild(matchEl);

  const namedEl = makeSection('Named Templates', namedTemplates, (li, item) => {
    li.appendChild(chip('name', 'ok'));
    li.appendChild(sourceButton(item.name, item.line, 'Open named template in source'));
    if (item.mode) li.appendChild(chip(`mode ${item.mode}`, 'muted'));
  });
  if (namedEl) host.appendChild(namedEl);

  const callEl = makeSection('Template Calls', calls, (li, item) => {
    li.appendChild(chip('call', 'warn', 'Explicit xsl:call-template dependency.'));
    li.appendChild(sourceButton(`${item.from} -> ${item.to}`, item.line, 'Open call-template in source'));
  });
  if (callEl) host.appendChild(callEl);

  const applyEl = makeSection('Apply Templates', applies, (li, item) => {
    li.appendChild(chip('apply', 'info', 'Dynamic template dispatch through match rules.'));
    li.appendChild(sourceButton(`${item.from} -> ${item.select}`, item.line, 'Open apply-templates in source'));
    if (item.mode) li.appendChild(chip(`mode ${item.mode}`, 'muted'));
  });
  if (applyEl) host.appendChild(applyEl);

  const varsEl = makeSection('Variables', variables, (li, item) => {
    li.appendChild(chip('var', item.used ? 'ok' : 'warn'));
    li.appendChild(sourceButton(`$${item.name}`, item.line, 'Open variable declaration in source'));
  });
  if (varsEl) host.appendChild(varsEl);

  const paramsEl = makeSection('Parameters', params, (li, item) => {
    li.appendChild(chip('param', item.used ? 'ok' : 'warn'));
    li.appendChild(sourceButton(`$${item.name}`, item.line, 'Open parameter declaration in source'));
  });
  if (paramsEl) host.appendChild(paramsEl);

  const issueEl = issueList(issues, { title: 'Stylesheet Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'xsl-line', highlighter: highlightXsltLine }));
  wireSourceLinks(host, { idPrefix: 'xsl-line' });

  return { parentNode: host };
}
