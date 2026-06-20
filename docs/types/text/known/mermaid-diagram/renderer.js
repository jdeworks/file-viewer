const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mmd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.mmd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff6b35;color:#fff;vertical-align:middle;margin-right:8px}
.mmd-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mmd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mmd-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.mmd-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.mmd-card strong{display:block;font-size:1.2rem;font-weight:700}
.mmd-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.mmd-note{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:12px 0;font-size:12px;color:var(--fg-2,#555)}
.mmd-note a{color:var(--fg,#0969da)}
.mmd-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.mmd-kw{color:#d73a49;font-weight:600}
.mmd-arrow{color:#0550ae}
.mmd-comment{color:var(--fg-2,#6e7681);font-style:italic}
.mmd-str{color:#0a3069}
`;

const DIAGRAM_TYPE_LABELS = {
  graph: 'Flowchart (graph)',
  flowchart: 'Flowchart',
  sequencediagram: 'Sequence Diagram',
  classdiagram: 'Class Diagram',
  statediagram: 'State Diagram',
  erdiagram: 'Entity-Relationship Diagram',
  gantt: 'Gantt Chart',
  pie: 'Pie Chart',
  gitgraph: 'Git Graph',
  mindmap: 'Mind Map',
  timeline: 'Timeline',
  xychart: 'XY Chart',
  quadrantchart: 'Quadrant Chart',
};

function detectDiagramType(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^\s*%%[^\n]*/, '').trim().toLowerCase();
    if (!trimmed) continue;
    for (const [kw, label] of Object.entries(DIAGRAM_TYPE_LABELS)) {
      if (trimmed.startsWith(kw)) return { keyword: kw, label };
    }
    // If line doesn't match any keyword, stop checking (first real line determines type)
    break;
  }
  return { keyword: 'unknown', label: 'Diagram' };
}

function countEdges(text) {
  const patterns = [/-->/g, /---/g, /->/g, /==>/g, /\.\.>/g, /\|\|/g];
  let count = 0;
  for (const pat of patterns) {
    const matches = text.match(pat);
    if (matches) count += matches.length;
  }
  return count;
}

function highlightMermaid(text) {
  const keywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'erDiagram', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'xychart', 'quadrantChart',
    'LR', 'RL', 'TD', 'BT', 'TB', 'section', 'title', 'participant', 'actor',
    'note', 'loop', 'alt', 'else', 'end', 'opt', 'par', 'rect', 'activate', 'deactivate',
    'class', 'link', 'direction', 'subgraph'];
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    // Comments: %% ...
    if (/^\s*%%/.test(line)) {
      result.push(`<span class="mmd-comment">${esc(line)}</span>`);
      continue;
    }
    let out = esc(line);
    // Arrow patterns — highlight before keywords
    out = out.replace(/(&gt;&gt;|--&gt;|==&gt;|\.\.\&gt;|--)/g, '<span class="mmd-arrow">$1</span>');
    // Keywords at start of line or after whitespace
    for (const kw of keywords) {
      const re = new RegExp(`\\b${kw}\\b`, 'g');
      out = out.replace(re, `<span class="mmd-kw">${kw}</span>`);
    }
    // Quoted strings
    out = out.replace(/&quot;([^&]*)&quot;/g, '<span class="mmd-str">&quot;$1&quot;</span>');
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const totalLines = lines.filter((l) => l.trim()).length;
  const { label: diagramLabel } = detectDiagramType(text);
  const edgeCount = countEdges(text);

  const host = document.createElement('div');
  host.className = 'mmd-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'mmd-badge';
  badge.textContent = 'Mermaid';
  const title = document.createElement('span');
  title.className = 'mmd-title';
  title.textContent = diagramLabel;
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'mmd-sub';
  sub.textContent = `Mermaid DSL · ${diagramLabel}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'mmd-summary';
  for (const { value, label } of [
    { value: diagramLabel, label: 'Diagram type' },
    { value: edgeCount, label: 'Connections' },
    { value: totalLines, label: 'Lines' },
  ]) {
    const card = document.createElement('div');
    card.className = 'mmd-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Note about rendering
  const note = document.createElement('div');
  note.className = 'mmd-note';
  const noteMsg = document.createTextNode('Rendered diagrams require Mermaid.js — install as a browser extension or paste at ');
  const noteLink = document.createElement('a');
  noteLink.href = 'https://mermaid.live/';
  noteLink.target = '_blank';
  noteLink.rel = 'noopener noreferrer';
  noteLink.textContent = 'mermaid.live';
  note.appendChild(noteMsg);
  note.appendChild(noteLink);
  host.appendChild(note);

  // Syntax-highlighted code
  const pre = document.createElement('pre');
  pre.className = 'mmd-pre';
  pre.innerHTML = highlightMermaid(text);
  host.appendChild(pre);

  return { parentNode: host };
}
