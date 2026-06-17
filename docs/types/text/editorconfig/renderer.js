function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function parseEditorConfig(text) {
  const sections = [];
  let current = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (!line || line.startsWith('#') || line.startsWith(';')) {
      // Track comments only inside a section
      if (current && line.startsWith('#')) {
        current.entries.push({ type: 'comment', text: line.slice(1).trim() });
      }
      continue;
    }

    if (line.startsWith('[')) {
      const closeIdx = line.lastIndexOf(']');
      const pattern = closeIdx > 0 ? line.slice(1, closeIdx) : line.slice(1);
      current = { pattern, entries: [] };
      sections.push(current);
      continue;
    }

    // key = value
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim().toLowerCase();
      const value = line.slice(eqIdx + 1).trim().toLowerCase();
      if (!current) {
        // Preamble — before any section (e.g. root = true)
        if (key === 'root') {
          sections.unshift({ pattern: null, isRoot: value === 'true', entries: [] });
        }
      } else {
        current.entries.push({ type: 'prop', key, value });
      }
    }
  }

  return sections;
}

function propsOf(section) {
  if (!section) return {};
  const out = {};
  for (const e of section.entries) {
    if (e.type === 'prop') out[e.key] = e.value;
  }
  return out;
}

function renderValue(key, value) {
  const v = esc(value);
  switch (key) {
    case 'indent_style':
      if (value === 'tab') {
        return '<span style="background:#78350f;color:#fbbf24;border-radius:4px;padding:1px 8px;font-size:11px;font-weight:600">TAB</span>';
      }
      if (value === 'space') {
        return '<span style="background:#1e3a5f;color:#60a5fa;border-radius:4px;padding:1px 8px;font-size:11px;font-weight:600">SPACE</span>';
      }
      return `<code style="color:#e2e8f0">${v}</code>`;

    case 'indent_size':
    case 'tab_width':
      return `<code style="background:#1e1e32;border-radius:4px;padding:1px 8px;color:#c084fc;font-size:12px">${v}</code>`;

    case 'end_of_line': {
      const icons = { lf: '&#x1F427;', crlf: '&#x1FA9F;', cr: '&#x1F34E;' };
      const names = { lf: 'LF', crlf: 'CRLF', cr: 'CR' };
      const icon = icons[value] || '';
      const name = names[value] || v;
      return `<span>${icon} <code style="color:#e2e8f0">${esc(name)}</code></span>`;
    }

    case 'trim_trailing_whitespace':
    case 'insert_final_newline':
      if (value === 'true') {
        return '<span style="color:#4ade80;font-size:14px">&#x2713;</span> <span style="color:#4ade80;font-size:12px">true</span>';
      }
      if (value === 'false') {
        return '<span style="color:#f87171;font-size:14px">&#x2717;</span> <span style="color:#f87171;font-size:12px">false</span>';
      }
      return `<code style="color:#e2e8f0">${v}</code>`;

    case 'charset':
      return `<span style="background:#1a2e1a;border:1px solid #2a4a2a;border-radius:4px;padding:1px 8px;color:#86efac;font-size:11px;font-family:monospace">${v}</span>`;

    case 'max_line_length':
      if (value === 'off') {
        return '<span style="color:#9a9ab8;font-size:12px">&#x1F4CF; off</span>';
      }
      return `<span style="color:#fde68a;font-size:12px">&#x1F4CF; ${v}</span>`;

    default:
      return `<code style="color:#e2e8f0">${v}</code>`;
  }
}

function friendlyPropLabel(key) {
  const labels = {
    indent_style: 'Indent style',
    indent_size: 'Indent size',
    tab_width: 'Tab width',
    end_of_line: 'Line endings',
    charset: 'Charset',
    trim_trailing_whitespace: 'Trim trailing whitespace',
    insert_final_newline: 'Insert final newline',
    max_line_length: 'Max line length',
  };
  return labels[key] || key.replace(/_/g, ' ');
}

function renderPropTable(entries) {
  const propRows = entries.filter(e => e.type === 'prop');
  if (!propRows.length) {
    return '<p style="color:#666;font-size:12px;margin:0;padding:4px 0">No properties</p>';
  }
  const rows = propRows.map(e =>
    `<tr>
      <td style="padding:5px 12px 5px 0;color:#9a9ab8;font-size:12px;white-space:nowrap;vertical-align:middle">${esc(friendlyPropLabel(e.key))}</td>
      <td style="padding:5px 0;vertical-align:middle">${renderValue(e.key, e.value)}</td>
    </tr>`
  ).join('');
  return `<table style="border-collapse:collapse;width:100%">${rows}</table>`;
}

