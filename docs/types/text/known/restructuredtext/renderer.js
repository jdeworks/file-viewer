import { chip, ensureKnownUiStyle, esc, issueList, sourceButton, sourcePreview, wireSourceLinks } from '../../../../core/known-ui.js';

const CSS = `
.rst-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.rst-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7b5ea7;color:#fff;vertical-align:middle;margin-right:8px}
.rst-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rst-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rst-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.rst-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.rst-card strong{display:block;font-size:1.2rem;font-weight:700}
.rst-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.rst-sec{margin:14px 0}
.rst-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.rst-outline{list-style:none;padding:0;margin:0;font-size:13px}
.rst-outline li{padding:4px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.rst-outline li:last-child{border-bottom:none}
.rst-level-0{font-weight:700;color:var(--fg,#24292f)}
.rst-level-1{padding-left:16px;color:var(--fg,#555)}
.rst-level-2{padding-left:32px;color:var(--fg-2,#666);font-size:12px}
.rst-level-3{padding-left:48px;color:var(--fg-2,#777);font-size:12px}
.rst-directives{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;align-items:center}
.rst-dir-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f3e8ff);color:#7b5ea7;border:1px solid #d8b4fe;font-family:ui-monospace,monospace}
.rst-ref-list{margin:0;padding:0;list-style:none;font-size:12px}
.rst-ref-list li{padding:5px 0;border-bottom:1px solid var(--border,#eaecf0);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.rst-ref-list li:last-child{border-bottom:none}
.rst-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.rst-trunc{font-size:11px;color:var(--fg-2,#888);padding:4px 12px;font-style:italic}
.rst-heading{color:#7b5ea7;font-weight:700}
.rst-directive{color:#0550ae;font-weight:700}
.rst-role{color:#b45309}
.rst-comment{color:var(--fg-2,#6e7681);font-style:italic}
.rst-strong{font-weight:700}
.rst-em{font-style:italic;color:var(--fg,#24292f)}
.rst-code{color:#d73a49;background:rgba(175,184,193,.2);padding:0 3px;border-radius:3px;font-family:ui-monospace,monospace}
.rst-underline{color:var(--fg-2,#aaa)}
`;

// RST section adornment characters (in order of typical convention)
const ADORN_CHARS = new Set(['=', '-', '~', '^', '"', '\'', '+', '#', '*', '@', '!', '/', '\\', '|', ':', '<', '>', '_', '.', '`']);

function isAdornLine(line) {
  if (line.length < 2) return false;
  const ch = line[0];
  if (!ADORN_CHARS.has(ch)) return false;
  return line.split('').every((c) => c === ch);
}

function parseRst(text) {
  const lines = text.split('\n');
  let docTitle = null;
  let docTitleLine = 0;
  const sections = [];
  const directiveMap = new Map();
  const refs = [];
  const labels = new Map();
  const anchors = new Map();
  const issues = [];
  let wordCount = 0;

  // RST headings: a text line followed by (or preceded AND followed by) a line of adornment chars
  // Simple heuristic: line[i] is text, line[i+1] is adornment of same length (underline style)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] || '';
    const prev = i > 0 ? lines[i - 1] : '';

    // Check for underline-style heading
    if (line.trim() && next && isAdornLine(next) && next.length >= line.trim().length) {
      const heading = line.trim();
      registerAnchor(anchors, issues, heading, i + 1);
      // If there's also an overline (same char as underline), it's a title-level heading
      if (prev && isAdornLine(prev) && prev[0] === next[0]) {
        if (!docTitle) { docTitle = heading; docTitleLine = i + 1; }
        else sections.push({ level: 0, text: heading, adorn: next[0], line: i + 1 });
      } else {
        if (!docTitle && sections.length === 0) { docTitle = heading; docTitleLine = i + 1; }
        else sections.push({ level: 1, text: heading, adorn: next[0], line: i + 1 });
      }
      i++; // skip the adornment line
      continue;
    }

    // Directives: `.. name::` or `.. name:: args`
    const dirM = line.match(/^\s*\.\.\s+([\w-]+)\s*::\s*(.*)$/);
    if (dirM) {
      addDirective(directiveMap, dirM[1], { line: i + 1, arg: dirM[2].trim() });
      if ((dirM[1] === 'include' || dirM[1] === 'image' || dirM[1] === 'figure') && dirM[2].trim()) {
        issues.push({ severity: 'info', label: 'external file', line: i + 1, message: `${dirM[1]} target "${dirM[2].trim()}" cannot be resolved from this standalone preview.` });
      }
      continue;
    }

    const labelM = line.match(/^\s*\.\.\s+_([^:]+):\s*$/);
    if (labelM) {
      const key = anchorKey(labelM[1]);
      if (labels.has(key)) issues.push({ severity: 'warning', label: 'duplicate label', line: i + 1, message: `Label "${labelM[1].trim()}" is also defined on line ${labels.get(key)}.` });
      else labels.set(key, i + 1);
    }

    for (const ref of inlineRefs(line, i + 1)) refs.push(ref);

    // Word count from regular text
    if (line.trim() && !isAdornLine(line) && !/^\s*\.\.\s/.test(line)) {
      wordCount += line.trim().split(/\s+/).filter(Boolean).length;
    }
  }

  // Re-assign heading levels by adorn character order
  const adornOrder = [];
  const adornMap = new Map();
  for (const s of sections) {
    if (!adornMap.has(s.adorn)) {
      adornMap.set(s.adorn, adornOrder.length);
      adornOrder.push(s.adorn);
    }
    s.level = adornMap.get(s.adorn);
  }

  const refTargets = new Set([...labels.keys(), ...anchors.keys()]);
  for (const ref of refs) {
    if (ref.kind === 'ref' && !refTargets.has(anchorKey(ref.target))) {
      issues.push({ severity: 'info', label: 'unresolved ref', line: ref.line, message: `Reference "${ref.target}" is not defined as a label or section target in this file.` });
    }
    if (ref.kind === 'doc') {
      issues.push({ severity: 'info', label: 'document ref', line: ref.line, message: `Document reference "${ref.target}" points outside this standalone preview.` });
    }
  }

  return { docTitle, docTitleLine, sections, directives: sortedDirectives(directiveMap), refs, labels: [...labels.entries()].map(([name, line]) => ({ name, line })), issues, wordCount };
}

