const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vhd-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.vhd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:6px;}
.vhd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vhd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.vhd-cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;}
.vhd-card{background:var(--bg-2,#f8fafc);border:1px solid var(--border,#d9e1ec);border-radius:8px;padding:9px 14px;min-width:110px;}
.vhd-card strong{display:block;font-size:1.2rem;font-weight:700;}
.vhd-card span{font-size:.8rem;color:var(--fg-2,#5a6678);}
.vhd-section{margin:0 0 16px;border:1px solid var(--border,#e0e0e0);border-radius:8px;overflow:hidden;}
.vhd-section-hd{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.vhd-list{margin:0;padding:0;list-style:none;}
.vhd-list li{padding:5px 14px;border-bottom:1px solid var(--border,#eaecf0);font-family:ui-monospace,monospace;font-size:12px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;}
.vhd-list li:last-child{border-bottom:none;}
.vhd-tag{font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;}
.vhd-tag-entity{background:#ede9fe;color:#7e22ce;}
.vhd-tag-arch{background:#dbeafe;color:#1e40af;}
.vhd-tag-pkg{background:#dcfce7;color:#166534;}
.vhd-tag-in{background:#e0f2fe;color:#0369a1;}
.vhd-tag-out{background:#fef3c7;color:#92400e;}
.vhd-tag-inout{background:#f3e8ff;color:#7e22ce;}
.vhd-tag-signal{background:#f0f9ff;color:#0c4a6e;}
.vhd-tag-process{background:#fce7f3;color:#9d174d;}
.vhd-tag-comp{background:#f0fdf4;color:#166534;}
.vhd-tag-gen{background:#fff7ed;color:#9a3412;}
`;

function parseVHDL(text) {
  // VHDL is case-insensitive
  const lines = text.split(/\r?\n/);

  const libraries = [];
  const entities = [];
  const architectures = [];
  const signals = [];
  const processes = [];
  const components = [];
  const generates = [];
  const ports = { inputs: 0, outputs: 0, inouts: 0 };

  let inPortList = false;
  let currentEntity = null;

  for (const line of lines) {
    const t = line.trim();
    // Skip comments
    if (t.startsWith('--')) continue;

    // Library use
    const useM = t.match(/^use\s+([\w.]+)/i);
    if (useM) { libraries.push(useM[1]); continue; }

    // Entity
    const entityM = t.match(/^entity\s+(\w+)\s+is/i);
    if (entityM) {
      currentEntity = entityM[1];
      entities.push({ name: entityM[1] });
      continue;
    }

    // Port list detection
    if (/^\s*port\s*\(/i.test(t)) { inPortList = true; continue; }
    if (inPortList) {
      if (/\)\s*;/.test(t)) { inPortList = false; continue; }
      if (/\bin\s+/i.test(t) && !/\binout\b/i.test(t)) ports.inputs++;
      else if (/\binout\b/i.test(t)) ports.inouts++;
      else if (/\bout\s+/i.test(t)) ports.outputs++;
    }

    // Architecture
    const archM = t.match(/^architecture\s+(\w+)\s+of\s+(\w+)\s+is/i);
    if (archM) {
      const name = archM[1];
      const entity = archM[2];
      // Determine style
      let style = 'behavioral';
      const lname = name.toLowerCase();
      if (lname.includes('struct') || lname.includes('rtl')) style = 'structural';
      else if (lname.includes('dataflow') || lname.includes('flow')) style = 'dataflow';
      architectures.push({ name, entity, style });
      continue;
    }

    // Signal declarations
    const sigM = t.match(/^\s*signal\s+(\w+)\s*:/i);
    if (sigM) { signals.push(sigM[1]); continue; }

    // Process blocks
    const procM = t.match(/^\s*(?:\w+\s*:\s*)?process\s*(?:\(([^)]*)\))?/i);
    if (procM) {
      const sensitivityList = procM[1] ? procM[1].split(',').filter((s) => s.trim()).length : 0;
      processes.push({ sensitivityCount: sensitivityList });
      continue;
    }

    // Component instantiations
    const compM = t.match(/^\s*(\w+)\s*:\s*(?:component\s+)?(\w+)\s*(?:port\s+map|generic\s+map)/i);
    if (compM) { components.push(compM[2]); continue; }

    // Generate statements
    const genM = t.match(/^\s*(\w+)\s*:\s*(?:for|if)\s+.*\s+generate/i);
    if (genM) { generates.push(genM[1]); continue; }
  }

  // Badge
  const isPackage = /^\s*package\s+\w+\s+is/im.test(text);
  let badge = entities.length > 0 ? 'VHDL Entity' : 'VHDL Architecture';
  if (isPackage && entities.length === 0) badge = 'VHDL Package';

  return { libraries, entities, architectures, signals, processes, components, generates, ports, badge };
}

function makeSection(host, title) {
  const sec = document.createElement('div');
  sec.className = 'vhd-section';
  const hd = document.createElement('div');
  hd.className = 'vhd-section-hd';
  hd.textContent = title;
  sec.appendChild(hd);
  host.appendChild(sec);
  return sec;
}

function makeList(sec) {
  const ul = document.createElement('ul');
  ul.className = 'vhd-list';
  sec.appendChild(ul);
  return ul;
}

function makeTag(cls, text) {
  const span = document.createElement('span');
  span.className = 'vhd-tag ' + cls;
  span.textContent = text;
  return span;
}

export async function render(intake) {
  const text = intake.text || '';
  const { libraries, entities, architectures, signals, processes, components, generates, ports, badge } = parseVHDL(text);

  const host = document.createElement('div');
  host.className = 'vhd-doc';

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  host.appendChild(styleEl);

  // Title
  const title = document.createElement('div');
  title.className = 'vhd-title';
  const badgeEl = document.createElement('span');
  badgeEl.className = 'vhd-badge';
  badgeEl.textContent = badge;
  title.appendChild(badgeEl);
  host.appendChild(title);

  // Sub
  const sub = document.createElement('div');
  sub.className = 'vhd-sub';
  const parts = [];
  if (entities.length > 0) parts.push(`${entities.length} entity`);
  if (architectures.length > 0) parts.push(`${architectures.length} architecture`);
  parts.push(`${signals.length} signal${signals.length !== 1 ? 's' : ''}`);
  parts.push(`${processes.length} process${processes.length !== 1 ? 'es' : ''}`);
  sub.textContent = parts.join(' · ');
  host.appendChild(sub);

  // Cards
  const cards = document.createElement('div');
  cards.className = 'vhd-cards';
  const totalPorts = ports.inputs + ports.outputs + ports.inouts;
  const cardItems = [
    { value: entities.length || '—', label: 'Entities' },
    { value: totalPorts || '—', label: 'Ports' },
    { value: signals.length, label: 'Signals' },
    { value: processes.length, label: 'Processes' },
  ];
  for (const { value, label } of cardItems) {
    const card = document.createElement('div');
    card.className = 'vhd-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    cards.appendChild(card);
  }
  host.appendChild(cards);

  // Library USE clauses
  if (libraries.length > 0) {
    const sec = makeSection(host, `Library USE Clauses (${libraries.length})`);
    const ul = makeList(sec);
    for (const lib of libraries) {
      const li = document.createElement('li');
      li.textContent = 'use ' + lib;
      ul.appendChild(li);
    }
  }

  // Entities and ports
  if (entities.length > 0) {
    const sec = makeSection(host, `Entities (${entities.length})`);
    const ul = makeList(sec);
    for (const { name } of entities) {
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-entity', 'entity'));
      li.appendChild(document.createTextNode(' ' + name));
      if (ports.inputs > 0 || ports.outputs > 0 || ports.inouts > 0) {
        const portSummary = document.createElement('span');
        portSummary.style.color = 'var(--fg-2,#888)';
        portSummary.style.fontSize = '11px';
        const portParts = [];
        if (ports.inputs) portParts.push(`${ports.inputs} in`);
        if (ports.outputs) portParts.push(`${ports.outputs} out`);
        if (ports.inouts) portParts.push(`${ports.inouts} inout`);
        portSummary.textContent = ' — ' + portParts.join(', ');
        li.appendChild(portSummary);
      }
      ul.appendChild(li);
    }
  }

  // Architectures
  if (architectures.length > 0) {
    const sec = makeSection(host, `Architectures (${architectures.length})`);
    const ul = makeList(sec);
    for (const { name, entity, style } of architectures) {
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-arch', 'architecture'));
      li.appendChild(document.createTextNode(' ' + name + ' of ' + entity));
      const styleSpan = document.createElement('span');
      styleSpan.style.color = 'var(--fg-2,#888)';
      styleSpan.style.fontSize = '11px';
      styleSpan.textContent = ' — ' + style;
      li.appendChild(styleSpan);
      ul.appendChild(li);
    }
  }

  // Signals
  if (signals.length > 0) {
    const MAX = 10;
    const shown = signals.slice(0, MAX);
    const sec = makeSection(host, `Signals (${signals.length})`);
    const ul = makeList(sec);
    for (const name of shown) {
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-signal', 'signal'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
    if (signals.length > MAX) {
      const li = document.createElement('li');
      li.textContent = `… and ${signals.length - MAX} more`;
      li.style.color = 'var(--fg-2,#888)';
      ul.appendChild(li);
    }
  }

  // Processes
  if (processes.length > 0) {
    const sec = makeSection(host, `Processes (${processes.length})`);
    const ul = makeList(sec);
    for (let i = 0; i < processes.length; i++) {
      const { sensitivityCount } = processes[i];
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-process', 'process'));
      const desc = sensitivityCount > 0
        ? ` process_${i + 1} — sensitivity list: ${sensitivityCount} signal${sensitivityCount !== 1 ? 's' : ''}`
        : ` process_${i + 1} — no sensitivity list`;
      li.appendChild(document.createTextNode(desc));
      ul.appendChild(li);
    }
  }

  // Component instantiations
  if (components.length > 0) {
    const sec = makeSection(host, `Component Instantiations (${components.length})`);
    const ul = makeList(sec);
    for (const name of components) {
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-comp', 'component'));
      li.appendChild(document.createTextNode(' ' + name));
      ul.appendChild(li);
    }
  }

  // Generate statements
  if (generates.length > 0) {
    const sec = makeSection(host, `Generate Statements (${generates.length})`);
    const ul = makeList(sec);
    for (const label of generates) {
      const li = document.createElement('li');
      li.appendChild(makeTag('vhd-tag-gen', 'generate'));
      li.appendChild(document.createTextNode(' ' + label));
      ul.appendChild(li);
    }
  }

  return { parentNode: host };
}