function buildBaseSummary(baseSection) {
  if (!baseSection) return '';
  const props = propsOf(baseSection);
  const lines = [];

  if (props.indent_style) {
    const size = props.indent_size || props.tab_width;
    if (props.indent_style === 'space' && size) {
      lines.push(`Indent: ${esc(size)} spaces`);
    } else if (props.indent_style === 'tab') {
      lines.push(`Indent: tabs${size ? ' (width ' + esc(size) + ')' : ''}`);
    } else {
      lines.push(`Indent: ${esc(props.indent_style)}`);
    }
  }

  if (props.end_of_line) {
    const names = { lf: 'LF (Unix)', crlf: 'CRLF (Windows)', cr: 'CR (Classic Mac)' };
    lines.push(`Line endings: ${esc(names[props.end_of_line] || props.end_of_line.toUpperCase())}`);
  }

  if (props.charset) {
    lines.push(`Charset: ${esc(props.charset.toUpperCase())}`);
  }

  if (props.trim_trailing_whitespace) {
    lines.push(`Trailing whitespace: ${props.trim_trailing_whitespace === 'true' ? 'trimmed' : 'preserved'}`);
  }

  if (props.insert_final_newline) {
    lines.push(`Final newline: ${props.insert_final_newline === 'true' ? 'yes' : 'no'}`);
  }

  if (!lines.length) return '';

  const lineItems = lines.map(l =>
    `<div style="padding:3px 0;color:#cbd5e1;font-size:12px">${l}</div>`
  ).join('');

  return `<div style="border:1px solid #3a3a5a;border-radius:6px;padding:12px 16px;margin-bottom:16px;background:#0f0f1e">
  <div style="font-size:11px;color:#6a6a8a;font-weight:600;letter-spacing:0.05em;margin-bottom:8px;text-transform:uppercase">Base settings ([*])</div>
  ${lineItems}
</div>`;
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const sections = parseEditorConfig(text);

  // Find preamble (root indicator)
  const preamble = sections.find(s => s.pattern === null);
  const isRoot = preamble && preamble.isRoot;

  // Non-preamble sections
  const contentSections = sections.filter(s => s.pattern !== null);

  // Find base section — [*] first, otherwise most general
  const baseSection = contentSections.find(s => s.pattern === '*')
    || contentSections.find(s => s.pattern === '**')
    || null;

  const baseProps = propsOf(baseSection);

  // Root badge
  const rootBadge = isRoot
    ? `<div style="display:flex;align-items:center;gap:8px;background:#0d2a0d;border:1px solid #2a6a2a;border-radius:6px;padding:8px 14px;margin-bottom:16px">
        <span style="color:#4ade80;font-size:14px">&#x2713;</span>
        <span style="color:#86efac;font-size:12px"><code style="font-weight:600">root = true</code> — stops EditorConfig search here</span>
      </div>`
    : '';

  // Base summary card
  const baseSummary = buildBaseSummary(baseSection);

  // Section cards
  const sectionCards = contentSections.map(section => {
    const isBase = section === baseSection;
    const entries = section.entries.filter(e => e.type === 'prop');

    // For non-base sections, show which props differ from base
    let diffNote = '';
    if (!isBase && baseSection && entries.length > 0) {
      const overrides = entries.filter(e => baseProps[e.key] !== e.value);
      if (overrides.length === entries.length && entries.length > 0) {
        // All are overrides — no note needed
      } else if (overrides.length < entries.length) {
        const sameCount = entries.length - overrides.length;
        diffNote = `<div style="font-size:11px;color:#6a6a8a;margin-bottom:8px">${sameCount} propert${sameCount !== 1 ? 'ies' : 'y'} inherited from [*]</div>`;
      }
    }

    const patternLabel = isBase
      ? `<span style="font-family:monospace;font-size:14px;color:#e2e8f0;font-weight:600">[${esc(section.pattern)}]</span>
         <span style="background:#1e3a5f;color:#60a5fa;border-radius:4px;padding:1px 8px;font-size:10px;margin-left:8px;font-weight:600">BASE</span>`
      : `<span style="font-family:monospace;font-size:14px;color:#e2e8f0;font-weight:600">[${esc(section.pattern)}]</span>`;

    return `<div style="border:1px solid #2a2a4a;border-radius:6px;padding:12px 16px;margin-bottom:10px;background:#13132a">
  <div style="margin-bottom:10px">${patternLabel}</div>
  ${diffNote}
  ${renderPropTable(section.entries)}
</div>`;
  }).join('');

  // Stats footer
  const patternCount = contentSections.length;
  const statsFooter = `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #2a2a4a;color:#6a6a8a;font-size:11px">
  ${patternCount} section${patternCount !== 1 ? 's' : ''} covering ${patternCount} file pattern${patternCount !== 1 ? 's' : ''}
</div>`;

  const bodyHtml = `<div style="padding:16px;font-family:system-ui,sans-serif;font-size:13px;max-width:800px">
${rootBadge}
${baseSummary}
${sectionCards}
${statsFooter}
</div>`;

  return { bodyHtml, hadUnsafe: false };
}