function anchorKey(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function registerAnchor(map, issues, text, line) {
  const key = anchorKey(text);
  if (!key) return;
  if (map.has(key)) {
    issues.push({ severity: 'warning', label: 'duplicate anchor', line, message: `Section heading "${text}" creates the same implicit anchor as line ${map.get(key)}.` });
  } else {
    map.set(key, line);
  }
}

function addDirective(map, name, item) {
  if (!map.has(name)) map.set(name, { name, count: 0, firstLine: item.line, args: [] });
  const rec = map.get(name);
  rec.count++;
  rec.firstLine = Math.min(rec.firstLine, item.line);
  if (item.arg) rec.args.push({ arg: item.arg, line: item.line });
}

function sortedDirectives(map) {
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function inlineRefs(line, lineNo) {
  const refs = [];
  for (const m of line.matchAll(/:(doc|ref):`([^`]+)`/g)) refs.push({ kind: m[1], target: m[2].trim(), line: lineNo });
  for (const m of line.matchAll(/`([^`<]+?)\s*<([^>]+)>`_/g)) refs.push({ kind: /^https?:\/\//i.test(m[2]) ? 'external' : 'link', target: m[2].trim(), label: m[1].trim(), line: lineNo });
  return refs;
}

function highlightRstLine(line) {
    // Comment
    if (/^\s*\.\.\s+$/.test(line) || /^\s*\.\.\s+[^.]/.test(line) && !/::\s*$/.test(line)) {
      if (/^\s*\.\.(?!\s+\w[\w-]*::)/.test(line)) {
        return `<span class="rst-comment">${esc(line)}</span>`;
      }
    }
    // Directive
    if (/^\s*\.\.\s+[\w-]+\s*::/.test(line)) {
      return `<span class="rst-directive">${esc(line)}</span>`;
    }
    // Adornment underline/overline
    if (isAdornLine(line.trim()) && line.trim().length > 1) {
      return `<span class="rst-underline">${esc(line)}</span>`;
    }

    let out = esc(line);
    // Inline roles: :role:`text`
    out = out.replace(/:[\w-]+:`[^`]*`/g, (m) => `<span class="rst-role">${m}</span>`);
    // Inline code: ``code``
    out = out.replace(/``([^`]*)``/g, '<span class="rst-code">``$1``</span>');
    // Bold: **word**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="rst-strong">**$1**</strong>');
    // Italic: *word*
    out = out.replace(/\*([^*]+)\*/g, '<em class="rst-em">*$1*</em>');
    return out;
}

export function render(intake) {
  const text = intake.text || '';
  const { docTitle, docTitleLine, sections, directives, refs, labels, issues, wordCount } = parseRst(text);
  const allLines = text.split('\n');

  const host = document.createElement('div');
  host.className = 'rst-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);
  ensureKnownUiStyle(host);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'rst-badge';
  badge.textContent = 'RST';
  const titleEl = document.createElement('span');
  titleEl.className = 'rst-title';
  if (docTitle && docTitleLine) titleEl.appendChild(sourceButton(docTitle, docTitleLine, 'Open document title in source'));
  else titleEl.textContent = (intake.name || intake.filename || '').split('/').pop() || 'reStructuredText Document';
  header.appendChild(badge);
  header.appendChild(titleEl);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'rst-sub';
  sub.textContent = `reStructuredText document · ${sections.length} section${sections.length !== 1 ? 's' : ''} · ~${wordCount} words`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'rst-summary';
  for (const { value, label } of [
    { value: sections.length, label: 'Sections' },
    { value: directives.length, label: 'Directive types' },
    { value: refs.length, label: 'References' },
    { value: `~${wordCount}`, label: 'Words' },
    { value: allLines.length, label: 'Lines' },
  ]) {
    const card = document.createElement('div');
    card.className = 'rst-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Document outline
  if (sections.length) {
    const sec = document.createElement('div');
    sec.className = 'rst-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Outline';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'rst-outline';
    for (const { level, text: sText, line } of sections.slice(0, 40)) {
      const li = document.createElement('li');
      li.className = `rst-level-${Math.min(level, 3)}`;
      li.appendChild(sourceButton(sText, line, 'Open section heading in source'));
      li.appendChild(chip(`line ${line}`, 'muted'));
      li.appendChild(chip(`level ${level + 1}`, 'info'));
      ul.appendChild(li);
    }
    if (sections.length > 40) {
      const li = document.createElement('li');
      li.style.cssText = 'color:var(--fg-2,#888);font-size:11px;font-style:italic';
      li.textContent = `… and ${sections.length - 40} more sections`;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  // Directives
  if (directives.length) {
    const sec = document.createElement('div');
    sec.className = 'rst-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'Directives used';
    sec.appendChild(h3);
    const tags = document.createElement('div');
    tags.className = 'rst-directives';
    for (const d of directives.slice(0, 30)) {
      const tag = document.createElement('span');
      tag.className = 'rst-dir-tag';
      tag.title = directiveHint(d.name);
      tag.appendChild(sourceButton(`.. ${d.name}::`, d.firstLine, `Open first ${d.name} directive`));
      tags.appendChild(tag);
      if (d.count > 1) tags.appendChild(chip(`${d.count} uses`, 'info'));
    }
    if (directives.length > 30) {
      const more = document.createElement('span');
      more.style.cssText = 'font-size:11px;color:var(--fg-2,#888);font-style:italic;align-self:center';
      more.textContent = `+${directives.length - 30} more`;
      tags.appendChild(more);
    }
    sec.appendChild(tags);
    host.appendChild(sec);
  }

  if (refs.length || labels.length) {
    const sec = document.createElement('div');
    sec.className = 'rst-sec';
    const h3 = document.createElement('h3');
    h3.textContent = 'References';
    sec.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'rst-ref-list';
    for (const ref of refs.slice(0, 30)) {
      const li = document.createElement('li');
      li.appendChild(chip(ref.kind, ref.kind === 'external' ? 'ok' : 'info'));
      li.appendChild(sourceButton(ref.target, ref.line, 'Open reference in source'));
      li.appendChild(chip(`line ${ref.line}`, 'muted'));
      ul.appendChild(li);
    }
    if (!refs.length) {
      for (const label of labels.slice(0, 20)) {
        const li = document.createElement('li');
        li.appendChild(chip('label', 'ok'));
        li.appendChild(sourceButton(label.name, label.line, 'Open label in source'));
        li.appendChild(chip(`line ${label.line}`, 'muted'));
        ul.appendChild(li);
      }
    }
    sec.appendChild(ul);
    host.appendChild(sec);
  }

  const issueEl = issueList(issues, { title: 'Reference Review' });
  if (issueEl) host.appendChild(issueEl);

  host.appendChild(sourcePreview(text, { title: 'Source', collapsed: true, idPrefix: 'rst-line', highlighter: highlightRstLine }));
  wireSourceLinks(host, { idPrefix: 'rst-line' });

  return { parentNode: host };
}

function directiveHint(name) {
  const hints = {
    note: 'Admonition that calls out supplementary information.',
    warning: 'Admonition for important warnings or deprecated behavior.',
    'code-block': 'Literal code block with an optional language.',
    automodule: 'Sphinx directive that documents a Python module.',
    'list-table': 'Structured table directive.',
    include: 'Includes another source file when the document is built.',
    image: 'Embeds an image file.',
    figure: 'Embeds an image with caption/legend.',
  };
  return hints[name] || 'reStructuredText directive';
}
