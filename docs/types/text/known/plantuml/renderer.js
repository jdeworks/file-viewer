const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.puml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.puml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9b59b6;color:#fff;vertical-align:middle;margin-right:8px}
.puml-title{font-size:18px;font-weight:700;margin:0 0 4px}
.puml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.puml-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.puml-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px}
.puml-card strong{display:block;font-size:1.2rem;font-weight:700}
.puml-card span{font-size:.8rem;color:var(--fg-2,#5a6678)}
.puml-pre{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px;overflow:auto;font-size:12px;font-family:ui-monospace,monospace;line-height:1.6;margin:0;white-space:pre}
.puml-kw{color:#9b59b6;font-weight:600}
.puml-directive{color:#d73a49;font-weight:700}
.puml-arrow{color:#0550ae}
.puml-comment{color:var(--fg-2,#6e7681);font-style:italic}
.puml-str{color:#0a3069}
`;

const DIAGRAM_TYPES = [
  { test: /\bclass\s+\w/m, label: 'Class Diagram' },
  { test: /\bactor\s+\w/m, label: 'Use Case Diagram' },
  { test: /\bstate\s+\w/m, label: 'State Diagram' },
  { test: /\bcomponent\s*\[/m, label: 'Component Diagram' },
  { test: /\bpackage\s+\w/m, label: 'Component / Package Diagram' },
  { test: /^\s*(\w+)\s+->>?\s+/m, label: 'Sequence Diagram' },
  { test: /\bnode\s+\w/m, label: 'Deployment Diagram' },
  { test: /\bobject\s+\w/m, label: 'Object Diagram' },
  { test: /^\s*\[([^\]]+)\]\s*->/m, label: 'Activity Diagram' },
  { test: /^\s*\*\s+\w/m, label: 'Mindmap / WBS' },
  { test: /^\s*section\s+/im, label: 'Gantt Chart' },
  { test: /^\s*table\s+/im, label: 'ER Diagram' },
  { test: /^\s*entity\s+\w/im, label: 'ER Diagram' },
  { test: /@startjson/i, label: 'JSON Diagram' },
  { test: /@startyaml/i, label: 'YAML Diagram' },
  { test: /@startmindmap/i, label: 'Mindmap' },
  { test: /@startwbs/i, label: 'WBS Diagram' },
  { test: /@startgantt/i, label: 'Gantt Diagram' },
];

function detectDiagramType(text) {
  for (const { test, label } of DIAGRAM_TYPES) {
    if (test.test(text)) return label;
  }
  return 'UML Diagram';
}

function countParticipants(text) {
  const patterns = [
    /^\s*participant\s+/gim,
    /^\s*actor\s+/gim,
    /^\s*class\s+\w/gim,
    /^\s*entity\s+\w/gim,
    /^\s*node\s+\w/gim,
    /^\s*component\s*\[/gim,
  ];
  const seen = new Set();
  for (const pat of patterns) {
    const matches = text.match(pat) || [];
    for (const m of matches) seen.add(m.trim());
  }
  return seen.size;
}

function countArrows(text) {
  // Matches PlantUML arrow types
  const arrowPat = /(-+>>?|<<?-+|\.+>>?|<<?\.+|--|\.\.|->|<-|-->|<--)/g;
  const matches = text.match(arrowPat) || [];
  return matches.length;
}

const KEYWORDS = [
  'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue',
  'class', 'interface', 'abstract', 'enum', 'state', 'note', 'component', 'package', 'node',
  'cloud', 'database', 'frame', 'folder', 'rectangle', 'usecase', 'left to right direction',
  'top to bottom direction', 'skinparam', 'title', 'header', 'footer', 'legend', 'newpage',
  'loop', 'alt', 'else', 'opt', 'par', 'break', 'critical', 'group', 'ref', 'end',
  'activate', 'deactivate', 'autonumber', 'return', 'destroy', 'create', 'box', 'end box',
  'namespace', 'diamond', 'hide', 'show', 'remove',
];

function highlightPlantUML(text) {
  const lines = text.split('\n');
  const result = [];
  for (const line of lines) {
    // Directives: @startuml, @enduml, etc.
    if (/^\s*@(start|end)\w+/i.test(line)) {
      result.push(`<span class="puml-directive">${esc(line)}</span>`);
      continue;
    }
    // Comments: ' or //'
    if (/^\s*('|\/\/)/.test(line)) {
      result.push(`<span class="puml-comment">${esc(line)}</span>`);
      continue;
    }
    let out = esc(line);
    // Arrows
    out = out.replace(/(-+&gt;&gt;?|&lt;&lt;?-+|\.+&gt;&gt;?|&lt;&lt;?\.\+|--|\.\.)/g, '<span class="puml-arrow">$1</span>');
    // Keywords
    for (const kw of KEYWORDS) {
      const re = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi');
      out = out.replace(re, (m) => `<span class="puml-kw">${m}</span>`);
    }
    // Quoted strings
    out = out.replace(/&quot;([^&]*)&quot;/g, '<span class="puml-str">&quot;$1&quot;</span>');
    result.push(out);
  }
  return result.join('\n');
}

export function render(intake) {
  const text = intake.text || '';
  const diagramType = detectDiagramType(text);
  const participantCount = countParticipants(text);
  const arrowCount = countArrows(text);
  const totalLines = text.split('\n').filter((l) => l.trim()).length;

  const host = document.createElement('div');
  host.className = 'puml-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px';
  const badge = document.createElement('span');
  badge.className = 'puml-badge';
  badge.textContent = 'PlantUML';
  const title = document.createElement('span');
  title.className = 'puml-title';
  title.textContent = diagramType;
  header.appendChild(badge);
  header.appendChild(title);
  host.appendChild(header);

  const sub = document.createElement('div');
  sub.className = 'puml-sub';
  sub.textContent = `PlantUML · ${diagramType}`;
  host.appendChild(sub);

  // Summary cards
  const summary = document.createElement('div');
  summary.className = 'puml-summary';
  for (const { value, label } of [
    { value: diagramType, label: 'Diagram type' },
    { value: participantCount || '—', label: 'Elements' },
    { value: arrowCount, label: 'Relationships' },
    { value: totalLines, label: 'Lines' },
  ]) {
    const card = document.createElement('div');
    card.className = 'puml-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    summary.appendChild(card);
  }
  host.appendChild(summary);

  // Syntax-highlighted code
  const pre = document.createElement('pre');
  pre.className = 'puml-pre';
  pre.innerHTML = highlightPlantUML(text);
  host.appendChild(pre);

  return { parentNode: host };
}
